<?php
/**
 * Alt-art catalogue: reference parsing, pricing, the mapping from one ownership-service family to
 * the shop's listing items, and the paging walk that follows from hiding owned prints.
 *
 * The HTTP call itself needs a Keycloak token and is exercised by the stack, so what is tested here
 * is everything decided before it: which references are alt arts, what things cost, what a family
 * turns into, and what happens when the answer is "nothing to sell".
 */

$plugin = dirname(__DIR__) . '/plugins/ownership';
require_once $plugin . '/includes/shop-list.php';

// Stubbed: shop-catalog.php resolves these, and the mapping under test must not depend on session
// state or on the site's configuration being loaded.
if (!function_exists('getLang')) {
    function getLang(): string { return 'en'; }
}
if (!function_exists('getUiLang')) {
    function getUiLang(): string { return 'en'; }
}

echo "-- reference parsing\n";

assertSame(true, ownShopIsAltReference('ALT_CORE_A_AX_31_C'), 'an alt-art print is recognised');
assertSame(false, ownShopIsAltReference('ALT_CORE_B_AX_31_C'), 'the standard print of the same family is not');
assertSame(false, ownShopIsAltReference('CORE_B_AX_31_C'), 'a plain card is not an alt print');
assertSame(false, ownShopIsAltReference('ALT_CORE_A_AX_31_C_EXTRA'), 'a longer reference is not guessed at');
assertSame(false, ownShopIsAltReference(''), 'an empty reference is not an alt print');

echo "-- prices come from the table, keyed on rarity and card type\n";

// The service reports a family's rarity as the gem letter ("C"), not the name — the same code its
// own rarity[] filter takes. Keying prices on "COMMON" instead would silently leave every alt art
// unpriced, so the letters are what the table is tested against.
$prices = ['C|TOKEN' => 500, 'U|HERO' => 8000];

assertSame(500, ownShopPriceInTable($prices, 'C', 'TOKEN'), 'a seeded combination is priced');
assertSame(8000, ownShopPriceInTable($prices, 'u', 'hero'), 'the key is matched case-insensitively');
assertSame(null, ownShopPriceInTable($prices, 'C', 'HERO'), 'the same rarity in another card type is a different product');
assertSame(null, ownShopPriceInTable($prices, 'U', 'TOKEN'), 'an unlisted card type has no price');
assertSame(null, ownShopPriceInTable($prices, 'X', 'TOKEN'), 'an unknown rarity has no price either');

// The rule that matters most: no price must never become a price. A fallback tier would quote one
// print at another print's price, and the player would read that as an offer.
assertSame(null, ownShopPriceInTable([], 'C', 'TOKEN'), 'an empty table prices nothing rather than everything free');
assertSame(500, ownShopPriceInTable($prices, ' C ', ' TOKEN '), 'surrounding whitespace is not a different rarity');
assertSame(null, ownShopPriceInTable($prices, 'C ', ''), 'a rarity with no card type prices nothing');
assertSame(null, ownShopPrice('C', 'TOKEN', []), 'ownShopPrice with an injected empty table agrees');

echo "-- the currency\n";

assertSame('Alterite', ownShopCurrencyName('en'), 'the currency is Alterite in English');
assertSame('Altérite', ownShopCurrencyName('fr'), 'and Altérite in French');
assertSame(true, strpos(ownShopCurrencyIcon(), 'web-app-manifest-192x192.png') !== false,
    'the currency mark is the site icon, reused rather than a new file');

echo "-- one family becomes one item per alt print it can still sell\n";

$family = [
    'familyId' => 7,
    'rarity'   => 'R',
    'faction'  => 'AX',
    'cardType' => 'TOKEN',
    'name'     => 'Brassbug',
];
$options = [
    '7:AX:R' => [
        'familyId' => 7,
        'faction'  => 'AX',
        'rarity'   => 'R',
        'copies'   => 3,
        'options'  => [
            ['reference' => 'ALT_CORE_B_AX_31_C', 'ownedQuantity' => 2],  // standard, unlimited
            ['reference' => 'ALT_CORE_A_AX_31_C', 'ownedQuantity' => 0],
            ['reference' => 'ALT_SETS2_A_AX_88_R', 'ownedQuantity' => null],
        ],
    ],
];

