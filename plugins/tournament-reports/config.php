<?php
// Plugin configuration for tournament-reports.

// GameApi's base URL. Reads (GET /api/tournaments, GET /api/tournaments/{id}/players)
// use the logged-in viewer's own Keycloak session, not this constant/key —
// see inc/functions.php's module docblock.
// Change this value or override it via Admin → Tournament Settings.
if (!defined('TOURNAMENTS_API_URL')) {
    define('TOURNAMENTS_API_URL', '');
}

// GameApi's adjustment API key (its ApiKeys:Adjustment secret) — only used
// for POST .../adjustment, the one write this plugin makes.
// Change this value or override it via Admin → Tournament Settings.
if (!defined('TOURNAMENTS_API_KEY')) {
    define('TOURNAMENTS_API_KEY', '');
}

// Base URL for plugin assets (images, JS, CSS).
$trPluginAssetsUrl = BASE_URL . '/plugins/tournament-reports/assets';
