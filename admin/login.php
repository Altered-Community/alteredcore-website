<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';

$return = BASE_URL . '/admin/';

if (!defined('KC_URL') || KC_URL === '') {
    $_SESSION['kc_return_url'] = $return;
    header('Location: ' . BASE_URL . '/pages/login');
} else {
    header('Location: ' . BASE_URL . '/auth/keycloak-login?return=' . urlencode($return));
}
exit;
