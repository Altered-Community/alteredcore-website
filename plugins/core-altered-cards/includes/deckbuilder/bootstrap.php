<?php
require_once __DIR__ . '/../functions.php';
$lang         = getLang();
$uiLang       = getUiLang();
$uniqueLocale = in_array($lang, ['en', 'fr'], true) ? $lang : 'en';

require_once __DIR__ . '/../../config.php';

if (!$guestModeEnabled && !kcIsLoggedIn()) {
    redirect(BASE_URL . '/pages/login?redirect=' . rawurlencode($_SERVER['REQUEST_URI'] ?? ''));
}
$isGuest = $guestModeEnabled && !kcIsLoggedIn();
$kcUser  = $isGuest ? null : kcUser();
$token   = $isGuest ? null : deckApiToken();

$_dbUserId          = (int)($_SESSION['user_id'] ?? 0);
$_collectionEnabled = defined('COLLECTION_MODE') && COLLECTION_MODE;
$_collectionMode    = $_collectionEnabled && !$isGuest && $_dbUserId > 0;
$_ownEnabled        = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$_ownMode           = $_ownEnabled && !$isGuest && $_dbUserId > 0;
$_altArtGlobalMode  = $_ownMode && cacIsAltArtGlobalMode($_dbUserId);
$_ownAltArtActive   = ownershipIsActive() && $_altArtGlobalMode;
$ownAltArtCfg = $_ownAltArtActive ? [
    'enabled'          => true,
    'altArtsUrl'       => BASE_URL . '/papi/core-altered-cards/deck-alt-arts',
    'cdnUrl'           => CDN_URL,
    'lang'             => $lang,
    'markerImg'        => BASE_URL . '/plugins/ownership/assets/selected_alt.png',
    'setPreferenceUrl' => BASE_URL . '/papi/ownership/alt-art-set-preference',
    'csrfToken'        => csrfToken(),
    'txt'              => ['saveError' => $uiLang === 'fr' ? 'Impossible d\'enregistrer votre choix.' : 'Could not save your choice.'],
] : ['enabled' => false];
$_userCollection    = [];
$_collEntries       = [];
if ($_collectionMode) {
    $_collectionApiUrl = COLLECTION_API_URL;
    $_coll           = collGetUserCollection($_collectionApiUrl, $_dbUserId);
    $_userCollection = $_coll['collection'];
    $_collEntries    = $_coll['entries'];
}

require_once __DIR__ . '/../favorites.php';
$_favMode       = !$isGuest && $_dbUserId > 0;
$_userFavorites = $_favMode ? array_fill_keys(cacFavGetRefs($_dbUserId), true) : [];

require __DIR__ . '/i18n.php';

require __DIR__ . '/ajax-save.php';

$editDeckId   = trim($_GET['id'] ?? '');
$existingDeck = null;
$apiError     = null;

if ($editDeckId && $token) {
    $ch = curl_init(DECKS_API_URL . '/api/decks/' . rawurlencode($editDeckId) . '?locale=' . rawurlencode($lang));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 200 && $code < 300 && $response) {
        $existingDeck = json_decode($response, true);
    } else {
        $apiError = $txt['err_load'];
    }
}

$_existingHeroFaction = null;
if ($existingDeck) {
    $_existingHeroCards = $existingDeck['deckCards'] ?? $existingDeck['cards'] ?? [];
    foreach ($_existingHeroCards as $_hc) {
        if (($_hc['cardTypeReference'] ?? '') === 'HERO') {
            $_existingHeroFaction = $_hc['factionCode'] ?? null;
            break;
        }
    }
}

$factionsData = loadAlteredData('factions');
$formatsData  = loadAlteredData('formats');
$setsData     = loadAlteredData('sets');
$subtypesData = loadAlteredData('subtypes');
$raritiesData = loadAlteredData('rarities');
$keywordsData   = loadAlteredData('keywords');
$typesData      = loadAlteredData('types');
$typesMergedData = loadAlteredData('types_merged');
$variationsData = loadAlteredData('variations');
$powersData     = loadAlteredData('powers');

$validFactions  = array_keys($factionsData);
$validTypes     = array_keys($typesData);

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
$_defaultDeckTypes = array_keys(array_diff_key($typesDataDisplay, array_flip(['HERO', 'TOKEN', 'TOKEN_MANA'])));
$validRarities  = array_keys($raritiesData);
$validSets      = array_keys($setsData);
$validCostPower = array_map('strval', range(0, 12));

