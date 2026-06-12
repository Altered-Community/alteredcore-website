<?php
// Plugin API router — blocked from direct access by includes/.htaccess.
// Reached via: GET /papi/{plugin-id}/{endpoint}
// Rewritten by .htaccess with ?_plugin=&_endpoint= query params.
require_once __DIR__ . '/functions.php';

header('Content-Type: application/json; charset=UTF-8');

$_pluginId = preg_replace('/[^a-z0-9_-]/', '', $_GET['_plugin']   ?? '');
$_endpoint = preg_replace('/[^a-z0-9_-]/', '', $_GET['_endpoint'] ?? '');

if ($_pluginId === '' || $_endpoint === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Bad request']);
    exit;
}

initPlugins();

$_apiEntry = pluginFindApi($_pluginId, $_endpoint);
if ($_apiEntry === null) {
    http_response_code(404);
    echo json_encode(['error' => 'Plugin API endpoint not found']);
    exit;
}

$GLOBALS['_ac_current_plugin_prefix'] = $_apiEntry['_table_prefix'];
include $_apiEntry['abs_file'];
unset($GLOBALS['_ac_current_plugin_prefix']);
