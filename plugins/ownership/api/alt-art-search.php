<?php
// GET /papi/ownership/alt-art-search — proxies GET /api/alt-arts/search on
// OWNERSHIP_API_URL, which returns one page of the payload pages/alt-arts.php's JS needs:
// the multi-art families matching the filters, plus each one's printings/owned
// quantities/current slot choices, already paginated and "hide non-choices"-filtered
// server-side (the ownership check that rule needs isn't available to this page's own
// filters, and re-running it here after the fact would mean fetching the whole matching
// catalog just to throw most of it away).
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=UTF-8');

if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'Ownership API not configured']);
    exit;
}

if (!kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

$parts = [];
$loc = is_string($_GET['locale'] ?? null) && $_GET['locale'] !== '' ? $_GET['locale'] : getLang();
$parts[] = 'locale=' . rawurlencode($loc);

if (isset($_GET['name']) && is_string($_GET['name']) && $_GET['name'] !== '') {
    $parts[] = 'name=' . rawurlencode($_GET['name']);
}
foreach ((array)($_GET['faction'] ?? []) as $f) {
    if (is_string($f) && $f !== '') $parts[] = 'faction[]=' . rawurlencode($f);
}
$types = [];
foreach ((array)($_GET['type'] ?? []) as $ty) {
    if (is_string($ty) && $ty !== '') $types[] = $ty;
}

// PerDeck mode: this page only manages token illustrations — regular card alt-arts are
// chosen per deck in the deckbuilder instead (see AltArtPreferenceMode). Enforced here,
// not just by which filter buttons pages/alt-arts.php renders, so a caller can't bypass
// it by requesting a non-token type directly.
if (!ownIsAltArtGlobalMode($userId)) {
    $types = array_values(array_filter($types, fn($ty) => str_starts_with($ty, 'TOKEN')));
    if (!$types) {
        $types = ['TOKEN', 'TOKEN_LANDMARK_PERMANENT', 'TOKEN_MANA'];
    }
}

foreach ($types as $ty) {
    $parts[] = 'type[]=' . rawurlencode($ty);
}

foreach ((array)($_GET['rarity'] ?? []) as $r) {
    if (is_string($r) && $r !== '') $parts[] = 'rarity[]=' . rawurlencode($r);
}
if (isset($_GET['mainCost']) && is_string($_GET['mainCost']) && $_GET['mainCost'] !== '') {
    $parts[] = 'mainCost=' . rawurlencode($_GET['mainCost']);
}

$hideNonChoices = !isset($_GET['hideNonChoices']) || $_GET['hideNonChoices'] !== 'false';
$parts[] = 'hideNonChoices=' . ($hideNonChoices ? 'true' : 'false');

$skip = max(0, (int)($_GET['skip'] ?? 0));
$parts[] = 'skip=' . $skip;
// One "page" here is one render batch in js/alt-arts.js, which advances skip by however
// many families it received rather than assuming this exact page size itself.
$parts[] = 'take=25';

$path = '/api/alt-arts/search' . '?' . implode('&', $parts);
[$status, $raw] = ownApiRequestRaw('GET', $path, $userId);
if ($raw === null || $status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

$result = json_decode($raw, true);
if (!is_array($result)) $result = [];
$families = $result['families'] ?? [];
$optionGroups = $result['options'] ?? [];

// /api/alt-arts/search already applies type[] itself (AltArtFamilyQuery.CardTypes);
// this is just a defensive re-check against the family's own cardType field.
if ($types) {
    $families = array_values(array_filter($families, fn($f) => in_array($f['cardType'] ?? null, $types, true)));
}

$options = [];
foreach ($optionGroups as $g) {
    $key = $g['familyId'] . ':' . $g['faction'] . ':' . $g['rarity'];
    $options[$key] = $g;
}

echo json_encode(['families' => $families, 'options' => $options, 'hasMore' => (bool)($result['hasMore'] ?? false)]);
