<?php
// GET /papi/ownership/shop-list — the alt-art catalogue: what the player does not own yet, priced
// in Alterite.
//
// Read-only by design: this route lists and prices, and nothing else. The purchase is settled by
// external endpoints, so there is no buy route here to call.
//
// Filters mirror the chips on the shop page and are passed straight through to the ownership
// service, which does the matching; skip/take page through the result so the grid can load more
// without shipping the whole catalogue at once. Everything after that — pricing, hiding owned
// prints, the walk past empty pages — is ../includes/shop-list.php, shared with the preview endpoint
// so both answer identically.
require_once __DIR__ . '/../includes/shop-list.php';

header('Content-Type: application/json; charset=UTF-8');

// "auth": "user" in plugin.json already 401s an anonymous caller before this file runs: the
// ownership service answers per player, so there is no anonymous catalogue to serve.

$userId = (int)($_SESSION['user_id'] ?? 0);

$str = static function (string $key): string {
    return isset($_GET[$key]) && is_string($_GET[$key]) ? trim((string)$_GET[$key]) : '';
};

// faction/rarity/type are multi-select chips, so they arrive as repeated keys (faction[]) and are
// normalised to lists; `q` stays a single value. see ownShopFilterValues().
$skip    = max(0, (int)($_GET['skip'] ?? 0));
$filters = [
    'name'    => $str('q'),
    'faction' => ownShopFilterValues($_GET['faction'] ?? null),
    'rarity'  => ownShopFilterValues($_GET['rarity'] ?? null),
    'type'    => ownShopFilterValues($_GET['type'] ?? null),
];
$prices  = ownShopPriceTable();

$list = ownShopPagedList(static function (int $offset) use ($userId, $filters, $prices): array {
    return ownShopBuildList(ownShopSearchPage($userId, $filters + ['skip' => $offset]), $offset, $prices);
}, $skip);

if ($list['error'] !== null) {
    http_response_code(ownShopListHttpStatus($list['error']));
    echo json_encode(['items' => [], 'total' => 0, 'skip' => $skip, 'skipNext' => $skip, 'hasMore' => false, 'balance' => null, 'error' => $list['error']]);
    exit;
}

// Balance rides with the list so the grid has one server response to read. null means this site
// cannot say what the player has, which the page renders as no balance at all — see shop-balance.php.
$list['balance'] = ownShopBalance($userId);
echo json_encode($list);
