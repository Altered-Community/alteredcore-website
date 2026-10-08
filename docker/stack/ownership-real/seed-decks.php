<?php
// docker-compose.ownership.yml only: two demo decks on the local decks API, created again on each run (start of the stack,
// or `docker compose … run --rm alice-decks`). alice: a deck built while she was in the « Global » alt-art mode
// (seed.sql): the site switches her to « par deck » on her next visit, and the deck takes her default alt arts the first
// time Re:Builder opens it. bob (« par deck »): a deck whose prints were chosen in the deck, kept as they are.

require_once dirname(__DIR__, 3) . '/includes/functions.php';

function seedHttp(string $method, string $url, array $headers, ?string $body = null): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 20]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, is_string($res) ? $res : ''];
}

/** Bearer headers of a player of the stack's realm; exits when Keycloak refuses. */
function playerAuth(string $user): array {
    [$code, $body] = seedHttp('POST', KC_URL . '/realms/' . KC_REALM . '/protocol/openid-connect/token',
        ['Content-Type: application/x-www-form-urlencoded'],
        http_build_query(['grant_type' => 'password', 'client_id' => KC_CLIENT_ID, 'client_secret' => KC_CLIENT_SECRET,
                          'username' => $user, 'password' => 'TestPassword1234', 'scope' => 'openid']));
    $token = json_decode($body, true)['access_token'] ?? null;
    if ($code !== 200 || !$token) {
        fwrite(STDERR, "[alt-art-decks] no token for {$user} (HTTP {$code})\n");
        exit(1);
    }
    return ['Authorization: Bearer ' . $token, 'Accept: application/json', 'Content-Type: application/json'];
}
$api = rtrim(DECKS_API_URL, '/');

$line = fn(string $ref, int $qty) => ['cardReference' => $ref, 'quantity' => $qty];
$decks = [
    [
        // Plain prints only: her default alt arts replace them (Vaike, Icare, Fée Clochette, the hero).
        'name' => 'Axiom (arts de base)',
        'deckCards' => [
            $line('ALT_ALIZE_B_AX_01_C', 1),  // Sierra & Oddball
            $line('ALT_ALIZE_B_AX_35_C', 3),  // Vaike, l'Énergéticienne
            $line('ALT_BISE_B_AX_56_C', 3),   // Icare
            $line('ALT_CORE_B_AX_09_C', 3),   // Fée Clochette
            $line('ALT_CORE_B_AX_22_C', 3),   // Entraînement Mécanique
            $line('ALT_CYCLONE_B_AX_74_C', 2), // Lucan, Léviathan Affamé
            $line('ALT_CYCLONE_B_AX_76_C', 2), // Sceau Axiom
            $line('ALT_EOLE_B_AX_106_C', 1),  // Salamandre Furtive
            $line('ALT_ALIZE_B_AX_46_C', 2),  // Galeries Saisies par les Glaces
            $line('ALT_CORE_B_AX_08_C', 3),   // Récupérateur Axiom (one illustration)
        ],
    ],
    [
        // Prints chosen in the deck: one Vaike on the plain art, an alt art not among her defaults.
        'name' => 'Axiom (arts choisis)',
        'deckCards' => [
            $line('ALT_ALIZE_B_AX_01_C', 1),
            $line('ALT_ALIZE_A_AX_35_C', 2),
            $line('ALT_ALIZE_B_AX_35_C', 1),
            $line('ALT_CORE_A_AX_22_C', 1),
            $line('ALT_CORE_B_AX_22_C', 2),
            $line('ALT_CORE_B_AX_09_C', 2),
        ],
    ],
];
$owners = ['alice', 'bob'];
$created = 0;
foreach ($decks as $i => $deck) {
    $auth = playerAuth($owners[$i]);
    [, $body] = seedHttp('GET', $api . '/api/decks?itemsPerPage=1000', $auth);
    $mine = json_decode($body, true);
    foreach (is_array($mine) ? ($mine['member'] ?? $mine) : [] as $existing) {
        if (($existing['name'] ?? '') === $deck['name']) seedHttp('DELETE', $api . '/api/decks/' . rawurlencode($existing['id']), $auth);
    }
    $deck += ['format' => 'standard', 'isPublic' => false, 'isDraft' => true];
    [$code] = seedHttp('POST', $api . '/api/decks', $auth, json_encode($deck, JSON_UNESCAPED_UNICODE));
    if ($code === 201) $created++;
    else fwrite(STDERR, "[alt-art-decks] {$deck['name']}: HTTP {$code}\n");
}
echo "[alt-art-decks] {$created} decks created\n";
