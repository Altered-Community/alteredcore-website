<?php
// Collection search proxy endpoint — /papi/core-altered-cards/collection-search
// Fetches the user's collection from the collection API, applies filters,
// handles server-side pagination, and returns a cards-API-compatible envelope.
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/collection-query.php';

header('Content-Type: application/json');

if (!defined('KC_URL') || KC_URL === '' || !kcIsLoggedIn()) {
    header('X-Ac-Auth-State: unauthenticated');
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

$query = cacCollectionQuery($_GET);
$path  = '/api/collection' . ($query !== '' ? '?' . $query : '');
[$code, $raw] = collApiRequestRaw(COLLECTION_API_URL, 'GET', $path, $userId);

if ($code === 401) {
    header('X-Ac-Auth-State: unauthenticated');
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$data = ($code > 0 && $code < 400 && $raw !== null && $raw !== '') ? json_decode($raw, true) : false;
if (!is_array($data)) {
    http_response_code(502);
    echo json_encode(['error' => 'Collection API error']);
    exit;
}

$items = is_array($data) ? $data : [];
$types = cacCollectionLocalTypes($_GET);
if ($types !== null) {
    $items = array_values(array_filter($items, fn($it) => is_array($it) && in_array($it['cardType'] ?? '', $types, true)));
}
$items = cacFilterItemsByNumeric($items, cacCollectionLocalNumeric($_GET));
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
