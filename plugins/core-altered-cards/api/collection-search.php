<?php
// Collection search proxy endpoint — /api/core-altered-cards/collection-search
// Fetches the user's collection from the collection API, applies filters,
// handles server-side pagination, and returns a cards-API-compatible envelope.
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json');

if (!defined('KC_URL') || !kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

$scalar = [
    'faction', 'rarity', 'cardType', 'variation',
    'isFoil', 'isBanned', 'isSuspended',
    'cardReference', 'name', 'subTypes', 'locale',
];
$range = ['mainCost', 'recallCost', 'oceanPower', 'mountainPower', 'forestPower'];

$parts = [];

foreach ($scalar as $k) {
    if (!isset($_GET[$k])) continue;
    if (is_array($_GET[$k])) {
        foreach ($_GET[$k] as $v) {
            if ($v !== '') $parts[] = $k . '=' . rawurlencode($v);
        }
    } elseif ($_GET[$k] !== '') {
        $parts[] = $k . '=' . rawurlencode($_GET[$k]);
    }
}

if (isset($_GET['cardSet'])) {
    $sets = is_array($_GET['cardSet']) ? $_GET['cardSet'] : [$_GET['cardSet']];
    foreach ($sets as $v) {
        if ($v !== '') $parts[] = 'cardSet=' . rawurlencode($v);
    }
}

foreach ($range as $k) {
    if (!isset($_GET[$k]) || !is_array($_GET[$k])) continue;
    foreach (['gte', 'lte', 'gt', 'lt'] as $op) {
        if (isset($_GET[$k][$op]) && $_GET[$k][$op] !== '') {
            $parts[] = $k . '[' . $op . ']=' . rawurlencode($_GET[$k][$op]);
        }
    }
}

$path = '/api/collection' . ($parts ? '?' . implode('&', $parts) : '');
$data = collApiRequest(COLLECTION_API_URL, 'GET', $path, $userId);

if ($data === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Collection API error']);
    exit;
}

$items    = is_array($data) ? $data : [];
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
