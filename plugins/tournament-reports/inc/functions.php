<?php
/**
 * Shared helpers for the tournament-reports plugin.
 *
 * Usage — include at the top of any page / admin file:
 *   require_once __DIR__ . '/../inc/functions.php';   // from pages/ or admin/
 */

/* ── Tournament CRUD ──────────────────────────────────────────────────────── */

/**
 * Return all tournaments, ordered by most recently fetched.
 *
 * @return array<int, array<string, mixed>>
 */
function trGetTournaments(): array
{
    global $db;
    return $db->query(qp("SELECT id, tournament_id, tournament_name, total_games, localization, description, fetched_at, created_by FROM {tournaments} ORDER BY fetched_at DESC"))->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Return all tournaments (same projection as trGetTournaments) with their
 * games_data decoded, fetched in a single query. Useful when the caller needs
 * game-level metadata (format, date, players) for every tournament.
 *
 * @return array<int, array<string, mixed>>
 */
function trGetTournamentsWithGames(): array
{
    global $db;
    $rows = $db->query(qp(
        "SELECT id, tournament_id, tournament_name, total_games, localization, description, fetched_at, created_by, games_data
         FROM {tournaments} ORDER BY fetched_at DESC"
    ))->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row['games'] = json_decode($row['games_data'] ?? '{}', true)['games'] ?? [];
        unset($row['games_data']);
    }
    return $rows;
}

/**
 * Return a single tournament by DB id, with games_data decoded.
 */
