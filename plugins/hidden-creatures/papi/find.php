<?php
// POST /papi/hidden-creatures/find {"spot": "home"} → {"code": "…"|null[, "new": bool, "found": ["home", …]]}
// A click on a creature. It only counts for a spot whose page this session has shown (global_head.php marks it), so
// that collecting every find takes visiting every page. Signed in: the find is recorded (admin « Hidden creatures »
// checks a contest winner against it) and `found` lists the user's finds. The code is the spot's Gleam secret code.
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store');
require_once dirname(__DIR__) . '/inc/functions.php';

$_hcSpot = pluginApiBody()['spot'] ?? '';
if (!is_string($_hcSpot) || !in_array($_hcSpot, hcSpotIds(), true)) {
    http_response_code(404);
    echo json_encode(['error' => 'unknown_spot']);
    return;
}
if (!hcSeen($_hcSpot)) {
    http_response_code(409);
    echo json_encode(['error' => 'not_seen']);
    return;
}

$_hcReply  = ['code' => (hcSpotCodes()[$_hcSpot] ?? '') ?: null];
$_hcUserId = kcIsLoggedIn() ? (int)($_SESSION['user_id'] ?? 0) : 0;
if ($_hcUserId > 0) {
    $_hcReply['new']   = hcRecordFind($_hcUserId, $_hcSpot);
    $_hcReply['found'] = array_keys(hcUserFinds($_hcUserId));
}
echo json_encode($_hcReply, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
