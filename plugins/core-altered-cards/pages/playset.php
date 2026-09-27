<?php
// Dedicated page for the "Physical Playset" dashboard (Profile G — Player
// playset). It embeds core-altered-cards' own card search widget forced to
// its already-built "playset" scope via ?tab=playset (read client-side by
// card-search.js), with the tab switcher hidden below so this page only ever
// shows that one scope — same pattern as ownership/pages/collection.php uses
// for the "Digital Ownership" scope.
require_once __DIR__ . '/../includes/functions.php';
$lang   = getLang();
$uiLang = getUiLang();

$txt = [
    'en' => ['page_title' => 'Physical Playset', 'login_prompt' => 'Log in to track your physical playset.',
             'btn_login' => 'Log in', 'back_cards' => 'Cards',
             'unavailable' => 'The physical collection feature is not enabled on this site.'],
    'fr' => ['page_title' => 'Playset physique', 'login_prompt' => 'Connectez-vous pour suivre votre playset physique.',
             'btn_login' => 'Se connecter', 'back_cards' => 'Cartes',
             'unavailable' => "La fonctionnalité de collection physique n'est pas activée sur ce site."],
][$uiLang];

$pageTitle    = $txt['page_title'];
$collEnabled  = defined('COLLECTION_MODE') && COLLECTION_MODE;
$loggedIn     = kcIsLoggedIn();