function trGetTournament(int $id): ?array
{
    global $db;
    $stmt = $db->prepare(qp("SELECT * FROM {tournaments} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return null;
    $row['games_data'] = json_decode($row['games_data'] ?? '{}', true);
    return $row;
}

/**
 * Return a single tournament by its external tournament_id.
 */
function trGetTournamentByExternalId(string $tournamentId): ?array
{
    global $db;
    $stmt = $db->prepare(qp("SELECT * FROM {tournaments} WHERE tournament_id = :tid"));
    $stmt->execute([':tid' => $tournamentId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) return null;
    $row['games_data'] = json_decode($row['games_data'] ?? '{}', true);
    return $row;
}

/**
 * Save (upsert) a tournament from external API data.
 * Returns the DB id.
 */
function trSaveTournament(array $apiData, int $createdBy = 0): int
{
    global $db;
    $tournamentId   = (string)($apiData['tournamentId'] ?? '');
    $tournamentName = (string)($apiData['tournamentName'] ?? '');
    $totalGames     = (int)($apiData['totalGames'] ?? 0);
    $gamesJson      = json_encode($apiData['games'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Upsert: update if exists, insert otherwise
    $stmt = $db->prepare(qp(
        "INSERT INTO {tournaments} (tournament_id, tournament_name, total_games, games_data, created_by)
         VALUES (:tid, :tn, :tg, :gd, :cb)
         ON DUPLICATE KEY UPDATE
            tournament_name = VALUES(tournament_name),
            total_games     = VALUES(total_games),
            games_data      = VALUES(games_data),
            fetched_at      = CURRENT_TIMESTAMP"
    ));
    $stmt->execute([
        ':tid' => $tournamentId,
        ':tn' => $tournamentName,
        ':tg' => $totalGames,
        ':gd' => $gamesJson,
        ':cb' => $createdBy,
    ]);

    // Return the id (new or existing)
    $sel = $db->prepare(qp("SELECT id FROM {tournaments} WHERE tournament_id = :tid"));
    $sel->execute([':tid' => $tournamentId]);
    return (int)$sel->fetchColumn();
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
 * the tournament page and ranking extraction expect, then reuses the upsert.
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
            (tournament_id, tournament_name, total_games, games_data, localization, description, created_by)
         VALUES (:tid, :tn, :tg, :gd, :loc, :desc, :cb)
         ON DUPLICATE KEY UPDATE
            tournament_name = VALUES(tournament_name),
            total_games     = VALUES(total_games),
            games_data      = VALUES(games_data),
            localization    = VALUES(localization),
            description     = VALUES(description),
            fetched_at      = CURRENT_TIMESTAMP"
    ));
    $stmt->execute([
        ':tid'  => $tournamentId,
        ':tn'   => $tournamentName,
        ':tg'   => 1,
        ':gd'   => json_encode($gamesData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':loc'  => $localization,
        ':desc' => $description,
        ':cb'   => $createdBy,
    ]);

    return (int)$db->lastInsertId();
}

/**
 * Delete a tournament by DB id.
 */
function trDeleteTournament(int $id): bool
{
    global $db;
    $stmt = $db->prepare(qp("DELETE FROM {tournaments} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    return $stmt->rowCount() > 0;
}

/**
 * Update the localization field of a tournament.
 */
function trUpdateTournamentLocalization(string $tournamentExtId, string $localization): void
{
    global $db;
    $stmt = $db->prepare(qp("UPDATE {tournaments} SET localization = :loc WHERE tournament_id = :tid"));
    $stmt->execute([':loc' => $localization, ':tid' => $tournamentExtId]);
}

/**
 * Update the description field of a tournament.
 */
function trUpdateTournamentDescription(string $tournamentExtId, string $description): void
{
    global $db;
    $stmt = $db->prepare(qp("UPDATE {tournaments} SET description = :desc WHERE tournament_id = :tid"));
    $stmt->execute([':desc' => $description, ':tid' => $tournamentExtId]);
}

/* ── Settings ─────────────────────────────────────────────────────────────── */

/**
 * Return the external tournament API base URL.
 * Falls back to the TOURNAMENTS_API_URL constant, then to a DB setting.
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
 * Save the external tournament API base URL.
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
 * Fetch tournament data from the external API.
 *
 * @return array{ok: bool, data?: array, error?: string}
 */
function trFetchTournament(string $tournamentId): array
{
    $apiUrl = trGetApiUrl();
    if ($apiUrl === '') {
        return ['ok' => false, 'error' => 'Tournament API URL is not configured.'];
    }
    $url = $apiUrl . '/tournaments/' . rawurlencode($tournamentId);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return ['ok' => false, 'error' => 'Connection error: ' . $curlErr];
    }
    if ($code < 200 || $code >= 300) {
        return ['ok' => false, 'error' => 'API error (HTTP ' . $code . ').'];
    }
    $data = json_decode($response, true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'Invalid API response.'];
    }
    return ['ok' => true, 'data' => $data];
}

/**
 * Return all rankings, optionally filtered by tournament ID.
 *
 * @return array<int, array<string, mixed>>
 */
function trGetRankings(?string $tournamentId = null): array
{
    global $db;
    if ($tournamentId !== null) {
        $stmt = $db->prepare(qp(
            "SELECT * FROM {rankings} WHERE tournament_id = :tid ORDER BY created_at DESC"
        ));
        $stmt->execute([':tid' => $tournamentId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    return $db->query(qp("SELECT * FROM {rankings} ORDER BY created_at DESC"))->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Return a single ranking by ID with its players.
 */
function trGetRanking(int $id): ?array
{
    global $db;
    $stmt = $db->prepare(qp("SELECT * FROM {rankings} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    $ranking = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ranking) return null;

    $stmt2 = $db->prepare(qp(
        "SELECT * FROM {ranking_players} WHERE ranking_id = :rid ORDER BY position ASC, id ASC"
    ));
    $stmt2->execute([':rid' => $id]);
    $ranking['players'] = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    return $ranking;
}

/**
 * Create a new ranking. Returns the new ranking ID.
 */
function trCreateRanking(string $tournamentId, string $tournamentName, int $createdBy): int
{
    global $db;
    $stmt = $db->prepare(qp(
        "INSERT INTO {rankings} (tournament_id, tournament_name, created_by) VALUES (:tid, :tn, :cb)"
    ));
    $stmt->execute([':tid' => $tournamentId, ':tn' => $tournamentName, ':cb' => $createdBy]);
    return (int)$db->lastInsertId();
}

/**
 * Update ranking players (replace all entries).
 */
function trUpdateRankingPlayers(int $rankingId, array $players): void
{
    global $db;
    $del = $db->prepare(qp("DELETE FROM {ranking_players} WHERE ranking_id = :rid"));
    $del->execute([':rid' => $rankingId]);

    if (empty($players)) return;
    $ins = $db->prepare(qp(
        "INSERT INTO {ranking_players} (ranking_id, position, player_id, player_name)
         VALUES (:rid, :pos, :pid, :pn)"
    ));
    foreach ($players as $i => $p) {
        $ins->execute([
            ':rid' => $rankingId,
            ':pos' => (int)($p['position'] ?? ($i + 1)),
            ':pid' => (string)($p['player_id'] ?? ''),
            ':pn'  => (string)($p['player_name'] ?? ''),
        ]);
    }
}

/**
 * Extract unique players from tournament games_data.
 *
 * @return array<int, array{id: string, name: string, faction: string, games_played: int}>
 */
function trExtractPlayers(string $gamesJson): array
{
    $data    = json_decode($gamesJson, true);
    $games   = $data['games'] ?? [];
    $players = [];

    foreach ($games as $game) {
        foreach (($game['endGamePlayers'] ?? []) as $p) {
            $pid = (string)($p['id'] ?? '');
            if ($pid === '') continue;
            if (!isset($players[$pid])) {
                $players[$pid] = [
                    'id'           => $pid,
                    'name'         => (string)($p['name'] ?? $pid),
                    'faction'      => (string)($p['faction'] ?? ''),
                    'games_played' => 0,
                ];
            }
            $players[$pid]['games_played']++;
        }
    }

    usort($players, fn($a, $b) => $b['games_played'] <=> $a['games_played'] || strcmp($a['name'], $b['name']));
    return array_values($players);
}

/**
 * Delete a ranking and its players.
 */
function trDeleteRanking(int $id): bool
{
    global $db;
    $stmt = $db->prepare(qp("DELETE FROM {rankings} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    return $stmt->rowCount() > 0;
}
