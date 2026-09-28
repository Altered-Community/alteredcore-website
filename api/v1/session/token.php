<?php
// POST /api/v1/session/token — the Keycloak access token of the current PHP session,
// for front-end plugins that call the Altered services directly (Authorization: Bearer).
//
// The shell stays the only holder of the client secret and the refresh token: this
// endpoint returns a short-lived access token only, refreshing it server-side when needed
// (kc_get_access_token). Same-origin only: no CORS headers, POST + X-CSRF-Token header.
//
// 200 {"access_token": "...", "token_type": "Bearer", "expires_at": 1767225600}
// 200 {"access_token": null, "reason": "local_auth"}  logged in without Keycloak (no JWT)
// 401 {"error": "not_authenticated" | "token_unavailable"}
// 403 {"error": "csrf"} · 405 {"error": "method_not_allowed"}
require_once dirname(__DIR__, 3) . '/config.php';
require_once dirname(__DIR__, 3) . '/includes/functions.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');

function sessionTokenReply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    sessionTokenReply(405, ['error' => 'method_not_allowed']);
}

if (session_status() === PHP_SESSION_NONE) session_start();

if (!csrfValid($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
    sessionTokenReply(403, ['error' => 'csrf']);
}

if (!kcIsLoggedIn()) {
    session_write_close();
    sessionTokenReply(401, ['error' => 'not_authenticated']);
}

if (!defined('KC_URL') || KC_URL === '') {
    session_write_close();
    sessionTokenReply(200, ['access_token' => null, 'reason' => 'local_auth']);
}

$token = kc_get_access_token((int)($_SESSION['user_id'] ?? 0));
$exp   = (int)($_SESSION['kc_access_token_exp'] ?? 0);
session_write_close();

if (!$token) {
    sessionTokenReply(401, ['error' => 'token_unavailable']);
}

sessionTokenReply(200, ['access_token' => $token, 'token_type' => 'Bearer', 'expires_at' => $exp]);
