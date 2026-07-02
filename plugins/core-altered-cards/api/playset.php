<?php
// Playset completion proxy endpoint — /papi/core-altered-cards/playset
// Fetches the user's physical-collection playset completion from the Altered
// Collection API (COLLECTION_API_URL) and returns it verbatim. The upstream
// GET /api/collection/playset aggregates the playset universe (COMMON / RARE /
// EXALTED, types CHARACTER / SPELL / PERMANENT — heroes and UNIQUE excluded)
// into quantity buckets (0 / 1 / 2 / 3+) by faction × set.
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json');

if (!defined('COLLECTION_API_URL') || !COLLECTION_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'Collection API not configured']);
    exit;
}

if (!kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

$loc   = is_string($_GET['locale'] ?? null) ? $_GET['locale'] : 'en';
$parts = ['locale=' . rawurlencode($loc)];

// Optional rarity filter (playset supports COMMON / RARE / EXALTED). Omitting it
// upstream returns all rarities.
if (isset($_GET['rarity'])) {
    $vals    = is_array($_GET['rarity']) ? $_GET['rarity'] : [$_GET['rarity']];
    $allowed = ['COMMON', 'RARE', 'EXALTED'];
    foreach ($vals as $v) {
        if (in_array($v, $allowed, true)) $parts[] = 'rarity[]=' . rawurlencode($v);
    }
}

$base = rtrim(COLLECTION_API_URL, '/');
$path = '/api/collection/playset?' . implode('&', $parts);
$data = collApiRequest($base, 'GET', $path, $userId);

if ($data === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Collection API error']);
    exit;
}

echo json_encode($data);
