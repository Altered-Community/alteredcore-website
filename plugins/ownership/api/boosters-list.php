<?php
// GET /papi/ownership/boosters-list — proxies GET /api/boosters on OWNERSHIP_API_URL.
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=UTF-8');

if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'Ownership API not configured']);
    exit;
}

if (!kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);
$data = ownApiRequest('GET', '/api/boosters', $userId);

if ($data === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

echo json_encode($data, JSON_UNESCAPED_UNICODE);
