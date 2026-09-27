<?php
// GET/PUT /papi/ownership/alt-art-preference-mode — proxies GET/PUT
// /api/alt-arts/preference-mode on OWNERSHIP_API_URL. Backs the "définir par deck /
// définir au global" toggle on pages/alt-arts.php. PUT is mutating, so CSRF-checked
// with this site's own csrf_token, same as alt-art-set-preference.php.
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
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    echo json_encode(['mode' => ownGetAltArtPreferenceMode($userId)]);
    exit;
}

if ($method !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

if (!csrfValid($body['csrf_token'] ?? null)) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

$mode = $body['mode'] ?? null;
if (!in_array($mode, ['PerDeck', 'Global'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'mode must be "PerDeck" or "Global"']);
    exit;
}

[$status, $raw] = ownApiRequestRaw('PUT', '/api/alt-arts/preference-mode', $userId, ['mode' => $mode]);

if ($status !== 204) {
    http_response_code($status ?: 502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

// Refresh the cache immediately so the rest of this session sees the new mode right
// away instead of waiting out ALT_ART_MODE_CACHE_TTL.
$_SESSION['alt_art_mode'] = $mode;
$_SESSION['alt_art_mode_at'] = time();

http_response_code(204);
