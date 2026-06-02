<?php
// Card/collection helpers for the core-altered-cards plugin.
// Required by plugin pages and the collection-search API endpoint.

function loadSearchSettings(): array {
    static $cfg = null;
    if ($cfg === null) {
        $file = dirname(__DIR__) . '/data/search_settings.json';
        if (!file_exists($file)) { $cfg = []; return []; }
        $raw = file_get_contents($file);
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) $raw = substr($raw, 3);
        $cfg = json_decode($raw, true) ?? [];
    }
    return $cfg;
}

function loadAlteredData(string $name): array {
    static $all = null;
    if ($all === null) {
        $file = dirname(__DIR__) . '/data/altered.json';
        if (!file_exists($file)) { $all = []; return []; }
        $raw = file_get_contents($file);
        // Strip UTF-8 BOM added by some Windows editors
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) $raw = substr($raw, 3);
        $all = json_decode($raw, true) ?? [];
    }
    return $all[$name] ?? [];
}

/**
 * Extract a deck UUID from a site deck URL or bare id string.
 */
function parseDeckPageId(string $urlOrId): ?string
{
    $s = trim($urlOrId);
    if ($s === '') {
        return null;
    }
    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $s)) {
        return $s;
    }
    if (preg_match('/[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i', $s, $m)) {
        return $m[1];
    }
    if (preg_match('/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i', $s, $m)) {
        return $m[1];
    }

    return null;
}

/**
 * Deck UUIDs from a contest CSV: Nom du deck, URL, optional Winner (1/yes/y/true).
 *
 * @param string|null $filter null = all rows; 'winners' = rows with Winner set
 * @return string[]
 */
function cacLoadDeckIdsFromCsvFile(string $path, ?string $filter = null): array
{
    if (!is_file($path)) {
        return [];
    }
    $fh = fopen($path, 'r');
    if ($fh === false) {
        return [];
    }
    $winnerOnly = $filter === 'winners';
    $ids        = [];
    $seen       = [];
    $first      = true;
    while (($row = fgetcsv($fh)) !== false) {
        if ($first) {
            $first = false;
            if (count($row) >= 2 && stripos(trim((string) $row[1]), 'http') !== 0) {
                continue;
            }
        }
        if (count($row) < 2) {
            continue;
        }
        $url = trim((string) $row[1]);
        if ($url === '' || stripos($url, 'http') !== 0) {
            continue;
        }
        $isWinner = false;
        if (isset($row[2])) {
            $isWinner = in_array(strtolower(trim((string) $row[2])), ['1', 'yes', 'y', 'true', 'winner'], true);
        }
        if ($winnerOnly && !$isWinner) {
            continue;
        }
        $id = parseDeckPageId($url);
        if ($id === null || isset($seen[$id])) {
            continue;
        }
        $seen[$id] = true;
        $ids[]     = $id;
    }
    fclose($fh);

    return $ids;
}

function cacUsesKeycloakForDeckApi(): bool
{
    return defined('KC_URL') && KC_URL !== '';
}

function deckApiToken(): ?string
{
    if (!kcIsLoggedIn() || !cacUsesKeycloakForDeckApi()) {
        return null;
    }
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    if (!$userId) {
        return null;
    }
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if ($token) {
        return $token;
    }
    // Fallback: session token may still work briefly if refresh failed transiently.
    $sessionToken = $_SESSION['kc_access_token'] ?? '';
    return $sessionToken !== '' ? $sessionToken : null;
}

/**
 * Toggle upvote on a public deck (POST /api/decks/{id}/upvote).
 *
 * @return array{upvoteCount: int, hasUpvoted: bool}|null
 */
function cacDeckApiUpvote(string $deckId, string $token): ?array
{
    $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId) . '/upvote');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS     => '{}',
        CURLOPT_TIMEOUT        => 15,
    ]);
    $raw  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300) {
        return null;
    }

    if ($raw) {
        $data = json_decode($raw, true);
        if (is_array($data)) {
            if (array_key_exists('upvoteCount', $data) || array_key_exists('hasUpvoted', $data)) {
                return [
                    'upvoteCount' => (int) ($data['upvoteCount'] ?? 0),
                    'hasUpvoted'  => !empty($data['hasUpvoted']),
                ];
            }
        }
    }

    return cacDeckApiUpvoteState($deckId, $token);
}

/**
 * Read upvoteCount / hasUpvoted from a single deck (after toggle or on load).
 *
 * @return array{upvoteCount: int, hasUpvoted: bool}|null
 */
function cacDeckApiUpvoteState(string $deckId, string $token): ?array
{
    $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $raw  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300 || !$raw) {
        return null;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return null;
    }

    return [
        'upvoteCount' => (int) ($data['upvoteCount'] ?? 0),
        'hasUpvoted'  => !empty($data['hasUpvoted']),
    ];
}

