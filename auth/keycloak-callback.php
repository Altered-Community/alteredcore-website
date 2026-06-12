<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/func.keycloak.php';
if (session_status() === PHP_SESSION_NONE) session_start();

// Validate anti-CSRF state
if (empty($_GET['state']) || !isset($_SESSION['kc_state']) || $_GET['state'] !== $_SESSION['kc_state']) {
    die('Invalid state parameter.');
}
unset($_SESSION['kc_state']);

// Error returned by KC
if (!empty($_GET['error'])) {
    header('Location: ' . BASE_URL . '/pages/login?kc_error=' . urlencode($_GET['error_description'] ?? $_GET['error']));
    exit;
}

$code = $_GET['code'] ?? '';
if (!$code) {
    header('Location: ' . BASE_URL . '/pages/login');
    exit;
}

$redirectUri = request_scheme() . '://' . $_SERVER['HTTP_HOST'] . BASE_URL . '/auth/keycloak-callback.php';

// Exchange authorisation code for tokens
$ch = curl_init(KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/token');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => http_build_query([
        'grant_type'    => 'authorization_code',
        'code'          => $code,
        'redirect_uri'  => $redirectUri,
        'client_id'     => KC_CLIENT_ID,
        'client_secret' => KC_CLIENT_SECRET,
    ]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_TIMEOUT    => 10,
]);
$response = curl_exec($ch);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr || !$response) {
    die('Token exchange failed: ' . htmlspecialchars($curlErr));
}
$tokens = json_decode($response, true);

if (empty($tokens['access_token'])) {
    $err = $tokens['error_description'] ?? $tokens['error'] ?? 'No access token';
    die(htmlspecialchars($err));
}

// Fetch user identity from KC
$ch2 = curl_init(KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/userinfo');
curl_setopt_array($ch2, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $tokens['access_token']],
    CURLOPT_TIMEOUT        => 10,
]);
$userInfo = json_decode(curl_exec($ch2), true);
curl_close($ch2);

if (empty($userInfo['sub'])) {
    die('Could not retrieve user info from Keycloak.');
}

$sub      = $userInfo['sub'];
$email    = $userInfo['email'] ?? '';
$username = $userInfo['pseudo']
         ?? $userInfo['preferred_username']
         ?? $userInfo['name']
         ?? explode('@', $email ?: 'user@x')[0];

// Upsert local user record
$db = getDB();
if (STORE_KC_USER_DATA) {
    $db->prepare(q(
        "INSERT INTO {users} (kc_sub, email, username)
         VALUES (:sub, :email, :username)
         ON DUPLICATE KEY UPDATE email = VALUES(email), username = VALUES(username)"
    ))->execute([':sub' => $sub, ':email' => $email, ':username' => $username]);
} else {
    $db->prepare(q(
        "INSERT IGNORE INTO {users} (kc_sub) VALUES (:sub)"
    ))->execute([':sub' => $sub]);
}

// Fetch the local user ID by kc_sub — never rely on lastInsertId() after an upsert
$stmt = $db->prepare(q("SELECT id FROM {users} WHERE kc_sub = :sub LIMIT 1"));
$stmt->execute([':sub' => $sub]);
$localUserId = (int)$stmt->fetchColumn();
if (!$localUserId) {
    die('User record could not be found after upsert.');
}

// Persist tokens (encrypted refresh → DB, access → session)
kc_save_tokens($localUserId, $tokens);
kc_set_remember_cookie($localUserId);

// Read values to carry over BEFORE regenerating (session data is preserved across
// regeneration, but reading first makes the intent explicit)
$returnUrl = $_SESSION['kc_return_url'] ?? BASE_URL . '/';
unset($_SESSION['kc_return_url']);

clearAuthSession();
session_regenerate_id(true);

$_SESSION['kc_logged_in']    = true;
$_SESSION['kc_logged_in_at'] = time();
$_SESSION['user_id']         = $localUserId;
$_SESSION['kc_sub']          = $sub;
$_SESSION['kc_email']        = $email;
$_SESSION['kc_username']     = $username;
$_SESSION['kc_id_token']     = $tokens['id_token'] ?? '';

header('Location: ' . $returnUrl);
exit;
