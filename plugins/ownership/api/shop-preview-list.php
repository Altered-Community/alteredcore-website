<?php
// GET /papi/ownership/shop-preview-list — the shop's list, answered from the local fixture instead
// of the ownership service.
//
// Exists so the preview page exercises the production pipeline rather than a second implementation
// of it: this file and api/shop-list.php differ only in where the families come from, and both call
// ../includes/shop-list.php for filtering, pricing, hiding owned prints and paging. A behaviour
// found here was therefore found in production too.
//
// Only differs in two deliberate ways, both because there is no service to imitate:
//   - it pages in smaller family pages, so "load more" and the walk past empty pages are actually
//     exercised by a 30-family fixture;
//   - a missing fixture is a 503 with preview_unavailable rather than a silent empty list, so the
//     page can say the preview is not installed instead of claiming the catalogue is empty.
require_once __DIR__ . '/../includes/shop-list.php';

header('Content-Type: application/json; charset=UTF-8');

/** Families per preview page. Small on purpose: the fixture is small. */
const OWN_SHOP_PREVIEW_PAGE_SIZE = 8;

$fixtureFile = dirname(__DIR__) . '/pages/shop-preview.json';

$fail = static function (string $why): void {
    http_response_code(503);
    echo json_encode(['items' => [], 'total' => 0, 'skip' => 0, 'skipNext' => 0, 'hasMore' => false, 'balance' => null, 'error' => $why]);
    exit;
};

if (!is_file($fixtureFile)) $fail('preview_unavailable');

$fixture = json_decode((string)file_get_contents($fixtureFile), true);
if (!is_array($fixture) || !is_array($fixture['families'] ?? null)) $fail('preview_unavailable');

$str = static function (string $key): string {
    return isset($_GET[$key]) && is_string($_GET[$key]) ? trim((string)$_GET[$key]) : '';
};

$skip = max(0, (int)($_GET['skip'] ?? 0));
$name = mb_strtolower($str('q'));

// Multi-select chips: each of faction/rarity/type may arrive as a repeated key, and a family matches
// when it is in every selected group (OR within a group, AND across groups). An empty group means
// "no opinion on this one", exactly like the live endpoint's pass-through to the service.
$factions = ownShopFilterValues($_GET['faction'] ?? null);
$rarities = ownShopFilterValues($_GET['rarity'] ?? null);
$types    = ownShopFilterValues($_GET['type'] ?? null);

$inList = static function (array $list, $value): bool {
    $value = strtoupper((string)$value);
    foreach ($list as $candidate) {
        if (strtoupper((string)$candidate) === $value) return true;
    }
    return false;
};

$matches = static function (array $family) use ($name, $factions, $rarities, $types, $inList): bool {
    if ($name !== '' && mb_strpos(mb_strtolower((string)($family['name'] ?? '')), $name) === false) return false;
    if ($factions !== [] && !$inList($factions, $family['faction'] ?? '')) return false;
    if ($rarities !== [] && !$inList($rarities, $family['rarity'] ?? '')) return false;
    return $types === [] || $inList($types, $family['cardType'] ?? '');
};

$all = array_values(array_filter($fixture['families'], static fn($f) => is_array($f) && $matches($f)));

$page  = array_slice($all, $skip, OWN_SHOP_PREVIEW_PAGE_SIZE);
$count = count($page);

$list = ownShopBuildList([
    'families' => $page,
    'options'  => $fixture['options'] ?? [],
    'hasMore'  => $skip + $count < count($all),
    'skipNext' => $skip + $count,
    'error'    => null,
], $skip, ownShopPriceTable());

$list['balance'] = isset($fixture['balance']) && is_numeric($fixture['balance'])
    ? max(0, (int)$fixture['balance'])
    : null;

echo json_encode($list);
