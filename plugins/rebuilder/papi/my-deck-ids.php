<?php
// GET /papi/rebuilder/my-deck-ids → {"ids": ["…", …]}
// Ids of the signed-in user's decks, for the editor to tell whether the open deck is theirs (DeckStore.owned). The
// decks API only gives them through GET /api/decks, which sends every deck of the account with its stats, unpaginated
// (app/docs/api-limitations/decks-api.md): fetched here, server side, so that the browser downloads ids only.
// Same token handling as the relay (api/v1/services/proxy.php). Manifest: "auth": "user".
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: private, no-store');

function rebuilderMyDeckIdsReply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
}

/** GET {DECKS_API_URL}/api/decks with the token: [status, decoded body] or null when unreachable. */
function rebuilderMyDeckIdsFetch(?string $token): ?array {
    $ch = curl_init(rtrim(DECKS_API_URL, '/') . '/api/decks?' . http_build_query(['page' => 1, 'itemsPerPage' => 1000]));
    $headers = ['Accept: application/json'];
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_ENCODING       => '',
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    ]);
    $out = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($out === false || $status === 0) return null;
    return [$status, json_decode((string)$out, true)];
}

$userId = (int)($_SESSION['user_id'] ?? 0);
if (!defined('KC_URL') || KC_URL === '' || !defined('DECKS_API_URL') || DECKS_API_URL === '' || $userId <= 0) {
    rebuilderMyDeckIdsReply(401, ['error' => 'unauthenticated']);
    return;
}

// Release the session lock during the upstream call (the page's other requests of the same user).
$token = kc_get_access_token($userId) ?: null;
session_write_close();
$res = rebuilderMyDeckIdsFetch($token);
// A token can be rejected before its expiry (revoked, clock skew): renew once and retry.
if ($res !== null && $res[0] === 401 && $token !== null) {
    session_start();
    unset($_SESSION['kc_access_token'], $_SESSION['kc_access_token_exp']);
    $token = kc_get_access_token($userId) ?: null;
    session_write_close();
    if ($token !== null) $res = rebuilderMyDeckIdsFetch($token);
}

if ($res === null) {
    rebuilderMyDeckIdsReply(502, ['error' => 'service_unreachable']);
    return;
}
[$status, $body] = $res;
if ($status !== 200 || !is_array($body)) {
    rebuilderMyDeckIdsReply($status >= 400 ? $status : 502, ['error' => 'decks_api', 'status' => $status]);
    return;
}
$decks = isset($body['member']) && is_array($body['member']) ? $body['member'] : $body;
$ids = [];
foreach ($decks as $deck) {
    if (is_array($deck) && isset($deck['id']) && is_string($deck['id'])) $ids[] = $deck['id'];
}
rebuilderMyDeckIdsReply(200, ['ids' => $ids]);
