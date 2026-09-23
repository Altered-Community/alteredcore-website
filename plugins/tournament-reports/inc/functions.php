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
    // Everything the listing needs and nothing more -- games_data is a
    // LONGTEXT per row and is deliberately left out.
    return $db->query(qp(
        "SELECT id, tournament_id, tournament_name, total_games, total_players, format, first_game_at,
                api_version, api_hash, localization, description, fetched_at, synced_at, created_by
         FROM {tournaments}
         ORDER BY first_game_at IS NULL, first_game_at DESC, fetched_at DESC"
    ))->fetchAll(PDO::FETCH_ASSOC);
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
 * ON DUPLICATE KEY UPDATE expression for `tournament_name`.
 *
 * The sync now runs by itself every hour, so a plain overwrite would silently
 * undo an admin's rename over and over. A name edited by hand
 * (name_overridden = 1) wins, and an empty name from the API never replaces
 * one we already have.
 */
const TR_KEEP_NAME_SQL =
    "IF(name_overridden = 1 OR VALUES(tournament_name) = '', tournament_name, VALUES(tournament_name))";

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
 * Save (upsert) a tournament from a full API report document.
 * Returns the DB id.
 *
 * `api_version` is written here and only here, so it always means "the version
 * of the document we actually hold". trSaveTournamentIndexEntry() below
 * deliberately leaves it alone, which is what lets the sync tell a tournament
 * it has merely listed from one it has downloaded.
 */