/**
 * Make an authenticated request to the collection API.
 *
 * @param string     $apiUrl      Base URL (no trailing slash)
 * @param string     $method      GET | POST | PATCH | DELETE
 * @param string     $path        Path with leading slash, e.g. '/api/collection'
 * @param int        $userId      Used to retrieve the Keycloak access token
 * @param array|null $body        Data for POST/PATCH (encoded as JSON automatically)
 * @param string     $contentType Content-Type for body (default: application/json)
 * @return array|true|false  Decoded JSON array, true on 204 No Content, false on error
 */
function collApiRequest(string $apiUrl, string $method, string $path, int $userId, $body = null, string $contentType = 'application/json') {
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) return false;

    $headers = [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: ' . $contentType;
    }

    $ch = curl_init($apiUrl . $path);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
        CURLOPT_CUSTOMREQUEST  => $method,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);

    $raw  = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_errno($ch);
    curl_close($ch);

    if ($err || $code >= 400) return false;
    if ($code === 204) return true;
    if ($raw === false || $raw === '') return false;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : false;
}

/**
 * Returns the user's collection, session-cached for 5 minutes.
 *
 * @param string $apiUrl  Collection API base URL
 * @param int    $userId
 * @return array{collection: array<string,int>, entries: array<string,int>}
 */
function collGetUserCollection(string $apiUrl, int $userId): array {
    if (session_status() === PHP_SESSION_NONE) session_start();

    $cacheKey = '_coll_' . $userId;
    $tsKey    = '_coll_ts_' . $userId;

    if (!empty($_SESSION[$cacheKey]) && isset($_SESSION[$tsKey]) && (time() - (int)$_SESSION[$tsKey]) < 300) {
        return $_SESSION[$cacheKey];
    }

    $collection = [];
    $entries    = [];

    $raw = collApiRequest($apiUrl, 'GET', '/api/collection', $userId);
    if (is_array($raw)) {
        foreach ($raw as $entry) {
            $ref = $entry['cardReference'] ?? '';
            $qty = (int)($entry['quantity'] ?? 0);
            $id  = (int)($entry['id'] ?? 0);
            if ($ref && $qty > 0) {
                $collection[$ref] = $qty;
                $entries[$ref]    = $id;
            }
        }
    }

    $result = ['collection' => $collection, 'entries' => $entries];
    $_SESSION[$cacheKey] = $result;
    $_SESSION[$tsKey]    = time();
    return $result;
}

/**
 * Whether a deck contains at least one of the given card references.
 *
 * @param string[] $refs
 */
function cacDeckContainsCardRefs(array $deck, array $refs): bool
{
    if ($refs === []) {
        return true;
    }
    $cards = $deck['cards'] ?? $deck['deckCards'] ?? [];
    foreach ($cards as $card) {
        if (!is_array($card)) {
            continue;
        }
        $cr = $card['cardReference'] ?? $card['reference'] ?? '';
        if ($cr !== '' && in_array($cr, $refs, true)) {
            return true;
        }
    }

    return false;
}

/**
 * @param array<int, array> $decks
 * @return array<int, array>
 */
function cacSortDecks(array $decks, string $field, string $dir): array
{
    usort($decks, static function ($a, $b) use ($field, $dir) {
        $va = is_array($a) ? ($a[$field] ?? '') : '';
        $vb = is_array($b) ? ($b[$field] ?? '') : '';
        if ($field === 'name') {
            $r = strcasecmp((string) $va, (string) $vb);
        } elseif (in_array($field, ['viewCount', 'upvoteCount'], true)) {
            $r = ((int) $va <=> (int) $vb);
        } else {
            $r = strcmp((string) $va, (string) $vb);
        }

        return $dir === 'desc' ? -$r : $r;
    });

    return $decks;
}

/**
 * Collect all public deck UUIDs matching list filters (paginates the public API).
 *
 * @param array<string, scalar> $filters format, faction, hero, …
 * @return string[]
 */
function cacFetchPublicDeckIds(
    string $apiBase,
    string $publicPath,
    array $filters,
    array $headers,
    string $order = 'updatedAt',
    string $dir = 'desc',
    int $itemsPerPage = 100
): array {
    $ids      = [];
    $page     = 1;
    $lastPage = 1;

    do {
        $params = array_merge($filters, ['page' => $page, 'itemsPerPage' => $itemsPerPage]);
        $url    = $apiBase . $publicPath . '?' . http_build_query($params)
            . '&order[' . rawurlencode($order) . ']=' . rawurlencode($dir);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
        ]);
        $resp = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code < 200 || $code >= 300 || !$resp) {
            break;
        }
        $data = json_decode($resp, true);
        if (!is_array($data)) {
            break;
        }
        foreach ($data['member'] ?? [] as $deck) {
            if (is_array($deck) && !empty($deck['id'])) {
                $ids[] = $deck['id'];
            }
        }
        $lastPage = max(1, (int) ($data['lastPage'] ?? 1));
        $page++;
    } while ($page <= $lastPage);

    return $ids;
}

