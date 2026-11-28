<?php
// Server-to-server proxy helpers for the AlteredOwnership API (OWNERSHIP_API_URL).
// Delegates transport, session lock discipline, and single 401 token refresh to AcServiceClient.

require_once dirname(__DIR__, 3) . '/includes/service-client.php';

/**
 * Authenticated GET/POST against OWNERSHIP_API_URL, decoded JSON on success.
 *
 * @return array|true|false Decoded JSON array, true on 204 No Content / empty 2xx, false on error.
 */
function ownApiRequest(string $method, string $path, int $userId, $body = null) {
    [$code, $raw] = ownApiRequestRaw($method, $path, $userId, $body);
    if ($code === 0 || $code >= 400 || $raw === null) return false;
    if ($code === 204 || $raw === '') return true;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : false;
}

/**
 * Same call, returning [statusCode, rawBody] (rawBody null on transport error) so callers can
 * forward upstream 404/409 error bodies verbatim (e.g. booster-open).
 *
 * @return array{0:int,1:?string}
 */
function ownApiRequestRaw(string $method, string $path, int $userId, $body = null): array {
    if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) return [0, null];
    $url = rtrim(OWNERSHIP_API_URL, '/') . $path;
    $res = acServiceRequest(AcHttpRequest::json($method, $url, $body, $userId));
    return [$res->status, $res->body];
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
