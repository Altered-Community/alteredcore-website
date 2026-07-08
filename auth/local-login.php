<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/functions.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . BASE_URL . '/pages/login');
    exit;
}

if (!csrfValid($_POST['csrf_token'] ?? '')) {
    flash('Invalid form token.', 'danger');
    header('Location: ' . BASE_URL . '/pages/login');
    exit;
}

$identifier = trim($_POST['identifier'] ?? '');
$password   = $_POST['password'] ?? '';
$remember   = !empty($_POST['remember_me']);

if ($identifier === '' || $password === '') {
    flash('Please fill in all fields.', 'danger');
    header('Location: ' . BASE_URL . '/pages/login');
    exit;
}

$db = getDB();

// Check super admin account first (admin_username + admin_password_hash)
$stmt = $db->prepare(q(
    "SELECT id, admin_password_hash FROM {users}
     WHERE admin_username = :id AND admin_password_hash IS NOT NULL
     LIMIT 1"
));
$stmt->execute([':id' => $identifier]);
$adminUser = $stmt->fetch();

if ($adminUser && password_verify($password, $adminUser['admin_password_hash'])) {
    if (password_needs_rehash($adminUser['admin_password_hash'], PASSWORD_BCRYPT)) {
        $db->prepare(q("UPDATE {users} SET admin_password_hash = :h WHERE id = :id"))
           ->execute([':h' => password_hash($password, PASSWORD_BCRYPT), ':id' => $adminUser['id']]);
    }
    $returnUrl = $_SESSION['kc_return_url'] ?? BASE_URL . '/';
    clearAuthSession();
    session_regenerate_id(true);
    $_SESSION['admin_logged_in']    = true;
    $_SESSION['admin_logged_in_at'] = time();
    $_SESSION['admin_username']     = $identifier;
    $_SESSION['local_logged_in']    = true;
    $_SESSION['local_logged_in_at'] = time();
    $_SESSION['user_id']            = (int)$adminUser['id'];
    header('Location: ' . $returnUrl);
    exit;
}

// Check regular local account (email or username + local_password_hash)
$stmt = $db->prepare(q(
    "SELECT id, email, username, local_password_hash
     FROM {users}
     WHERE (email = :id1 OR username = :id2) AND local_password_hash IS NOT NULL
     LIMIT 1"
));
$stmt->execute([':id1' => $identifier, ':id2' => $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['local_password_hash'])) {
    flash('Incorrect credentials.', 'danger');
    header('Location: ' . BASE_URL . '/pages/login');
    exit;
}

if (password_needs_rehash($user['local_password_hash'], PASSWORD_BCRYPT)) {
    $db->prepare(q("UPDATE {users} SET local_password_hash = :h WHERE id = :id"))
       ->execute([':h' => password_hash($password, PASSWORD_BCRYPT), ':id' => $user['id']]);
}

if ($remember) {
    $token  = bin2hex(random_bytes(32));
    $expiry = time() + SESSION_LIFETIME_DAYS * 86400;
    $db->prepare(q("UPDATE {users} SET local_remember_token = :tok, local_remember_expiry = :exp WHERE id = :id"))
       ->execute([':tok' => $token, ':exp' => $expiry, ':id' => $user['id']]);
    $secure = request_is_https();
    setcookie('local_remember', $token, [
        'expires'  => $expiry,
        'path'     => '/',
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

$returnUrl = $_SESSION['kc_return_url'] ?? BASE_URL . '/';
clearAuthSession();
session_regenerate_id(true);

$_SESSION['local_logged_in']    = true;
$_SESSION['local_logged_in_at'] = time();
$_SESSION['user_id']            = (int)$user['id'];
$_SESSION['local_email']        = $user['email']    ?? '';
$_SESSION['local_username']     = $user['username'] ?? '';

header('Location: ' . $returnUrl);
exit;