/**
 * Fetch multiple deck resources from the Decks API in parallel (curl_multi).
 *
 * @param string[] $deckIds  Deck UUIDs (order preserved in the returned list)
 * @param string   $apiBase  DECKS_API_URL without trailing slash
 * @param string[] $headers  curl HTTP headers
 * @param string|null $locale Optional locale query parameter
 * @param int      $concurrency Max simultaneous requests (0 = all at once)
 * @return array<int, array> Decoded deck objects
 */
function cacFetchDecksParallel(array $deckIds, string $apiBase, array $headers = [], ?string $locale = null, int $concurrency = 30): array
{
    if ($deckIds === []) {
        return [];
    }

    $member  = [];
    $seen    = [];
    $chunks  = $concurrency > 0 ? array_chunk($deckIds, $concurrency) : [$deckIds];

    foreach ($chunks as $chunk) {
        $mh      = curl_multi_init();
        $handles = [];
        foreach ($chunk as $i => $deckId) {
            $url = $apiBase . '/api/decks/' . rawurlencode($deckId);
            if ($locale !== null && $locale !== '') {
                $url .= '?locale=' . rawurlencode($locale);
            }
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => $headers,
                CURLOPT_TIMEOUT        => 15,
                CURLOPT_CONNECTTIMEOUT => 5,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$i] = $ch;
        }

        $running = null;
        do {
            curl_multi_exec($mh, $running);
            if ($running > 0) {
                curl_multi_select($mh);
            }
        } while ($running > 0);

        foreach ($handles as $i => $ch) {
            $resp = curl_multi_getcontent($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            if ($code >= 200 && $code < 300 && $resp) {
                $deck = json_decode($resp, true);
                if (is_array($deck) && !empty($deck['id']) && !isset($seen[$deck['id']])) {
                    $seen[$deck['id']] = true;
                    $member[] = $deck;
                }
            }
        }
        curl_multi_close($mh);
    }

    return $member;
}

/**
 * Formats API violation objects into a human-readable string.
 * Used when an API returns a 422 response with a "violations" array.
 */
function formatApiViolations(array $violations): string {
    return implode(' — ', array_map(
        function ($v) { return ($v['propertyPath'] ? $v['propertyPath'] . ': ' : '') . ($v['message'] ?? ''); },
        $violations
    ));
}

/**
 * Execute multiple collection API requests in parallel using curl_multi.
 *
 * @param string $apiUrl  Base URL (no trailing slash)
 * @param array  $reqs    Each item: ['method'=>'...', 'path'=>'...', 'body'=>[...], 'contentType'=>'...']
 * @param int    $userId  Used to retrieve the Keycloak access token
 * @return array  Results indexed by request order (same format as collApiRequest)
 */
function collApiMultiRequest(string $apiUrl, array $reqs, int $userId): array {
    if (empty($reqs)) return [];
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) return array_fill(0, count($reqs), false);

    $baseHeaders = ['Authorization: Bearer ' . $token, 'Accept: application/json'];

    $mh      = curl_multi_init();
    $handles = [];
    foreach ($reqs as $i => $req) {
        $body    = $req['body'] ?? null;
        $headers = $baseHeaders;
        if ($body !== null) $headers[] = 'Content-Type: ' . ($req['contentType'] ?? 'application/json');
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_USERAGENT      => 'alteredcore.org/1.0',
            CURLOPT_CUSTOMREQUEST  => $req['method'],
        ];
        if ($body !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
        $ch = curl_init($apiUrl . $req['path']);
        curl_setopt_array($ch, $opts);
        curl_multi_add_handle($mh, $ch);
        $handles[$i] = $ch;
    }

    $running = null;
    do { curl_multi_exec($mh, $running); curl_multi_select($mh); } while ($running > 0);

    $results = [];
    foreach ($handles as $i => $ch) {
        $raw  = curl_multi_getcontent($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_errno($ch);
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
        if ($err) { $results[$i] = false; continue; }
        if ($code === 204) { $results[$i] = true; continue; }
        if (!$raw) { $results[$i] = false; continue; }
        $decoded = json_decode($raw, true);
        $results[$i] = is_array($decoded) ? $decoded : false;
    }
    curl_multi_close($mh);
    return $results;
}
