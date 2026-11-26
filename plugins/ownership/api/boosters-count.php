<?php
// GET /papi/ownership/boosters-count — { "count": N }: the total of unopened boosters of the
// signed-in user, for the "boosters to open" indicators shown on every page of the site
// (js/booster-alert.js). Lighter than boosters-list (no image mapping, no list to send).
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=UTF-8');

if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'Ownership API not configured']);
    exit;
}

if (!kcIsLoggedIn()) {
    header('X-Ac-Auth-State: unauthenticated');
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$count = ownGetBoosterCount((int)($_SESSION['user_id'] ?? 0));
if ($count === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

echo json_encode(['count' => $count]);
