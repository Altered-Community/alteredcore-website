<?php
// GET/PUT /papi/ownership/alt-art-preference-mode — proxies GET/PUT
// /api/alt-arts/preference-mode on OWNERSHIP_API_URL. Backs the « par deck / global »
// toggle on pages/alt-arts.php. Method, sign-in and CSRF: checked by the router (manifest).
// Before « Global » → « par deck », the page writes the defaults in every deck
// (api/alt-art-leave-global.php).
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=UTF-8');

if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'Ownership API not configured']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    echo json_encode(['mode' => ownGetAltArtPreferenceMode($userId)]);
    exit;
}

$mode = pluginApiBody()['mode'] ?? null;
if (!in_array($mode, ['PerDeck', 'Global'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'mode must be "PerDeck" or "Global"']);
    exit;
}

[$status] = ownApiRequestRaw('PUT', '/api/alt-arts/preference-mode', $userId, ['mode' => $mode]);
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
