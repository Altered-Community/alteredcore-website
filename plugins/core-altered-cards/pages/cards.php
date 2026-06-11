<?php
require_once __DIR__ . '/../includes/functions.php';
$lang   = getLang();
$uiLang = getUiLang();


// translations
$_ss        = loadSearchSettings();
$_sharedTxt = $_ss['translations'][$uiLang] ?? [];
$txt        = array_merge($_sharedTxt, [
    'en' => [
        'page_title'  => 'Cards',
        'search_ph'   => 'Search cards…',
        'official'    => 'Official',
        'community'   => 'Community',
        'detail_label'=> 'View detail',
        'btn_collection' => 'My collection',
        'lbl_effects' => 'Effects',
        'add_effect'  => 'Add effect',
    ],
    'fr' => [
        'page_title'  => 'Cartes',
        'search_ph'   => 'Rechercher par nom…',
        'official'    => 'Officiel',
        'community'   => 'Communauté',
        'detail_label'=> 'Accéder au détail',
        'btn_collection' => 'Ma collection',
        'lbl_effects' => 'Effets',
        'add_effect'  => 'Ajouter un effet',
    ],
][$uiLang] ?? []);

// static data
$setsData       = loadAlteredData('sets');
$subtypesData   = loadAlteredData('subtypes');
$raritiesData   = loadAlteredData('rarities');
$factionsData   = loadAlteredData('factions');
$keywordsData   = loadAlteredData('keywords');
$typesData      = loadAlteredData('types');
$typesMergedData = loadAlteredData('types_merged');
$variationsData = loadAlteredData('variations');

$validFactions = array_keys($factionsData);
$validTypes    = array_keys($typesData);

// Build display-only type list: hide types absorbed by a merge group
$_mergedKeys = array_keys($typesMergedData);
$_absorbedTypes = [];
foreach ($typesMergedData as $_mk => $_mvs) {
    foreach ($_mvs as $_mv) {
        if (!in_array($_mv, $_mergedKeys, true)) {
            $_absorbedTypes[$_mv] = true;
        }
    }
}
$typesDataDisplay = array_diff_key($typesData, $_absorbedTypes);
$validSets     = array_keys($setsData);
$validRarities = array_keys($raritiesData);
$validSorts    = array_keys($txt['sorts'] ?? []);
if (empty($validSorts)) $validSorts = ['default'];

// defaults
$defaultFactions   = array_values(array_intersect((array)($_ss['default_factions']   ?? []), $validFactions));
$defaultSets       = array_values(array_intersect((array)($_ss['default_sets']       ?? []), $validSets));
$defaultRarities   = array_values(array_intersect((array)($_ss['default_rarities']   ?? []), $validRarities));
$defaultTypes      = array_values(array_intersect((array)($_ss['default_types']      ?? []), $validTypes));
$defaultVariations  = array_values(array_intersect((array)($_ss['default_variations']  ?? []), array_keys($variationsData)));
$defaultCollection  = $_ss['default_collection'] ?? 'official';
$_raw1        = $_ss['default_sort_1'] ?? 'default';
$_raw2        = $_ss['default_sort_2'] ?? null;
$defaultSort1 = in_array($_raw1, $validSorts) ? $_raw1 : 'default';
$defaultSort2 = ($_raw2 && in_array($_raw2, $validSorts)) ? $_raw2 : null;
$_defaultCols = max(2, min(5, (int)($_ss['default_cols'] ?? 4)));

// parse URL filter params (passed to JS for initial state)
$q    = trim($_GET['q'] ?? '');
$sort = in_array($_GET['sort'] ?? '', $validSorts) ? $_GET['sort'] : 'default';
$cols = (int)($_GET['cols'] ?? $_defaultCols);
if (!in_array($cols, [1, 2, 3, 4, 5])) $cols = $_defaultCols;

$validCostPower = array_map('strval', range(0, 12));
$factions = array_values(array_intersect(array_filter((array)($_GET['faction'] ?? [])), $validFactions));
$types    = array_key_exists('type', $_GET)
    ? array_values(array_intersect(array_filter((array)$_GET['type']), $validTypes))
    : $defaultTypes;
$rarities = array_key_exists('rarity', $_GET)
    ? array_values(array_intersect(array_filter((array)$_GET['rarity']), $validRarities))
    : $defaultRarities;
$sets = array_key_exists('set', $_GET)
    ? array_values(array_intersect(array_filter((array)$_GET['set']), $validSets))
    : $defaultSets;