$defaultFactions = array_values(array_intersect((array)($_ss['default_factions'] ?? []), $validFactions));
$defaultSets     = array_values(array_intersect((array)($_ss['default_sets']     ?? []), $validSets));
$defaultRarities = array_values(array_intersect((array)($_ss['default_rarities'] ?? []), $validRarities));
$defaultTypes    = array_values(array_intersect((array)($_ss['default_types']    ?? []), $validTypes));
$_raw1        = $_ss['default_sort_1'] ?? 'default';
$_raw2        = $_ss['default_sort_2'] ?? null;
$validSorts   = array_keys($txt['sorts'] ?? []);
$defaultSort1 = in_array($_raw1, $validSorts) ? $_raw1 : 'default';
$defaultSort2 = ($_raw2 && in_array($_raw2, $validSorts)) ? $_raw2 : null;
$_defaultDbCols  = max(2, min(4, (int)($_ss['default_cols_db'] ?? 3)));

$_heroSS         = $_ss['default_heroes'] ?? [];
$_heroTypes      = array_values(array_intersect((array)($_heroSS['types']      ?? ['HERO']),                   $validTypes));
$_heroRarities   = array_values(array_intersect((array)($_heroSS['rarities']   ?? array_values(array_diff(array_keys($raritiesData), ['UNIQUE']))), $validRarities));
$_heroSets       = array_values(array_intersect((array)($_heroSS['sets']       ?? []),                         $validSets));
$_heroVariations = array_values(array_intersect((array)($_heroSS['variations'] ?? []),                         array_keys($variationsData)));
$_heroSort1           = in_array($_heroSS['sort_1'] ?? '', $validSorts) ? $_heroSS['sort_1'] : null;
$_heroSort2           = in_array($_heroSS['sort_2'] ?? '', $validSorts) ? $_heroSS['sort_2'] : null;
$_heroReferenceFilter = (string)($_heroSS['referenceFilter'] ?? '');
$_heroSortAlpha       = !empty($_heroSS['sort_alpha']);
$_heroNoDuplicate     = !empty($_heroSS['no_duplicate']);
$_heroDuplicateOrder  = (($_heroSS['duplicate_order'] ?? '') === 'desc') ? 'desc' : 'asc';
$_defaultVariations = array_values(array_intersect((array)($_ss['default_variations'] ?? []),                  array_keys($variationsData)));
$defaultCollection  = $_ss['default_collection'] ?? 'official';

$factionNames = array_map(fn($f) => $f[$uiLang] ?? $f['en'], $factionsData);
$rarityGems      = array_map(fn($r) => $r['gem'], $raritiesData);
$_rarityGemColors = [];
foreach ($raritiesData as $_rd) {
    if (!empty($_rd['gem'])) $_rarityGemColors[$_rd['gem']] = $_rd['color'] ?? '';
}
$txt['types'] = array_map(fn($t) => $t[$uiLang] ?? $t['en'], $typesData);
$txt['types']['OTHER'] = $uiLang === 'fr' ? 'Autre' : 'Other';

$setOptionsJson = json_encode(array_values(array_map(
    fn($ref, $set) => [
        'value'     => $ref,
        'text'      => $set[$uiLang] ?? $set['en'],
        'icon'      => $set['icon'] ?? '',
        'type'      => $set['type'] ?? 'official',
        'publisher' => $set['publisher'] ?? 'Equinox',
        'subtype'   => $set['subtype'] ?? 'main',
    ],
    array_keys($setsData), array_values($setsData)
)));
$subtypeOptionsJson = json_encode(array_values(array_map(
    fn($code, $names) => ['value' => $code, 'text' => $names[$uiLang] ?? $names['en']],
    array_keys($subtypesData), array_values($subtypesData)
)));
$keywordOptionsJson = json_encode(array_values(array_map(
    fn($code, $names) => ['value' => $code, 'text' => $names[$uiLang] ?? $names['en']],
    array_keys($keywordsData), array_values($keywordsData)
)));
$variationOptionsJson = json_encode(array_values(array_map(
    fn($code, $names) => ['value' => $code, 'text' => $names[$uiLang] ?? $names['en']],
    array_keys($variationsData), array_values($variationsData)
)));
$pageTitle = $editDeckId ? $txt['edit_deck'] : $txt['new_deck'];
?>
