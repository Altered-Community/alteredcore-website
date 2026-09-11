<?php
// POST /papi/ownership/alt-art-set-preference — proxies PUT /api/alt-arts/preferences on
// OWNERSHIP_API_URL. Mutating, so CSRF-checked with this site's own csrf_token, same as
// boosters-open.php.
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

if (!isset($body['familyId'], $body['faction'], $body['rarity'], $body['slotReferences'])
    || !is_array($body['slotReferences'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing familyId/faction/rarity/slotReferences']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

$upstreamBody = [
    'familyId'       => (int)$body['familyId'],
    'faction'        => (string)$body['faction'],
    'rarity'         => (string)$body['rarity'],
    'slotReferences' => array_values($body['slotReferences']),
];

[$status, $raw] = ownApiRequestRaw('PUT', '/api/alt-arts/preferences', $userId, $upstreamBody);

if ($raw === null) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

// 204 -> no body; 400 -> plain-text message; 409 -> JSON shortfall array. Relay as-is so
// js/alt-arts.js can tell the cases apart the same way it would from the real API.
http_response_code($status ?: 502);
if ($status === 204) {
    exit;
}
if ($status === 409) {
    header('Content-Type: application/json; charset=UTF-8');
    echo $raw;
} else {
    header('Content-Type: text/plain; charset=UTF-8');
    echo $raw;
}
