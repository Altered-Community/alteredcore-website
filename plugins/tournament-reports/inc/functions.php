<?php
/**
 * Shared helpers for the tournament-reports plugin.
 *
 * Usage — include at the top of any page / admin file:
 *   require_once __DIR__ . '/../inc/functions.php';   // from pages/ or admin/
 *
 * Tournament data lives entirely on GameApi and is fetched live on every read
 * (GET /api/tournaments, GET /api/tournaments/{id}/players) — nothing about
 * it is cached or overridden locally.
 */

require_once __DIR__ . '/Deckfmt/Deckfmt.php';

use TournamentReports\Deckfmt\Deckfmt;

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
 * its player standings in one call. This is what a single tournament report
 * page needs — GameApi has no single-tournament-detail route, only the full
 * index + a players sub-resource.
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

    return [
        'ok'             => true,
        'tournament_name'=> (string)($entry['tournamentParentName'] ?? ''),
        'total_games'    => (int)($entry['totalGames'] ?? 0),
        'total_players'  => (int)($entry['totalPlayers'] ?? 0),
        'localization'   => '',
        'description'    => '',
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

