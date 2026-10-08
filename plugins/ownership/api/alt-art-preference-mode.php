<?php
// GET /papi/ownership/alt-art-preference-mode — the player's mode on OWNERSHIP_API_URL
// (GET /api/alt-arts/preference-mode). Default alt arts replace the « par deck / global »
// choice: reading it switches a player still in "Global" to "PerDeck" (see
// includes/func.alt-arts.php), and nothing sets it back.
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

echo json_encode(['mode' => ownGetAltArtPreferenceMode((int)($_SESSION['user_id'] ?? 0))]);
