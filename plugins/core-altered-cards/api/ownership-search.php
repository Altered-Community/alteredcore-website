<?php
// Digital-ownership search proxy endpoint — /papi/core-altered-cards/ownership-search
// Fetches the user's owned cards from the AlteredOwnership API (OWNERSHIP_API_URL),
// applies filters, handles server-side pagination, and returns a cards-API-compatible
// envelope. Mirrors collection-search.php but targets the digital ownership service,
// whose GET /api/collection uses bracketed array params (?faction[]=…) and returns
// camelCase items (reference/quantity/name).
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json');

if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'Ownership API not configured']);
    exit;
}

if (!defined('KC_URL') || !kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

// Map the widget's collection-style params (sent by buildCollApiUrl in card-search.js)
// to the AlteredOwnership query interface.
//   incoming  => ownership param
$arrayMap = [
    'faction'   => 'faction[]',
    'cardType'  => 'type[]',
    'rarity'    => 'rarity[]',
    'cardSet'   => 'set[]',
    'subTypes'  => 'subtype[]',
    'variation' => 'variation[]',
];
// Exact numeric filters: incoming `mainCost[]=N` => ownership `mainCost=N`.
$numericMap = [
    'mainCost'      => 'mainCost',
    'recallCost'    => 'recallCost',
    'forestPower'   => 'forest',
    'mountainPower' => 'mountain',
    'oceanPower'    => 'ocean',
];

$parts = [];

$loc = is_string($_GET['locale'] ?? null) ? $_GET['locale'] : 'en';
$parts[] = 'locale=' . rawurlencode($loc);

foreach ($arrayMap as $in => $out) {
    if (!isset($_GET[$in])) continue;
    $vals = is_array($_GET[$in]) ? $_GET[$in] : [$_GET[$in]];
    foreach ($vals as $v) {
        if ($v !== '') $parts[] = $out . '=' . rawurlencode($v);
    }
}

foreach ($numericMap as $in => $out) {
    if (!isset($_GET[$in])) continue;
    $v = is_array($_GET[$in]) ? ($_GET[$in][0] ?? '') : $_GET[$in];
    if ($v !== '') $parts[] = $out . '=' . rawurlencode($v);
}

foreach (['isBanned', 'isSuspended'] as $flag) {
    if (($_GET[$flag] ?? '') === 'true') $parts[] = $flag . '=true';
}

// Case-insensitive name substring search (matched in the requested locale upstream).
if (isset($_GET['name']) && is_string($_GET['name']) && $_GET['name'] !== '') {
    $parts[] = 'name=' . rawurlencode($_GET['name']);
}

$base = rtrim(OWNERSHIP_API_URL, '/');
$path = '/api/collection' . ($parts ? '?' . implode('&', $parts) : '');
$data = collApiRequest($base, 'GET', $path, $userId);

if ($data === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

// Normalize ownership items (reference/quantity/name) to the shape the card-search.js
// collection field map expects (cardReference/quantity/name).
$items = [];
if (is_array($data)) {
    foreach ($data as $it) {
        if (!is_array($it)) continue;
        $it['cardReference'] = $it['reference'] ?? ($it['cardReference'] ?? '');
        $items[] = $it;
    }
}

$total    = count($items);
$perPage  = max(1, (int)($_GET['itemsPerPage'] ?? 30));
$page     = max(1, (int)($_GET['page']         ?? 1));
$lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
$page     = min($page, $lastPage);
$offset   = ($page - 1) * $perPage;

echo json_encode([
    'member'     => array_slice($items, $offset, $perPage),
    'totalItems' => $total,
    'lastPage'   => $lastPage,
]);