function trSaveTournament(array $apiData, int $createdBy = 0): int
{
    global $db;
    // The report is keyed by the parent tournament; `tournamentId` is the
    // deprecated alias the API still sends alongside it.
    $tournamentId   = (string)($apiData['tournamentParentId'] ?? $apiData['tournamentId'] ?? '');
    $tournamentName = (string)($apiData['tournamentName'] ?? '');
    $totalGames     = (int)($apiData['totalGames'] ?? 0);
    $totalPlayers   = (int)($apiData['totalPlayers'] ?? 0);
    $apiVersion     = (int)($apiData['version'] ?? 0);
    $apiHash        = (string)($apiData['hash'] ?? '');
    $gamesJson      = json_encode($apiData ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Denormalized off the first game so the listing page never has to decode
    // a games_data blob per row just to show a format and a date. The API
    // orders games oldest-first, so the first one carries both.
    $games     = (array)($apiData['games'] ?? []);
    $firstGame = $games[0] ?? [];
    $format    = (string)($firstGame['format'] ?? '');
    $firstAt   = trToDateTime((string)($firstGame['receivedAt'] ?? ''));

    // Upsert: update if exists, insert otherwise
    $stmt = $db->prepare(qp(
        "INSERT INTO {tournaments}
            (tournament_id, tournament_name, total_games, total_players,
             format, first_game_at, api_version, api_hash, games_data, synced_at, created_by)
         VALUES (:tid, :tn, :tg, :tp, :fmt, :fga, :av, :ah, :gd, CURRENT_TIMESTAMP, :cb)
         ON DUPLICATE KEY UPDATE
            tournament_name = " . TR_KEEP_NAME_SQL . ",
            total_games     = VALUES(total_games),
            total_players   = VALUES(total_players),
            format          = VALUES(format),
            first_game_at   = VALUES(first_game_at),
            api_version     = VALUES(api_version),
            api_hash        = VALUES(api_hash),
            games_data      = VALUES(games_data),
            fetched_at      = CURRENT_TIMESTAMP,
            synced_at       = CURRENT_TIMESTAMP"
    ));
    $stmt->execute([
        ':tid' => $tournamentId,
        ':tn' => $tournamentName,
        ':tg' => $totalGames,
        ':tp' => $totalPlayers,
        ':fmt' => $format,
        ':fga' => $firstAt,
        ':av' => $apiVersion,
        ':ah' => $apiHash,
        ':gd' => $gamesJson,
        ':cb' => $createdBy,
    ]);

    // Return the id (new or existing)
    $sel = $db->prepare(qp("SELECT id FROM {tournaments} WHERE tournament_id = :tid"));
    $sel->execute([':tid' => $tournamentId]);
    return (int)$sel->fetchColumn();
}

/**
 * Save (upsert) just the listing metadata for one entry of
 * GET /api/tournament-reports — name, game count, participant count. Never
 * touches games_data or api_version.
 *
 * This is what makes a tournament appear in the list as soon as the API knows
 * about it, instead of only once its (much larger) report document has been
 * downloaded. The sync fills those in afterwards, a few per run.
 */
function trSaveTournamentIndexEntry(array $entry, int $createdBy = 0): void
{
    global $db;
    $tournamentId = (string)($entry['tournamentParentId'] ?? '');
    if ($tournamentId === '') return;

    $db->prepare(qp(
        "INSERT INTO {tournaments}
            (tournament_id, tournament_name, total_games, total_players, created_by)
         VALUES (:tid, :tn, :tg, :tp, :cb)
         ON DUPLICATE KEY UPDATE
            tournament_name = " . TR_KEEP_NAME_SQL . ",
            total_games     = VALUES(total_games),
            total_players   = VALUES(total_players)"
    ))->execute([
        ':tid' => $tournamentId,
        ':tn'  => (string)($entry['tournamentName'] ?? ''),
        ':tg'  => (int)($entry['totalGames'] ?? 0),
        ':tp'  => (int)($entry['totalPlayers'] ?? 0),
        ':cb'  => $createdBy,
    ]);
}

/**
 * Fetch a tournament from the external API and store (create or update) it.
 *
 * @return array{ok: bool, error?: string}
 */
function trFetchAndStoreTournament(string $tournamentId, int $createdBy = 0): array
{
    $result = trFetchTournament($tournamentId);
    if (!$result['ok'] || !isset($result['data'])) {
        return ['ok' => false, 'error' => $result['error'] ?? 'Unknown error'];
    }
    trSaveTournament($result['data'], $createdBy);
    return ['ok' => true];
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

    // A manual tournament is never in the API index, so the sync leaves it
    // alone -- but it lands in the same list, so it fills the same
    // denormalized columns the listing page reads. name_overridden is set for
    // the same reason: this name came from a human, not from BGA.
    $stmt = $db->prepare(qp(
        "INSERT INTO {tournaments}
            (tournament_id, tournament_name, name_overridden, total_games, total_players,
             format, first_game_at, games_data, localization, description, created_by)
         VALUES (:tid, :tn, 1, :tg, :tp, :fmt, :fga, :gd, :loc, :desc, :cb)
         ON DUPLICATE KEY UPDATE
            tournament_name = VALUES(tournament_name),
            name_overridden = 1,
            total_games     = VALUES(total_games),
            total_players   = VALUES(total_players),
            format          = VALUES(format),
            first_game_at   = VALUES(first_game_at),
            games_data      = VALUES(games_data),
            localization    = VALUES(localization),
            description     = VALUES(description),
            fetched_at      = CURRENT_TIMESTAMP"
    ));
    $stmt->execute([
        ':tid'  => $tournamentId,
        ':tn'   => $tournamentName,
        ':tg'   => 1,
        ':tp'   => count($endGamePlayers),
        ':fmt'  => (string)($data['format'] ?? ''),
        ':fga'  => trToDateTime((string)($data['date'] ?? '')),
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

/**
 * Update the display name of a tournament.
 */
function trUpdateTournamentName(string $tournamentExtId, string $name): void
{
    global $db;
    // Flagged as overridden so the hourly sync stops overwriting it — see
    // TR_KEEP_NAME_SQL. Clearing the name hands control back to the API.
    $stmt = $db->prepare(qp(
        "UPDATE {tournaments} SET tournament_name = :tn, name_overridden = :ov WHERE tournament_id = :tid"
    ));
    $stmt->execute([
        ':tn'  => $name,
        ':ov'  => trim($name) === '' ? 0 : 1,
        ':tid' => $tournamentExtId,
    ]);
}

/* ── Settings ─────────────────────────────────────────────────────────────── */

/**
 * Read one plugin setting, or $default when it has never been written.
 */
function trGetSetting(string $key, string $default = ''): string
{
    global $db;
    $stmt = $db->prepare(qp("SELECT value FROM {settings} WHERE `key` = :k"));
    $stmt->execute([':k' => $key]);
    $value = $stmt->fetchColumn();
    return $value === false || $value === null ? $default : (string)$value;
}

/**
 * Write one plugin setting.
 */
function trSaveSetting(string $key, string $value): void
{
    global $db;
    $db->prepare(qp(
        "INSERT INTO {settings} (`key`, value) VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE value = :v2"
    ))->execute([':k' => $key, ':v' => $value, ':v2' => $value]);
}

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
 * Return the API key used to authenticate with the tournament API.
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
 * Save the API key.
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

/**
 * Fetch tournament data from the external API.
 *
 * @return array{ok: bool, data?: array, error?: string}
 */
function trFetchTournament(string $tournamentId): array
{
    // The API resolves whichever id it is given to its parent tournament and
    // answers with every stage, so passing a stage id here is harmless.
    return trApiGet('/api/tournament-report', ['tournamentParentId' => $tournamentId]);
}

/**
 * Fetch the tournament index: every tournament the API holds a report for,
 * with its name, counts and version — and none of its games.
 *
 * Cheap enough to call on a schedule; it is what tells us which tournaments
 * exist and which of our stored copies have gone stale.
 *
 * @return array{ok: bool, data?: array, error?: string}
 */
function trFetchTournamentIndex(): array
{
    return trApiGet('/api/tournament-reports');
}

/**
 * GET a JSON document from the tournament API.
 *
 * @param string $path  Path starting with '/'.
 * @param array<string, string|int> $query  Query params; the API key is added here.
 * @return array{ok: bool, data?: array, error?: string}
 */
function trApiGet(string $path, array $query = []): array
{
    $apiUrl = trGetApiUrl();
    if ($apiUrl === '') {
        return ['ok' => false, 'error' => 'Tournament API URL is not configured.'];
    }

    $apiKey = trGetApiKey();
    if ($apiKey === '') {
        return ['ok' => false, 'error' => 'Tournament API key is not configured.'];
    }

    $url = $apiUrl . $path . '?' . http_build_query($query + ['apiKey' => $apiKey]);
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    $logUrl = preg_replace('/apiKey=[^&]+/', 'apiKey=REDACTED', $url);
    error_log('[tournament-reports] GET ' . $logUrl . ' -> HTTP ' . $code . ($curlErr !== '' ? ' — ' . $curlErr : ''));

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

/* ── Sync ─────────────────────────────────────────────────────────────────── */

/** Documents downloaded in one sync run, so a first sync over a long history can't hang a page render. */
const TR_SYNC_MAX_DOCUMENTS = 5;

/** Wall-clock budget (seconds) for downloading documents in one run — the same guard from the other side. */
const TR_SYNC_TIME_BUDGET = 8.0;

/** How soon to come back when a run left work behind, instead of waiting a full interval. */
const TR_SYNC_RETRY_SECONDS = 60;

/**
 * Bring the local tournament list and reports in line with the API.
 *
 * One cheap call to the index gives every tournament with its version; a
 * tournament whose stored `api_version` already matches is left completely
 * alone, so a steady state costs exactly one HTTP request. Only the ones that
 * moved (and the ones never downloaded) have their document re-fetched, a few
 * per run.
 *
 * @return array{ok: bool, error?: string, listed?: int, fetched?: int, pending?: int, errors?: array<string>}
 */
function trSyncTournaments(
    int $createdBy = 0,
    int $maxDocuments = TR_SYNC_MAX_DOCUMENTS,
    float $timeBudget = TR_SYNC_TIME_BUDGET
): array {
    global $db;

    // Stamped before anything is fetched: a slow or failing run must not leave
    // every subsequent page render starting a sync of its own.
    trSaveSetting('last_sync_at', gmdate('Y-m-d H:i:s'));
    trSaveSetting('sync_pending', '0');

    $index = trFetchTournamentIndex();
    if (!$index['ok']) {
        return ['ok' => false, 'error' => $index['error'] ?? 'Unknown error'];
    }

    $stored = [];
    foreach ($db->query(qp("SELECT tournament_id, api_version FROM {tournaments}"))->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $stored[(string)$row['tournament_id']] = (int)$row['api_version'];
    }

    // A non-positive budget means "take as long as it takes" — what an
    // admin-triggered or cron-triggered run wants.
    $deadline = $timeBudget > 0 ? microtime(true) + $timeBudget : INF;
    $listed = 0;
    $fetched = 0;
    $pending = 0;
    $errors = [];

    foreach ((array)($index['data']['tournaments'] ?? []) as $entry) {
        $tournamentId = (string)($entry['tournamentParentId'] ?? '');
        if ($tournamentId === '') continue;

        trSaveTournamentIndexEntry($entry, $createdBy);
        $listed++;

        // api_version is only ever written by trSaveTournament, so equality
        // here means we hold that exact document — nothing to download.
        if (($stored[$tournamentId] ?? -1) === (int)($entry['version'] ?? 0)) {
            continue;
        }

        if ($fetched >= $maxDocuments || microtime(true) > $deadline) {
            $pending++;
            continue;
        }

        $result = trFetchAndStoreTournament($tournamentId, $createdBy);
        if ($result['ok']) {
            $fetched++;
        } else {
            $errors[] = $tournamentId . ': ' . ($result['error'] ?? 'unknown error');
        }
    }

    if ($pending > 0) {
        trSaveSetting('sync_pending', '1');
    }

    return [
        'ok'      => true,
        'listed'  => $listed,
        'fetched' => $fetched,
        'pending' => $pending,
        'errors'  => $errors,
    ];
}

/**
 * Run a sync if one is due. Safe to call at the top of any page.
 *
 * There is no job runner on this site, so the schedule rides on visitor
 * traffic: the first render after the interval has elapsed pays for a sync,
 * every other render pays nothing. `bin/sync.php` does the same thing from a
 * real cron if one is ever wired up, and the two can coexist — whichever runs
 * first pushes the next one out.
 */
function trAutoSyncTournaments(int $createdBy = 0): void
{
    $interval = (int)trGetSetting('sync_interval', '3600');
    if ($interval <= 0) return;

    $last = strtotime((string)trGetSetting('last_sync_at', '') . ' UTC');
    if ($last === false) $last = 0;

    // A run that hit its per-run cap left work behind: come back for it in a
    // minute rather than in an hour, so a first sync over a long history
    // drains in minutes instead of days.
    $due = trGetSetting('sync_pending', '0') === '1' ? TR_SYNC_RETRY_SECONDS : $interval;
    if (time() - $last < $due) return;

    trSyncTournaments($createdBy);
}

/**
 * Human-readable summary of a trSyncTournaments() result, for flash messages.
 */
function trSyncSummary(array $result): string
{
    if (!($result['ok'] ?? false)) {
        return (string)($result['error'] ?? 'Unknown error');
    }

    $summary = sprintf(
        '%d tournament(s) listed, %d report(s) updated',
        (int)($result['listed'] ?? 0),
        (int)($result['fetched'] ?? 0)
    );
    if (!empty($result['pending'])) {
        $summary .= sprintf(', %d still queued', (int)$result['pending']);
    }
    if (!empty($result['errors'])) {
        $summary .= ' — ' . implode(' · ', $result['errors']);
    }
    return $summary;
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
 * Compute win/loss standings from tournament games_data.
 *
 * A game's winner is read from `game['winner']['userId']`. A game without a
 * recorded winner counts toward `games_played` but neither as a win nor a loss.
 *
 * @param array $gamesData Decoded tournament payload (or its `games` list).
 * @return array<int, array{id: string, name: string, faction: string, games_played: int, wins: int, losses: int, ratio: string}>
 */
function trComputeStandings(array $gamesData): array
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
        $ra = $a['wins'] + $a['losses'] > 0 ? $a['wins'] / ($a['wins'] + $a['losses']) : 1;
        $rb = $b['wins'] + $b['losses'] > 0 ? $b['wins'] / ($b['wins'] + $b['losses']) : 1;
        if ($rb !== $ra) return $rb <=> $ra;
        return strcmp($a['name'], $b['name']);
    });

    return array_values($standings);
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
