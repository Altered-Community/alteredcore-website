<?php
// Local / CI stack only (docker/entrypoint.sh, AC_STACK_SEED=1): public decks for the community
// lists (the site's « Community » tab, Re:Builder's « Communauté »). Copies of legal public decks of
// production (community-decks.json, September 2026), created on the local decks API as bob.
// Skipped when bob already has decks.

require_once dirname(__DIR__, 2) . '/includes/functions.php';

function seedHttp(string $method, string $url, array $headers, ?string $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 20,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $res  = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, is_string($res) ? $res : ''];
}

[$code, $body] = seedHttp('POST', KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/token',
    ['Content-Type: application/x-www-form-urlencoded'],
    http_build_query(['grant_type' => 'password', 'client_id' => KC_CLIENT_ID, 'client_secret' => KC_CLIENT_SECRET,
                      'username' => 'bob', 'password' => 'TestPassword1234', 'scope' => 'openid']));
$token = json_decode($body, true)['access_token'] ?? null;
if ($code !== 200 || !$token) {
    fwrite(STDERR, "[seed-decks] no token for bob (HTTP {$code})\n");
    exit(1);
}
$auth = ['Authorization: Bearer ' . $token, 'Accept: application/json', 'Content-Type: application/json'];
$api  = rtrim(DECKS_API_URL, '/');

[$code, $body] = seedHttp('GET', $api . '/api/decks?itemsPerPage=1', $auth);
$mine = json_decode($body, true);
$count = is_array($mine) ? (isset($mine['member']) ? count($mine['member']) : count($mine)) : 0;
if ($code === 200 && $count > 0) {
    echo "[seed-decks] bob already has decks\n";
    exit(0);
}

$decks   = json_decode((string)file_get_contents(__DIR__ . '/community-decks.json'), true) ?: [];
$created = 0;
foreach ($decks as $deck) {
    $deck['isPublic'] = true;
    [$code] = seedHttp('POST', $api . '/api/decks', $auth, json_encode($deck, JSON_UNESCAPED_UNICODE));
    if ($code === 201) $created++;
    else fwrite(STDERR, "[seed-decks] {$deck['name']}: HTTP {$code}\n");
}
echo "[seed-decks] {$created} public decks created\n";
