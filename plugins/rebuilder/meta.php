<?php
// Manifest `meta` of the Re:Builder page: title and link preview of a deck, as on the site's deck page (core-altered-cards
// pages/deck.php sets $pageTitle to the deck's name). Included by pages/_router.php with $slug and $subPath in scope:
// `deck?id=` and `deckbuilder?id=` (beta mode), or the former links of the plugin's own page (`rebuilder/decks/{id}`).
// A guest deck, an unknown deck or an unreachable API keep the page's default title.
$id = in_array($slug, ['deck', 'deckbuilder', 'rebuilder'], true) ? (string)($_GET['id'] ?? '') : '';
if ($slug === 'rebuilder' && preg_match('#^decks/([0-9a-f-]{36})(?:/|$)#i', $subPath, $m)) $id = $m[1];
if (!preg_match('#^[0-9a-f-]{36}$#i', $id) || !defined('DECKS_API_URL') || DECKS_API_URL === '') return;

$headers = ['Accept: application/json'];
// The owner's private deck needs the session's token (the relay's, kc_get_access_token refreshes it).
if (kcIsLoggedIn() && defined('KC_URL') && KC_URL !== '' && function_exists('kc_get_access_token')) {
    $token = kc_get_access_token((int)($_SESSION['user_id'] ?? 0));
    if ($token) $headers[] = 'Authorization: Bearer ' . $token;
}
$ch = curl_init(rtrim(DECKS_API_URL, '/') . '/api/decks/' . rawurlencode($id) . '?' . http_build_query(['locale' => getUiLang()]));
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 4]);
$body = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$deck = $code === 200 && is_string($body) ? json_decode($body, true) : null;
if (!is_array($deck) || trim((string)($deck['name'] ?? '')) === '') return;

$pageTitle = trim((string)$deck['name']);
$hero = $deck['stats']['hero']['name'] ?? null;
$formats = ['standard' => 'Standard All Uniques', 'frontier' => 'Frontier', 'nuc' => 'Standard No Unique', 'singleton' => 'Singleton',
            'singleton_nuc' => 'Singleton No Unique', 'sandbox' => 'Sandbox', 'test' => 'Test'];
$format = $formats[$deck['format'] ?? ''] ?? '';
if (is_string($hero) && $hero !== '') $pageDescription = $hero . ($format !== '' ? ' · ' . $format : '');
