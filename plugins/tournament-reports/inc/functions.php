<?php
/**
 * Shared helpers for the tournament-reports plugin.
 *
 * Usage — include at the top of any page / admin file:
 *   require_once __DIR__ . '/../inc/functions.php';   // from pages/ or admin/
 *
 * Tournament data comes from two places, never mixed:
 *  - Manual tournaments (created via the admin "Create tournament" form) live
 *    entirely in {tournaments}.games_data, exactly like before.
 *  - Everything else is a GameApi tournament: fetched live from GameApi on
 *    every read (GET /api/tournaments, GET /api/tournaments/{id}/players) —
 *    nothing is cached locally. {tournaments} rows with an empty games_data
 *    are a *sparse admin-authored overlay* (a display-name override,
 *    localization, description) for one specific GameApi tournament id; a
 *    GameApi tournament with no admin edits has no local row at all.
 * A row's games_data tells the two apart: non-empty = manual, empty = overlay.
 */

require_once __DIR__ . '/Deckfmt/Deckfmt.php';

use TournamentReports\Deckfmt\Deckfmt;

/* ── Manual tournament CRUD ──────────────────────────────────────────────── */

/**
 * Return every manual tournament, ordered by most recently created.
 *
 * @return array<int, array<string, mixed>>
 */
function trGetManualTournaments(): array
{
    global $db;
    return $db->query(qp(
        "SELECT id, tournament_id, tournament_name, localization, description, fetched_at, created_by
         FROM {tournaments}
         WHERE games_data IS NOT NULL AND games_data <> ''
         ORDER BY fetched_at DESC"
    ))->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Every local {tournaments} row that is *not* a manual tournament, keyed by
 * tournament_id — the sparse admin-authored overlay (name override /
 * localization / description) for GameApi tournaments. One query for the
 * whole listing page instead of one lookup per row.
 *
 * @return array<string, array<string, mixed>>
 */
function trGetTournamentOverridesMap(): array
{
    global $db;
    $rows = $db->query(qp(
        "SELECT id, tournament_id, tournament_name, localization, description
         FROM {tournaments}
         WHERE games_data IS NULL OR games_data = ''"
    ))->fetchAll(PDO::FETCH_ASSOC);

    $map = [];
    foreach ($rows as $row) {
        $map[(string)$row['tournament_id']] = $row;
    }
    return $map;
}

/**
 * Return a single local row (manual tournament, or GameApi-tournament
 * overlay) by external tournament id, decoding games_data when present.
 */
function trGetTournamentByExternalId(string $tournamentId): ?array
{
    global $db;
    $stmt = $db->prepare(qp("SELECT * FROM {tournaments} WHERE tournament_id = :tid"));
    $stmt->execute([':tid' => $tournamentId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return null;
    if (!empty($row['games_data'])) {
        $row['games_data'] = json_decode($row['games_data'], true);
    }
    return $row;
}

/** True when a local row (as returned by trGetTournamentByExternalId) is a manual tournament. */
function trIsManualTournament(?array $row): bool
{
    return $row !== null && !empty($row['games_data']);
}

/**
 * Convert an ISO-8601 instant to the 'Y-m-d H:i:s' UTC form MySQL DATETIME
 * wants, or null when it is missing or unparseable.
 */
function trToDateTime(string $iso): ?string
{
    if (trim($iso) === '') return null;
    $timestamp = strtotime($iso);
    return $timestamp === false ? null : gmdate('Y-m-d H:i:s', $timestamp);
}

/**
 * Parse a paste-friendly Altered decklist (one "<qty> <reference>" per line)
 * into a structured array.
 *
 * @return array{ok: bool, deck: array<int, array{reference: string, quantity: int}>, errors: array<string>}
 */
function parseDecklistText(string $text): array
{
    $deck   = [];
    $errors = [];
    $lines  = preg_split('/\r\n|\r|\n/', $text);
    if ($lines === false) $lines = [];

    foreach ($lines as $i => $line) {
        $line = trim((string)$line);
        if ($line === '') continue;
        if (!preg_match('/^(\d+)\s+(\S+)$/', $line, $m)) {
            $errors[] = 'Line ' . ($i + 1) . ': ' . $line;
            continue;
        }
        $deck[] = ['reference' => $m[2], 'quantity' => (int)$m[1]];
    }

    return ['ok' => empty($errors), 'deck' => $deck, 'errors' => $errors];
}

/**
 * Insert a manually-created tournament. Builds games_data in the same shape
 * the tournament page and standings extraction expect, then upserts.
 *
 * @param array $data {
 *   tournament_name, optional tournament_id, format, optional localization,
 *   optional description, players: array<int, array{name, optional faction, optional id, optional decklist}>
 * }
 */
function trManualSaveTournament(array $data, int $createdBy = 0): int
{
    global $db;

    $tournamentName = (string)($data['tournament_name'] ?? '');
    $tournamentId   = (string)($data['tournament_id'] ?? '');
    if ($tournamentId === '') {
        $tournamentId = 'manual-' . gmdate('YmdHis') . '-' . substr((string)uniqid(), -4);
    }

    $endGamePlayers = [];
    foreach (($data['players'] ?? []) as $p) {
        $name = (string)($p['name'] ?? '');
        if ($name === '') continue;

        $playerId = (string)($p['id'] ?? '');
        if ($playerId === '') {
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $name), '-'));
            $playerId = $slug !== '' ? $slug : 'player-' . count($endGamePlayers);
        }

        $deck = ($p['deck'] ?? []);
        if (!is_array($deck)) $deck = [];

        $endGamePlayers[] = [
            'id'           => $playerId,
            'name'         => $name,
            'faction'      => (string)($p['faction'] ?? ''),
            'deck'         => $deck,
            'playedCards'  => [],
        ];
    }

    $gamesData = [
        'tournamentId'    => $tournamentId,
        'tournamentName'  => $tournamentName,
        'totalGames'      => 1,
        'localization'    => (string)($data['localization'] ?? ''),
        'description'     => (string)($data['description'] ?? ''),
        'games'           => [[
            'format'          => (string)($data['format'] ?? ''),
            'receivedAt'      => (string)($data['date'] ?? ''),
            'endGamePlayers'  => $endGamePlayers,
        ]],
    ];

    $localization = (string)($data['localization'] ?? '');
    $description  = (string)($data['description'] ?? '');

    $stmt = $db->prepare(qp(
        "INSERT INTO {tournaments}
            (tournament_id, tournament_name, name_overridden, games_data, localization, description, created_by)
         VALUES (:tid, :tn, 1, :gd, :loc, :desc, :cb)
         ON DUPLICATE KEY UPDATE
            tournament_name = VALUES(tournament_name),
            name_overridden = 1,
            games_data      = VALUES(games_data),
            localization    = VALUES(localization),
            description     = VALUES(description),
            fetched_at      = CURRENT_TIMESTAMP"
    ));
    $stmt->execute([
        ':tid'  => $tournamentId,
        ':tn'   => $tournamentName,
        ':gd'   => json_encode($gamesData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':loc'  => $localization,
        ':desc' => $description,
        ':cb'   => $createdBy,
    ]);

    return (int)$db->lastInsertId();
}

/**
 * Delete a local row by DB id — a manual tournament (all its data) or a
 * GameApi-tournament overlay (just the admin's name/localization/description
 * edits; the tournament itself keeps existing on GameApi).
 */
function trDeleteTournament(int $id): bool
{
    global $db;
    $stmt = $db->prepare(qp("DELETE FROM {tournaments} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    return $stmt->rowCount() > 0;
}

/**
 * Set (or clear) the localization override for a tournament id. Works for
 * both manual tournaments and GameApi tournaments (upserting a sparse
 * overlay row for the latter).
 */
function trUpdateTournamentLocalization(string $tournamentExtId, string $localization): void
{
    global $db;
    $db->prepare(qp(
        "INSERT INTO {tournaments} (tournament_id, localization) VALUES (:tid, :loc)
         ON DUPLICATE KEY UPDATE localization = VALUES(localization)"
    ))->execute([':tid' => $tournamentExtId, ':loc' => $localization]);
}

/** Set (or clear) the description override for a tournament id. */
function trUpdateTournamentDescription(string $tournamentExtId, string $description): void
{
    global $db;
    $db->prepare(qp(
        "INSERT INTO {tournaments} (tournament_id, description) VALUES (:tid, :desc)
         ON DUPLICATE KEY UPDATE description = VALUES(description)"
    ))->execute([':tid' => $tournamentExtId, ':desc' => $description]);
}

/**
 * Set (or clear) the display-name override for a tournament id. For a manual
 * tournament this just renames it; for a GameApi tournament it upserts the
 * sparse overlay row. Clearing the name (empty string) hands display back to
 * GameApi's own tournamentParentName for GameApi tournaments.
 */
function trUpdateTournamentName(string $tournamentExtId, string $name): void
{
    global $db;
    $db->prepare(qp(
        "INSERT INTO {tournaments} (tournament_id, tournament_name, name_overridden) VALUES (:tid, :tn, :ov)
         ON DUPLICATE KEY UPDATE tournament_name = VALUES(tournament_name), name_overridden = VALUES(name_overridden)"
    ))->execute([
        ':tid' => $tournamentExtId,
        ':tn'  => $name,
        ':ov'  => trim($name) === '' ? 0 : 1,
    ]);
}

/* ── Settings ─────────────────────────────────────────────────────────────── */

/**
 * Return GameApi's base URL. Falls back to the TOURNAMENTS_API_URL constant,
 * then to a DB setting.
 */
function trGetApiUrl(): string
{
    if (defined('TOURNAMENTS_API_URL') && TOURNAMENTS_API_URL !== '') {
        return TOURNAMENTS_API_URL;
    }
    global $db;
    $val = $db->query(qp("SELECT value FROM {settings} WHERE `key` = 'api_url'"))->fetchColumn();
    return $val !== false ? (string)$val : '';
}

/**
 * Save GameApi's base URL.
 */
function trSaveApiUrl(string $url): void
{
    global $db;
    $url = rtrim(trim($url), '/');
    $db->prepare(qp(
        "INSERT INTO {settings} (`key`, value) VALUES ('api_url', :v)
         ON DUPLICATE KEY UPDATE value = :v2"
    ))->execute([':v' => $url, ':v2' => $url]);
}

/**
 * Return GameApi's adjustment API key (the only thing this key is used for —
 * reads use the logged-in admin's own Keycloak session, not this key).
 * Falls back to the TOURNAMENTS_API_KEY constant, then to a DB setting.
 */
function trGetApiKey(): string
{
    if (defined('TOURNAMENTS_API_KEY') && TOURNAMENTS_API_KEY !== '') {
        return TOURNAMENTS_API_KEY;
    }
    global $db;
    $val = $db->query(qp("SELECT value FROM {settings} WHERE `key` = 'api_key'"))->fetchColumn();
    return $val !== false ? (string)$val : '';
}

/**
 * Save the adjustment API key.
 */
function trSaveApiKey(string $apiKey): void
{
    global $db;
    $apiKey = trim($apiKey);
    $db->prepare(qp(
        "INSERT INTO {settings} (`key`, value) VALUES ('api_key', :v)
         ON DUPLICATE KEY UPDATE value = :v2"
    ))->execute([':v' => $apiKey, ':v2' => $apiKey]);
}

/* ── GameApi — live reads (no local storage) ─────────────────────────────── */

/**
 * Bearer header for a GameApi read, using the given user's own Keycloak
 * session (GameApi's read routes are gated on the "bga-game-history" scope
 * carried by that token — no service-account/client_credentials flow here).
 *
 * @return array{ok: bool, header?: string, error?: string}
 */
function trGameApiAuthHeader(int $userId): array
{
    if (!$userId) {
        return ['ok' => false, 'error' => 'You must be logged in to view tournament reports.'];
    }
    require_once dirname(__DIR__, 3) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) {
        return ['ok' => false, 'error' => 'Unable to obtain an access token for your session.'];
    }
    return ['ok' => true, 'header' => 'Authorization: Bearer ' . $token];
}

/**
 * GET a JSON document from GameApi, authenticated as the given user.
 *
 * @return array{ok: bool, data?: array, error?: string}
 */
function trGameApiGet(string $path, int $userId): array
{
    $apiUrl = trGetApiUrl();
    if ($apiUrl === '') {
        return ['ok' => false, 'error' => 'GameApi URL is not configured.'];
    }

    $auth = trGameApiAuthHeader($userId);
    if (!$auth['ok']) {
        return ['ok' => false, 'error' => $auth['error']];
    }

    $ch = curl_init($apiUrl . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', $auth['header']],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    error_log('[tournament-reports] GET ' . $apiUrl . $path . ' -> HTTP ' . $code . ($curlErr !== '' ? ' — ' . $curlErr : ''));

    if ($curlErr) {
        return ['ok' => false, 'error' => 'Connection error: ' . $curlErr];
    }
    if ($code < 200 || $code >= 300) {
        return ['ok' => false, 'error' => 'GameApi error (HTTP ' . $code . ').'];
    }
    $data = json_decode($response, true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'Invalid GameApi response.'];
    }
    return ['ok' => true, 'data' => $data];
}

/**
 * GET /api/tournaments — every tournament GameApi knows about, live.
 *
 * @return array{ok: bool, data?: array, error?: string}
 */
function trFetchLiveTournamentIndex(int $userId): array
{
    return trGameApiGet('/api/tournaments', $userId);
}

/**
 * GET /api/tournaments/{id}/players — one tournament's player standings, live.
 *
 * @return array{ok: bool, data?: array, error?: string}
 */
function trFetchLiveTournamentPlayers(string $tournamentId, int $userId): array
{
    return trGameApiGet('/api/tournaments/' . rawurlencode($tournamentId) . '/players', $userId);
}

/**
 * Fetch one GameApi tournament's header (name/counts, from the index) and
 * its player standings in one call, merged with any local admin overlay.
 * This is what a single tournament report page needs — GameApi has no
 * single-tournament-detail route, only the full index + a players sub-resource.
 *
 * @return array{ok: bool, tournament_name?: string, total_games?: int, total_players?: int,
 *               standings?: array, error?: string}
 */
function trFetchLiveTournament(string $tournamentId, int $userId): array
{
    $index = trFetchLiveTournamentIndex($userId);
    if (!$index['ok']) {
        return ['ok' => false, 'error' => $index['error'] ?? 'Unknown error'];
    }

    $entry = null;
    foreach ((array)($index['data']['tournaments'] ?? []) as $t) {
        if ((string)($t['tournamentParentId'] ?? '') === $tournamentId) {
            $entry = $t;
            break;
        }
    }
    if ($entry === null) {
        return ['ok' => false, 'error' => 'Tournament not found.'];
    }

    $playersResult = trFetchLiveTournamentPlayers($tournamentId, $userId);
    if (!$playersResult['ok']) {
        return ['ok' => false, 'error' => $playersResult['error'] ?? 'Unknown error'];
    }

    $override = trGetTournamentByExternalId($tournamentId);
    $overrideName = trim((string)($override['tournament_name'] ?? ''));

    return [
        'ok'             => true,
        'tournament_name'=> $overrideName !== '' ? $overrideName : (string)($entry['tournamentParentName'] ?? ''),
        'total_games'    => (int)($entry['totalGames'] ?? 0),
        'total_players'  => (int)($entry['totalPlayers'] ?? 0),
        'localization'   => (string)($override['localization'] ?? ''),
        'description'    => (string)($override['description'] ?? ''),
        'standings'      => trStandingsFromGameApiPlayers((array)($playersResult['data']['players'] ?? [])),
    ];
}

/* ── Standings ────────────────────────────────────────────────────────────── */

/**
 * Map GameApi's player summaries to the standings render contract, sorted
 * wins desc, games played desc, losses desc. This is now the only ranking —
 * there is no manual reordering anymore; the only way to change it is the
 * win/loss "adjustment" GameApi exposes (see trSubmitAdjustment()).
 *
 * @return array<int, array{id: string, name: string, faction: string, hero: string,
 *   main_deck: ?string, games_played: int, wins: int, losses: int, ratio: string,
 *   admin_wins_adjustment: int, admin_losses_adjustment: int, admin_adjustment_note: ?string}>
 */
function trStandingsFromGameApiPlayers(array $players): array
{
    $standings = [];
    foreach ($players as $p) {
        $winsAdj   = (int)($p['adminWinsAdjustment'] ?? 0);
        $lossesAdj = (int)($p['adminLossesAdjustment'] ?? 0);
        $wins      = (int)($p['wins'] ?? 0) + $winsAdj;
        $losses    = (int)($p['losses'] ?? 0) + $lossesAdj;
        $standings[] = [
            'id'                       => (string)($p['bgaUserId'] ?? ''),
            'name'                     => (string)($p['bgaName'] ?? '') ?: (string)($p['bgaUserId'] ?? ''),
            'faction'                  => (string)($p['faction'] ?? ''),
            'hero'                     => (string)($p['hero'] ?? ''),
            'main_deck'                => $p['mainDeck'] ?? null,
            'games_played'             => (int)($p['decksPlayed'] ?? 0),
            'wins'                     => $wins,
            'losses'                   => $losses,
            'ratio'                    => $wins . '-' . $losses,
            'admin_wins_adjustment'    => $winsAdj,
            'admin_losses_adjustment'  => $lossesAdj,
            'admin_adjustment_note'    => $p['adminAdjustmentNote'] ?? null,
        ];
    }

    usort($standings, function ($a, $b) {
        if ($b['wins'] !== $a['wins']) return $b['wins'] <=> $a['wins'];
        if ($b['games_played'] !== $a['games_played']) return $b['games_played'] <=> $a['games_played'];
        return $b['losses'] <=> $a['losses'];
    });

    return $standings;
}

/**
 * Win/loss standings for a *manual* tournament, computed from its
 * games_data (the only path that still derives standings from per-game
 * results — a GameApi tournament gets them precomputed, see
 * trStandingsFromGameApiPlayers()). A game's winner is read from
 * `game['winner']['userId']`.
 *
 * @param array $gamesData Decoded tournament payload (or its `games` list).
 * @return array<int, array{id: string, name: string, faction: string, games_played: int, wins: int, losses: int, ratio: string}>
 */
function trComputeManualStandings(array $gamesData): array
{
    $games = $gamesData['games'] ?? $gamesData ?? [];
    if (!is_array($games)) $games = [];

    $players = [];
    foreach ($games as $game) {
        $winnerId = (string)($game['winner']['userId'] ?? '');
        foreach (($game['endGamePlayers'] ?? []) as $p) {
            $pid = (string)($p['id'] ?? '');
            if ($pid === '') continue;
            if (!isset($players[$pid])) {
                $players[$pid] = [
                    'id'           => $pid,
                    'name'         => (string)($p['name'] ?? $pid),
                    'faction'      => (string)($p['faction'] ?? ''),
                    'games_played' => 0,
                    'wins'         => 0,
                    'losses'       => 0,
                ];
            }
            $players[$pid]['games_played']++;
            if ($winnerId !== '' && $winnerId === $pid) {
                $players[$pid]['wins']++;
            } elseif ($winnerId !== '') {
                $players[$pid]['losses']++;
            }
        }
    }

    $standings = [];
    foreach ($players as $p) {
        $p['ratio'] = $p['wins'] . '-' . $p['losses'];
        $standings[] = $p;
    }

    usort($standings, function ($a, $b) {
        if ($b['wins'] !== $a['wins']) return $b['wins'] <=> $a['wins'];
        if ($b['games_played'] !== $a['games_played']) return $b['games_played'] <=> $a['games_played'];
        return $b['losses'] <=> $a['losses'];
    });

    return array_values($standings);
}

/* ── GameApi — result correction (the one write) ─────────────────────────── */

/**
 * POST a win/loss correction for one player of a GameApi tournament.
 * Additive on top of GameApi's computed wins/losses; GameApi requires a
 * non-empty note (it's the whole point of the field — an unexplained
 * correction isn't auditable).
 *
 * @return array{ok: bool, data?: array, error?: string}
 */
function trSubmitAdjustment(string $tournamentId, string $bgaUserId, int $winsAdjustment, int $lossesAdjustment, string $note): array
{
    $note = trim($note);
    if ($note === '') {
        return ['ok' => false, 'error' => 'A note is required.'];
    }

    $apiUrl = trGetApiUrl();
    if ($apiUrl === '') {
        return ['ok' => false, 'error' => 'GameApi URL is not configured.'];
    }
    $apiKey = trGetApiKey();
    if ($apiKey === '') {
        return ['ok' => false, 'error' => 'GameApi adjustment key is not configured.'];
    }

    $url  = $apiUrl . '/api/tournaments/' . rawurlencode($tournamentId) . '/players/' . rawurlencode($bgaUserId) . '/adjustment';
    $body = json_encode([
        'winsAdjustment'   => $winsAdjustment,
        'lossesAdjustment' => $lossesAdjustment,
        'note'             => $note,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return ['ok' => false, 'error' => 'Connection error: ' . $curlErr];
    }
    if ($code < 200 || $code >= 300) {
        return ['ok' => false, 'error' => 'GameApi error (HTTP ' . $code . ').'];
    }
    $data = json_decode($response, true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'Invalid GameApi response.'];
    }
    return ['ok' => true, 'data' => $data];
}

/* ── Decklist decoding & duplication ─────────────────────────────────────── */

/**
 * Decode a GameApi player's Deckfmt-compressed main_deck into a card list.
 *
 * @return array{ok: bool, cards?: array<int, array{reference: string, quantity: int}>, error?: string}
 */
function trDecodeMainDeck(?string $mainDeck): array
{
    if ($mainDeck === null || trim($mainDeck) === '') {
        return ['ok' => false, 'error' => 'No deck recorded.'];
    }
    return Deckfmt::decode($mainDeck);
}

/**
 * Access token for the currently logged-in user, for calling the Decks API.
 * Mirrors core-altered-cards' deckApiToken() exactly (each plugin keeps its
 * own copy of this small helper — the established convention in this
 * codebase; see ownership/core-altered-cards/equinox-deck-import).
 */
function trUserApiToken(): ?string
{
    $userId = (int)($_SESSION['user_id'] ?? 0);
    if (!$userId) return null;
    require_once dirname(__DIR__, 3) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    return $token ?: null;
}

/**
 * Duplicate a decoded decklist onto the logged-in user's own account, the
 * same way core-altered-cards' "Dupliquer" action does for an existing deck
 * (plugins/core-altered-cards/pages/deck.php) — a private, non-draft standard
 * deck with the same cards.
 *
 * @param array<int, array{reference: string, quantity: int}> $cards
 * @return array{ok: bool, id?: string, error?: string}
 */
function trDuplicateDeckToAccount(array $cards, string $name): array
{
    $token = trUserApiToken();
    if (!$token) {
        return ['ok' => false, 'error' => 'You must be logged in to duplicate a deck.'];
    }
    if (empty($cards)) {
        return ['ok' => false, 'error' => 'No cards to duplicate.'];
    }

    $deckCards = [];
    foreach ($cards as $c) {
        if (empty($c['reference'])) continue;
        $deckCards[] = ['cardReference' => $c['reference'], 'quantity' => (int)($c['quantity'] ?? 1)];
    }

    $payload = [
        'name'      => trim($name) !== '' ? trim($name) : 'Deck',
        'format'    => 'standard',
        'isPublic'  => false,
        'isDraft'   => false,
        'deckCards' => $deckCards,
    ];

    $ch = curl_init(DECKS_API_URL . '/api/decks');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return ['ok' => false, 'error' => 'Connection error: ' . $curlErr];
    }
    if ($code < 200 || $code >= 300) {
        return ['ok' => false, 'error' => 'Decks API error (HTTP ' . $code . ').'];
    }
    $data = json_decode($response, true);
    return ['ok' => true, 'id' => (string)($data['id'] ?? '')];
}

