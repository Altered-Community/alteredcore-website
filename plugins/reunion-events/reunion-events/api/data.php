<?php
/**
 * Plugin API endpoint — reached via GET /api/reunion-events/events
 *
 * Returns upcoming tournaments data as JSON.
 */

require_once __DIR__ . '/../inc/functions.php';

header('Content-Type: application/json; charset=UTF-8');

$apiKey = reGetApiKey();

if (empty($apiKey)) {
    http_response_code(503);
    echo json_encode([
        'error'   => 'API key not configured',
        'code'    => 'NO_API_KEY',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$result = reGetUpcomingTournaments();

echo json_encode([
    'tournaments' => $result['tournaments'],
    'total'       => $result['total'],
    'limit'       => $result['limit'],
    'offset'      => $result['offset'],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
