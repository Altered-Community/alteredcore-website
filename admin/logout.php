<?php
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';
if (session_status() === PHP_SESSION_NONE) session_start();

if (!empty($_SESSION['kc_logged_in'])) {
    header('Location: ' . BASE_URL . '/auth/keycloak-logout.php');
} else {
    header('Location: ' . BASE_URL . '/auth/local-logout.php');
}
exit;
