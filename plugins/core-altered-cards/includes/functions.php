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
 * Normalize a card reference for CDN image lookups. Mirrors the client-side
 * normalizeRef()/normalizeHeroRef() helpers in decks.php and deckbuilder.php:
 * promo prints (segment 2 === 'P') fall back to the base booster art ('B'),
 * and BISE-set refs (segment 1 === 'BISE') map to CORE.
 */
function normalizeCardRef(string $ref): string {
    $p = explode('_', $ref);
    if (($p[2] ?? null) === 'P')    $p[2] = 'B';
    if (($p[1] ?? null) === 'BISE') $p[1] = 'CORE';
    return implode('_', $p);
}

function deckApiToken(): ?string {
    if (!kcIsLoggedIn()) return null;
    $userId = (int)($_SESSION['user_id'] ?? 0);
    if (!$userId) return null;
    require_once dirname(dirname(dirname(__DIR__))) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    return $token ?: null;
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

/**
 * Starter deck contest entries from bundled JSON (no Decks API).
 *
 * @return array<int, array<string, mixed>>
 */
function cacLoadContestDecksFromJsonFile(string $path): array
{
    $data = json_decode(file_get_contents($path), true);
    $decks = [];
    foreach ($data['decks'] as $entry) {
        $stats = $entry['stats'];
        $stats['totalCards'] = 39;
        $decks[] = [
            'id'       => $entry['id'],
            'name'     => $entry['name'],
            'winner'   => !empty($entry['winner']),
            'format'   => 'nuc',
            'isPublic' => true,
            'isDraft'  => false,
            'legal'    => true,
            'stats'    => $stats,
        ];
    }

    return $decks;
}