$items = ownShopFamilyItems($family, $options, ['R|TOKEN' => 3000]);
assertSame(2, count($items), 'only the alt prints are listed, the standard print is not for sale');
assertSame('ALT_CORE_A_AX_31_C', $items[0]['reference'] ?? null, 'prints keep the service order');
assertSame('Brassbug', $items[0]['name'] ?? null, 'the item carries the name the service localised');
assertSame(3000, $items[0]['price'] ?? null, 'the item is priced from rarity and card type');
assertSame('TOKEN', $items[0]['cardType'] ?? null, 'the item keeps the card type its price was keyed on');
assertSame(true, strpos((string)($items[0]['image'] ?? ''), '/cards/en/CORE/ALT_CORE_A_AX_31_C.webp') !== false,
    'the image path is derived from the reference, set segment included');

assertSame([], ownShopFamilyItems($family, [], []), 'a family with no option group lists nothing');
assertSame([], ownShopFamilyItems(['familyId' => 7, 'rarity' => 'R', 'faction' => 'AX'], $options, []),
    'a family with no name is skipped rather than listed blank');
assertSame([], ownShopFamilyItems($family, ['7:AX:R' => ['options' => 'not-an-array']], []),
    'a malformed option group lists nothing instead of warning');

echo "-- a print the player owns is not for sale\n";

// The shop answers "what can I buy", so an owned print is absent rather than labelled. A visible but
// dead price reads as an offer, and a greyed-out tile still invites the click.
$ownedPrint = ownShopFamilyItems($family, [
    '7:AX:R' => ['options' => [
        ['reference' => 'ALT_CORE_A_AX_31_C', 'ownedQuantity' => 2],
        ['reference' => 'ALT_SETS2_A_AX_88_R', 'ownedQuantity' => 0],
    ]],
], []);
assertSame(1, count($ownedPrint), 'the owned print is dropped from the list');
assertSame('ALT_SETS2_A_AX_88_R', $ownedPrint[0]['reference'] ?? null, 'and only the unowned one is left');

// Silence from the service is not proof of ownership, and hiding a print the player does not have
// would be the worse of the two errors.
$unknown = ownShopFamilyItems($family, [
    '7:AX:R' => ['options' => [
        ['reference' => 'ALT_CORE_A_AX_31_C', 'ownedQuantity' => null],
        ['reference' => 'ALT_SETS2_A_AX_88_R', 'ownedQuantity' => 0],
    ]],
], []);
assertSame(2, count($unknown), 'an unreported owned count stays listed');
assertSame(true, array_key_exists('owned', $unknown[0]) && $unknown[0]['owned'] === null,
    'and it says null rather than claiming zero');

$fullyOwned = ownShopFamilyItems($family, [
    '7:AX:R' => ['options' => [
        ['reference' => 'ALT_CORE_A_AX_31_C', 'ownedQuantity' => 1],
        ['reference' => 'ALT_SETS2_A_AX_88_R', 'ownedQuantity' => 4],
    ]],
], []);
assertSame([], $fullyOwned, 'a family the player owns in full contributes nothing');

echo "-- one source page becomes one answer\n";

$page = [
    'families' => [$family],
    'options'  => array_values($options),
    'hasMore'  => true,
    'skipNext' => 50,
    'error'    => null,
];

$list = ownShopBuildList($page, 0, ['R|TOKEN' => 3000]);
assertSame(2, $list['total'], 'both unowned prints come back');
assertSame(0, $list['skip'], 'the answer echoes the offset it was asked for');
assertSame(50, $list['skipNext'], "the source's own offset, not the item count");
assertSame(true, $list['hasMore'], 'and the source verdict on there being more');
assertSame(null, $list['error'], 'a page that worked reports no error');

// The option groups are re-keyed by the builder, so a caller may hand it the raw payload.
assertSame(2, count(ownShopBuildList($page, 0, [])['items']), 'the builder keys the option groups itself');

$failed = ownShopBuildList(['error' => 'upstream_error'], 0, []);
assertSame([], $failed['items'], 'a failed call yields no items');
assertSame('upstream_error', $failed['error'], 'and says why');
assertSame(502, ownShopListHttpStatus('upstream_error'), 'a configured but unreachable service is a 502');
assertSame(503, ownShopListHttpStatus('not_configured'), 'a server with no service at all is a 503');
assertSame(200, ownShopListHttpStatus(null), 'a page that worked is a 200');

