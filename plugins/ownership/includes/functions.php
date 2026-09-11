<?php
// Server-to-server proxy helpers for the AlteredOwnership API (OWNERSHIP_API_URL).
// Self-contained (does not depend on core-altered-cards being active) — mirrors
// collApiRequest() in plugins/core-altered-cards/includes/functions.php.

/**
 * Authenticated GET/POST against OWNERSHIP_API_URL, decoded JSON on success.
 *
 * @return array|true|false Decoded JSON array, true on 204 No Content, false on error.
 */
function ownApiRequest(string $method, string $path, int $userId, $body = null) {
    [, $raw] = ownApiRequestRaw($method, $path, $userId, $body);
    if ($raw === null) return false;
    if ($raw === '') return true;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : false;
}

/**
 * Same call, but returns [statusCode, rawBody] (rawBody null on transport error) instead
 * of collapsing every 4xx/5xx into `false` — needed where the upstream error message
 * itself must reach the browser (e.g. booster-open's 409/404 plain-text bodies).
 *
 * @return array{0:int,1:?string}
 */
function ownApiRequestRaw(string $method, string $path, int $userId, $body = null): array {
    if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) return [0, null];

    require_once dirname(__DIR__, 3) . '/includes/func.keycloak.php';
    $token = kc_get_access_token($userId);
    if (!$token) return [0, null];

    $headers = [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
    }

    $ch = curl_init(rtrim(OWNERSHIP_API_URL, '/') . $path);
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

    if ($err || $raw === false) return [0, null];
    return [$code, $raw];
}

/**
 * Total unopened-booster count for the sub-nav badge. Returns null when the API is
 * unreachable/unconfigured so callers can hide the badge instead of showing "0".
 */
function ownGetBoosterCount(int $userId): ?int {
    $data = ownApiRequest('GET', '/api/boosters', $userId);
    if (!is_array($data)) return null;
    $total = 0;
    foreach ($data as $b) {
        $total += (int)($b['quantity'] ?? 0);
    }
    return $total;
}
