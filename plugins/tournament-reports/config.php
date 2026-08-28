<?php
// Plugin configuration for tournament-reports.

// External tournament API base URL.
// Set this to the base URL of the tournament results API.
// The endpoint pattern is: {TOURNAMENTS_API_URL}/tournaments/{tournamentId}
// Change this value or override it via Admin → Tournament Settings.
if (!defined('TOURNAMENTS_API_URL')) {
    define('TOURNAMENTS_API_URL', '');
}

// Base URL for plugin assets (images, JS, CSS).
$trPluginAssetsUrl = BASE_URL . '/plugins/tournament-reports/assets';
