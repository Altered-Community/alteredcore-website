<?php
// Physical collection quantities — /papi/core-altered-cards/collection-qty
// GET : { enabled, quantities: { ref: qty } } of the signed-in user (enabled false without COLLECTION_MODE).
// POST: csrf_token, ref, qty (0–99) → { ok, ref, qty }: sets the card's quantity (0 removes it), as the set_qty action of
//       pages/collection.php; the collection line is found server-side.
// Used by the card browser of Re:Builder (plugin rebuilder, /pages/cards with « Beta Deckbuilder »).
require_once dirname(__DIR__) . '/includes/functions.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

if (!kcIsLoggedIn()) {
    header('X-Ac-Auth-State: unauthenticated');
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized', 'code' => 'CQ01']);
    exit;
}

$userId  = kcCurrentUserId();
$enabled = defined('COLLECTION_MODE') && COLLECTION_MODE && defined('COLLECTION_API_URL') && COLLECTION_API_URL && $userId > 0;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!$enabled) {
        echo json_encode(['enabled' => false, 'quantities' => (object)[]]);
        exit;
    }
    $coll = collGetUserCollection(COLLECTION_API_URL, $userId);
    echo json_encode(['enabled' => true, 'quantities' => (object)$coll['collection']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed', 'code' => 'CQ00']);
    exit;
}

if (!csrfValid($_POST['csrf_token'] ?? '')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid token', 'code' => 'CQ02']);
    exit;
}

if (!$enabled) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Collection disabled', 'code' => 'CQ03']);
    exit;
}

$ref = strtoupper(trim((string)($_POST['ref'] ?? '')));
if (!preg_match('/^ALT_[A-Z0-9_]+$/', $ref)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid ref', 'code' => 'CQ04']);
    exit;
}
$qty = max(0, min(99, (int)($_POST['qty'] ?? 0)));

$entries = collGetUserCollection(COLLECTION_API_URL, $userId)['entries'];
$result  = collSetQuantity(COLLECTION_API_URL, $userId, $ref, $qty, (int)($entries[$ref] ?? 0));

if (!$result['ok']) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Collection API error', 'code' => 'CQ05']);
    exit;
}
echo json_encode(['ok' => true, 'ref' => $ref, 'qty' => $result['qty']]);