echo "-- a page with nothing to sell is walked past\n";

// This is the bug the owned filter creates: paging is by family, so a page can come back with no
// items and still have families behind it. Answering that page as-is would tell the player the
// catalogue is empty when it is not.
$calls = [];
$fetcher = static function (int $offset) use (&$calls, $family, $options): array {
    $calls[] = $offset;
    if ($offset === 0) {
        // A page whose only family is already owned in full.
        return ownShopBuildList([
            'families' => [$family],
            'options'  => [['familyId' => 7, 'faction' => 'AX', 'rarity' => 'R', 'options' => [
                ['reference' => 'ALT_CORE_A_AX_31_C', 'ownedQuantity' => 1],
            ]]],
            'hasMore'  => true,
            'skipNext' => 8,
            'error'    => null,
        ], $offset, []);
    }
    return ownShopBuildList([
        'families' => [$family],
        'options'  => $options,
        'hasMore'  => false,
        'skipNext' => 16,
        'error'    => null,
    ], $offset, []);
};

$walked = ownShopPagedList($fetcher, 0);
assertSame([0, 8], $calls, 'the walk asked the source for the next page');
assertSame(2, count($walked['items']), 'and answers with the page that did have something');
assertSame(false, $walked['hasMore'], 'and carries the verdict of the page it settled on, not the one it walked past');
assertSame(16, $walked['skipNext'], 'the client continues from the offset that produced the items');

// A catalogue the player owns entirely is a real answer, so the walk is bounded rather than
// unbounded: it stops and says so instead of pulling every remaining page.
$neverCalls = 0;
$neverAny = static function (int $offset) use (&$neverCalls): array {
    $neverCalls++;
    return ownShopBuildList(['families' => [], 'options' => [], 'hasMore' => true, 'skipNext' => $offset + 8], $offset, []);
};
$bound = ownShopPagedList($neverAny, 0, 2);
assertSame(3, $neverCalls, 'the walk gave up after the bound it was given, rather than paging forever');
assertSame([], $bound['items'], 'and reports nothing to sell, which the client renders as empty');
assertSame(24, $bound['skipNext'], 'the offset it stopped at is where a client would resume');

// A source that does not advance would loop forever on the same page.
$stuckCalls = 0;
$stuck = static function (int $offset) use (&$stuckCalls): array {
    $stuckCalls++;
    return ownShopBuildList(['families' => [], 'options' => [], 'hasMore' => true, 'skipNext' => $offset], $offset, []);
};
assertSame([], ownShopPagedList($stuck, 40)['items'], 'a source stuck on one offset still answers');
assertSame(1, $stuckCalls, 'and is asked only once rather than spun on');

echo "-- faction labels and colour tokens\n";

$factions = ['AX' => ['en' => 'Axiom', 'fr' => 'Axiom'], 'BR' => ['en' => 'Bravos', 'fr' => 'Bravos']];
assertSame('Bravos', ownShopFactionLabel('BR', $factions), 'the faction name comes from the cards data');
assertSame('Bravos', ownShopFactionLabel('br', $factions), 'a lowercase code still resolves');
assertSame('ZZ', ownShopFactionLabel('ZZ', $factions), 'an unknown code falls back to the code itself');
assertSame('axiom', ownShopFactionToken('AX'), 'the colour token is named after the faction, not the code');
assertSame('', ownShopFactionToken('ZZ'), 'a faction with no token gets no dot rather than a broken var()');

echo "-- rarity labels\n";

assertSame('Common', ownShopRarityName('C'), 'rarities are labelled for the chips');
assertSame('Rare', ownShopRarityName('r'), 'the label lookup is case-insensitive too');
assertSame('X', ownShopRarityName('X'), 'an unknown rarity is shown as itself');

echo "-- card types the shop prices\n";

assertSame('Character', ownShopCardTypeName('CHARACTER'), 'a card type is labelled for the chip');
assertSame('Jeton', ownShopCardTypeName('TOKEN', 'fr'), 'and localised in French');
assertSame('Token', ownShopCardTypeName('token'), 'the label lookup is case-insensitive too');
assertSame('X', ownShopCardTypeName('X'), 'an unknown card type is shown as itself');
foreach (array_keys(ownShopCardTypeTiers()) as $code) {
    $seeded = false;
    foreach (ownShopPriceRows() as $row) {
        if ($row['cardType'] === $code) { $seeded = true; break; }
    }
    assertSame(true, $seeded, "the $code filter has a priced row behind it, so it cannot list nothing");
}

