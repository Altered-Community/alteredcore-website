<?php
// GET  /papi/rebuilder/deck-alt-arts?deck=<id>  → {"families": {"<familyId>:<faction>:<rarity>": ["<ref>", "<ref>", "<ref>"]}}
// POST /papi/rebuilder/deck-alt-arts {"deck": "<id>", "family": "<key>", "cards": ["<ref>", …]} → 204
// POST … {"deck": "<id>", "family": "<key>", "cards": null} → 204: the card follows the default alt arts again.
// POST … {"deck": "<id>"} → 204: every card of the deck follows them again (« Appliquer les arts par défaut »).
// The brush's choices for a deck of the signed-in player: the illustration of the 1st, 2nd and 3rd card (copy) of each
// multi-art card, in order (table {rebuilder_deck_alt_arts}, sql/migration_010). The decks API keeps only the deck's
// references; the default alt arts stay in the ownership service. Manifest: "auth": "user"; CSRF checked by the router.
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store');

function rebuilderDeckAltArtsReply(int $status, ?array $body = null): void {
    http_response_code($status);
    if ($body !== null) echo json_encode($body, JSON_UNESCAPED_SLASHES);
}

$userId = (int)($_SESSION['user_id'] ?? 0);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body   = $method === 'GET' ? [] : pluginApiBody();
$deckId = $method === 'GET' ? ($_GET['deck'] ?? '') : ($body['deck'] ?? '');
if ($userId <= 0) {
    rebuilderDeckAltArtsReply(401, ['error' => 'unauthenticated']);
    return;
}
if (!is_string($deckId) || !preg_match('/^[A-Za-z0-9-]{1,64}$/', $deckId)) {
    rebuilderDeckAltArtsReply(400, ['error' => 'deck']);
    return;
}

$db = getDB();

if ($method === 'GET') {
    $stmt = $db->prepare(q("SELECT family, card1, card2, card3 FROM {rebuilder_deck_alt_arts} WHERE user_id = :u AND deck_id = :d"));
    $stmt->execute([':u' => $userId, ':d' => $deckId]);
    $families = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $families[$row['family']] = [$row['card1'], $row['card2'], $row['card3']];
    }
    rebuilderDeckAltArtsReply(200, ['families' => (object)$families]);
    return;
}

// No family: the whole deck goes back to the default alt arts.
if (!array_key_exists('family', $body)) {
    $db->prepare(q("DELETE FROM {rebuilder_deck_alt_arts} WHERE user_id = :u AND deck_id = :d"))
       ->execute([':u' => $userId, ':d' => $deckId]);
    rebuilderDeckAltArtsReply(204);
    return;
}

$family = $body['family'];
if (!is_string($family) || !preg_match('/^\d{1,10}:[A-Z_]{1,20}:[A-Z0-9_]{1,20}$/', $family)) {
    rebuilderDeckAltArtsReply(400, ['error' => 'family']);
    return;
}
$cards = $body['cards'] ?? null;
if ($cards === null) {
    $db->prepare(q("DELETE FROM {rebuilder_deck_alt_arts} WHERE user_id = :u AND deck_id = :d AND family = :f"))
       ->execute([':u' => $userId, ':d' => $deckId, ':f' => $family]);
    rebuilderDeckAltArtsReply(204);
    return;
}
$valid = is_array($cards) && array_values($cards) === $cards && count($cards) >= 1 && count($cards) <= 3;
foreach ($valid ? $cards : [] as $ref) {
    if (!is_string($ref) || !preg_match('/^[A-Za-z0-9_]{1,64}$/', $ref)) $valid = false;
}
if (!$valid) {
    rebuilderDeckAltArtsReply(400, ['error' => 'cards']);
    return;
}
// Fewer than three: the last one goes on the following cards, as for the default alt arts' slots.
while (count($cards) < 3) $cards[] = $cards[count($cards) - 1];

$db->prepare(q(
    "INSERT INTO {rebuilder_deck_alt_arts} (user_id, deck_id, family, card1, card2, card3)"
    . " VALUES (:u, :d, :f, :c1, :c2, :c3)"
    . " ON DUPLICATE KEY UPDATE card1 = VALUES(card1), card2 = VALUES(card2), card3 = VALUES(card3)"
))->execute([':u' => $userId, ':d' => $deckId, ':f' => $family, ':c1' => $cards[0], ':c2' => $cards[1], ':c3' => $cards[2]]);
rebuilderDeckAltArtsReply(204);