$keywords       = array_values(array_intersect(array_filter((array)($_GET['keyword']       ?? [])), array_keys($keywordsData)));
$subtypes       = array_values(array_intersect(array_filter((array)($_GET['subtype']       ?? [])), array_keys($subtypesData)));
$mainCost   = isset($_GET['mainCost'])   && in_array($_GET['mainCost'],   $validCostPower, true) ? $_GET['mainCost']   : null;
$recallCost = isset($_GET['recallCost']) && in_array($_GET['recallCost'], $validCostPower, true) ? $_GET['recallCost'] : null;
$forest     = isset($_GET['forest'])     && in_array($_GET['forest'],     $validCostPower, true) ? $_GET['forest']     : null;
$mountain   = isset($_GET['mountain'])   && in_array($_GET['mountain'],   $validCostPower, true) ? $_GET['mountain']   : null;
$ocean      = isset($_GET['ocean'])      && in_array($_GET['ocean'],      $validCostPower, true) ? $_GET['ocean']      : null;
$kwMode         = ($_GET['kwMode'] ?? '') === 'and' ? 'and' : 'or';
$hasNoEffect    = ($_GET['hasNoEffect'] ?? '') === 'true';
$variations = array_key_exists('variation', $_GET)
    ? array_values(array_intersect(array_filter((array)$_GET['variation']), array_keys($variationsData)))
    : $defaultVariations;
$isBanned    = ($_GET['isBanned']    ?? '') === 'true';
$isErrated   = ($_GET['isErrated']   ?? '') === 'true';
$isSuspended = ($_GET['isSuspended'] ?? '') === 'true';

// collection
$_csUserId         = (int)($_SESSION['user_id'] ?? 0);
$_collEnabled      = defined('COLLECTION_MODE') && COLLECTION_MODE;
$_collMode         = $_collEnabled && $_csUserId > 0;

// digital ownership (AlteredOwnership service)
$_ownEnabled       = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$_ownMode          = $_ownEnabled && $_csUserId > 0;
// Browser-facing ownership app root (same resolution as pages/collection.php):
// prefer the public OWNERSHIP_WEB_URL, fall back to OWNERSHIP_API_URL.
$_ownWebBase       = (defined('OWNERSHIP_WEB_URL') && OWNERSHIP_WEB_URL) ? OWNERSHIP_WEB_URL
                   : ((defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL) ? OWNERSHIP_API_URL : '');
$_ownWebUrl        = $_ownWebBase ? rtrim($_ownWebBase, '/') . '/' : '';
$_userCollection   = [];
$_collEntries      = [];
if ($_collMode) {
    $_collApiUrl     = COLLECTION_API_URL;
    $_coll           = collGetUserCollection($_collApiUrl, $_csUserId);
    $_userCollection = $_coll['collection'];
    $_collEntries    = $_coll['entries'];
}

