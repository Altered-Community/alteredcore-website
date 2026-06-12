<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/functions.php';
if (session_status() === PHP_SESSION_NONE) session_start();

$secure = request_is_https();

// Signal logout to all installations on the same domain
setcookie('ac_global_logout', (string)time(), [
    'expires'  => time() + 30 * 86400,
    'path'     => '/',
    'secure'   => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);

$userId = (int)($_SESSION['user_id'] ?? 0);

// Destroy session: clear data, remove server-side file, expire browser cookie
session_unset();
$_params = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires'  => time() - 3600,
    'path'     => $_params['path'],
    'domain'   => $_params['domain'] ?? '',
    'secure'   => $_params['secure'],
    'httponly' => $_params['httponly'],
    'samesite' => 'Lax',
]);
session_destroy();

// Expire the remember cookie in the browser (all possible paths)
foreach (['/', BASE_URL . '/'] as $_p) {
    setcookie('local_remember', '', [
        'expires'  => time() - 3600,
        'path'     => $_p,
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

// Null the remember token in DB for this user so localRestoreSession() cannot re-login.
// Also null it for ALL users sharing the same browser session (belt-and-suspenders):
// the cookie value is unknown post-destroy, so we target the known userId only.
if ($userId > 0) {
    try {
        getDB()->prepare(q("UPDATE {users} SET local_remember_token = NULL, local_remember_expiry = NULL WHERE id = :id"))
               ->execute([':id' => $userId]);
    } catch (Throwable $e) {}
}

header('Location: ' . BASE_URL . '/');
exit;
