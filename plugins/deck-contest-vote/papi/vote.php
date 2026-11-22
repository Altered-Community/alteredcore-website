<?php
// POST /papi/deck-contest-vote/vote {"deck": "<id>", "tier": 1..5|null, "frustrating": bool} → {"ok": true, "placed": n}
// Records where the signed-in user put one deck in the tier list (called on every move, so that a ballot is saved
// whenever the voter stops). Signed-in only and CSRF-checked by the router (plugin.json), open window only.
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store');
require_once dirname(__DIR__) . '/inc/functions.php';

if (dcvState() !== 'open') {
    http_response_code(409);
    echo json_encode(['error' => 'closed']);
    return;
}

$_dcvBody   = pluginApiBody();
$_dcvDeck   = $_dcvBody['deck'] ?? null;
$_dcvTier   = $_dcvBody['tier'] ?? null;
$_dcvUserId = (int)($_SESSION['user_id'] ?? 0);

if (!is_string($_dcvDeck) || $_dcvUserId <= 0 || ($_dcvTier !== null && !is_int($_dcvTier))
    || !dcvSaveVote($_dcvUserId, $_dcvDeck, $_dcvTier, !empty($_dcvBody['frustrating']))) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid']);
    return;
}
echo json_encode(['ok' => true, 'placed' => dcvPlacedCount($_dcvUserId)]);
