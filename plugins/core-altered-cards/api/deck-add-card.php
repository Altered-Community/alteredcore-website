<?php
// Add-one-card-to-deck endpoint — POST /papi/core-altered-cards/deck-add-card
// Body: deck_id, card_ref, csrf_token. Adds the card (or +1 quantity if already present)
// to one of the logged-in user's own decks. The deck API has no incremental "add card"
// operation, so this fetches the deck's current card list and PATCHes back the full
// deckCards array (and the deck's altArtOverrides), see cacDeckAddCardPatch().
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__, 3) . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed', 'code' => 'DA00']);
    exit;
}

if (!kcIsLoggedIn()) {
    header('X-Ac-Auth-State: unauthenticated');
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized', 'code' => 'DA01']);
    exit;
}

if (!csrfValid($_POST['csrf_token'] ?? '')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid token', 'code' => 'DA02']);
    exit;
}

$deckId = trim($_POST['deck_id'] ?? '');
$cardRef = trim($_POST['card_ref'] ?? '');
if ($deckId === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $cardRef)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid parameters', 'code' => 'DA03']);
    exit;
}

$token = deckApiToken();
if (!$token) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Could not connect to the deck API.', 'code' => 'DA04']);
    exit;
}

// Fetch the deck's current card list
$ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Accept: application/json', 'Authorization: Bearer ' . $token],
    CURLOPT_TIMEOUT        => 10,
]);
$getResp = curl_exec($ch);
$getCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($getCode < 200 || $getCode >= 300 || !$getResp) {
    http_response_code($getCode ?: 502);
    echo json_encode(['ok' => false, 'error' => 'Could not load the deck.', 'code' => 'DA05']);
    exit;
}

$deck = json_decode($getResp, true);
// The deck's canonical lines + its own art choices (altArtOverrides) sent back unchanged, so the
// card choices made in the deck builder are kept; the player's global alt-art preferences are
// not baked into the list (AlteredOwnership applies them when the deck is shown).
$patch = cacDeckAddCardPatch(is_array($deck) ? $deck : [], $cardRef);

$ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($deckId));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => 'PATCH',
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/merge-patch+json',
        'Accept: application/json',
        'Authorization: Bearer ' . $token,
    ],
    CURLOPT_POSTFIELDS     => json_encode($patch),
    CURLOPT_TIMEOUT        => 15,
]);
$patchResp = curl_exec($ch);
$patchCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($patchCode >= 200 && $patchCode < 300) {
    echo json_encode(['ok' => true, 'deck_id' => $deckId, 'card_ref' => $cardRef]);
} else {
    http_response_code($patchCode ?: 502);
    echo json_encode(['ok' => false, 'error' => 'Could not save the deck.', 'code' => 'DA06']);
}
