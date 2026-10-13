<?php
// GET  /papi/ownership/alt-art-leave-global → {"decks": ["<id>", …]}
// POST /papi/ownership/alt-art-leave-global {"deck": "<id>"} → {"changed": bool}
// « Global » → « par deck » (pages/alt-arts.php): the page lists the player's decks, writes the defaults in each one
// (what Board Game Arena showed of it, see includes/func.alt-arts.php) and drops its brush choices, then sets the mode
// (api/alt-art-preference-mode.php).
// A deck is only written while the player is in « Global » (409 otherwise). Manifest: "auth": "user".
require_once __DIR__ . '/../includes/functions.php';
require_once dirname(__DIR__, 3) . '/includes/func.alt-arts.php';
require_once dirname(__DIR__, 3) . '/includes/func.keycloak.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store');

if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'ownership']);
    return;
}

$userId = (int)($_SESSION['user_id'] ?? 0);
$token = kc_get_access_token($userId);
if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'token']);
    return;
}
// The page sends four decks at a time: the session's lock would run them one after the other.
session_write_close();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $ids = altArtUserDeckIds($token);
    if ($ids === null) {
        http_response_code(502);
        echo json_encode(['error' => 'decks']);
        return;
    }
    echo json_encode(['decks' => $ids]);
    return;
}

$deckId = pluginApiBody()['deck'] ?? '';
if (!is_string($deckId) || !preg_match('/^[A-Za-z0-9-]{1,64}$/', $deckId)) {
    http_response_code(400);
    echo json_encode(['error' => 'deck']);
    return;
}

// Read from the service, not the session's cache: outside « Global », apply-to-deck would only swap the prints not owned.
[, $mode] = altArtHttp('GET', rtrim(OWNERSHIP_API_URL, '/') . '/api/alt-arts/preference-mode', $token);
if (($mode['mode'] ?? null) !== 'Global') {
    http_response_code(409);
    echo json_encode(['error' => 'mode']);
    return;
}

$changed = altArtWriteDefaultsInDeck($token, $deckId);
if ($changed === null) {
    http_response_code(502);
    echo json_encode(['error' => 'write']);
    return;
}
altArtForgetDeck($userId, $deckId);
echo json_encode(['changed' => $changed]);
