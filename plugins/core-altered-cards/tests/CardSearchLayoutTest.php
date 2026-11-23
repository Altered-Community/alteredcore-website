<?php
// Verify card-search.php filter layout parity between cards & deck modes,
// and coherent separation between Simple/Standard card filters vs Uniques filters.

if (!function_exists('h')) {
    function h(string $str): string {
        return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
    }
}
if (!function_exists('getSetting')) {
    function getSetting(string $plugin, string $key, $default = null) {
        return $default;
    }
}

$renderSearchWidget = static function (string $mode, string $prefix): string {
    $_cs = [
        'prefix'   => $prefix,
        'mode'     => $mode,
        'lang'     => 'fr',
        'base_url' => '',
        'data'     => [
            'factions'   => ['AX' => ['fr' => 'Axiom'], 'BR' => ['fr' => 'Bravos']],
            'types'      => [
                'HERO'                => ['fr' => 'Héros'],
                'CHARACTER'           => ['fr' => 'Personnage'],
                'TOKEN'               => ['fr' => 'Jeton'],
                'SPELL'               => ['fr' => 'Sort'],
                'LANDMARK_PERMANENT'  => ['fr' => 'Repère'],
            ],
            'rarities'   => [
                'COMMON' => ['fr' => 'Commune', 'gem' => 'C'],
                'RARE'   => ['fr' => 'Rare',    'gem' => 'R'],
                'UNIQUE' => ['fr' => 'Unique',  'gem' => 'U'],
            ],
            'sets'       => [
                'CORE'   => ['fr' => 'CORE',   'subtype' => 'main', 'uniques' => true],
                'FUGUE'  => ['fr' => 'FUGUE',  'subtype' => 'main', 'uniques' => false],
                'PROMO1' => ['fr' => 'Promo1', 'subtype' => 'sub',  'uniques' => false],
            ],
            'subtypes'   => ['ANIMAL' => ['fr' => 'Animal']],
            'keywords'   => ['FLEETING' => ['fr' => 'Fugace']],
            'variations' => ['standard' => ['fr' => 'Standard']],
        ],
    ];
    ob_start();
    include __DIR__ . '/../includes/card-search.php';
    return (string)ob_get_clean();
};

foreach (['cards' => 'cs', 'deck' => 'db'] as $mode => $prefix) {
    $html = $renderSearchWidget($mode, $prefix);

    assertSame(0, substr_count($html, 'data-tab="unique"'), "{$mode}: separate Uniques tab removed");
    assertSame(0, substr_count($html, 'cs-unique-banner-nudge'), "{$mode}: obsolete Uniques tab nudge removed");
    assertSame(1, substr_count($html, 'class="card-altered p-3 mb-3" data-tabs="all collection ownership favoris"'), "{$mode}: filter card keeps favoris tab visible");
    assertSame(1, substr_count($html, 'class="cs-controlbar mb-2" data-tabs="all collection ownership favoris"'), "{$mode}: results control bar keeps favoris count visible");
    assertSame(1, substr_count($html, 'class="filter-row filter-row--scroll cs-faction-row'), "{$mode}: single primary faction row");
    assertSame(1, substr_count($html, 'data-filter="faction" data-value="AX"'), "{$mode}: faction button is not duplicated in advanced section");
    assertSame(1, substr_count($html, 'class="filter-row filter-row--scroll cs-standard-row mb-2" data-tabs="all collection ownership favoris"'), "{$mode}: rarities/types row cleanly scoped");
    assertSame(1, substr_count($html, 'data-filter="rarity" data-value="COMMON"'), "{$mode}: rarity button rendered once");
    assertSame(1, substr_count($html, '<span class="cs-sep" data-tabs="all ownership"></span>'), "{$mode}: standard-row divider scoped to intersection of rarities and types");
    assertSame(1, substr_count($html, 'class="cs-uniques-section mb-2" data-tabs="all"'), "{$mode}: unified format/effects/support filters available on all tab");
    assertTrue(strpos($html, "id=\"{$prefix}-format-wrap\"") !== false, "{$mode}: format selector rendered inside effects section");
    assertTrue(strpos($html, "id=\"{$prefix}-effect-rows\"") !== false, "{$mode}: effect rows rendered inside effects section");
    assertTrue(strpos($html, "id=\"{$prefix}-support-row\"") !== false, "{$mode}: support row rendered inside effects section");
    assertTrue(strpos($html, "id=\"{$prefix}-filter-hasnoeffect\"") !== false, "{$mode}: hasNoEffect checkbox present in both cards and deck modes");
    assertTrue(strpos($html, "id=\"{$prefix}-filter-cost-relation\"") !== false, "{$mode}: costRelation select present in both cards and deck modes");
    assertTrue(strpos($html, "id=\"{$prefix}-promo-toggle\"") !== false && strpos($html, "id=\"{$prefix}-promo-panel\"") !== false, "{$mode}: alt-arts switch and promo panel both present");

    $posName     = strpos($html, 'cs-name-row');
    $posFactions = strpos($html, 'cs-faction-row');
    $posStandard = strpos($html, 'cs-standard-row');
    $posUniques  = strpos($html, 'cs-uniques-section');
    $posAdv      = strpos($html, 'cs-adv-wrap');
    assertTrue($posName !== false && $posFactions !== false && $posStandard !== false && $posUniques !== false && $posAdv !== false, "{$mode}: all filter zones present");
    assertTrue($posName < $posFactions && $posFactions < $posStandard && $posStandard < $posUniques && $posUniques < $posAdv, "{$mode}: identical section order across cards & deck modes");
    assertSame(false, strpos($html, 'cs-rarity-type-spacer'), "{$mode}: obsolete deck-only rarity spacer removed");
}

$cardsHtml = $renderSearchWidget('cards', 'cs');
$deckHtml  = $renderSearchWidget('deck', 'db');
assertTrue(strpos($cardsHtml, 'data-filter="type" data-value="HERO"') !== false, 'cards: HERO type kept');
assertSame(false, strpos($deckHtml, 'data-filter="type" data-value="HERO"'), 'deck: HERO type omitted');
assertSame(false, strpos($deckHtml, 'data-filter="type" data-value="TOKEN"'), 'deck: TOKEN type omitted');
assertTrue(strpos($deckHtml, 'data-bool-filter="bannedOrSuspended"') !== false, 'deck: bannedOrSuspended toggle used');
assertTrue(strpos($cardsHtml, 'data-bool-filter="isBanned"') !== false && strpos($cardsHtml, 'data-bool-filter="isErrated"') !== false, 'cards: status filter buttons kept');
