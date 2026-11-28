<?php
// GET /papi/rebuilder/my-deck-ids → {"ids": ["…", …]}
// Ids of the signed-in user's decks, for the editor to tell whether the open deck is theirs (DeckStore.owned). The
// decks API only gives them through GET /api/decks, which sends every deck of the account with its stats, unpaginated
// (app/docs/api-limitations/decks-api.md): fetched here, server side, so that the browser downloads ids only.
// Manifest: "auth": "user".
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store');

function rebuilderMyDeckIdsReply(int $status, array $body, bool $unauthenticated = false): void {
    if ($status === 401 && $unauthenticated) header('X-Ac-Auth-State: unauthenticated');
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
}

$userId = kcCurrentUserId();
if (!defined('KC_URL') || KC_URL === '' || !defined('DECKS_API_URL') || DECKS_API_URL === '' || $userId <= 0) {
    rebuilderMyDeckIdsReply(401, ['error' => 'unauthenticated'], true);
    return;
}

$url = rtrim(DECKS_API_URL, '/') . '/api/decks?' . http_build_query(['page' => 1, 'itemsPerPage' => 1000]);
$res = acServiceRequest(new AcHttpRequest('GET', $url, ['Accept: application/json'], null, 20, 5, false, $userId));

if ($res->isUnreachable()) {
    if ($res->status === 401 && $res->authExpired) {
        rebuilderMyDeckIdsReply(401, ['error' => 'decks_api', 'status' => 401], true);
        return;
    }
    rebuilderMyDeckIdsReply(502, ['error' => 'service_unreachable']);
    return;
}

$body = $res->json();
if ($res->status !== 200 || !is_array($body)) {
    rebuilderMyDeckIdsReply(
        $res->status >= 400 ? $res->status : 502,
        ['error' => 'decks_api', 'status' => $res->status],
        $res->status === 401 && $res->authExpired
    );
    return;
}

$decks = isset($body['member']) && is_array($body['member']) ? $body['member'] : $body;
$ids = [];
foreach ($decks as $deck) {
    if (is_array($deck) && isset($deck['id']) && is_string($deck['id'])) $ids[] = $deck['id'];
}
rebuilderMyDeckIdsReply(200, ['ids' => $ids]);
