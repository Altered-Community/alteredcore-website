<?php
// Playset exploration proxy — /papi/core-altered-cards/playset-cards
// Card-by-card "shopping list" view of the whole playset universe (including
// cards owned in 0 copies). Proxies GET /api/collection/playset/cards on the
// Altered Collection API (COLLECTION_API_URL). Filters (cardSet/faction/rarity/
// cardType/name/copies) are forwarded too, so the same endpoint serves the
// filtered view once the UI controls are added.
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

$userId  = (int)($_SESSION['user_id'] ?? 0);
$loc     = is_string($_GET['locale'] ?? null) ? $_GET['locale'] : 'en';
$page    = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(100, max(1, (int)($_GET['itemsPerPage'] ?? 30)));

$parts = [
    'locale=' . rawurlencode($loc),
    'page=' . $page,
    'itemsPerPage=' . $perPage,
];

// Forward optional filters (bracketed arrays + scalar name). Values are passed
// through; the upstream validates them (400 on invalid rarity/copies).
foreach (['cardSet', 'faction', 'cardType', 'rarity', 'copies'] as $key) {
    if (!isset($_GET[$key])) continue;
    $vals = is_array($_GET[$key]) ? $_GET[$key] : [$_GET[$key]];
    foreach ($vals as $v) {
        if ($v !== '') $parts[] = $key . '[]=' . rawurlencode($v);
    }
}
if (isset($_GET['name']) && is_string($_GET['name']) && $_GET['name'] !== '') {
    $parts[] = 'name=' . rawurlencode($_GET['name']);
}

$base = rtrim(COLLECTION_API_URL, '/');
$path = '/api/collection/playset/cards?' . implode('&', $parts);
$data = collApiRequest($base, 'GET', $path, $userId);

if ($data === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Collection API error']);
    exit;
}

echo json_encode($data);
