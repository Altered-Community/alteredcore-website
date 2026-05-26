<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (!defined('KC_URL') || KC_URL === '') {
    header('Location: ' . BASE_URL . '/pages/login');
    exit;
}

$scheme      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$redirectUri = $scheme . '://' . $_SERVER['HTTP_HOST'] . BASE_URL . '/auth/keycloak-callback.php';
$state       = bin2hex(random_bytes(16));
$action      = $_GET['action'] ?? 'login';

$_SESSION['kc_state'] = $state;
// Only allow same-site return URLs to prevent open redirect
$_rawReturn = $_GET['return'] ?? '';
$_SESSION['kc_return_url'] = ($_rawReturn !== '' && strpos($_rawReturn, BASE_URL . '/') === 0)
    ? $_rawReturn
    : BASE_URL . '/';

$endpoint = ($action === 'register')
    ? KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/registrations'
    : KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/auth';

$params = http_build_query([
    'client_id'     => KC_CLIENT_ID,
    'response_type' => 'code',
    'redirect_uri'  => $redirectUri,
    'scope'         => KC_SCOPES,
    'state'         => $state,
]);

header('Location: ' . $endpoint . '?' . $params);
exit;