// tomSelect option arrays
$setOptionsJson = json_encode(array_values(array_map(
    function($ref, $set) use ($uiLang) {
        return [
            'value'     => $ref,
            'text'      => $set[$uiLang] ?? $set['en'],
            'icon'      => $set['icon'] ?? '',
            'type'      => $set['type'] ?? 'official',
            'publisher' => $set['publisher'] ?? 'Equinox',
            'subtype'   => $set['subtype'] ?? 'main',
        ];
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

// Promo set linking: parent (main) edition → its promo (sub) editions, plus the
// flat list of sub editions. Used client-side to (de)select promos with their parent.
$setChildren = [];
$subSets     = [];
foreach ($setsData as $_sref => $_sd) {
    if (($_sd['subtype'] ?? '') !== 'sub') continue;
    $subSets[] = $_sref;
    if (!empty($_sd['parent'])) $setChildren[$_sd['parent']][] = $_sref;
}

// Playset heatmap metadata: faction rows (canonical order, with colors) and the
// main-set columns ordered chronologically descending (recent first) — same
// reverse-of-file-order convention as the quick-filter set bar.
$playsetFactions = [];
foreach ($factionsData as $_fk => $_fv) {
    $playsetFactions[] = ['code' => $_fk, 'name' => $_fv[$uiLang] ?? $_fv['en'] ?? $_fk, 'color' => $_fv['color'] ?? '#888'];
}
// The playset API merges the Kickstarter edition (COREKS) into CORE, so only a
// single "Au-delà des Portes" column appears — flagged with an explanatory note.
// Label lives under translations.{lang}.playset.core_note in search_settings.json.
$_psCoreNote = $_sharedTxt['playset']['core_note'] ?? ($uiLang === 'fr'
    ? 'Regroupe les éditions Au-delà des Portes (CORE) et sa version Kickstarter (COREKS).'
    : 'Combines the Beyond the Gates (CORE) edition and its Kickstarter version (COREKS).');
$playsetSets = [];
foreach (array_reverse(array_filter($setsData, fn($s) => ($s['subtype'] ?? '') === 'main'), true) as $_sk => $_sv) {
    $_entry = [
        'code' => $_sk,
        'name' => $_sv[$uiLang] ?? $_sv['en'] ?? $_sk,
        'icon' => $_sv['icon'] ?? '',
    ];
    if ($_sk === 'CORE') $_entry['note'] = $_psCoreNote;
    $playsetSets[] = $_entry;
}
$playsetSetBg      = BASE_URL . '/plugins/core-altered-cards/assets/set/small_bg/';
$playsetFactionIcon = BASE_URL . '/plugins/core-altered-cards/assets/faction/';

// widget config for card-search.php
$_cs = [
    'prefix'  => 'cs',
    'mode'    => 'cards',
    'lang'    => $uiLang,
    'txt'     => $txt,
    'data'    => [
        'factions'   => $factionsData,
        'types'      => $typesDataDisplay,
        'rarities'   => $raritiesData,
        'sets'       => $setsData,
        'subtypes'   => $subtypesData,
        'keywords'   => $keywordsData,
        'variations' => $variationsData,
    ],
    'defaults' => [
        'types'      => $defaultTypes,
        'rarities'   => $defaultRarities,
        'sets'       => $defaultSets,
        'variations' => $defaultVariations,
        'collection' => $defaultCollection,
        'sort1'      => $defaultSort1,
        'sort2'      => $defaultSort2,
        'cols'       => $cols,
        'perPage'    => CARDS_DISPLAY_PER_PAGE,
    ],
    'selected' => [
        'q'           => $q,
        'faction'     => $factions,
        'type'        => array_key_exists('type',   $_GET) ? $types   : [],
        'rarity'      => array_key_exists('rarity', $_GET) ? $rarities : [],
        'sets'        => array_key_exists('set',    $_GET) ? $sets    : [],
        'sort'        => $sort,
        'isBanned'    => $isBanned,
        'isErrated'   => $isErrated,
        'isSuspended' => $isSuspended,
    ],
    'col_options'        => [1, 2, 3, 4, 5],
    'show_cols'          => true,
    'collection_mode'    => $_collMode,
    'collection_enabled' => $_collEnabled,
    'ownership_mode'     => $_ownMode,
    'ownership_enabled'  => $_ownEnabled,
    'ownership_url'      => $_ownWebUrl,
    'playset_mode'       => $_collMode,
    'base_url'           => BASE_URL,
];

$pageTitle = $txt['page_title'];
?>

<div class="container py-4">
    <?php include __DIR__ . '/../includes/card-search.php'; ?>
</div>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/css/tom-select.bootstrap5.min.css">
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/js/tom-select.complete.min.js"></script>
<script src="<?= h(BASE_URL) ?>/plugins/core-altered-cards/assets/card-search.js"></script>
<script>
CardSearch({
    debug:       <?= (defined('API_RESPONSE_DEBUG') && API_RESPONSE_DEBUG) ? 'true' : 'false' ?>,
    apiBase:     <?= json_encode(defined('CARDS_API_URL') ? CARDS_API_URL : 'https://cards.alteredcore.org') ?>,
    lang:        <?= json_encode($lang) ?>,
    uiLang:      <?= json_encode($uiLang) ?>,
    prefix:      'cs',
    mode:        'cards',
    cdnUrl:      <?= json_encode(CDN_URL) ?>,
    rendererSrc: 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js',
    cardDetailUrl: <?= json_encode(BASE_URL . '/pages/card') ?>,
    pushState:   true,
    autoSearch:  true,
    closeFiltersOnSearch: true,
    collectionMode:    <?= $_collMode ? 'true' : 'false' ?>,
    collectionData:    <?= json_encode($_userCollection) ?>,
    collectionEntries: <?= json_encode($_collMode ? (object)$_collEntries : (object)[]) ?>,
    collectionCsrf:    <?= json_encode($_collMode ? csrfToken() : '') ?>,
    collectionUrl:     <?= json_encode(BASE_URL . '/pages/collection') ?>,
    collApiUrl:        <?= json_encode($_collMode ? BASE_URL . '/papi/core-altered-cards/collection-search' : '') ?>,
    ownershipApiUrl:   <?= json_encode($_ownMode ? BASE_URL . '/papi/core-altered-cards/ownership-search' : '') ?>,
    playsetApiUrl:     <?= json_encode($_collMode ? BASE_URL . '/papi/core-altered-cards/playset' : '') ?>,
    playsetMeta:       { factions: <?= json_encode($playsetFactions) ?>, sets: <?= json_encode($playsetSets) ?>, setBg: <?= json_encode($playsetSetBg) ?>, factionIcon: <?= json_encode($playsetFactionIcon) ?> },
    defaults: {
        factions:   <?= json_encode($defaultFactions) ?>,
        types:      <?= json_encode($defaultTypes) ?>,
        rarities:   <?= json_encode($defaultRarities) ?>,
        sets:       <?= json_encode($defaultSets) ?>,
        variations: <?= json_encode($defaultVariations) ?>,
        sort1:      <?= json_encode($defaultSort1) ?>,
        sort2:      <?= json_encode($defaultSort2) ?>,
        cols:       <?= (int)$cols ?>,
        perPage:    <?= CARDS_DISPLAY_PER_PAGE ?>,
    },
    initial: {
        q:              <?= json_encode($q) ?>,
        faction:        <?= json_encode($factions) ?>,
        faction:        <?= json_encode($factions) ?>,
        factionExplicit:<?= array_key_exists('faction', $_GET) ? 'true' : 'false' ?>,
        type:           <?= json_encode($types) ?>,
        typeExplicit:   <?= array_key_exists('type', $_GET) ? 'true' : 'false' ?>,
        rarity:         <?= json_encode($rarities) ?>,
        rarityExplicit: <?= array_key_exists('rarity', $_GET) ? 'true' : 'false' ?>,
        sets:           <?= json_encode($sets) ?>,
        setsExplicit:   <?= array_key_exists('set', $_GET) ? 'true' : 'false' ?>,
        subtypes:       <?= json_encode($subtypes) ?>,
        keywords:       <?= json_encode($keywords) ?>,
        variations:     <?= json_encode($variations) ?>,
        mainCost:    <?= json_encode($mainCost) ?>,
        recallCost:  <?= json_encode($recallCost) ?>,
        forest:      <?= json_encode($forest) ?>,
        mountain:    <?= json_encode($mountain) ?>,
        ocean:       <?= json_encode($ocean) ?>,
        keywordMode:    <?= json_encode($kwMode) ?>,
        hasNoEffect:    <?= $hasNoEffect ? 'true' : 'false' ?>,
        isBanned:       <?= $isBanned    ? 'true' : 'false' ?>,
        isErrated:      <?= $isErrated   ? 'true' : 'false' ?>,
        isSuspended:    <?= $isSuspended ? 'true' : 'false' ?>,
        sort:           <?= json_encode($sort) ?>,
    },
    tsOptions: {
        setOptions:            <?= $setOptionsJson ?>,
        initialSets:           <?= json_encode($sets) ?>,
        subtypeOptions:        <?= $subtypeOptionsJson ?>,
        initialSubtypes:       <?= json_encode($subtypes) ?>,
        keywordOptions:        <?= $keywordOptionsJson ?>,
        initialKeywords:       <?= json_encode($keywords) ?>,
        variationOptions:      <?= $variationOptionsJson ?>,
        initialVariations:     <?= json_encode($variations) ?>,
        defaultCollection:     <?= json_encode($defaultCollection) ?>,
    },
    typesMerged: <?= json_encode($typesMergedData) ?>,
    setChildren:  <?= json_encode($setChildren) ?>,
    subSets:      <?= json_encode($subSets) ?>,
    uniqueType:   <?= json_encode(['CHARACTER']) ?>,
    uniqueRarity: <?= json_encode(['UNIQUE']) ?>,
    uniqueExtraSets: <?= json_encode(array_values(array_intersect(['COREKS'], $validSets))) ?>,
    txt: {
        prev:          <?= json_encode($txt['prev']          ?? '← Prev') ?>,
        next:          <?= json_encode($txt['next']          ?? 'Next →') ?>,
        showing:       <?= json_encode($txt['showing']       ?? '%d cards') ?>,
        detail_label:  <?= json_encode($txt['detail_label']  ?? 'View detail') ?>,
        any_trigger:    <?= json_encode($uiLang === 'fr' ? 'Tous les déclencheurs' : 'Any trigger') ?>,
        any_condition:  <?= json_encode($uiLang === 'fr' ? 'Toutes les conditions' : 'Any condition') ?>,
        any_effect:     <?= json_encode($uiLang === 'fr' ? 'Tous les effets'       : 'Any effect') ?>,
        lbl_subtype:    <?= json_encode($txt['lbl_subtype']    ?? ($uiLang === 'fr' ? 'Sous-type' : 'Subtype')) ?>,
        lbl_card_status:<?= json_encode($txt['lbl_card_status'] ?? ($uiLang === 'fr' ? 'Statut'    : 'Status')) ?>,
        lbl_keyword:    <?= json_encode($txt['lbl_keyword']    ?? ($uiLang === 'fr' ? 'Mot-clé'   : 'Keyword')) ?>,
        lbl_variation:  <?= json_encode($txt['lbl_variation']  ?? ($uiLang === 'fr' ? 'Variation'  : 'Variation')) ?>,
    },
    onColsChange: function(n) {
        var grid = document.getElementById('cs-grid');
        if (grid) grid.style.setProperty('--cards-mobile-cols', n >= 3 ? 2 : n);
    },
});
</script>

