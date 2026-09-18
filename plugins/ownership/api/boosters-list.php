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

// Booster cover art is mirrored locally (assets/boosters/) instead of hot-linking
// ownership.altered.re images cross-origin — rewrite the upstream relative path
// (e.g. "/img/boosters/unique-random-lyra.webp") to our own copy by filename. Falls
// back to null (generic icon, see js/boosters.js) if we don't have that file locally.
foreach ($data as &$booster) {
    $file = isset($booster['imagePath']) ? basename((string)$booster['imagePath']) : '';
    $local = $file !== '' ? __DIR__ . '/../assets/boosters/' . $file : '';
    $booster['imagePath'] = ($local !== '' && is_file($local))
        ? BASE_URL . '/plugins/ownership/assets/boosters/' . $file
        : null;
}
unset($booster);

echo json_encode($data, JSON_UNESCAPED_UNICODE);