echo "-- filters accept one value or many\n";

assertSame(['AX', 'BR'], ownShopFilterValues(['AX', ' BR ', '']), 'a repeated filter is trimmed and blanks dropped');
assertSame(['TOKEN'], ownShopFilterValues(' TOKEN '), 'a scalar filter is read as a one-item list');
assertSame([], ownShopFilterValues(null), 'no filter is an empty list, not a null entry');
assertSame(['42'], ownShopFilterValues(42), 'a numeric filter is taken as its string form');
assertSame([], ownShopFilterValues([['nested'], null, ['k' => 'v']]), 'a non-scalar value is ignored rather than cast to nonsense');

$q = ownShopSearchQuery(['name' => 'Brass', 'faction' => ['AX', 'BR'], 'rarity' => 'C', 'type' => ['TOKEN']], 50);
assertSame(true, strpos($q, 'name=Brass') !== false, 'the search term rides along');
assertSame(2, substr_count($q, 'faction[]='), 'every selected faction is sent, not only the last');
assertSame(true, strpos($q, 'faction[]=AX') !== false && strpos($q, 'faction[]=BR') !== false, 'both faction values survive');
assertSame(true, strpos($q, 'rarity[]=C') !== false, 'a single-value group is still sent as a repeated key');
assertSame(true, strpos($q, 'type[]=TOKEN') !== false, 'the card type filter reaches the service');
assertSame(true, strpos($q, 'skip=50') !== false, 'the offset is carried through');
assertSame(0, substr_count($q, 'name[]'), 'the search term never gets a bracket the service cannot read');

echo "-- the seeded price rows cover what the catalogue contains\n";

$seeded = [];
foreach (ownShopPriceRows() as $row) {
    $seeded[ownShopPriceKey($row['rarity'], $row['cardType'])] = $row['price'];
}
foreach (['C|TOKEN', 'R|SPELL', 'U|HERO', 'R|LANDMARK_PERMANENT', 'U|CHARACTER', 'C|CHARACTER'] as $key) {
    assertSame(true, array_key_exists($key, $seeded), "a fresh install prices $key without an admin visit");
}
assertSame(500, $seeded['C|TOKEN'] ?? null, 'a common costs the common figure');
assertSame(8000, $seeded['U|HERO'] ?? null, 'a unique hero costs the unique figure');

echo "-- a submitted price form is applied, and only where it is sane\n";

// With no database behind it, every write is refused and nothing is claimed as saved — the shape of
// the answer is what matters here, not the rows it would have touched.
$noDb = ownShopSavePrices(['C|TOKEN' => '750'], []);
assertSame(0, $noDb['saved'], 'no row is saved when there is nowhere to save it');
assertSame(0, $noDb['invalid'], 'and a well-formed field is not blamed for that');
assertSame(true, $noDb['error'], 'the failure is reported as one');

// The rules a plain read-modify-write gets wrong, checked without a database by looking at what the
// function refused to coerce before it reached one.
$rejected = ownShopSavePrices([
    'C|TOKEN'    => '12 500',   // a pasted figure with a separator
    'R|SPELL'    => '-40',      // negative
    'U|HERO'     => '1e5',      // not an integer literal
    'C|HERO'     => 'abc',
    'TOKEN'      => '500',      // not a rarity|cardType key
    'R|'         => '500',      // half a key
    '|SPELL'     => '500',
], []);
assertSame(7, $rejected['invalid'], 'every malformed entry is refused rather than coerced');
assertSame(0, $rejected['saved'], 'and none of them is stored');

$blank = ownShopSavePrices(['C|TOKEN' => '', 'R|SPELL' => '   '], ['C|TOKEN' => 500]);
assertSame(0, $blank['saved'], 'an empty field saves nothing');
assertSame(0, $blank['invalid'], 'and is not an error either');
assertSame(500, $blank['table']['C|TOKEN'] ?? null,
    'a blank field leaves the stored price alone rather than making the alt art free');
