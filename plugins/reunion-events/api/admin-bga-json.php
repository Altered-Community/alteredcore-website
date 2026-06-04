<?php
/**
 * Admin download for bga-tournaments.json — GET /papi/reunion-events/admin-bga-json
 */

require_once __DIR__ . '/../inc/functions.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

requireAdmin();

if (!adminHasSection('events-settings')) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!csrfValid($_GET['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid token'], JSON_UNESCAPED_UNICODE);
    exit;
}

reSendBgaTournamentsJsonDownload();
