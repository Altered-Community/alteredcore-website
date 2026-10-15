<?php
/**
 * The shop's list pipeline: payload -> priced items -> the JSON the grid renders.
 *
 * Both list endpoints are the same code over a different source. api/shop-list.php reads the
 * ownership service; api/shop-preview.php reads the local fixture. Filtering, pricing, paging,
 * error mapping and the balance all live here, so the preview cannot drift from what ships — which
 * is the only reason a preview is worth having when the real service is unreachable.
 *
 * Split out for the same reason as shop-view.php: two pages include one file, and the preview must
 * not be able to differ from production.
 */

declare(strict_types=1);

require_once __DIR__ . '/shop-catalog.php';
require_once __DIR__ . '/shop-balance.php';

/**
 * How many consecutive empty pages to walk past before answering.
 *
 * The source pages by family while the grid shows printings, and a family the player owns in full
 * contributes no items once owned prints are hidden. A page can therefore come back with zero items
 * and more families behind it — rendering that as "no alt art" would claim the catalogue is empty
 * when it is not. The walk skips those pages so a page the client receives always has something on
 * it.
 *
 * Bounded because a player who owns everything is a real answer, not a page to keep pulling: past
 * this many empty pages we return what we have with hasMore left on, and the grid settles.
 */
const OWN_SHOP_MAX_EMPTY_PAGES = 5;

/**
 * Turn one source page into one answer for the grid.
 *
 * Pure: everything that decides what is in the list and what it costs is an argument, so this can
 * be tested against a hand-written payload with no HTTP and no database.
 *
 * @param array{families?:array,options?:array,hasMore?:bool,skipNext?:int,error?:?string} $page
 *        One page as ownShopSearchPage() returns it.
 * @param array<string,int>|null $priceTable Loaded prices, or null to read them here.
 * @return array{items:array,total:int,skip:int,skipNext:int,hasMore:bool,error:?string}
 */
function ownShopBuildList(array $page, int $skip, ?array $priceTable = null): array {
    $error = isset($page['error']) && is_string($page['error']) ? $page['error'] : null;

    $items = [];
    if ($error === null) {
        $options = ownShopOptionsByKey($page['options'] ?? []);
        foreach ((array)($page['families'] ?? []) as $family) {
            if (!is_array($family)) continue;
            foreach (ownShopFamilyItems($family, $options, $priceTable) as $item) {
                $items[] = $item;
            }
        }
    }

    return [
        'items'    => $items,
        // Items on this page, not the size of the catalogue: the source never tells us the total,
        // and the grid only uses this to know whether a page came back thin.
        'total'    => count($items),
        'skip'     => max(0, $skip),
        // The source's own next offset, not the item count. The two are unrelated — a family with
        // three alt arts is one offset and three items — so the client must be handed this rather
        // than left to derive it.
        'skipNext' => (int)($page['skipNext'] ?? $skip),
        'hasMore'  => (bool)($page['hasMore'] ?? false),
        'error'    => $error,
    ];
}

/**
 * Build one page the client can render, skipping past pages that filtering emptied.
 *
 * $fetch receives the offset to ask the source for and returns that page built by ownShopBuildList().
 * It is a callback because the two sources page differently — the service by family, the fixture by
 * family too, but the walk is the same problem either way.
 *
 * The answer carries no extra flag for "the catalogue is finished": the client can tell from an
 * empty `items`, which is the only thing it would act on.
 *
 * @param callable(int):array<string,mixed> $fetch
 * @return array<string,mixed>
 */
function ownShopPagedList(callable $fetch, int $skip, int $maxEmptyPages = OWN_SHOP_MAX_EMPTY_PAGES): array {
    $list    = $fetch(max(0, $skip));
    $empties = 0;

    while ($list['items'] === [] && $list['hasMore'] && $list['error'] === null && $empties < $maxEmptyPages) {
        if ($list['skipNext'] <= $list['skip']) break; // the source is not advancing; stop rather than loop
        $list    = $fetch((int)$list['skipNext']);
        $empties++;
    }

    return $list;
}

/**
 * The status code for a failed list.
 *
 * 503 when the deployment has no ownership service configured at all, 502 when it is configured but
 * unreachable — the page says which, because only the second is worth retrying.
 */
function ownShopListHttpStatus(?string $error): int {
    if ($error === null) return 200;
    return $error === 'not_configured' ? 503 : 502;
}
