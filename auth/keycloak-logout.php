<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/func.keycloak.php';
if (session_status() === PHP_SESSION_NONE) session_start();

// Signal logout to all installations on the same domain
$secure = request_is_https();
setcookie('ac_global_logout', (string)time(), [
    'expires'  => time() + 30 * 86400,
    'path'     => '/',
    'secure'   => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);

$idToken = $_SESSION['kc_id_token'] ?? '';
$userId  = (int)($_SESSION['user_id'] ?? 0);

// If the PHP session was GC'd, recover userId from the remember cookie
// so the DB refresh token can still be nulled below.
if ($userId === 0 && !empty($_COOKIE['kc_remember'])) {
    $decoded = kc_decrypt($_COOKIE['kc_remember']);
    if ($decoded) {
        $cookieData = json_decode($decoded, true);
        if (!empty($cookieData['uid'])) {
            $userId = (int)$cookieData['uid'];
        }
    }
}

// Destroy PHP session
session_destroy();

// Clear the remember cookie
setcookie('kc_remember', '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);

// Null the refresh token in DB so kc_restore_session() cannot silently re-login.
// kcIsLoggedIn() checks this field on every request — nulling it invalidates all
// concurrent sessions for this user immediately.
// Fresh PDO inside try/catch so a DB failure never aborts the logout flow above.
if ($userId > 0) {
    try {
        getDB()->prepare(q("UPDATE {users} SET kc_refresh_token = NULL, kc_token_expiry = 0 WHERE id = :id"))
               ->execute([':id' => $userId]);
    } catch (Throwable $e) {}
}

$scheme     = $secure ? 'https' : 'http';
$postLogout = $scheme . '://' . $_SERVER['HTTP_HOST'] . BASE_URL . '/';

$params = http_build_query([
    'post_logout_redirect_uri' => $postLogout,
    'client_id'                => KC_CLIENT_ID,
]);
if ($idToken) {
    $params .= '&id_token_hint=' . urlencode($idToken);
}

header('Location: ' . KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/logout?' . $params);
exit;
