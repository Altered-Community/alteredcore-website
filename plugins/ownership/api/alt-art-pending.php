<?php
// GET  /papi/ownership/alt-art-pending?deck=<id> → {"pending": bool}
// POST /papi/ownership/alt-art-pending {"deck": "<id>"} → 204
// Re:Builder, on opening one of the player's decks: whether it waits for the player's default alt arts (decks of a
// player switched from the « Global » alt-art mode, see includes/func.alt-arts.php), then that it took them. Reading
// the mode first (from the service, not the session's cache) switches a player still in « Global » (the deck then waits
// too). Manifest: "auth": "user".
require_once __DIR__ . '/../includes/functions.php';
require_once dirname(__DIR__, 3) . '/includes/func.alt-arts.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store');

$userId = (int)($_SESSION['user_id'] ?? 0);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$deckId = $method === 'GET' ? ($_GET['deck'] ?? '') : (pluginApiBody()['deck'] ?? '');
if (!is_string($deckId) || !preg_match('/^[A-Za-z0-9-]{1,64}$/', $deckId)) {
    http_response_code(400);
    echo json_encode(['error' => 'deck']);
    return;
}

if ($method === 'POST') {
    altArtClearPending($userId, $deckId);
    http_response_code(204);
    return;
}

// Read again, not from the session's cache: a player still in « Global » is switched before their deck opens.
unset($_SESSION['alt_art_mode'], $_SESSION['alt_art_mode_at']);
ownGetAltArtPreferenceMode($userId);
echo json_encode(['pending' => altArtDeckPending($userId, $deckId)]);
