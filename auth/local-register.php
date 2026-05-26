<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/functions.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . BASE_URL . '/pages/register');
    exit;
}

if (!defined('LOCAL_ALLOW_REGISTER') || !LOCAL_ALLOW_REGISTER) {
    flash('Registration is currently disabled.', 'danger');
    header('Location: ' . BASE_URL . '/pages/register');
    exit;
}

if (!csrfValid($_POST['csrf_token'] ?? '')) {
    flash('Invalid form token.', 'danger');
    header('Location: ' . BASE_URL . '/pages/register');
    exit;
}

$username = trim($_POST['username'] ?? '');
$email    = trim($_POST['email']    ?? '');
$password = $_POST['password']         ?? '';
$confirm  = $_POST['password_confirm'] ?? '';

$errors = [];

if ($username === '' || $email === '' || $password === '') {
    $errors[] = 'All fields are required.';
}
if ($username !== '' && !preg_match('/^[a-zA-Z0-9_.\\-]{3,50}$/', $username)) {
    $errors[] = 'Username must be 3–50 characters (letters, numbers, _ . - only).';
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email address.';
}
if (strlen($password) < 8) {
    $errors[] = 'Password must be at least 8 characters.';
}
if ($password !== $confirm) {
    $errors[] = 'Passwords do not match.';
}

if (!$errors) {
    $db   = getDB();
    $stmt = $db->prepare(q("SELECT COUNT(*) FROM {users} WHERE username = :u"));
    $stmt->execute([':u' => $username]);
    if ((int)$stmt->fetchColumn() > 0) {
        $errors[] = 'This username is already taken.';
    }

    $stmt = $db->prepare(q("SELECT COUNT(*) FROM {users} WHERE email = :e"));
    $stmt->execute([':e' => $email]);
    if ((int)$stmt->fetchColumn() > 0) {
        $errors[] = 'This email address is already registered.';
    }
}

if ($errors) {
    $_SESSION['register_errors'] = $errors;
    $_SESSION['register_old']    = ['username' => $username, 'email' => $email];
    header('Location: ' . BASE_URL . '/pages/register');
    exit;
}

$db = $db ?? getDB();
$db->prepare(q(
    "INSERT INTO {users} (username, email, local_password_hash) VALUES (:u, :e, :h)"
))->execute([':u' => $username, ':e' => $email, ':h' => password_hash($password, PASSWORD_BCRYPT)]);

// Fetch the new user ID by email — never rely on lastInsertId() across concurrent inserts
$stmt = $db->prepare(q("SELECT id FROM {users} WHERE email = :e LIMIT 1"));
$stmt->execute([':e' => $email]);
$newId = (int)$stmt->fetchColumn();

if (!$newId) {
    flash('Account creation failed. Please try again.', 'danger');
    header('Location: ' . BASE_URL . '/pages/register');
    exit;
}

clearAuthSession();
session_regenerate_id(true);

$_SESSION['local_logged_in']    = true;
$_SESSION['local_logged_in_at'] = time();
$_SESSION['user_id']            = $newId;
$_SESSION['local_email']        = $email;
$_SESSION['local_username']     = $username;

header('Location: ' . BASE_URL . '/');
exit;
