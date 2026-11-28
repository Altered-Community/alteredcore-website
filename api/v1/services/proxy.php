<?php
// /api/v1/services/{service}/{path} — same-origin relay from front-end plugins to the
// authenticated Altered services (decks, collection, ownership). Rewritten by .htaccess with
// ?_service=&_path= (the client's query string is read from REQUEST_URI).
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
// The upstream content type is passed through: if a service ever answers HTML, it must not run
// as a page of the site's origin (same-origin XSS with the user's session).
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; sandbox");

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
$isLoggedIn = kcIsLoggedIn();
$userId = $isLoggedIn && $kcMode ? (int)($_SESSION['user_id'] ?? 0) : 0;
$authExpired = $kcMode && !$isLoggedIn;

// The client's query string, untouched: rebuilding it from $_GET would rename top-level keys
// with dots or spaces (a.b → a_b) and keep only the last of repeated keys.
$query = (string)parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY);
$url = rtrim($services[$service], '/') . '/' . $path . ($query !== '' ? '?' . $query : '');

$forward = [];
foreach (['HTTP_ACCEPT' => 'Accept', 'CONTENT_TYPE' => 'Content-Type', 'HTTP_ACCEPT_LANGUAGE' => 'Accept-Language'] as $key => $name) {
    if (!empty($_SERVER[$key])) $forward[] = $name . ': ' . $_SERVER[$key];
}

// Guest requests ($userId === 0) are forwarded anonymously without a token; signed-in requests
// pass $userId so AcServiceClient handles session_write_close() and single 401 refresh-retry.
$req = new AcHttpRequest(
    $method,
    $url,
    $forward,
    $method === 'GET' ? null : $body,
    20,
    5,
    false,
    $userId > 0 ? $userId : null
);
$res = acServiceRequest($req);

if ($res->isUnreachable()) {
    if ($res->status === 401 && $res->authExpired) {
        // Signed-in user whose refresh token could not be renewed before calling upstream.
        header('X-Ac-Auth-State: unauthenticated');
        serviceProxyReply(401, ['error' => 'unauthenticated']);
    }
    serviceProxyReply(502, ['error' => 'service_unreachable', 'service' => $service]);
}

// Signal expired/absent session on 401 when no valid token backed the request so the shell UI can flip to guest.
if ($res->status === 401 && ($authExpired || $res->authExpired || $userId === 0)) {
    header('X-Ac-Auth-State: unauthenticated');
}
require_once dirname(__DIR__, 3) . '/includes/json-gzip.php';
jsonGzipStart();
http_response_code($res->status);
header('Content-Type: ' . ($res->contentType !== '' ? $res->contentType : 'application/json'));
echo (string)$res->body;
