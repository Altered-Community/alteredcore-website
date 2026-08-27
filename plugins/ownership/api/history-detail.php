<?php
// GET /papi/ownership/history-detail?id=123 — proxies GET /api/history/{id} on
// OWNERSHIP_API_URL.
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

$id = (int)($_GET['id'] ?? 0);
if ($id < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);
$loc = is_string($_GET['locale'] ?? null) && $_GET['locale'] !== '' ? $_GET['locale'] : getUiLang();

$data = ownApiRequest('GET', '/api/history/' . $id . '?locale=' . rawurlencode($loc), $userId);

if ($data === false) {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    exit;
}

echo json_encode($data, JSON_UNESCAPED_UNICODE);
