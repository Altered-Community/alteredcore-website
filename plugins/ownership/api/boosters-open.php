<?php
// POST /papi/ownership/boosters-open — proxies POST /api/boosters/{key}/open on
// OWNERSHIP_API_URL. Mutating (decrements the upstream inventory), so it is CSRF-checked
// with this site's own csrf_token — the AlteredOwnership endpoint no longer needs a
// cookie session for this call now that it runs under the read-collection scope.
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

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

if (!csrfValid($body['csrf_token'] ?? null)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

$boosterTypeKey = (string)($body['boosterTypeKey'] ?? '');
$quantity       = max(1, (int)($body['quantity'] ?? 1));
if ($boosterTypeKey === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing boosterTypeKey']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);
$loc    = is_string($body['locale'] ?? null) && $body['locale'] !== '' ? $body['locale'] : getUiLang();

$path = '/api/boosters/' . rawurlencode($boosterTypeKey) . '/open?locale=' . rawurlencode($loc);
[$status, $raw] = ownApiRequestRaw('POST', $path, $userId, ['quantity' => $quantity]);

if ($raw === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

// Relay the upstream status/body as-is: 200 -> JSON array of opened cards, 404/409 ->
// plain-text error message the UI shows verbatim (see js/boosters.js).
http_response_code($status ?: 502);
if ($status >= 200 && $status < 300) {
    header('Content-Type: application/json; charset=UTF-8');
    echo $raw;
} else {
    header('Content-Type: text/plain; charset=UTF-8');
    echo $raw;
}