// The widget's initial tab is entirely driven by the URL's own ?tab= query
// string (read client-side from location.search), so a visitor landing here
// without it needs to be sent to the URL that actually carries it.
if ($collEnabled && $loggedIn && ($_GET['tab'] ?? '') !== 'playset') {
    redirect(BASE_URL . '/pages/playset?tab=playset');
}
?>
<div class="container py-4">

    <?php if (!$collEnabled): ?>
    <div class="alert alert-warning"><?= h($txt['unavailable']) ?></div>
    <?php elseif (!$loggedIn): ?>
    <div class="card-altered p-4">
        <p class="mb-2 text-muted"><?= h($txt['login_prompt']) ?></p>
        <a href="<?= h(BASE_URL) ?>/pages/login" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-right-to-bracket me-1"></i><?= h($txt['btn_login']) ?>
        </a>
    </div>
    <?php else:

    // static data
    $setsData        = loadAlteredData('sets');
    $subtypesData    = loadAlteredData('subtypes');
    $raritiesData    = loadAlteredData('rarities');
    $factionsData    = loadAlteredData('factions');
    $keywordsData    = loadAlteredData('keywords');
    $typesData       = loadAlteredData('types');
    $typesMergedData = loadAlteredData('types_merged');
    $variationsData  = loadAlteredData('variations');

    $validFactions = array_keys($factionsData);
    $validTypes    = array_keys($typesData);

    $_mergedKeys = array_keys($typesMergedData);
    $_absorbedTypes = [];
    foreach ($typesMergedData as $_mk => $_mvs) {
        foreach ($_mvs as $_mv) {
            if (!in_array($_mv, $_mergedKeys, true)) $_absorbedTypes[$_mv] = true;
        }
    }
    $typesDataDisplay = array_diff_key($typesData, $_absorbedTypes);
    $validSets     = array_keys($setsData);
    $validRarities = array_keys($raritiesData);

    $_ss        = loadSearchSettings();
    $_sharedTxt = $_ss['translations'][$uiLang] ?? [];
    $cacTxt     = array_merge($_sharedTxt, [
        'en' => ['page_title' => 'Cards', 'search_ph' => 'Search cards…'],
        'fr' => ['page_title' => 'Cartes', 'search_ph' => 'Rechercher par nom…'],
    ][$uiLang] ?? []);
    $validSorts = array_keys($cacTxt['sorts'] ?? []);
    if (empty($validSorts)) $validSorts = ['default'];

    $defaultFactions   = array_values(array_intersect((array)($_ss['default_factions']   ?? []), $validFactions));
    $defaultSets       = array_values(array_intersect((array)($_ss['default_sets']       ?? []), $validSets));
    $defaultRarities   = array_values(array_intersect((array)($_ss['default_rarities']   ?? []), $validRarities));
    $defaultTypes      = array_values(array_intersect((array)($_ss['default_types']      ?? []), $validTypes));
    $defaultVariations = array_values(array_intersect((array)($_ss['default_variations'] ?? []), array_keys($variationsData)));
    $defaultCollection = $_ss['default_collection'] ?? 'official';
    $_raw1        = $_ss['default_sort_1'] ?? 'default';
    $_raw2        = $_ss['default_sort_2'] ?? null;
    $defaultSort1 = in_array($_raw1, $validSorts) ? $_raw1 : 'default';
    $defaultSort2 = ($_raw2 && in_array($_raw2, $validSorts)) ? $_raw2 : null;
    $_defaultCols = max(2, min(5, (int)($_ss['default_cols'] ?? 4)));

    $_csUserId    = (int)($_SESSION['user_id'] ?? 0);
    $_collMode    = true; // gated above: $collEnabled && $loggedIn

    $setOptionsJson = json_encode(array_values(array_map(
        function($ref, $set) use ($uiLang) {
            return ['value' => $ref, 'text' => $set[$uiLang] ?? $set['en'], 'icon' => $set['icon'] ?? '',
                    'type' => $set['type'] ?? 'official', 'publisher' => $set['publisher'] ?? 'Equinox', 'subtype' => $set['subtype'] ?? 'main'];
        },
        array_keys($setsData), array_values($setsData)
    )));
    $subtypeOptionsJson = json_encode(array_values(array_map(
        function($code, $names) use ($uiLang) { return ['value' => $code, 'text' => $names[$uiLang] ?? $names['en']]; },
        array_keys($subtypesData), array_values($subtypesData)
    )));
    $keywordOptionsJson = json_encode(array_values(array_map(
        function($code, $names) use ($uiLang) { return ['value' => $code, 'text' => $names[$uiLang] ?? $names['en']]; },
        array_keys($keywordsData), array_values($keywordsData)
    )));
    $variationOptionsJson = json_encode(array_values(array_map(
        function($code, $names) use ($uiLang) { return ['value' => $code, 'text' => $names[$uiLang] ?? $names['en']]; },
        array_keys($variationsData), array_values($variationsData)
    )));

    $setChildren = [];
    $subSets     = [];
    foreach ($setsData as $_sref => $_sd) {
        if (($_sd['subtype'] ?? '') !== 'sub') continue;
        $subSets[] = $_sref;
        if (!empty($_sd['parent'])) $setChildren[$_sd['parent']][] = $_sref;
    }
    $noUniqueSets = array_values(array_keys(array_filter($setsData, fn($s) => ($s['uniques'] ?? true) === false)));

    // Playset heatmap metadata: faction rows (canonical order, with colors) and the
    // main-set columns ordered chronologically descending (recent first).
    $playsetFactions = [];
    foreach ($factionsData as $_fk => $_fv) {
        $playsetFactions[] = ['code' => $_fk, 'name' => $_fv[$uiLang] ?? $_fv['en'] ?? $_fk, 'color' => $_fv['color'] ?? '#888'];
    }
    $_psCoreNote = $_sharedTxt['playset']['core_note'] ?? ($uiLang === 'fr'
        ? 'Regroupe les éditions Au-delà des Portes (CORE) et sa version Kickstarter (COREKS).'
        : 'Combines the Beyond the Gates (CORE) edition and its Kickstarter version (COREKS).');
    $playsetSets = [];
    foreach (array_reverse(array_filter($setsData, fn($s) => ($s['subtype'] ?? '') === 'main'), true) as $_sk => $_sv) {
        $_entry = ['code' => $_sk, 'name' => $_sv[$uiLang] ?? $_sv['en'] ?? $_sk, 'icon' => $_sv['icon'] ?? ''];
        if ($_sk === 'CORE') $_entry['note'] = $_psCoreNote;
        $playsetSets[] = $_entry;
    }
    $playsetSetBg       = BASE_URL . '/plugins/core-altered-cards/assets/set/small_bg/';
    $playsetFactionIcon = BASE_URL . '/plugins/core-altered-cards/assets/faction/';
    $playsetGemBase     = BASE_URL . '/plugins/core-altered-cards/assets/gems/';
    $playsetRarities = [];
    foreach (['COMMON', 'RARE', 'EXALTED'] as $_rk) {
        if (!isset($raritiesData[$_rk])) continue;
        $playsetRarities[$_rk] = ['name' => $raritiesData[$_rk][$uiLang] ?? $raritiesData[$_rk]['en'] ?? $_rk,
                                   'gem'  => $raritiesData[$_rk]['gem'] ?? substr($_rk, 0, 1)];
    }
    $playsetTypes = [];
    foreach ($typesData as $_tk => $_tv) {
        $playsetTypes[$_tk] = $_tv[$uiLang] ?? $_tv['en'] ?? $_tk;
    }

    // widget config for card-search.php — forced onto the "playset" tab, with
    // every other tab/section (all/unique/collection/ownership/favoris) hidden
    // below since this page only ever exposes the playset dashboard.
    $_cs = [
        'prefix'  => 'cs',
        'mode'    => 'cards',
        'lang'    => $uiLang,
        'txt'     => $cacTxt,
        'data'    => [
            'factions' => $factionsData, 'types' => $typesDataDisplay, 'rarities' => $raritiesData,
            'sets' => $setsData, 'subtypes' => $subtypesData, 'keywords' => $keywordsData, 'variations' => $variationsData,
        ],
        'defaults' => [
            'types' => $defaultTypes, 'rarities' => $defaultRarities, 'sets' => $defaultSets, 'variations' => $defaultVariations,
            'collection' => $defaultCollection, 'sort1' => $defaultSort1, 'sort2' => $defaultSort2, 'cols' => $_defaultCols,
            'perPage' => CARDS_DISPLAY_PER_PAGE,
        ],
        'selected' => ['q' => '', 'faction' => [], 'type' => [], 'rarity' => [], 'sets' => [], 'sort' => 'default'],
        'col_options' => [1, 2, 3, 4, 5],
        'show_cols'   => true,
        'collection_mode' => $_collMode, 'collection_enabled' => $collEnabled,
        'ownership_mode'  => false, 'ownership_enabled' => false, 'ownership_url' => '',
        'playset_mode'    => $_collMode, 'favorites_mode' => false,
        'base_url'        => BASE_URL,
    ];
    ?>

    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($pageTitle) ?></span></div>
        <a href="<?= h(BASE_URL) ?>/pages/cards" class="btn btn-outline-secondary btn-sm">
            <i class="fa-solid fa-arrow-left me-1"></i><?= h($txt['back_cards']) ?>
        </a>
    </div>

    <!-- This page only ever shows the "playset" scope of the widget below
         (forced via ?tab=playset, read by card-search.js on load) — the tab
         switcher that would let a visitor jump to another scope is hidden
         since it has nothing else to show on this page. -->
    <style>#cs-panel .cs-tabs { display: none; }</style>

    <?php include __DIR__ . '/../includes/card-search.php'; ?>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/css/tom-select.bootstrap5.min.css">
    <script src="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/js/tom-select.complete.min.js"></script>
    <script src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/card-search-playset.js"></script>
    <script src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/card-search.js"></script>
    <script>
    CardSearch({
        debug:       <?= (defined('API_RESPONSE_DEBUG') && API_RESPONSE_DEBUG) ? 'true' : 'false' ?>,
        apiBase:     <?= json_encode(defined('CARDS_API_URL') ? CARDS_API_URL : 'https://cards.alteredcore.org') ?>,
        uniquesApiBase: <?= json_encode(defined('UNIQUES_API_URL') ? UNIQUES_API_URL : '') ?>,
        lang:        <?= json_encode($lang) ?>,
        uiLang:      <?= json_encode($uiLang) ?>,
        prefix:      'cs',
        mode:        'cards',
        cdnUrl:      <?= json_encode(CDN_URL) ?>,
        rendererSrc: 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js',
        cardDetailUrl: <?= json_encode(BASE_URL . '/pages/card') ?>,
        pushState:   true,
        autoSearch:  false,
        closeFiltersOnSearch: true,
        collectionMode:    true,
        collectionData:    {},
        collectionEntries: {},
        collectionCsrf:    <?= json_encode(csrfToken()) ?>,
        collectionUrl:     <?= json_encode(BASE_URL . '/pages/collection') ?>,
        collApiUrl:        <?= json_encode(BASE_URL . '/papi/core-altered-cards/collection-search') ?>,
        ownershipApiUrl:   '',
        playsetApiUrl:     <?= json_encode(BASE_URL . '/papi/core-altered-cards/playset') ?>,
        playsetCardsApiUrl:<?= json_encode(BASE_URL . '/papi/core-altered-cards/playset-cards') ?>,
        playsetMeta:       { factions: <?= json_encode($playsetFactions) ?>, sets: <?= json_encode($playsetSets) ?>, setBg: <?= json_encode($playsetSetBg) ?>, factionIcon: <?= json_encode($playsetFactionIcon) ?>, gemBase: <?= json_encode($playsetGemBase) ?>, rarities: <?= json_encode($playsetRarities) ?>, types: <?= json_encode($playsetTypes) ?> },
        favoritesEnabled:  false,
        favoritesData:     {},
        favoritesCsrf:     '',
        favToggleUrl:      '',
        favApiUrl:         '',
        defaults: {
            factions: <?= json_encode($defaultFactions) ?>, types: <?= json_encode($defaultTypes) ?>,
            rarities: <?= json_encode($defaultRarities) ?>, sets: <?= json_encode($defaultSets) ?>,
            variations: <?= json_encode($defaultVariations) ?>, sort1: <?= json_encode($defaultSort1) ?>,
            sort2: <?= json_encode($defaultSort2) ?>, cols: <?= (int)$_defaultCols ?>, perPage: <?= CARDS_DISPLAY_PER_PAGE ?>,
        },
        initial: {
            q: '', faction: [], factionExplicit: 'false', type: [], typeExplicit: 'false',
            rarity: [], rarityExplicit: 'false', sets: [], setsExplicit: 'false',
            subtypes: [], keywords: [], variations: [],
            mainCost: null, recallCost: null, forest: null, mountain: null, ocean: null,
            keywordMode: 'or', hasNoEffect: false, isBanned: false, isErrated: false, isSuspended: false,
            sort: 'default',
        },
        tsOptions: {
            setOptions: <?= $setOptionsJson ?>, initialSets: [],
            subtypeOptions: <?= $subtypeOptionsJson ?>, initialSubtypes: [],
            keywordOptions: <?= $keywordOptionsJson ?>, initialKeywords: [],
            variationOptions: <?= $variationOptionsJson ?>, initialVariations: [],
            defaultCollection: <?= json_encode($defaultCollection) ?>,
        },
        typesMerged: <?= json_encode($typesMergedData) ?>,
        setChildren: <?= json_encode($setChildren) ?>,
        subSets: <?= json_encode($subSets) ?>,
        noUniqueSets: <?= json_encode($noUniqueSets) ?>,
        uniqueType: <?= json_encode(['CHARACTER']) ?>,
        uniqueRarity: <?= json_encode(['UNIQUE']) ?>,
        uniqueExtraSets: <?= json_encode(array_values(array_intersect(['COREKS'], $validSets))) ?>,
        txt: {
            prev: <?= json_encode($cacTxt['prev'] ?? '← Prev') ?>, next: <?= json_encode($cacTxt['next'] ?? 'Next →') ?>,
            showing: <?= json_encode($cacTxt['showing'] ?? '%d cards') ?>, detail_label: <?= json_encode($cacTxt['detail_label'] ?? 'View detail') ?>,
        },
    });
    </script>

    <?php endif; ?>
</div>
