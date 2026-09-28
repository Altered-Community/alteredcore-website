<?php
// /api/v1/services/{service}/{path} — same-origin relay from front-end plugins to the
// authenticated Altered services (decks, collection). Rewritten by .htaccess with
// ?_service=&_path=.
//
// The browser never holds a Keycloak token: the relay reads the access token from the PHP
// session (kc_get_access_token refreshes it server-side) and adds `Authorization: Bearer`.
// Public services (cards, CDN) are called directly by plugins and are not relayed.
//
//   GET    /api/v1/services/decks/api/decks?itemsPerPage=10   → {DECKS_API_URL}/api/decks?itemsPerPage=10
//   PATCH  /api/v1/services/decks/api/decks/{id}               (header X-CSRF-Token required)
//
// Rules: only listed services; paths under `api/` made of [A-Za-z0-9._~-] segments; writes need the
// session's CSRF token; cookies are never forwarded; a guest is relayed without a token (public
// endpoints still answer). 404 unknown service · 400 bad path · 403 csrf · 413 body too large ·
// 502 service unreachable. Otherwise the service's status and body are returned as is.
require_once dirname(__DIR__, 3) . '/config.php';
require_once dirname(__DIR__, 3) . '/includes/functions.php';

const SERVICE_PROXY_MAX_BODY = 1048576; // 1 MB: deck payloads are a few KB

function serviceProxyReply(int $status, array $body): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

$service  = preg_replace('/[^a-z0-9-]/', '', (string)($_GET['_service'] ?? ''));
$path     = (string)($_GET['_path'] ?? '');
$services = spaProxyServices();
if (!isset($services[$service])) serviceProxyReply(404, ['error' => 'unknown_service']);

// Strict segments: letters, digits, `._~-` only, never `.` / `..`. No `%` either, so an
// (double-)encoded `..` or `/` cannot reach the service and be decoded there.
$segments = explode('/', $path);
$pathOk = $segments[0] === 'api' && count($segments) > 1;
foreach ($segments as $seg) {
    if (!preg_match('/^[A-Za-z0-9._~-]+$/', $seg) || $seg === '.' || $seg === '..') { $pathOk = false; break; }
}
if (!$pathOk) serviceProxyReply(400, ['error' => 'bad_path']);

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if (!in_array($method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    header('Allow: GET, POST, PUT, PATCH, DELETE');
    serviceProxyReply(405, ['error' => 'method_not_allowed']);
}

if (session_status() === PHP_SESSION_NONE) session_start();
if ($method !== 'GET' && !csrfValid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
    session_write_close();
    serviceProxyReply(403, ['error' => 'csrf']);
}

$body = $method === 'GET' ? '' : (string)file_get_contents('php://input', false, null, 0, SERVICE_PROXY_MAX_BODY + 1);
if (strlen($body) > SERVICE_PROXY_MAX_BODY) serviceProxyReply(413, ['error' => 'body_too_large']);

$kcMode = defined('KC_URL') && KC_URL !== '';
$userId = kcIsLoggedIn() && $kcMode ? (int)($_SESSION['user_id'] ?? 0) : 0;

/** Access token of the session; with $renew, drops the cached one first (after a 401). */
function serviceProxyToken(int $userId, bool $renew = false) {
    if ($userId <= 0) return null;
    if ($renew) unset($_SESSION['kc_access_token'], $_SESSION['kc_access_token_exp']);
    return kc_get_access_token($userId) ?: null;
}

$query = $_GET;
unset($query['_service'], $query['_path']);
$url = rtrim($services[$service], '/') . '/' . $path . ($query ? '?' . http_build_query($query) : '');

$forward = [];
foreach (['HTTP_ACCEPT' => 'Accept', 'CONTENT_TYPE' => 'Content-Type', 'HTTP_ACCEPT_LANGUAGE' => 'Accept-Language'] as $key => $name) {
    if (!empty($_SERVER[$key])) $forward[] = $name . ': ' . $_SERVER[$key];
}

/** One upstream call. Returns [status, content type, body] or null when unreachable. */
function serviceProxySend(string $method, string $url, array $headers, string $body, ?string $token): ?array {
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_ENCODING       => '',
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    ]);
    if ($method !== 'GET') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $out = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    return $out === false || $status === 0 ? null : [$status, $type, (string)$out];
}

// Release the session lock during the upstream call (concurrent requests of the same user).
$token = serviceProxyToken($userId);
session_write_close();
$res = serviceProxySend($method, $url, $forward, $body, $token);
// A token can be rejected before its expiry (revoked, clock skew): renew once and retry.
if ($res !== null && $res[0] === 401 && $token !== null) {
    session_start();
    $token = serviceProxyToken($userId, true);
    session_write_close();
    if ($token !== null) $res = serviceProxySend($method, $url, $forward, $body, $token);
}

if ($res === null) serviceProxyReply(502, ['error' => 'service_unreachable', 'service' => $service]);
[$status, $type, $out] = $res;
http_response_code($status);
header('Content-Type: ' . ($type !== '' ? $type : 'application/json'));
echo $out;
