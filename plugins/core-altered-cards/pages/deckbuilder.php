<?php
require_once __DIR__ . '/../includes/functions.php';
$lang         = getLang();
$uiLang       = getUiLang();
$uniqueLocale = in_array($lang, ['en', 'fr'], true) ? $lang : 'en';

require_once __DIR__ . '/../config.php';

// auth (guest access allowed when $guestModeEnabled, server save requires login)
if (!$guestModeEnabled && !kcIsLoggedIn()) {
    redirect(BASE_URL . '/pages/login?redirect=' . rawurlencode($_SERVER['REQUEST_URI'] ?? ''));
}
$isGuest = $guestModeEnabled && !kcIsLoggedIn();
$kcUser  = $isGuest ? null : kcUser();
$token   = $isGuest ? null : deckApiToken();

// collection
$_dbUserId          = (int)($_SESSION['user_id'] ?? 0);
$_collectionEnabled = defined('COLLECTION_MODE') && COLLECTION_MODE;
$_collectionMode    = $_collectionEnabled && !$isGuest && $_dbUserId > 0;
// digital ownership (AlteredOwnership service)
$_ownEnabled        = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$_ownMode           = $_ownEnabled && !$isGuest && $_dbUserId > 0;
$_userCollection    = []; // {ref => qty}
$_collEntries       = []; // {ref => api_entry_id} — populated in API mode only
if ($_collectionMode) {
    $_collectionApiUrl = COLLECTION_API_URL;
    $_coll           = collGetUserCollection($_collectionApiUrl, $_dbUserId);
    $_userCollection = $_coll['collection'];
    $_collEntries    = $_coll['entries'];
}

// favorites (stockage DB locale du plugin — voir includes/favorites.php)
require_once __DIR__ . '/../includes/favorites.php';
$_favMode       = !$isGuest && $_dbUserId > 0;
$_userFavorites = $_favMode ? array_fill_keys(cacFavGetRefs($_dbUserId), true) : [];

// translations (shared from search_settings.json + page-specific)
$_ss = loadSearchSettings();
$_sharedTxt = $_ss['translations'][$uiLang] ?? [];
$txt = array_merge($_sharedTxt, [
    'en' => [
        'page_title'      => 'Deck Builder',
        'new_deck'        => 'New Deck',
        'edit_deck'       => 'Edit Deck',
        'search_cards'    => 'Search cards…',
        'search_ph'       => 'Search cards…',
        'initial_msg'     => 'Use filters or search to display cards.',
        'add_card'        => 'Add',
        'remove_card'     => 'Remove',
        'hero_slot'       => 'Select a hero',
        'deck_name'       => 'Deck name',
        'description'     => 'Description',
        'format'          => 'Format',
        'visibility'      => 'Visibility',
        'public'          => 'Public',
        'private'         => 'Private',
        'save_btn'        => 'Save deck',
        'saving'          => 'Saving…',
        'saved_ok'        => 'Deck saved!',
        'err_token'       => 'Could not connect to the deck API.',
        'err_save'        => 'Could not save the deck (HTTP %d).',
        'err_load'        => 'Could not load the deck.',
        'err_connect'     => 'Connection error.',
        'api_later'       => 'The API is currently unavailable. Please try again later.',
        'save_retry'      => 'Retry',
        'unsaved_title'   => 'Unsaved changes',
        'unsaved_msg'     => 'You have unsaved changes. What would you like to do?',
        'save_and_leave'  => 'Save and leave',
        'leave_anyway'    => 'Leave without saving',
        'stay'            => 'Stay on page',
        'autosaved'       => 'Autosaved',
        'deck_cards'      => 'cards',
        'cards_in_deck'   => 'Cards in deck',
        'hero_required'        => 'A hero is required.',
        'min_cards'            => 'Minimum %d cards required.',
        'max_cards'            => 'Maximum %d cards.',
        'max_rare'             => 'Maximum %d rare cards.',
        'max_exalted'          => 'Maximum %d exalted cards.',
        'max_unique'           => 'Maximum %d unique cards.',
        'max_copies'           => 'Maximum %d copies of the same card.',
        'max_copies_rarity'    => 'Maximum %d copy of each rarity per card name.',
        'same_faction'         => 'All cards must be from the same faction.',
        'validation_ok'        => 'Deck is valid.',
        'deck_invalid'         => 'Invalid',
        'rules_modal_title'    => 'Format rules',
        'rule_hero'            => 'Hero required',
        'rule_min_cards'       => 'Minimum cards',
        'rule_max_cards'       => 'Maximum cards',
        'rule_max_rare'        => 'Rare limit',
        'rule_max_exalted'     => 'Exalted limit',
        'rule_max_unique'      => 'Unique limit',
        'rule_copies'          => 'Copies per card name',
        'rule_copies_rarity'   => 'Copies per rarity',
        'rule_unique_copies'   => 'Copies per unique',
        'rule_same_faction'    => 'Single faction',
        'rule_no_banned'       => 'Banned cards not allowed',
        'rule_no_suspended'    => 'Suspended cards not allowed',
        'rule_frontier_legal'  => 'Unique cards must be part of the Frontier allowlist',
        'tt_show_banned'       => 'Show banned cards (hidden by default for this format)',
        'tt_show_suspended'    => 'Show suspended cards (hidden by default for this format)',
        'tt_banned_allowed'    => 'The selected format already allows banned cards — this filter has no effect',
        'tt_suspended_allowed' => 'The selected format already allows suspended cards — this filter has no effect',
        'hero_label'      => 'Hero',
        'choose_hero'     => 'Choose hero',
        'change_hero'     => 'Change hero',
        'select_hero_msg' => 'Choose a hero to start building your deck.',
        'lbl_status'      => 'Status',
        'status_auto'     => 'Auto',
        'status_draft'    => 'Draft',
        'status_final'    => 'Final',
        'tab_search'      => 'Search',
        'tab_deck'        => 'Deck',
        'tab_cards'       => 'Cards',
        'tab_stats'       => 'Stats',
        'tab_hand'        => 'Starting hand',
        'tab_grid'        => 'View Deck',
        'stats_cost_main'   => 'Hand cost curve',
        'stats_cost_recall' => 'Reserve cost curve',
        'stats_types'       => 'Card types',
        'stats_powers'      => 'Avg. powers',
        'no_cards'        => 'No cards in the deck.',
        'guest_banner'    => 'Guest mode — Your deck is saved locally in this browser (1 deck max).',
        'guest_login'     => 'Log in',
        'guest_login_why' => 'to save on the server and manage multiple decks.',
        'guest_saved_ok'  => 'Deck saved locally!',
        'official'        => 'Official',
        'community'       => 'Community',
        'login_required'  => 'Login required',
        'stock_warn'      => 'More in deck than owned',
        'unnamed'         => 'Unnamed',
        'detail_label'    => 'View detail',
        'bga_sets_info'   => 'The following sets are not yet available on Board Game Arena and cannot be used in BGA games: %s.',
    ],
    'fr' => [
        'page_title'      => 'Deckbuilder',
        'new_deck'        => 'Nouveau Deck',
        'edit_deck'       => 'Modifier le Deck',
        'search_cards'    => 'Rechercher des cartes…',
        'search_ph'       => 'Rechercher par nom…',
        'initial_msg'     => 'Utilisez les filtres ou la recherche pour afficher des cartes.',
        'add_card'        => 'Ajouter',
        'remove_card'     => 'Retirer',
        'hero_slot'       => 'Choisir un héros',
        'deck_name'       => 'Nom du deck',
        'description'     => 'Description',
        'format'          => 'Format',
        'visibility'      => 'Visibilité',
        'public'          => 'Public',
        'private'         => 'Privé',
        'save_btn'        => 'Sauvegarder',
        'saving'          => 'Sauvegarde…',
        'saved_ok'        => 'Deck sauvegardé !',
        'err_token'       => 'Impossible de se connecter à l\'API de decks.',
        'err_save'        => 'Impossible de sauvegarder le deck (HTTP %d).',
        'err_load'        => 'Impossible de charger le deck.',
        'err_connect'     => 'Erreur de connexion.',
        'api_later'       => 'L\'API est actuellement indisponible. Veuillez réessayer plus tard.',
        'save_retry'      => 'Réessayer',
        'unsaved_title'   => 'Modifications non sauvegardées',
        'unsaved_msg'     => 'Vous avez des modifications non sauvegardées. Que voulez-vous faire ?',
        'save_and_leave'  => 'Sauvegarder et quitter',
        'leave_anyway'    => 'Quitter sans sauvegarder',
        'stay'            => 'Rester sur la page',
        'autosaved'       => 'Sauvegardé',
        'deck_cards'      => 'cartes',
        'cards_in_deck'   => 'Cartes dans le deck',
        'hero_required'        => 'Un héros est requis.',
        'min_cards'            => '%d cartes minimum requises.',
        'max_cards'            => '%d cartes maximum.',
        'max_rare'             => '%d cartes rares maximum.',
        'max_exalted'          => '%d cartes exaltées maximum.',
        'max_unique'           => '%d cartes uniques maximum.',
        'max_copies'           => '%d copies maximum d\'une même carte.',
        'max_copies_rarity'    => '%d copie maximum par rareté pour un même nom de carte.',
        'same_faction'         => 'Toutes les cartes doivent être de la même faction.',
        'validation_ok'        => 'Deck valide.',
        'deck_invalid'         => 'Invalide',
        'rules_modal_title'    => 'Règles du format',
        'rule_hero'            => 'Héros requis',
        'rule_min_cards'       => 'Cartes minimum',
        'rule_max_cards'       => 'Cartes maximum',
        'rule_max_rare'        => 'Limite rares',
        'rule_max_exalted'     => 'Limite exaltées',
        'rule_max_unique'      => 'Limite uniques',
        'rule_copies'          => 'Copies par nom de carte',
        'rule_copies_rarity'   => 'Copies par rareté',
        'rule_unique_copies'   => 'Copies par unique',
        'rule_same_faction'    => 'Faction unique',
        'rule_no_banned'       => 'Cartes bannies non autorisées',
        'rule_no_suspended'    => 'Cartes suspendues non autorisées',
        'rule_frontier_legal'  => 'Les cartes uniques doivent faire partie de la liste autorisée Frontier',
        'tt_show_banned'       => 'Afficher les cartes bannies (masquées par défaut pour ce format)',
        'tt_show_suspended'    => 'Afficher les cartes suspendues (masquées par défaut pour ce format)',
        'tt_banned_allowed'    => 'Le format sélectionné autorise déjà les cartes bannies — ce filtre est sans effet',
        'tt_suspended_allowed' => 'Le format sélectionné autorise déjà les cartes suspendues — ce filtre est sans effet',
        'hero_label'      => 'Héros',
        'choose_hero'     => 'Choisir héros',
        'change_hero'     => 'Changer de héros',
        'select_hero_msg' => 'Choisissez un héros pour commencer à construire votre deck.',
        'lbl_status'      => 'Statut',
        'status_auto'     => 'Auto',
        'status_draft'    => 'Brouillon',
        'status_final'    => 'Final',
        'tab_search'      => 'Recherche',
        'tab_deck'        => 'Deck',
        'tab_cards'       => 'Cartes',
        'tab_stats'       => 'Stats',
        'tab_hand'        => 'Main de départ',
        'tab_grid'        => 'Voir le deck',
        'stats_cost_main'   => 'Courbe coût main',
        'stats_cost_recall' => 'Courbe coût réserve',
        'stats_types'       => 'Types de cartes',
        'stats_powers'      => 'Puissances moy.',
        'no_cards'        => 'Aucune carte dans le deck.',
        'guest_banner'    => 'Mode invité — Votre deck est sauvegardé localement dans ce navigateur (1 deck maximum).',
        'guest_login'     => 'Connectez-vous',
        'guest_login_why' => 'pour sauvegarder sur le serveur et gérer plusieurs decks.',
        'guest_saved_ok'  => 'Deck sauvegardé localement !',
        'official'        => 'Officiel',
        'community'       => 'Communauté',
        'login_required'  => 'Connexion requise',
        'stock_warn'      => 'Plus dans le deck que possédé',
        'unnamed'         => 'Sans nom',
        'detail_label'    => 'Accéder au détail',
        'bga_sets_info'   => 'Les sets suivants ne sont pas encore disponibles sur Board Game Arena et ne sont donc pas légaux en partie BGA : %s.',
    ],
][$uiLang] ?? []);
$txt += cacStartingHandStatsTxt($uiLang);   // shared Starting-hand stats/calc strings

// handle AJAX save
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['ajax'])) {
    header('Content-Type: application/json');

    if ($isGuest) {
        echo json_encode(['ok' => false, 'error' => 'guest']);
        exit;
    }
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        echo json_encode(['ok' => false, 'error' => 'Invalid token']);
        exit;
    }
    if (!$token) {
        echo json_encode(['ok' => false, 'error' => $txt['err_token']]);
        exit;
    }

    $deckId   = trim($_POST['deck_id'] ?? '');
    $payload  = json_decode($_POST['payload'] ?? '{}', true);

    $method  = $deckId ? 'PATCH' : 'POST';
    $url     = DECKS_API_URL . '/api/decks' . ($deckId ? '/' . rawurlencode($deckId) : '');

    $contentType = ($method === 'PATCH') ? 'application/merge-patch+json' : 'application/json';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: ' . $contentType,
            'Accept: application/json',
            'Authorization: Bearer ' . $token,
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        echo json_encode(['ok' => false, 'error' => $txt['err_connect']]);
    } elseif ($code >= 200 && $code < 300) {
        $data  = json_decode($response, true);
        $uuid = $data['id'] ?? $deckId;
        echo json_encode(['ok' => true, 'id' => $uuid]);
    } else {
        $apiBody   = json_decode($response, true);
        $apiDetail = '';
        if (!empty($apiBody['violations']) && is_array($apiBody['violations'])) {
            $apiDetail = formatApiViolations($apiBody['violations']);
        } elseif (!empty($apiBody['detail'])) {
            $apiDetail = $apiBody['detail'];
        } elseif (!empty($apiBody['title'])) {
            $apiDetail = $apiBody['title'];
        }
        $errorMsg = sprintf($txt['err_save'], $code);
        if ($apiDetail) $errorMsg .= "\n" . $apiDetail;
        echo json_encode(['ok' => false, 'error' => $errorMsg]);
    }
    exit;
}

// load existing deck if editing
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

// hero faction of the deck being edited (drives default faction filter in search)
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

// static data
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
// Deckbuilder type filter row default: everything shown there (Hero/Token
// already excluded from the row itself) except Mana, which isn't a useful
// search target when building a deck.
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

<div class="container py-4">

    <div class="section-title mb-3"><span><?= h($pageTitle) ?></span></div>

    <?php if (!$isGuest && !$token): ?>
    <div class="alert alert-danger"><i class="fa-solid fa-circle-exclamation me-2"></i><?= h($txt['err_token']) ?></div>
    <?php else: ?>

    <!-- Mobile bottom navbar -->
    <div class="db-mobile-tabs">
        <button type="button" class="db-mobile-tab active" data-tab="search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <span><?= h($txt['tab_search']) ?></span>
        </button>
        <button type="button" class="db-mobile-tab" data-tab="view">
            <i class="fa-solid fa-eye"></i>
            <span><?= h($txt['tab_grid']) ?></span>
        </button>
        <button type="button" class="db-mobile-tab" data-tab="hand">
            <i class="fa-solid fa-hand-sparkles"></i>
            <span><?= h($txt['tab_hand']) ?></span>
        </button>
        <button type="button" class="db-mobile-tab" data-tab="deck">
            <i class="fa-solid fa-layer-group"></i>
            <span><?= h($txt['tab_deck']) ?></span>
        </button>
    </div>

    <div class="db-layout">

        <!-- LEFT: card browser + deck view -->
        <div class="db-panel-left db-tab-pane active" id="db-tab-search">

            <!-- Sub-tabs: Card Search | View Deck -->
            <div class="ac-tab-toggle d-none d-lg-flex">
                <button type="button" class="btn-toggle db-search-tab active" data-pane="search">
                    <i class="fa-solid fa-magnifying-glass me-1"></i><?= h($txt['tab_search']) ?>
                </button>
                <button type="button" class="btn-toggle db-search-tab" data-pane="view">
                    <i class="fa-solid fa-eye me-1"></i><?= h($txt['tab_grid']) ?>
                </button>
                <button type="button" class="btn-toggle db-search-tab" data-pane="hand">
                    <i class="fa-solid fa-hand-sparkles me-1"></i><?= h($txt['tab_hand']) ?>
                </button>
            </div>

            <!-- Card search pane -->
            <div id="db-search-pane-search">
                <?php
                $_cs = [
                    'prefix'             => 'db',
                    'mode'               => 'deck',
                    'lang'               => $uiLang,
                    'txt'                => $txt,
                    'data'               => [
                        'factions'   => $factionsData,
                        'types'      => $typesDataDisplay,
                        'rarities'   => $raritiesData,
                        'sets'       => $setsData,
                        'subtypes'   => $subtypesData,
                        'keywords'   => $keywordsData,
                        'variations' => $variationsData,
                    ],
                    'defaults'           => [
                        'factions'   => $defaultFactions,
                        'types'      => $defaultTypes,
                        'rarities'   => $defaultRarities,
                        'sets'       => $defaultSets,
                        'variations' => $_defaultVariations,
                        'collection' => $defaultCollection,
                        'sort1'      => $defaultSort1,
                        'sort2'      => $defaultSort2,
                        'cols'       => $_defaultDbCols,
                        'perPage'    => CARDS_DISPLAY_PER_PAGE,
                    ],
                    'selected'           => [
                        'type'    => $_defaultDeckTypes,
                        'rarity'  => [],
                        'faction' => $_existingHeroFaction ? [$_existingHeroFaction] : [],
                    ],
                    'col_options'        => [2, 3, 4],
                    'show_cols'          => true,
                    'collection_mode'    => $_collectionMode,
                    'collection_enabled' => $_collectionEnabled,
                    'ownership_mode'     => $_ownMode,
                    'ownership_enabled'  => $_ownEnabled,
                    'favorites_mode'     => $_favMode,
                    'base_url'           => BASE_URL,
                ];
                include __DIR__ . '/../includes/card-search.php';
                ?>
            </div>

            <!-- Deck view pane -->
            <div id="db-search-pane-view" class="db-search-pane" style="display:none">
                <div class="d-flex justify-content-end mb-2">
                    <div class="btn-group btn-group-sm">
                        <button type="button" id="db-grid-toggle-grid" class="btn btn-outline-secondary active" title="Grid">
                            <i class="fa-solid fa-grip"></i>
                        </button>
                        <button type="button" id="db-grid-toggle-list" class="btn btn-outline-secondary" title="List">
                            <i class="fa-solid fa-list"></i>
                        </button>
                    </div>
                </div>
                <div id="db-deckgrid-content"></div>
            </div>

            <!-- Starting-hand stats (main content, full width) -->
            <div id="db-search-pane-hand" class="db-search-pane" style="display:none">
                <?php include __DIR__ . '/_starting-hand-sandbox.php'; ?>
                <?php include __DIR__ . '/_starting-hand-stats.php'; ?>
            </div>

        </div>

        <!-- RIGHT: deck editor -->
        <div class="db-panel-right db-tab-pane" id="db-tab-deck">
            <?php if ($apiError): ?>
            <div class="text-center py-4 mb-2">
                <i class="fa-solid fa-triangle-exclamation fa-2x text-danger mb-3 d-block"></i>
                <p class="text-muted mb-1 small"><?= h($apiError) ?></p>
                <p class="text-muted small"><?= h($txt['api_later']) ?></p>
            </div>
            <?php endif; ?>
            <?php if ($isGuest): ?>
            <div id="guest-banner" class="db-guest-banner">
                <i class="fa-solid fa-circle-info me-1"></i>
                <?= h($txt['guest_banner']) ?>
                <br>
                <a href="<?= h(BASE_URL . '/pages/login?redirect=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/pages/deckbuilder')) ?>" class="db-guest-link"><?= h($txt['guest_login']) ?></a>
                <?= h($txt['guest_login_why']) ?>
            </div>
            <?php endif; ?>
            <div class="card-altered p-3">

                <!-- Hero -->
                <div class="mb-3">
                    <div class="filter-label mb-1"><?= h($txt['hero_label']) ?></div>
                    <div id="db-hero-banner" class="hero-banner" onclick="dbSelectHero()">
                        <i class="fa-solid fa-person-rays" style="font-size:1.5rem;color:var(--neutral-300);flex-shrink:0"></i>
                        <span id="db-hero-label" style="font-size:.85rem;color:var(--neutral-400)"><?= h($txt['hero_slot']) ?></span>
                    </div>
                </div>

                <!-- Deck meta -->
                <div class="mb-2">
                    <label class="filter-label mb-1"><?= h($txt['deck_name']) ?></label>
                    <input type="text" id="db-deck-name" class="form-control form-control-sm" placeholder="<?= h($txt['deck_name']) ?>">
                </div>
                <div class="mb-2">
                    <label class="filter-label mb-1"><?= h($txt['description']) ?></label>
                    <textarea id="db-deck-desc" class="form-control form-control-sm" rows="2"></textarea>
                </div>
                <div class="row g-2 mb-2">
                    <div class="<?= $isGuest ? 'col-12' : 'col-6' ?>">
                        <label class="filter-label mb-1"><?= h($txt['format']) ?></label>
                        <select id="db-deck-format" class="form-select form-select-sm">
                            <?php foreach ($formatsData as $fmtKey => $fmtData): ?>
                            <?php // Hidden formats (e.g. BGA tester format) are rendered but stay
                                  // out of the dropdown until the tester flag is set client-side. ?>
                            <option value="<?= h($fmtKey) ?>"<?= !empty($fmtData['hidden']) ? ' data-hidden="1" hidden' : '' ?>><?= h($fmtData[$uiLang] ?? $fmtData['en']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <?php if (!$isGuest): ?>
                    <div class="col-6">
                        <label class="filter-label mb-1"><?= h($txt['visibility']) ?></label>
                        <select id="db-deck-public" class="form-select form-select-sm">
                            <option value="0"><?= h($txt['private']) ?></option>
                            <option value="1"><?= h($txt['public']) ?></option>
                        </select>
                    </div>
                    <select id="db-deck-draft" class="d-none">
                        <option value="auto" selected></option>
                    </select>
                    <?php endif; ?>
                </div>

                <!-- Card list -->
                <div class="d-flex align-items-center justify-content-between mb-1 mt-3">
                    <span class="filter-label"><?= h($txt['cards_in_deck']) ?></span>
                    <span id="db-card-count" class="db-card-count">0 <?= h($txt['deck_cards']) ?></span>
                </div>
                <!-- Rarity gems row -->
                <div id="db-rarity-row" class="d-flex gap-2 mb-2 db-rarity-row">
                    <?php foreach (array_values($rarityGems) as $r):
                        $_gc = $_rarityGemColors[$r] ?? '';
                        $gemCountStyle = $_gc ? 'style="color:' . h($_gc) . '"' : 'class="text-muted"'; ?>
                    <span class="d-flex align-items-center gap-1" id="db-gem-<?= $r ?>" style="display:none!important">
                        <img src="<?= $pluginAssetsUrl ?>/gems/<?= $r ?>.png" alt="<?= $r ?>" style="width:13px;height:13px">
                        <span id="db-gem-<?= $r ?>-count" <?= $gemCountStyle ?>>0</span>
                    </span>
                    <?php endforeach; ?>
                </div>
                <!-- Validation status -->
                <div id="db-validation" class="mb-2"></div>

                <!-- Tabs: Cards / Stats -->
                <div class="db-tabs-row">
                    <button type="button" class="db-deck-tab active" data-pane="cards"><?= h($txt['tab_cards']) ?></button>
                    <button type="button" class="db-deck-tab" data-pane="stats"><?= h($txt['tab_stats']) ?></button>
                </div>
                <div id="db-deck-pane-cards">
                    <div id="db-card-list" class="mb-3"></div>
                </div>
                <div id="db-deck-pane-stats" class="db-stats-pane" style="display:none">
                    <!-- Stats content populated by renderStatsPane() -->
                </div>

                <!-- Save button -->
                <div id="db-save-ok" class="alert alert-success p-2 mb-2 small" style="display:none"></div>
                <div id="db-save-error" class="alert alert-danger p-2 mb-2 small" style="display:none">
                    <div class="d-flex align-items-start gap-2">
                        <span id="db-save-error-msg" class="flex-fill"></span>
                        <button type="button" id="db-save-retry" class="btn btn-sm btn-outline-danger flex-shrink-0" style="padding:.1rem .6rem;font-size:.78rem"></button>
                    </div>
                </div>
                <button type="button" id="db-save-btn" class="btn btn-primary-altered w-100">
                    <i class="fa-solid fa-floppy-disk me-1"></i><?= h($txt['save_btn']) ?>
                </button>
                <div id="db-autosave-status" class="db-autosave-status"></div>
            </div>

            <?php
            $_bgaIllegalSets = array_filter($setsData, fn($s) => ($s['subtype'] ?? '') === 'main' && ($s['bgalegal'] ?? true) === false);
            if (!empty($_bgaIllegalSets)):
                $_bgaSetNames = implode(', ', array_map(fn($s) => h($s[$uiLang] ?? $s['en']), array_values($_bgaIllegalSets)));
            ?>
            <div class="card-altered p-3 mt-2 db-info-banner">
                <div class="d-flex align-items-start gap-2">
                    <i class="fa-solid fa-circle-info flex-shrink-0 text-secondary" style="margin-top:.15em"></i>
                    <span><?= sprintf(h($txt['bga_sets_info']), '<strong>' . $_bgaSetNames . '</strong>') ?></span>
                </div>
            </div>
            <?php endif; ?>
        </div>

    </div>

    <?php endif; ?>
</div>

<!-- Card lightbox (deck list) -->
<div id="db-card-modal" class="ac-lightbox-overlay" style="display:none">
    <div id="db-card-modal-inner" class="ac-lightbox-inner" onclick="event.stopPropagation()"></div>
</div>

<!-- Hero selector modal -->
<div id="db-hero-modal" class="ac-lightbox-overlay" style="display:none;overflow:hidden;z-index:9998" onclick="if(event.target===this)this.style.display='none'">
    <div class="db-hero-panel" onclick="event.stopPropagation()">
        <button onclick="document.getElementById('db-hero-modal').style.display='none'"
                class="db-hero-close-btn">×</button>
        <h3 class="db-hero-title"><?= h($txt['choose_hero']) ?></h3>
        <div class="d-flex gap-1 mb-3 flex-wrap" id="db-hero-factions">
            <button type="button" onclick="dbLoadHeroes('')"
                    class="btn btn-outline-secondary btn-sm active" id="db-hero-all-btn">
                <?= h($txt['collection_all']) ?>
            </button>
            <?php foreach ($factionsData as $fCode => $fData): ?>
            <button type="button" onclick="dbLoadHeroes('<?= $fCode ?>')"
                    class="btn btn-outline-secondary btn-sm" data-faction="<?= $fCode ?>">
                <img src="<?= $pluginAssetsUrl ?>/faction/<?= $fCode ?>.png" alt="<?= h($fCode) ?>" style="width:16px;height:16px;object-fit:contain;vertical-align:middle">
                <?= h($fData[$uiLang] ?? $fData['en']) ?>
            </button>
            <?php endforeach; ?>
        </div>
        <div id="db-hero-loading" class="db-hero-loading"><?= h($txt['loading']) ?></div>
        <div id="db-hero-grid">
            <!-- populated by JS -->
        </div>
    </div>
</div>

<!-- Validation rules modal -->
<div class="modal fade" id="db-rules-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:380px">
        <div class="modal-content db-modal-content">
            <div class="modal-header db-modal-header">
                <h5 class="modal-title small fw-bold" id="db-rules-modal-title"></h5>
                <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 db-modal-body" id="db-rules-modal-body"></div>
        </div>
    </div>
</div>

<!-- Unsaved changes modal -->
<div class="modal fade" id="db-unsaved-modal" tabindex="-1" aria-labelledby="db-unsaved-title" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:420px">
        <div class="modal-content db-modal-content">
            <div class="modal-header db-modal-header" style="padding:inherit">
                <h5 class="modal-title" id="db-unsaved-title"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body db-modal-body" id="db-unsaved-msg"></div>
            <div class="modal-footer db-modal-footer">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal" id="db-modal-stay"></button>
                <button type="button" class="btn btn-outline-danger btn-sm" id="db-modal-leave"></button>
                <button type="button" class="btn btn-primary-altered btn-sm" id="db-modal-save-leave"></button>
            </div>
        </div>
    </div>
</div>

<script>
var AlteredDB = {
    baseUrl:         <?= json_encode(BASE_URL) ?>,
    pluginAssetsUrl: <?= json_encode($pluginAssetsUrl) ?>,
    cdnUrl:    <?= json_encode(CDN_URL) ?>,
    lang:         <?= json_encode($lang) ?>,
    uniqueLocale: <?= json_encode($uniqueLocale) ?>,
    uiLang:       <?= json_encode($uiLang) ?>,
    csrfToken: <?= json_encode(csrfToken()) ?>,
    deckId:    <?= json_encode($editDeckId) ?>,
    isGuest:   <?= $isGuest ? 'true' : 'false' ?>,
    debug:     <?= (defined('API_RESPONSE_DEBUG') && API_RESPONSE_DEBUG) ? 'true' : 'false' ?>,
    factions:  <?= json_encode($factionsData) ?>,
    formats:   <?= json_encode($formatsData) ?>,
    rarities:  <?= json_encode($raritiesData) ?>,
    types:        <?= json_encode($typesData) ?>,
    typesMerged:  <?= json_encode($typesMergedData) ?>,
    powers:    <?= json_encode($powersData) ?>,
    txt: <?= json_encode([
        'loading'       => $txt['loading'],
        'no_results'    => $txt['no_results'],
        'add_card'      => $txt['add_card'],
        'deck_cards'    => $txt['deck_cards'],
        'hero_required'     => $txt['hero_required'],
        'min_cards'         => $txt['min_cards'],
        'max_cards'         => $txt['max_cards'],
        'max_rare'          => $txt['max_rare'],
        'max_exalted'       => $txt['max_exalted'],
        'max_unique'        => $txt['max_unique'],
        'max_copies'        => $txt['max_copies'],
        'max_copies_rarity' => $txt['max_copies_rarity'],
        'same_faction'      => $txt['same_faction'],
        'validation_ok'     => $txt['validation_ok'],
        'deck_invalid'         => $txt['deck_invalid'],
        'rules_modal_title'    => $txt['rules_modal_title'],
        'rule_hero'            => $txt['rule_hero'],
        'rule_min_cards'       => $txt['rule_min_cards'],
        'rule_max_cards'       => $txt['rule_max_cards'],
        'rule_max_rare'        => $txt['rule_max_rare'],
        'rule_max_exalted'     => $txt['rule_max_exalted'],
        'rule_max_unique'      => $txt['rule_max_unique'],
        'rule_copies'          => $txt['rule_copies'],
        'rule_copies_rarity'   => $txt['rule_copies_rarity'],
        'rule_unique_copies'   => $txt['rule_unique_copies'],
        'rule_same_faction'    => $txt['rule_same_faction'],
        'rule_no_banned'       => $txt['rule_no_banned'],
        'rule_no_suspended'    => $txt['rule_no_suspended'],
        'rule_frontier_legal'  => $txt['rule_frontier_legal'],
        'tt_show_banned'       => $txt['tt_show_banned'],
        'tt_show_suspended'    => $txt['tt_show_suspended'],
        'tt_banned_allowed'    => $txt['tt_banned_allowed'],
        'tt_suspended_allowed' => $txt['tt_suspended_allowed'],
        'saving'        => $txt['saving'],
        'saved_ok'      => $txt['saved_ok'],
        'save_btn'      => $txt['save_btn'],
        'change_hero'   => $txt['change_hero'],
        'types'         => $txt['types'],
        'status_auto'   => $txt['status_auto'],
        'status_draft'  => $txt['status_draft'],
        'status_final'  => $txt['status_final'],
        'prev'          => $txt['prev'],
        'next'          => $txt['next'],
        'tab_cards'     => $txt['tab_cards'],
        'tab_stats'     => $txt['tab_stats'],
        'tab_grid'      => $txt['tab_grid'],
        'stats_cost_main'   => $txt['stats_cost_main'],
        'stats_cost_recall' => $txt['stats_cost_recall'],
        'stats_types'       => $txt['stats_types'],
        'stats_powers'      => $txt['stats_powers'],
        'no_cards'      => $txt['no_cards'],
        'err_api'        => $txt['err_api'],
        'save_retry'     => $txt['save_retry'],
        'unsaved_title'  => $txt['unsaved_title'],
        'unsaved_msg'    => $txt['unsaved_msg'],
        'save_and_leave' => $txt['save_and_leave'],
        'leave_anyway'   => $txt['leave_anyway'],
        'stay'           => $txt['stay'],
        'autosaved'      => $txt['autosaved'],
        'guest_saved_ok' => $txt['guest_saved_ok'],
    ]) ?>,
    rendererSrc: 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js',
    existingDeck: <?= json_encode($existingDeck) ?>,
    collection:        <?= json_encode($_userCollection) ?>,
    collectionEntries: <?= json_encode($_collEntries) ?>, // {ref: api_entry_id}
    collectionMode:    <?= $_collectionMode ? 'true' : 'false' ?>,
    showStockWarn:     <?= $showStockWarn ? 'true' : 'false' ?>,
    collectionUrl:     <?= json_encode(BASE_URL . '/pages/collection') ?>,
    collectionCsrf:    <?= json_encode($_collectionMode ? csrfToken() : '') ?>,
    collApiUrl:        <?= json_encode($_collectionMode ? BASE_URL . '/papi/core-altered-cards/collection-search' : '') ?>,
    favoritesEnabled:  <?= $_favMode ? 'true' : 'false' ?>,
    favoritesData:     <?= json_encode($_favMode ? (object)$_userFavorites : (object)[]) ?>,
    favoritesCsrf:     <?= json_encode($_favMode ? csrfToken() : '') ?>,
    favToggleUrl:      <?= json_encode($_favMode ? BASE_URL . '/papi/core-altered-cards/favorites-toggle' : '') ?>,
    favApiUrl:         <?= json_encode($_favMode ? BASE_URL . '/papi/core-altered-cards/favorites-search' : '') ?>,
    favoriteLabel:     <?= json_encode($uiLang === 'fr' ? 'Favori' : 'Favorite') ?>,
    heroTypes:      <?= json_encode($_heroTypes) ?>,
    heroRarities:   <?= json_encode($_heroRarities) ?>,
    heroSets:       <?= json_encode($_heroSets) ?>,
    heroVariations: <?= json_encode($_heroVariations) ?>,
    heroSort1:           <?= json_encode($_heroSort1) ?>,
    heroSort2:           <?= json_encode($_heroSort2) ?>,
    heroReferenceFilter: <?= json_encode($_heroReferenceFilter) ?>,
    heroSortAlpha:       <?= json_encode($_heroSortAlpha) ?>,
    heroNoDuplicate:     <?= json_encode($_heroNoDuplicate) ?>,
    heroDuplicateOrder:  <?= json_encode($_heroDuplicateOrder) ?>,
    defaultVariations: <?= json_encode($_defaultVariations) ?>,
    setOptionsJson:     <?= $setOptionsJson ?>,
    subtypeOptionsJson:   <?= $subtypeOptionsJson ?>,
    keywordOptionsJson:   <?= $keywordOptionsJson ?>,
    variationOptionsJson: <?= $variationOptionsJson ?>,
    defaultCollection:    <?= json_encode($defaultCollection) ?>,
<?php
    // Promo set linking (main edition → its promo sub editions) + flat sub list.
    $setChildren = [];
    $subSets     = [];
    foreach ($setsData as $_sref => $_sd) {
        if (($_sd['subtype'] ?? '') !== 'sub') continue;
        $subSets[] = $_sref;
        if (!empty($_sd['parent'])) $setChildren[$_sd['parent']][] = $_sref;
    }
?>
    setChildren:  <?= json_encode($setChildren) ?>,
    subSets:      <?= json_encode($subSets) ?>,
    ownershipApiUrl: <?= json_encode($_ownMode ? BASE_URL . '/papi/core-altered-cards/ownership-search' : '') ?>,
    uniquesApiBase:  <?= json_encode(defined('UNIQUES_API_URL') ? UNIQUES_API_URL : '') ?>,
};
</script>
<script>
(function () {
    // state
    var deck = {
        id:           AlteredDB.deckId || null,
        name:         '',
        desc:         '',
        format:       'standard',
        isPublic:     false,
        isDraftMode:  'auto', // 'auto'|'draft'|'final'
        hero:         null,   // {cardReference, name, factionCode}
        cards:        {},     // {cardReference: {qty, name, type, rarity, mainCost, recallCost, oceanPower, mountainPower, forestPower}}
    };

    var dirty = false;
    var _autoSaveTimer  = null;
    var _autoSaving     = false;
    var _autoSaveFadeT  = null;
    var elAutoSaveStatus = document.getElementById('db-autosave-status');

    function markDirty() { dirty = true; scheduleAutoSave(); }
    function markClean() {
        dirty = false;
        if (_autoSaveTimer) { clearTimeout(_autoSaveTimer); _autoSaveTimer = null; }
    }

    function scheduleAutoSave() {
        if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
        _autoSaveTimer = setTimeout(function() {
            _autoSaveTimer = null;
            if (dirty) autoSave(null);
        }, 5000);
    }

    function _setAutoStatus(text, fade) {
        if (!elAutoSaveStatus) return;
        clearTimeout(_autoSaveFadeT);
        elAutoSaveStatus.style.transition = '';
        elAutoSaveStatus.style.opacity    = '1';
        elAutoSaveStatus.textContent      = text;
        if (fade) {
            _autoSaveFadeT = setTimeout(function() {
                elAutoSaveStatus.style.transition = 'opacity 1s';
                elAutoSaveStatus.style.opacity    = '0';
            }, 3000);
        }
    }

    function _buildSaveFormData() {
        var deckCards = Object.keys(deck.cards).map(function(ref) {
            return { cardReference: ref, quantity: deck.cards[ref].qty };
        });
        if (deck.hero) deckCards.unshift({ cardReference: deck.hero.cardReference, quantity: 1 });
        var draftMode = elDeckDraft ? elDeckDraft.value : 'auto';
        var isDraft = (draftMode === 'draft') ? true
                    : (draftMode === 'final') ? false
                    : !deck._valid;
        var payload = {
            name:        elDeckName.value.trim() || <?= json_encode($txt['unnamed']) ?>,
            description: elDeckDesc.value.trim(),
            format:      elDeckFormat.value,
            isPublic:    elDeckPublic.value === '1',
            isDraft:     isDraft,
            deckCards:   deckCards,
        };
        var body = new FormData();
        body.append('csrf_token', AlteredDB.csrfToken);
        body.append('deck_id',    deck.id || '');
        body.append('payload',    JSON.stringify(payload));
        return body;
    }

    function autoSave(onDone) {
        if (_autoSaving) { if (onDone) onDone(false); return; }
        if (!dirty)      { if (onDone) onDone(true);  return; }

        if (AlteredDB.isGuest) {
            saveGuestDeck(); markClean();
            _setAutoStatus('✓ ' + AlteredDB.txt.autosaved, true);
            if (onDone) onDone(true);
            return;
        }

        _autoSaving = true;
        _setAutoStatus(AlteredDB.txt.saving, false);

        fetch(AlteredDB.baseUrl + '/pages/deckbuilder?ajax=1', { method: 'POST', body: _buildSaveFormData() })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                _autoSaving = false;
                if (data.ok) {
                    markClean();
                    deck.id = data.id; AlteredDB.deckId = data.id;
                    if (history.replaceState) history.replaceState(null, '', '?id=' + data.id);
                    _setAutoStatus('✓ ' + AlteredDB.txt.autosaved, true);
                    if (onDone) onDone(true);
                } else {
                    _setAutoStatus('', false);
                    if (onDone) onDone(false);
                }
            })
            .catch(function() {
                _autoSaving = false;
                _setAutoStatus('', false);
                if (onDone) onDone(false);
            });
    }

    var GUEST_DECK_KEY = 'alteredcore_guest_deck';

    var rendererLoaded  = false;
    var heroCurrPage    = 1;
    var heroCurrFaction = '';

    // dOM refs
    var elCards    = document.getElementById('db-grid');
    var elCardList = document.getElementById('db-card-list');
    var elCardCount  = document.getElementById('db-card-count');
    var elValidation = document.getElementById('db-validation');
    var elHeroBanner = document.getElementById('db-hero-banner');
    var elHeroLabel  = document.getElementById('db-hero-label');
    var elSaveBtn    = document.getElementById('db-save-btn');
    var elSaveOk     = document.getElementById('db-save-ok');
    var elSaveErr    = document.getElementById('db-save-error');
    var elDeckName   = document.getElementById('db-deck-name');
    var elDeckDesc   = document.getElementById('db-deck-desc');
    var elDeckFormat = document.getElementById('db-deck-format');
    var elDeckPublic = document.getElementById('db-deck-public');
    var elDeckDraft  = document.getElementById('db-deck-draft');

    // BGA tester formats: hidden <option>s become selectable only when the tester
    // flag has been enabled via the secret /pages/bgatester opt-in page.
    if (elDeckFormat) {
        var _bgaTester = false;
        try { _bgaTester = localStorage.getItem('bgatester') === 'true'; } catch (e) {}
        if (_bgaTester) {
            elDeckFormat.querySelectorAll('option[data-hidden]').forEach(function(opt) {
                opt.hidden = false;
                opt.removeAttribute('hidden');
            });
        }
    }

    // card helpers
    // Refs: ALT_{SET}_{SUB}_{FACTION}_{NUM}_{RARITY}[_{VAR}]
    // Unique example: ALT_EOLE_B_AX_106_U_530 — rarity is always parts[5][0]
    function isUnique(ref) { return (ref.split('_')[5] || '')[0] === 'U'; }
    function rarityCode(ref) { return (ref.split('_')[5] || '')[0] || '?'; }
    // Stable hero key: FACTION_NUMBER (e.g. "LY_105"), ignores set/subtype/rarity/variation
    function heroStableKey(ref) {
        var p = ref ? ref.split('_') : [];
        return (p[3] || '') + '_' + (p[4] || '');
    }
    // Canonical card name for grouping copies (handles string or {en,fr,...} objects)
    function canonicalName(card) {
        var n = card ? card.name : '';
        if (typeof n === 'object' && n !== null) return (n.en || n.fr || '').toLowerCase().trim();
        return String(n || '').toLowerCase().trim();
    }
    // Returns the effective unique card limit for the current hero and format rules
    function getHeroUniqueLimit(rules) {
        var limits = rules.heroUniqueLimits;
        if (limits && limits.length > 0 && deck.hero) {
            var stable = heroStableKey(deck.hero.cardReference);
            for (var i = 0; i < limits.length; i++) {
                if (limits[i].match && limits[i].match === stable) return limits[i].maxUniques;
            }
        }
        return (rules.maxUnique !== null && rules.maxUnique !== undefined) ? rules.maxUnique : null;
    }
    // Replaces %d in a message template with a number
    function fmtMsg(tpl, n) { return String(tpl).replace('%d', n); }
    function cdnUrl(ref) {
        var p = ref.split('_');
        return AlteredDB.cdnUrl + '/cards/' + AlteredDB.lang + '/' + (p[1] || '') + '/' + ref + '.webp';
    }
    function normalizeHeroRef(ref) {
        var p = ref.split('_');
        if (p[2] === 'P') p[2] = 'B';
        if (p[1] === 'BISE') p[1] = 'CORE';
        return p.join('_');
    }
    // Locale-keyed names: old Cards API uses short codes (en, fr); the Uniques
    // search API (rust-cards-api) uses long codes (en_US, fr_FR) — fall back
    // across both so unique cards don't render with an empty name.
    var LOCALE_MAP_LONG = { en: 'en_US', fr: 'fr_FR' };
    function cardName(card) {
        var n = card.name;
        if (typeof n !== 'object' || n === null) return n || '';
        return n[AlteredDB.lang] || n[LOCALE_MAP_LONG[AlteredDB.lang]] || n.en || n.en_US || '';
    }
    function factionFromRef(ref) {
        var m = ref.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
        return m ? m[1] : null;
    }
    function ensureRenderer() {
        if (rendererLoaded) return;
        rendererLoaded = true;
        var s = document.createElement('script');
        s.src = AlteredDB.rendererSrc;
        document.head.appendChild(s);
    }

    // render a card in the browser grid
    function renderBrowserCard(card) {
        var ref  = card.reference || '';
        var name = cardName(card);
        // The Uniques search API's CardV2 objects carry no cardType field at all
        // (rust-cards-api drops it) — every unique searchable here is a Character.
        var type = (card.cardType && card.cardType.reference) || card.cardTypeReference || (isUnique(ref) ? 'CHARACTER' : '');
        var fmtRules = AlteredDB.formats[elDeckFormat ? elDeckFormat.value : 'standard'] || {};
        var perRef   = fmtRules.maxCopiesPerRef;
        var lim      = (card.deckLimit !== undefined && card.deckLimit !== null && perRef !== undefined)
                       ? Math.min(card.deckLimit, perRef) : (perRef !== undefined ? perRef : card.deckLimit);
        if (isUnique(ref) && fmtRules.maxCopiesPerUnique !== null && fmtRules.maxCopiesPerUnique !== undefined) {
            lim = (lim !== undefined && lim !== null) ? Math.min(lim, fmtRules.maxCopiesPerUnique) : fmtRules.maxCopiesPerUnique;
        }
        var qty  = deck.cards[ref] ? deck.cards[ref].qty : 0;
        var isH  = type === 'HERO';
        var typeData   = AlteredDB.types[type];
        var notInDeck  = typeData && typeData.allowedInDeckbuilder === false;

        var item = document.createElement('div');
        item.style.minWidth = '0';

        var nameEl = document.createElement('div');
        nameEl.className = 'db-card-name';
        nameEl.title = name;
        nameEl.textContent = name;
        item.appendChild(nameEl);

        var wrap = document.createElement('div');
        wrap.className = 'db-card-wrap';
        wrap.dataset.ref = ref;

        if (isUnique(ref)) {
            ensureRenderer();
            var el = document.createElement('altered-card');
            el.setAttribute('ref', ref);
            el.setAttribute('locale', AlteredDB.uniqueLocale);
            wrap.appendChild(el);
        } else {
            var img = document.createElement('img');
            img.src = cdnUrl(ref);
            img.alt = name;
            img.className = 'db-card-img';
            img.loading = 'lazy';
            wrap.appendChild(img);
        }

        // Favorite star — top-right (helper exposed by card-search.js)
        if (window.acMakeFavButton) {
            var favBtn = window.acMakeFavButton(card);
            if (favBtn) wrap.appendChild(favBtn);
        }

        if (notInDeck) {
            // no add/remove controls for token-type cards
        } else if (isH) {
            var overlay = document.createElement('div');
            overlay.className = 'db-card-add-overlay';
            overlay.innerHTML = '<span>' + AlteredDB.txt.change_hero + '</span>';
            wrap.appendChild(overlay);

            wrap.addEventListener('click', function () {
                setHero({ cardReference: ref, name: name, factionCode: factionFromRef(ref) });
                document.getElementById('db-hero-modal').style.display = 'none';
            });
        } else {
            var btnGroup = document.createElement('div');
            btnGroup.className = 'db-card-btn-group btn-group';

            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-danger';
            removeBtn.title = '−';
            removeBtn.textContent = '−';
            if (qty === 0) removeBtn.style.display = 'none';
            btnGroup.appendChild(removeBtn);

            var addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn-primary-altered';
            addBtn.title = '+';
            addBtn.textContent = '+';
            btnGroup.appendChild(addBtn);

            wrap.appendChild(btnGroup);

            var addPayload = {
                cardReference: ref,
                name: name,
                cardTypeReference: type,
                rarity: rarityCode(ref),
                factionCode: (card.faction && card.faction.code) || null,
                mainCost: card.mainCost || 0,
                recallCost: card.recallCost || 0,
                oceanPower: card.oceanPower || 0,
                mountainPower: card.mountainPower || 0,
                forestPower: card.forestPower || 0,
                deckLimit: lim,
                isBanned:    !!card.isBanned,
                isSuspended: !!card.isSuspended,
            };

            addBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                addCard(addPayload);
            });

            removeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                removeCard(ref);
            });

            wrap.addEventListener('click', function () {
                openDbCardModal(ref, addPayload);
            });
        }

        if (qty > 0 && !isH) {
            var badge = document.createElement('span');
            badge.className = 'db-card-qty-badge';
            badge.textContent = '×' + qty;
            wrap.appendChild(badge);
        }

        if (AlteredDB.collectionMode && !isH) {
            var cqty = AlteredDB.collection[ref] || 0;
            var cbadge = document.createElement('span');
            cbadge.className = 'db-card-coll-badge';
            cbadge.dataset.ref = ref;
            cbadge.innerHTML = '<i class="fa-solid fa-box-archive"></i> \xd7' + cqty;
            wrap.appendChild(cbadge);
        }

        item.appendChild(wrap);

        return item;
    }

    // hero
    function setHero(heroData) {
        deck.hero = heroData;
        markDirty();
        var ref     = heroData.cardReference || '';
        var name    = typeof heroData.name === 'object'
            ? (heroData.name[AlteredDB.lang] || heroData.name.en || '')
            : (heroData.name || '');
        var faction = heroData.factionCode || factionFromRef(ref);
        deck.hero.factionCode = faction; // resolved once here so later reads (e.g. reset) don't need to recompute
        var fData   = AlteredDB.factions[faction] || {};
        var fColor  = fData.color || '#fff';

        elHeroBanner.innerHTML = '';
        elHeroBanner.style.cssText = '';

        if (ref) {
            var heroImg = AlteredDB.cdnUrl + '/cards/hero/' + normalizeHeroRef(ref) + '_1.webp';
            var fImg    = faction ? AlteredDB.pluginAssetsUrl + '/faction/' + faction + '.png' : '';
            elHeroBanner.style.cssText =
                'background-image:linear-gradient(to right,' + fColor + 'b3 30%,' + fColor + '00 100%),url(' + heroImg + ');' +
                'background-size:cover;background-position:left top;';
        }

        if (faction) {
            var fImgEl = document.createElement('img');
            fImgEl.src = AlteredDB.pluginAssetsUrl + '/faction/' + faction + '.png';
            fImgEl.alt = faction;
            fImgEl.style.cssText = 'width:28px;height:28px;object-fit:contain;flex-shrink:0';
            elHeroBanner.appendChild(fImgEl);
        }
        var textEl = document.createElement('div');
        textEl.className = 'deck-card-text-white';
        textEl.innerHTML = '<div style="font-size:.85rem;font-weight:700">' + escHtml(name) + '</div>'
            + '<div style="font-size:.72rem;opacity:.7;margin-top:2px">' + AlteredDB.txt.change_hero + '</div>';
        elHeroBanner.appendChild(textEl);

        updateDeckDisplay();
        updateHeroFactionFilter(faction);
        if (AlteredDB.isGuest) saveGuestDeck();
    }

    // Sync the (advanced-search) faction filter to the hero's faction when the
    // hero changes mid-session. No-op at page load: the CardSearch engine
    // (window.CardSearchInstances.db) is created by a later <script> block and
    // doesn't exist yet while initFromExisting() runs.
    function updateHeroFactionFilter(faction) {
        var engine = window.CardSearchInstances && window.CardSearchInstances.db;
        if (!engine || !faction) return;
        var root = document.getElementById('db-panel');
        if (!root) return;
        root.querySelectorAll('.filter-toggle[data-filter="faction"]').forEach(function(btn) {
            var isTarget = btn.dataset.value === faction;
            var isActive = btn.classList.contains('active');
            if (isTarget !== isActive) btn.click(); // reuses card-search.js's own toggle logic
        });
        engine.search(1);
    }

    // deck card management
    function addCard(card) {
        var _td = AlteredDB.types[card.cardTypeReference];
        if (_td && _td.allowedInDeckbuilder === false) return;
        markDirty();
        var ref = card.cardReference;
        if (!deck.cards[ref]) {
            deck.cards[ref] = {
                qty: 0, name: card.name, type: card.cardTypeReference, rarity: card.rarity,
                factionCode: card.factionCode || null,
                mainCost: card.mainCost || 0, recallCost: card.recallCost || 0,
                oceanPower: card.oceanPower || 0, mountainPower: card.mountainPower || 0, forestPower: card.forestPower || 0,
                isBanned:    !!card.isBanned,
                isSuspended: !!card.isSuspended,
            };
        }
        deck.cards[ref].qty++;
        updateDeckDisplay();
        updateBrowserCardBadge(ref);
        if (AlteredDB.isGuest) saveGuestDeck();
    }
    function removeCard(ref) {
        markDirty();
        if (deck.cards[ref]) {
            deck.cards[ref].qty--;
            if (deck.cards[ref].qty <= 0) delete deck.cards[ref];
            updateDeckDisplay();
            updateBrowserCardBadge(ref);
            if (AlteredDB.isGuest) saveGuestDeck();
        }
    }
    function updateBrowserCardBadge(ref) {
        var wrap = elCards.querySelector('[data-ref="' + ref.replace(/"/g, '\\"') + '"]');
        if (!wrap) return;
        var badge     = wrap.querySelector('.db-card-qty-badge');
        var removeBtn = wrap.querySelector('.db-card-btn-group .btn-danger');
        var qty = deck.cards[ref] ? deck.cards[ref].qty : 0;
        if (qty > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'db-card-qty-badge';
                wrap.appendChild(badge);
            }
            badge.textContent = '×' + qty;
            if (removeBtn) removeBtn.style.display = '';
        } else {
            if (badge) badge.remove();
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }

    // deck display (right panel)
    var TYPE_ORDER = Object.keys(AlteredDB.types).filter(function(t) {
        return t !== 'HERO' && t.indexOf('TOKEN') !== 0;
    });
    TYPE_ORDER.push('OTHER'); // catch-all for cards with unrecognized types

    function updateDeckDisplay() {
        // Card count + gems
        var total = 0, gems = {};
        Object.keys(AlteredDB.rarities).forEach(function(k) { var g = AlteredDB.rarities[k].gem; if (g) gems[g] = 0; });
        Object.keys(deck.cards).forEach(function(ref) {
            var c = deck.cards[ref];
            total += c.qty;
            var r = c.rarity || rarityCode(ref);
            if (gems[r] !== undefined) gems[r] += c.qty;
        });
        elCardCount.textContent = total + ' ' + AlteredDB.txt.deck_cards;

        // Gem badges
        Object.keys(gems).forEach(function(r) {
            var el  = document.getElementById('db-gem-' + r);
            var cnt = document.getElementById('db-gem-' + r + '-count');
            if (!el || !cnt) return;
            if (gems[r] > 0) {
                el.style.display = '';
                cnt.textContent  = gems[r];
            } else {
                el.style.display = 'none';
            }
        });

        // Validation — all rules come from AlteredDB.formats (altered.json)
        var fmtKey       = elDeckFormat ? elDeckFormat.value : (deck.format || 'standard');
        var rules        = AlteredDB.formats[fmtKey] || {};
        var ruleResults  = [];   // [{label, ok, current, limit}]
        var violatingRefs = {};  // {ref: "reason"} for per-card violations

        function addRule(label, ok, current, limit) {
            ruleResults.push({ label: label, ok: ok, current: current, limit: limit });
        }

        // Hero required
        if (rules.heroRequired) {
            addRule(AlteredDB.txt.rule_hero, !!deck.hero, null, null);
        }

        // Min / max cards (hero excluded from total)
        if (rules.minCards !== null && rules.minCards !== undefined)
            addRule(AlteredDB.txt.rule_min_cards, total >= rules.minCards, total, rules.minCards);
        if (rules.maxCards !== null && rules.maxCards !== undefined)
            addRule(AlteredDB.txt.rule_max_cards, total <= rules.maxCards, total, rules.maxCards);

        // Rarity caps
        if (rules.maxRare !== null && rules.maxRare !== undefined)
            addRule(AlteredDB.txt.rule_max_rare, gems.R <= rules.maxRare, gems.R, rules.maxRare);
        if (rules.maxExalted !== null && rules.maxExalted !== undefined)
            addRule(AlteredDB.txt.rule_max_exalted, gems.E <= rules.maxExalted, gems.E, rules.maxExalted);

        // Unique cap — hero-dependent in singleton
        var uLimit = getHeroUniqueLimit(rules);
        if (uLimit !== null)
            addRule(AlteredDB.txt.rule_max_unique, gems.U <= uLimit, gems.U, uLimit);

        // Max copies of the same unique reference
        if (rules.maxCopiesPerUnique !== null && rules.maxCopiesPerUnique !== undefined) {
            var uniqueRefOk = true;
            Object.keys(deck.cards).forEach(function(ref) {
                if (isUnique(ref) && deck.cards[ref].qty > rules.maxCopiesPerUnique) uniqueRefOk = false;
            });
            addRule(AlteredDB.txt.rule_unique_copies, uniqueRefOk, null, rules.maxCopiesPerUnique);
            if (!uniqueRefOk) {
                Object.keys(deck.cards).forEach(function(ref) {
                    if (isUnique(ref) && deck.cards[ref].qty > rules.maxCopiesPerUnique)
                        violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_unique_copies : AlteredDB.txt.rule_unique_copies;
                });
            }
        }

        // Max copies per card name (same name across different set refs = same card)
        if (rules.maxCopiesPerName !== null && rules.maxCopiesPerName !== undefined) {
            var nameQty = {};
            Object.keys(deck.cards).forEach(function(ref) {
                var key = canonicalName(deck.cards[ref]);
                if (key) nameQty[key] = (nameQty[key] || 0) + deck.cards[ref].qty;
            });
            var maxName = rules.maxCopiesPerName;
            var nameOk  = true;
            var badNames = {};
            Object.keys(nameQty).forEach(function(k) {
                if (nameQty[k] > maxName) { nameOk = false; badNames[k] = true; }
            });
            addRule(AlteredDB.txt.rule_copies, nameOk, null, maxName);
            if (!nameOk) {
                Object.keys(deck.cards).forEach(function(ref) {
                    if (badNames[canonicalName(deck.cards[ref])]) violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_copies : AlteredDB.txt.rule_copies;
                });
            }
        }

        // Max copies per card name+rarity (singleton: 1 per rarity per name)
        if (rules.maxCopiesPerNameRarity !== null && rules.maxCopiesPerNameRarity !== undefined) {
            var nameRarityQty = {};
            Object.keys(deck.cards).forEach(function(ref) {
                var c   = deck.cards[ref];
                var key = canonicalName(c) + '|' + (c.rarity || rarityCode(ref));
                nameRarityQty[key] = (nameRarityQty[key] || 0) + c.qty;
            });
            var maxNR  = rules.maxCopiesPerNameRarity;
            var nrOk   = true;
            var badNRs = {};
            Object.keys(nameRarityQty).forEach(function(k) {
                if (nameRarityQty[k] > maxNR) { nrOk = false; badNRs[k] = true; }
            });
            addRule(AlteredDB.txt.rule_copies_rarity, nrOk, null, maxNR);
            if (!nrOk) {
                Object.keys(deck.cards).forEach(function(ref) {
                    var c   = deck.cards[ref];
                    var key = canonicalName(c) + '|' + (c.rarity || rarityCode(ref));
                    if (badNRs[key]) violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_copies_rarity : AlteredDB.txt.rule_copies_rarity;
                });
            }
        }

        // Faction unity — hero and all cards must share one faction
        if (rules.sameFaction) {
            var heroFaction  = deck.hero ? (deck.hero.factionCode || factionFromRef(deck.hero.cardReference)) : null;
            var allFactions  = {};
            Object.keys(deck.cards).forEach(function(ref) {
                var f = deck.cards[ref].factionCode || null; if (f) allFactions[f] = true;
            });
            if (heroFaction) allFactions[heroFaction] = true;
            var factionOk = Object.keys(allFactions).length <= 1;
            addRule(AlteredDB.txt.rule_same_faction, factionOk, null, null);
            if (!factionOk && heroFaction) {
                Object.keys(deck.cards).forEach(function(ref) {
                    var f = deck.cards[ref].factionCode || null;
                    if (f && f !== heroFaction) violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_same_faction : AlteredDB.txt.rule_same_faction;
                });
            }
        }

        // Banned cards
        if (rules.allowBanned === false) {
            var bannedRefs = [];
            Object.keys(deck.cards).forEach(function(ref) {
                if (deck.cards[ref].isBanned) bannedRefs.push(ref);
            });
            addRule(AlteredDB.txt.rule_no_banned, bannedRefs.length === 0, bannedRefs.length > 0 ? bannedRefs.length : null, null);
            bannedRefs.forEach(function(ref) {
                violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_no_banned : AlteredDB.txt.rule_no_banned;
            });
        }

        // Suspended cards
        if (rules.allowSuspended === false) {
            var suspendedRefs = [];
            Object.keys(deck.cards).forEach(function(ref) {
                if (deck.cards[ref].isSuspended) suspendedRefs.push(ref);
            });
            addRule(AlteredDB.txt.rule_no_suspended, suspendedRefs.length === 0, suspendedRefs.length > 0 ? suspendedRefs.length : null, null);
            suspendedRefs.forEach(function(ref) {
                violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_no_suspended : AlteredDB.txt.rule_no_suspended;
            });
        }

        // Frontier allowlist — verified live against the uniques search API,
        // since the ~30k reference allowlist is never shipped to the browser.
        if (rules.requireUniqueLegality) {
            var illegalUniqueRefs = [];
            Object.keys(deck.cards).forEach(function(ref) {
                if (isUnique(ref) && deck.cards[ref].isFrontierIllegal) illegalUniqueRefs.push(ref);
            });
            addRule(AlteredDB.txt.rule_frontier_legal, illegalUniqueRefs.length === 0, illegalUniqueRefs.length > 0 ? illegalUniqueRefs.length : null, null);
            illegalUniqueRefs.forEach(function(ref) {
                violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_frontier_legal : AlteredDB.txt.rule_frontier_legal;
            });
            checkFrontierLegality();
        }

        deck._valid = ruleResults.every(function(r) { return r.ok; });

        if (!deck._valid) {
            var badge = document.createElement('span');
            badge.className = 'badge';
            badge.style.cssText = 'background:#ef4444;color:#fff;font-size:.75rem;font-weight:600;padding:4px 9px;cursor:pointer';
            badge.innerHTML = escHtml(AlteredDB.txt.deck_invalid) + ' <i class="fa-solid fa-circle-info" style="font-size:.7rem"></i>';
            badge.onclick = function() { openValidationModal(ruleResults, fmtKey); };
            elValidation.innerHTML = '';
            elValidation.appendChild(badge);
        } else {
            var okBadge = document.createElement('span');
            okBadge.className = 'badge';
            okBadge.style.cssText = 'background:#22c55e;color:#fff;font-size:.75rem;font-weight:600;padding:4px 9px;cursor:pointer';
            okBadge.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + escHtml(AlteredDB.txt.validation_ok) + ' <i class="fa-solid fa-circle-info" style="font-size:.7rem"></i>';
            okBadge.onclick = function() { openValidationModal(ruleResults, fmtKey); };
            elValidation.innerHTML = '';
            elValidation.appendChild(okBadge);
        }

        // Card list by type
        var grouped = {};
        TYPE_ORDER.forEach(function(t) { grouped[t] = []; });
        Object.keys(deck.cards).forEach(function(ref) {
            var c = deck.cards[ref];
            var t = c.type || 'OTHER';
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push({ ref: ref, qty: c.qty, name: c.name, rarity: c.rarity || rarityCode(ref), mainCost: c.mainCost, faction: c.factionCode || null, isBanned: !!c.isBanned, isSuspended: !!c.isSuspended, isFrontierIllegal: !!c.isFrontierIllegal });
        });
        elCardList.innerHTML = '';
        TYPE_ORDER.forEach(function(type) {
            var group = grouped[type] || [];
            if (!group.length) return;
            group.sort(function(a,b) { return (a.mainCost||0) - (b.mainCost||0); });
            var typeLabel = (AlteredDB.txt.types || {})[type] || type;
            var hdr = document.createElement('div');
            hdr.style.cssText = 'font-size:.7rem;font-weight:700;color:var(--neutral-400);text-transform:uppercase;letter-spacing:.05em;padding:4px 0 2px';
            hdr.textContent = typeLabel + ' (' + group.reduce(function(s,c){ return s + c.qty; }, 0) + ')';
            elCardList.appendChild(hdr);
            group.forEach(function(c) {
                var item = document.createElement('div');
                item.className = 'deck-list-item';
                var rGem    = {C:'C',R:'R',U:'U',E:'E'}[c.rarity] || 'C';
                var faction = c.faction || null;
                var dName   = typeof c.name === 'object' ? (c.name[AlteredDB.lang] || c.name.en || '') : (c.name || '');
                item.innerHTML =
                    '<div class="deck-list-qty">'
                    + '<button onclick="removeCard(\'' + escAttr(c.ref) + '\')" title="-">−</button>'
                    + '<span class="qty-num">' + c.qty + '</span>'
                    + '<button onclick="addCard({cardReference:\'' + escAttr(c.ref) + '\',name:\'' + escAttr(c.name||'') + '\',cardTypeReference:\'' + escAttr(c.type||'OTHER') + '\',rarity:\'' + escAttr(c.rarity||'') + '\',factionCode:\'' + escAttr(c.faction||'') + '\',mainCost:' + (c.mainCost||0) + '})" title="+">+</button>'
                    + '</div>'
                    + (faction ? '<img src="' + AlteredDB.pluginAssetsUrl + '/faction/' + faction + '.png" alt="' + faction + '" class="deck-list-gem">' : '')
                    + '<img src="' + AlteredDB.pluginAssetsUrl + '/gems/' + rGem + '.png" alt="' + rGem + '" class="deck-list-gem">'
                    + '<span class="deck-list-name" title="' + escAttr(dName) + '" style="cursor:pointer" onclick="openDbCardModal(\'' + escAttr(c.ref) + '\')">'
                    + escHtml(dName)
                    + '</span>'
                    + (c.isBanned    && rules.allowBanned    === false ? '<span class="deck-list-banned"    title="' + escAttr(AlteredDB.txt.rule_no_banned)    + '"><i class="fa-solid fa-ban"></i></span>'          : '')
                    + (c.isSuspended && rules.allowSuspended === false ? '<span class="deck-list-suspended" title="' + escAttr(AlteredDB.txt.rule_no_suspended) + '"><i class="fa-solid fa-circle-pause"></i></span>' : '')
                    + (c.isFrontierIllegal && rules.requireUniqueLegality ? '<span class="deck-list-banned" title="' + escAttr(AlteredDB.txt.rule_frontier_legal) + '"><i class="fa-solid fa-map"></i></span>' : '')
                    + (violatingRefs[c.ref] ? '<span class="deck-list-violation" title="' + escAttr(violatingRefs[c.ref]) + '">!</span>' : '')
                    + (AlteredDB.showStockWarn && AlteredDB.collectionMode && c.qty > (AlteredDB.collection[c.ref] || 0)
                        ? '<span class="deck-list-stockwarn" title="' + <?= json_encode($txt['stock_warn']) ?> + '"><i class="fa-solid fa-box-archive" style="font-size:.6rem"></i></span>'
                        : '');
                elCardList.appendChild(item);
            });
        });

        renderStatsPane();
        renderGridPane();
        renderHandPane();
    }

    function openValidationModal(results, fmtKey) {
        var fmtData = AlteredDB.formats[fmtKey] || {};
        var fmtName = fmtData[AlteredDB.uiLang] || fmtData.en || fmtKey;
        var titleEl = document.getElementById('db-rules-modal-title');
        var bodyEl  = document.getElementById('db-rules-modal-body');
        if (!titleEl || !bodyEl) return;

        titleEl.textContent = AlteredDB.txt.rules_modal_title + ' — ' + fmtName;

        var html = '<ul style="list-style:none;margin:0;padding:0">';
        results.forEach(function(r) {
            var icon   = r.ok
                ? '<i class="fa-solid fa-check" style="color:#22c55e;width:14px;flex-shrink:0"></i>'
                : '<i class="fa-solid fa-xmark" style="color:#ef4444;width:14px;flex-shrink:0"></i>';
            var detail = '';
            if (r.current !== null && r.limit !== null) {
                detail = '<span style="font-size:.75rem;color:var(--neutral-400);margin-left:auto;white-space:nowrap">'
                    + r.current + ' / ' + r.limit + '</span>';
            } else if (r.limit !== null) {
                detail = '<span style="font-size:.75rem;color:var(--neutral-400);margin-left:auto;white-space:nowrap">'
                    + '&le; ' + r.limit + '</span>';
            }
            html += '<li style="display:flex;align-items:center;gap:8px;padding:7px 16px;border-bottom:1px solid var(--sand-200)">'
                + icon
                + '<span style="font-size:.84rem' + (r.ok ? '' : ';color:#ef4444') + '">' + escHtml(r.label) + '</span>'
                + detail
                + '</li>';
        });
        html += '</ul>';
        bodyEl.innerHTML = html;

        var el = document.getElementById('db-rules-modal');
        var m  = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
        m.show();
    }

    function renderStatsPane() {
        var pane = document.getElementById('db-deck-pane-stats');
        if (!pane) return;

        var keys = Object.keys(deck.cards);
        if (!keys.length) {
            pane.innerHTML = '<p style="font-size:.82rem;color:var(--neutral-400);padding:.5rem 0">' + escHtml(AlteredDB.txt.no_cards) + '</p>';
            return;
        }

        var costCurve   = {};
        var recallCurve = {};
        var typeTotals  = {};
        var powers      = {};
        Object.keys(AlteredDB.powers).forEach(function(pk) { powers[pk] = 0; });
        var powerCount  = 0;

        keys.forEach(function(ref) {
            var c      = deck.cards[ref];
            var main   = Math.min(c.mainCost   || 0, 7);
            var recall = Math.min(c.recallCost || 0, 7);
            costCurve[main]     = (costCurve[main]     || 0) + c.qty;
            recallCurve[recall] = (recallCurve[recall] || 0) + c.qty;
            typeTotals[c.type || 'OTHER'] = (typeTotals[c.type || 'OTHER'] || 0) + c.qty;
            Object.keys(AlteredDB.powers).forEach(function(pk) {
                powers[pk] += (c[pk + 'Power'] || 0) * c.qty;
            });
            powerCount += c.qty;
        });

        var avg = {};
        Object.keys(AlteredDB.powers).forEach(function(pk) {
            avg[pk] = powerCount > 0 ? Math.round(powers[pk] / powerCount * 10) / 10 : 0;
        });
        var maxCost   = Math.max.apply(null, Object.values(costCurve).concat([1]));
        var maxRecall = Math.max.apply(null, Object.values(recallCurve).concat([1]));
        var maxType   = Math.max.apply(null, Object.values(typeTotals).concat([1]));
        var maxPwr    = Math.max.apply(null, Object.values(avg).concat([1]));

        function vCurve(curve, maxQty, color) {
            var counts = '';
            var bars   = '';
            var labels = '';
            for (var i = 1; i <= 7; i++) {
                var qty = curve[i] || 0;
                var h   = maxQty > 0 ? Math.round(qty / maxQty * 100) : 0;
                var lbl = i < 7 ? String(i) : '7+';
                counts += '<span>' + (qty > 0 ? qty : '') + '</span>';
                bars   += '<div class="db-vcurve-bar" style="height:' + h + '%;background:' + color + '"></div>';
                labels += '<span>' + lbl + '</span>';
            }
            return '<div class="db-vcurve-counts">' + counts + '</div>'
                 + '<div class="db-vcurve-bars">'   + bars   + '</div>'
                 + '<div class="db-vcurve-labels">' + labels + '</div>';
        }

        function bar(label, val, max, color) {
            var pct = Math.round(val / max * 100);
            return '<div class="db-stat-bar-row">'
                + '<span class="db-stat-bar-lbl">' + escHtml(String(label)) + '</span>'
                + '<div class="db-stat-bar-track"><div class="db-stat-bar-fill" style="width:' + pct + '%;'
                + (color ? 'background:' + color : '') + '"></div></div>'
                + '<span class="db-stat-bar-val">' + val + '</span>'
                + '</div>';
        }

        var html = '<div class="db-stat-section-title">' + escHtml(AlteredDB.txt.stats_cost_main) + '</div>';
        html += vCurve(costCurve, maxCost, 'var(--primary-400)');
        html += '<div class="db-stat-section-title">' + escHtml(AlteredDB.txt.stats_cost_recall) + '</div>';
        html += vCurve(recallCurve, maxRecall, 'var(--secondary-400,#a78bfa)');

        html += '<div class="db-stat-section-title" style="margin-top:16px">' + escHtml(AlteredDB.txt.stats_types) + '</div>';
        TYPE_ORDER.forEach(function(t) {
            if (!typeTotals[t]) return;
            var lbl = (AlteredDB.txt.types || {})[t] || t;
            html += '<div class="db-stat-bar-row">'
                + '<span class="db-stat-bar-lbl" style="min-width:66px;text-align:left">' + escHtml(lbl) + '</span>'
                + '<div class="db-stat-bar-track"><div class="db-stat-bar-fill" style="width:' + Math.round(typeTotals[t] / maxType * 100) + '%"></div></div>'
                + '<span class="db-stat-bar-val">' + typeTotals[t] + '</span>'
                + '</div>';
        });

        html += '<div class="db-stat-section-title" style="margin-top:16px">' + escHtml(AlteredDB.txt.stats_powers) + '</div>';
        var B = AlteredDB.pluginAssetsUrl;
        Object.keys(AlteredDB.powers).forEach(function(pk) {
            var p = AlteredDB.powers[pk];
            html += '<div class="db-stat-bar-row">'
                + '<span class="db-stat-bar-lbl"><img src="' + B + '/biome/' + p.img + '" style="width:16px;height:16px;object-fit:contain" alt="' + pk + '"></span>'
                + '<div class="db-stat-bar-track"><div class="db-stat-bar-fill" style="width:' + Math.round(avg[pk] / maxPwr * 100) + '%;background:' + p.color + '"></div></div>'
                + '<span class="db-stat-bar-val">' + avg[pk] + '</span>'
                + '</div>';
        });

        pane.innerHTML = html;
    }

    // deck preview pane (grid / list view)
    var dbGridViewMode = 'grid';

    function renderGridPane() {
        var pane = document.getElementById('db-search-pane-view');
        if (!pane || pane.style.display === 'none') return;

        var content = document.getElementById('db-deckgrid-content');
        if (!content) return;

        var keys = Object.keys(deck.cards);
        if (!keys.length) {
            content.innerHTML = '<p style="font-size:.82rem;color:var(--neutral-400);padding:.5rem 0">' + escHtml(AlteredDB.txt.no_cards) + '</p>';
            return;
        }

        var grouped = {};
        TYPE_ORDER.forEach(function(t) { grouped[t] = []; });
        keys.forEach(function(ref) {
            var c = deck.cards[ref];
            var t = c.type || 'OTHER';
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push({
                ref: ref, qty: c.qty, name: c.name,
                faction: c.factionCode || null,
                rarity: c.rarity || rarityCode(ref),
                mainCost: c.mainCost || 0, recallCost: c.recallCost || 0,
                oceanPower: c.oceanPower || 0, mountainPower: c.mountainPower || 0, forestPower: c.forestPower || 0,
            });
        });

        var hasUnique = keys.some(function(ref) { var p = ref.split('_'); return p[5] && p[5][0] === 'U'; });
        if (hasUnique) ensureRenderer();

        var html = '';
        if (dbGridViewMode === 'grid') {
            TYPE_ORDER.forEach(function(type) {
                var group = grouped[type] || [];
                if (!group.length) return;
                group.sort(function(a, b) { return a.mainCost - b.mainCost; });
                var typeLabel = (AlteredDB.txt.types || {})[type] || type;
                var total = group.reduce(function(s, c) { return s + c.qty; }, 0);
                html += '<div class="db-deckgrid-type">' + escHtml(typeLabel) + ' (' + total + ')</div>';
                html += '<div class="deck-cards-grid">';
                group.forEach(function(c) {
                    var dName = typeof c.name === 'object' ? (c.name[AlteredDB.lang] || c.name.en || '') : (c.name || '');
                    var p = c.ref.split('_');
                    var cardImg = (p[5] && p[5][0] === 'U')
                        ? '<altered-card ref="' + escAttr(c.ref) + '" locale="' + escAttr(AlteredDB.uniqueLocale) + '" style="display:block;width:100%;border-radius:7px;overflow:hidden;aspect-ratio:63.5/88"></altered-card>'
                        : '<img src="' + cdnUrl(c.ref) + '" alt="' + escAttr(dName) + '" loading="lazy">';
                    html += '<div class="db-deckgrid-card" onclick="openDbCardModal(\'' + escAttr(c.ref) + '\')" title="' + escAttr(dName) + '">'
                        + cardImg
                        + (c.qty > 1 ? '<span class="db-deckgrid-qty">\xd7' + c.qty + '</span>' : '')
                        + '</div>';
                });
                html += '</div>';
            });
        } else {
            var B = AlteredDB.pluginAssetsUrl;
            TYPE_ORDER.forEach(function(type) {
                var group = grouped[type] || [];
                if (!group.length) return;
                group.sort(function(a, b) { return a.mainCost - b.mainCost; });
                var typeLabel = (AlteredDB.txt.types || {})[type] || type;
                var total = group.reduce(function(s, c) { return s + c.qty; }, 0);
                html += '<div class="db-deckgrid-type">' + escHtml(typeLabel) + ' (' + total + ')</div>';
                group.forEach(function(c) {
                    var dName = typeof c.name === 'object' ? (c.name[AlteredDB.lang] || c.name.en || '') : (c.name || '');
                    var rGem = {C:'C',R:'R',U:'U',E:'E'}[c.rarity] || 'C';
                    html += '<div class="db-decklist-row" onclick="openDbCardModal(\'' + escAttr(c.ref) + '\')">'
                        + '<span class="db-decklist-qty">' + c.qty + '</span>'
                        + (c.faction ? '<img src="' + B + '/faction/' + c.faction + '.png" alt="' + c.faction + '" class="deck-list-gem">' : '')
                        + '<img src="' + B + '/gems/' + rGem + '.png" alt="' + rGem + '" class="deck-list-gem">'
                        + '<span class="db-decklist-name" title="' + escAttr(dName) + '">' + escHtml(dName) + '</span>'
                        + '<span class="decklist-stats">'
                        + '<span class="decklist-stat"><i class="fak fa-altered-h" style="font-size:.8rem"></i>' + c.mainCost + '</span>'
                        + '<span class="decklist-stat"><i class="fak fa-altered-r" style="font-size:.8rem"></i>' + c.recallCost + '</span>'
                        + '<span class="decklist-stat"><img src="' + B + '/biome/F.webp" alt="F" style="width:11px;height:11px">' + c.forestPower + '</span>'
                        + '<span class="decklist-stat"><img src="' + B + '/biome/M.webp" alt="M" style="width:11px;height:11px">' + c.mountainPower + '</span>'
                        + '<span class="decklist-stat"><img src="' + B + '/biome/O.webp" alt="O" style="width:11px;height:11px">' + c.oceanPower + '</span>'
                        + '</span>'
                        + '</div>';
                });
            });
        }
        content.innerHTML = html;
    }

    // Starting-hand pane: rebuild the hand-odds globals from the live deck, then recompute.
    // (deck.cards holds no hero — heroes live on deck.hero — so the pool needs no filtering.)
    function renderHandPane() {
        ensureRenderer();   // the calculators' unique thumbnails use the <altered-card> web component
        var cards = [], groups = {};
        Object.keys(deck.cards).forEach(function(ref) {
            var c = deck.cards[ref], nm = cardName(c), uniq = isUnique(ref), img = cdnUrl(ref);
            cards.push({ ref: ref, name: nm, qty: c.qty, type: c.type, mainCost: c.mainCost, recallCost: c.recallCost, unique: uniq, img: img });
            // Uniques are distinct cards (own art + costs): key by ref; others group by name+rarity.
            var key = uniq ? ref : (nm + '|' + (c.rarity || ''));
            if (!groups[key]) groups[key] = { key: key, name: nm, rarity: c.rarity || '', type: c.type, mainCost: c.mainCost, recallCost: c.recallCost, qty: 0, unique: uniq, ref: ref, img: img };
            groups[key].qty += c.qty;
        });
        window.handDeckCards  = cards;
        window.handDeckGroups = Object.keys(groups).map(function(k) { return groups[k]; });
        window.handDeckSize   = cards.reduce(function(s, c) { return s + c.qty; }, 0);
        if (window.HandOdds) window.HandOdds.refresh();
    }

    // hero modal
    window.dbSelectHero = function() {
        document.getElementById('db-hero-modal').style.display = 'flex';
        if (!document.getElementById('db-hero-grid').children.length) {
            dbLoadHeroes('');
        }
    };
    window.dbLoadHeroes = function(faction) {
        heroCurrFaction = faction;
        var grid    = document.getElementById('db-hero-grid');
        var loading = document.getElementById('db-hero-loading');
        grid.innerHTML    = '';
        loading.style.display = 'block';

        // Update faction buttons
        document.getElementById('db-hero-all-btn').classList.toggle('active', !faction);
        document.querySelectorAll('#db-hero-factions [data-faction]').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.faction === faction);
        });

        // Build params for direct API call
        var heroParts = [
            'itemsPerPage=<?= CARDS_API_MAX_PER_PAGE ?>',
            'locale=' + encodeURIComponent(AlteredDB.lang),
        ];
        AlteredDB.heroTypes.forEach(function(t)      { heroParts.push('cardType[]='       + encodeURIComponent(t)); });
        AlteredDB.heroRarities.forEach(function(r)   { heroParts.push('rarity[]='         + encodeURIComponent(r)); });
        AlteredDB.heroSets.forEach(function(s)       { heroParts.push('set.reference[]='  + encodeURIComponent(s)); });
        AlteredDB.heroVariations.forEach(function(v) { heroParts.push('variation[]='      + encodeURIComponent(v)); });
        if (AlteredDB.heroSort1) {
            var _s1 = AlteredDB.heroSort1;
            if (_s1 === 'random') { heroParts.push('random=true'); }
            else if (_s1 === 'set_date_desc') { heroParts.push('order[set.date]=desc'); }
            else if (_s1 === 'set_date_asc')  { heroParts.push('order[set.date]=asc'); }
            else if (_s1 === 'collector_asc') { heroParts.push('order[collectorNumberFormatedId]=asc'); }
        }
        if (faction) heroParts.push('faction.code[]=' + encodeURIComponent(faction));

        function fetchHeroPage(page, accumulated) {
            var p = heroParts.concat(['page=' + page]);
            return fetch('https://cards.alteredcore.org/api/cards?' + p.join('&'))
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (AlteredDB.debug) console.log('[deckbuilder] hero cards API response (page ' + page + '):', data);
                    var all = accumulated.concat(data.member || []);
                    return page < (data.lastPage || 1) ? fetchHeroPage(page + 1, all) : all;
                });
        }

        fetchHeroPage(1, [])
            .then(function(allCards) {
                loading.style.display = 'none';
                if (!allCards || !allCards.length) {
                    grid.innerHTML = '<div style="color:var(--neutral-400);padding:10px;text-align:center;grid-column:1/-1">—</div>';
                    return;
                }
                allCards.forEach(function(card) {
                    var ref  = card.reference || '';
                    var name = typeof card.name === 'string' ? card.name : (card.name ? (card.name[AlteredDB.lang] || card.name.en || '') : '');
                    var imgSrc = cdnUrl(ref);
                    var wrap = document.createElement('div');
                    wrap.style.cssText = 'cursor:pointer;overflow:hidden;border-radius:7px;';
                    var img  = document.createElement('img');
                    img.src  = imgSrc;
                    img.alt  = name;
                    img.style.cssText = 'display:block;width:100%;border-radius:7px;aspect-ratio:63.5/88;object-fit:cover;transition:transform .12s';
                    wrap.onmouseenter = function() { img.style.transform = 'scale(1.05)'; };
                    wrap.onmouseleave = function() { img.style.transform = ''; };
                    wrap.appendChild(img);
                    wrap.onclick = function() {
                        var fCode = (card.faction && card.faction.code) ? card.faction.code : factionFromRef(ref);
                        setHero({ cardReference: ref, name: name, factionCode: fCode });
                        document.getElementById('db-hero-modal').style.display = 'none';
                    };
                    grid.appendChild(wrap);
                });
            })
            .catch(function(err) {
                loading.style.display = 'none';
                console.error('Hero load error:', err);
                grid.innerHTML = '<div style="color:red;padding:10px;grid-column:1/-1">' + (err && err.message ? err.message : 'Load error') + '</div>';
            });
    };

    // save deck
    var saveBtnHtml = '<i class="fa-solid fa-floppy-disk me-1"></i>' + escHtml(AlteredDB.txt.save_btn);
    var elSaveRetry = document.getElementById('db-save-retry');
    var elSaveErrMsg = document.getElementById('db-save-error-msg');
    if (elSaveRetry) elSaveRetry.textContent = AlteredDB.txt.save_retry;

    function showSaveError(html) {
        elSaveOk.style.display = 'none';
        if (elSaveErrMsg) elSaveErrMsg.innerHTML = html;
        else elSaveErr.innerHTML = html;
        elSaveErr.style.display = '';
    }

    function saveDeck(onDone) {
        elSaveErr.style.display = 'none';

        if (AlteredDB.isGuest) {
            saveGuestDeck();
            markClean();
            elSaveOk.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + escHtml(AlteredDB.txt.guest_saved_ok);
            elSaveOk.style.display = '';
            setTimeout(function() { elSaveOk.style.display = 'none'; }, 4000);
            if (onDone) onDone(true);
            return;
        }

        elSaveBtn.disabled = true;
        elSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>' + escHtml(AlteredDB.txt.saving);

        fetch(AlteredDB.baseUrl + '/pages/deckbuilder?ajax=1', { method: 'POST', body: _buildSaveFormData() })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (AlteredDB.debug) console.log('[deckbuilder] save deck API response:', data);
                elSaveBtn.innerHTML = saveBtnHtml;
                elSaveBtn.disabled = false;
                if (data.ok) {
                    markClean();
                    deck.id = data.id;
                    AlteredDB.deckId = data.id;
                    if (history.replaceState) history.replaceState(null, '', '?id=' + data.id);
                    elSaveErr.style.display = 'none';
                    elSaveOk.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + escHtml(AlteredDB.txt.saved_ok);
                    elSaveOk.style.display = '';
                    setTimeout(function() { elSaveOk.style.display = 'none'; }, 4000);
                    if (onDone) onDone(true);
                } else {
                    var parts = (data.error || 'Error').split('\n');
                    showSaveError(escHtml(parts[0]) + (parts[1] ? '<br><small style="opacity:.85">' + escHtml(parts[1]) + '</small>' : ''));
                    if (onDone) onDone(false);
                }
            })
            .catch(function() {
                elSaveBtn.innerHTML = saveBtnHtml;
                elSaveBtn.disabled = false;
                showSaveError(escHtml(AlteredDB.txt.err_connect || 'Connection error'));
                if (onDone) onDone(false);
            });
    }

    elSaveBtn.addEventListener('click', function() { saveDeck(null); });
    if (elSaveRetry) elSaveRetry.addEventListener('click', function() { saveDeck(null); });

    // unsaved changes guard
    // On tab/window close: sendBeacon for existing decks (fire-and-forget), browser
    // dialog for brand-new decks that have never been saved (no deck.id yet).
    window.addEventListener('beforeunload', function(e) {
        if (!dirty) return;
        if (deck.id && navigator.sendBeacon) {
            navigator.sendBeacon(AlteredDB.baseUrl + '/pages/deckbuilder?ajax=1', _buildSaveFormData());
            return;
        }
        e.preventDefault();
        e.returnValue = '';
    });

    // On same-site link click: autosave then navigate; show error in save area if it fails.
    document.addEventListener('click', function(e) {
        if (!dirty) return;
        var a = e.target.closest('a[href]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0) return;
        try {
            var url = new URL(href, window.location.href);
            if (url.hostname !== window.location.hostname) return;
        } catch (ex) { return; }
        e.preventDefault();
        autoSave(function(ok) {
            if (ok) {
                window.location.href = href;
            } else {
                // Autosave failed — surface the error so the user can retry manually
                showSaveError(escHtml(AlteredDB.txt.err_connect || 'Connection error'));
            }
        });
    });

    // escape helpers
    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(s) {
        return String(s).replace(/'/g,"\\'");
    }
    // Expose for inline onclick
    window.addCard    = addCard;
    window.removeCard = removeCard;

    // guest localStorage helpers
    function saveGuestDeck() {
        try {
            localStorage.setItem(GUEST_DECK_KEY, JSON.stringify({
                name:   elDeckName ? elDeckName.value.trim() : (deck.name || ''),
                format: elDeckFormat ? elDeckFormat.value : (deck.format || 'standard'),
                hero:   deck.hero,
                cards:  deck.cards,
            }));
        } catch (e) {}
    }

    function initFromGuest(data) {
        if (!data) return;
        if (elDeckName)   elDeckName.value   = data.name   || '';
        if (elDeckFormat) elDeckFormat.value = (data.format || 'standard').toLowerCase();
        if (data.hero) {
            deck.hero = data.hero;
            setHero(deck.hero);
        }
        if (data.cards && typeof data.cards === 'object') {
            Object.keys(data.cards).forEach(function(ref) {
                deck.cards[ref] = data.cards[ref];
            });
        }
        updateDeckDisplay();
    }

    // init from existing deck
    function initFromExisting() {
        var d = AlteredDB.existingDeck;
        if (!d) return;

        elDeckName.value   = d.name        || '';
        elDeckDesc.value   = d.description || '';
        elDeckFormat.value = (d.format || 'standard').toLowerCase();
        elDeckPublic.value = d.isPublic ? '1' : '0';

        // isDraft mode: if deck was saved as draft, pre-select draft mode
        if (d.isDraft) {
            deck.isDraftMode = 'draft';
            if (elDeckDraft) elDeckDraft.value = 'draft';
        }

        // API returns 'cards' in GET responses, 'deckCards' in POST — support both
        var cards = d.deckCards || d.cards || [];
        cards.forEach(function(c) {
            var ref  = c.cardReference || '';
            var type = c.cardTypeReference || '';
            if (type === 'HERO') {
                deck.hero = {
                    cardReference: ref,
                    name: c.name || ref,
                    factionCode: c.factionCode || factionFromRef(ref),
                };
            } else {
                deck.cards[ref] = {
                    qty:          c.quantity || 1,
                    name:         c.name || ref,
                    type:         type,
                    rarity:       rarityCode(ref),
                    factionCode:  c.factionCode || null,
                    mainCost:     c.mainCost || 0,
                    recallCost:   c.recallCost || 0,
                    oceanPower:   c.oceanPower || 0,
                    mountainPower: c.mountainPower || 0,
                    forestPower:  c.forestPower || 0,
                    isBanned:    !!c.isBanned,
                    isSuspended: !!c.isSuspended,
                };
            }
        });
        if (deck.hero) setHero(deck.hero);
        updateDeckDisplay();
    }

    // enrich deck cards with ban/suspend status from Cards API
    function enrichDeckCardStatus() {
        var refs = Object.keys(deck.cards);
        if (!refs.length) return;
        var params = refs.map(function(r) { return 'cards.reference[]=' + encodeURIComponent(r); });
        params.push('itemsPerPage=' + refs.length);
        fetch('https://cards.alteredcore.org/api/card_groups?' + params.join('&'))
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (!data || !Array.isArray(data.member)) return;
                var statusMap = {};
                data.member.forEach(function(group) {
                    var banned    = !!group.isBanned;
                    var suspended = !!group.isSuspended;
                    if (Array.isArray(group.cards)) {
                        group.cards.forEach(function(c) {
                            if (c.reference) statusMap[c.reference] = { isBanned: banned, isSuspended: suspended };
                        });
                    }
                });
                var changed = false;
                refs.forEach(function(ref) {
                    if (statusMap[ref]) {
                        deck.cards[ref].isBanned    = statusMap[ref].isBanned;
                        deck.cards[ref].isSuspended = statusMap[ref].isSuspended;
                        changed = true;
                    }
                });
                if (changed) updateDeckDisplay();
            })
            .catch(function() {});
    }

    // Frontier allowlist check — mirrors the backend FrontierFormatValidator,
    // which calls the same uniques search API server-side on save. Runs here too
    // so the deckbuilder's validation badge doesn't show "valid" for a deck the
    // API will actually reject. Only re-checks refs not already resolved, so
    // repeated calls from updateDeckDisplay() are cheap no-ops once settled.
    var _frontierCheckInFlight = {};
    function checkFrontierLegality() {
        if (!AlteredDB.uniquesApiBase) return;
        var pending = [];
        Object.keys(deck.cards).forEach(function(ref) {
            if (!isUnique(ref)) return;
            if (deck.cards[ref].isFrontierIllegal !== undefined) return;
            if (_frontierCheckInFlight[ref]) return;
            pending.push(ref);
        });
        if (!pending.length) return;
        pending.forEach(function(ref) { _frontierCheckInFlight[ref] = true; });
        fetch(AlteredDB.uniquesApiBase + '/api/v2/cards?ref=' + pending.map(encodeURIComponent).join(',') + '&format=frontier')
            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function(data) {
                var legal = {};
                (data.cards || []).forEach(function(c) { if (c.reference) legal[c.reference] = true; });
                pending.forEach(function(ref) {
                    if (deck.cards[ref]) deck.cards[ref].isFrontierIllegal = !legal[ref];
                    delete _frontierCheckInFlight[ref];
                });
                updateDeckDisplay();
            })
            .catch(function() {
                // Fail closed, like the backend: an unreachable allowlist service
                // means the deck can't be confirmed legal.
                pending.forEach(function(ref) {
                    if (deck.cards[ref]) deck.cards[ref].isFrontierIllegal = true;
                    delete _frontierCheckInFlight[ref];
                });
                updateDeckDisplay();
            });
    }

    // isDraft select
    if (elDeckDraft) elDeckDraft.addEventListener('change', function() {
        deck.isDraftMode = this.value;
        markDirty();
    });

    // mark dirty on meta field changes
    [elDeckName, elDeckDesc].forEach(function(el) {
        if (el) el.addEventListener('input', markDirty);
    });
    [elDeckPublic].forEach(function(el) {
        if (el) el.addEventListener('change', markDirty);
    });
    if (elDeckFormat) elDeckFormat.addEventListener('change', function() {
        markDirty();
        updateDeckDisplay();
    });

    // mobile tabs
    document.querySelectorAll('.db-mobile-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.db-mobile-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var t = tab.dataset.tab;
            // 'view' shares the left panel with 'search'
            var paneId = 'db-tab-' + (t === 'view' || t === 'hand' ? 'search' : t);
            document.querySelectorAll('.db-tab-pane').forEach(function(p) { p.classList.remove('active'); });
            var pane = document.getElementById(paneId);
            if (pane) pane.classList.add('active');
            // Switch sub-pane between search form, deck view and starting hand
            if (t === 'search' || t === 'view' || t === 'hand') {
                document.getElementById('db-search-pane-search').style.display = t === 'search' ? '' : 'none';
                document.getElementById('db-search-pane-view').style.display   = t === 'view'   ? '' : 'none';
                document.getElementById('db-search-pane-hand').style.display   = t === 'hand'   ? '' : 'none';
                document.querySelectorAll('.db-search-tab').forEach(function(st) {
                    st.classList.toggle('active', st.dataset.pane === t);
                });
                if (t === 'view') renderGridPane();
                if (t === 'hand') { renderHandPane(); if (window.HandTester && !window.HandTester.isStarted()) window.HandTester.reset(); }
            }
        });
    });

    // card lightbox
    var dbCardModal      = document.getElementById('db-card-modal');
    var dbCardModalInner = document.getElementById('db-card-modal-inner');
    function closeDbCardModal() {
        dbCardModal.style.display = 'none';
        dbCardModalInner.innerHTML = '';
        document.body.style.overflow = '';
    }
    var detailLabel = <?= json_encode($txt['detail_label']) ?>;
    var cardDetailBase = <?= json_encode(BASE_URL . '/pages/card') ?>;
    var cardDetailLang = <?= json_encode($lang) ?>;
    window.openDbCardModal = function(ref) {
        dbCardModalInner.innerHTML = '';
        var cardEl;
        if (isUnique(ref)) {
            ensureRenderer();
            cardEl = document.createElement('altered-card');
            cardEl.setAttribute('ref', ref);
            cardEl.setAttribute('locale', AlteredDB.uniqueLocale);
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        } else {
            cardEl = document.createElement('img');
            cardEl.src = cdnUrl(ref);
            cardEl.alt = ref;
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        }
        cardEl.addEventListener('click', closeDbCardModal);
        dbCardModalInner.appendChild(cardEl);
        dbCardModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
    dbCardModal.addEventListener('click', closeDbCardModal);

    // deck quantity stepper (modal)
    function buildDbQtyControls(ref, cardData) {
        function addPayload() {
            if (cardData) return cardData;
            var c = deck.cards[ref];
            return c ? {
                cardReference: ref, name: c.name, cardTypeReference: c.type, rarity: c.rarity,
                factionCode: c.factionCode || null,
                mainCost: c.mainCost || 0, recallCost: c.recallCost || 0,
                oceanPower: c.oceanPower || 0, mountainPower: c.mountainPower || 0, forestPower: c.forestPower || 0,
                isBanned: !!c.isBanned, isSuspended: !!c.isSuspended,
            } : { cardReference: ref };
        }
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;background:rgba(0,0,0,.32);border-radius:8px;padding:5px 10px';
        var lbl = document.createElement('span');
        lbl.style.cssText = 'color:rgba(255,255,255,.7);font-size:.76rem;white-space:nowrap';
        lbl.innerHTML = '<i class="fa-solid fa-layer-group" style="margin-right:3px"></i>' + <?= json_encode($txt['tab_deck']) ?>;
        var ctrl = document.createElement('div');
        ctrl.style.cssText = 'display:flex;align-items:center;gap:6px';
        var btnM = document.createElement('button');
        btnM.type = 'button'; btnM.className = 'btn btn-sm btn-outline-secondary';
        btnM.style.cssText = 'padding:1px 8px;font-size:.9rem'; btnM.textContent = '−';
        var qtyEl = document.createElement('span');
        qtyEl.style.cssText = 'color:#fff;font-weight:700;font-size:.9rem;min-width:22px;text-align:center';
        var btnP = document.createElement('button');
        btnP.type = 'button'; btnP.className = 'btn btn-sm btn-outline-secondary';
        btnP.style.cssText = 'padding:1px 8px;font-size:.9rem'; btnP.textContent = '+';
        ctrl.appendChild(btnM); ctrl.appendChild(qtyEl); ctrl.appendChild(btnP);
        row.appendChild(lbl); row.appendChild(ctrl);
        function refresh() {
            var q = deck.cards[ref] ? deck.cards[ref].qty : 0;
            qtyEl.textContent = q;
            btnM.disabled = q === 0;
        }
        btnM.addEventListener('click', function () { removeCard(ref); refresh(); });
        btnP.addEventListener('click', function () { addCard(addPayload()); refresh(); });
        refresh();
        return row;
    }

    // patch openDbCardModal: add deck quantity controls then detail button
    var _origOpenDbCardModal = window.openDbCardModal;
    window.openDbCardModal = function (ref, cardData) {
        _origOpenDbCardModal(ref);
        dbCardModalInner.appendChild(buildDbQtyControls(ref, cardData));
        var detailBtn = document.createElement('a');
        detailBtn.href = cardDetailBase + '?ref=' + encodeURIComponent(ref) + '&card_lang=' + cardDetailLang;
        detailBtn.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i>' + detailLabel;
        detailBtn.className = 'btn btn-sm btn-primary-altered';
        detailBtn.style.cssText = 'display:block;width:100%;margin-top:8px;text-decoration:none';
        dbCardModalInner.appendChild(detailBtn);
    };

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var m = document.getElementById('db-hero-modal');
            if (m && m.style.display !== 'none') { m.style.display = 'none'; return; }
            if (dbCardModal && dbCardModal.style.display !== 'none') closeDbCardModal();
        }
    });

    // deck panel tabs (Cards / Stats)
    document.querySelectorAll('.db-deck-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.db-deck-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var pane = tab.dataset.pane;
            document.getElementById('db-deck-pane-cards').style.display = pane === 'cards' ? '' : 'none';
            document.getElementById('db-deck-pane-stats').style.display = pane === 'stats' ? '' : 'none';
        });
    });

    // left panel tabs (Card Search / View Deck)
    document.querySelectorAll('.db-search-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.db-search-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var pane = tab.dataset.pane;
            document.getElementById('db-search-pane-search').style.display = pane === 'search' ? '' : 'none';
            document.getElementById('db-search-pane-view').style.display   = pane === 'view'   ? '' : 'none';
            document.getElementById('db-search-pane-hand').style.display   = pane === 'hand'   ? '' : 'none';
            if (pane === 'view') renderGridPane();
            if (pane === 'hand') { renderHandPane(); if (window.HandTester && !window.HandTester.isStarted()) window.HandTester.reset(); }
        });
    });

    // grid/list toggle for deck view pane
    var elToggleGrid = document.getElementById('db-grid-toggle-grid');
    var elToggleList = document.getElementById('db-grid-toggle-list');
    if (elToggleGrid && elToggleList) {
        elToggleGrid.addEventListener('click', function() {
            dbGridViewMode = 'grid';
            elToggleGrid.classList.add('active');
            elToggleList.classList.remove('active');
            renderGridPane();
        });
        elToggleList.addEventListener('click', function() {
            dbGridViewMode = 'list';
            elToggleList.classList.add('active');
            elToggleGrid.classList.remove('active');
            renderGridPane();
        });
    }

    if (AlteredDB.isGuest) {
        var _saved = localStorage.getItem(GUEST_DECK_KEY);
        if (_saved) { try { initFromGuest(JSON.parse(_saved)); } catch (e) {} }
        else { updateDeckDisplay(); }
    } else {
        initFromExisting();
        updateDeckDisplay();
        enrichDeckCardStatus();
    }

    window.renderBrowserCard = renderBrowserCard;
    // Exposed so the (separately-scoped) CardSearch engine setup can wire the
    // "Réinitialiser" button to restore the hero's faction instead of clearing it.
    window.updateHeroFactionFilter = updateHeroFactionFilter;
    window.getDeckHeroFaction = function() { return deck.hero ? deck.hero.factionCode : null; };
    // Banned/suspended-card visibility depends on the deck's current format —
    // exposed so the CardSearch engine can read it live on every search.
    window.getDeckFormatLegality = function() {
        var fmtKey = elDeckFormat ? elDeckFormat.value : '';
        var fmt = (AlteredDB.formats && AlteredDB.formats[fmtKey]) || {};
        return {
            allowBanned:    fmt.allowBanned    !== false,
            allowSuspended: fmt.allowSuspended !== false,
        };
    };
})();
</script>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/css/tom-select.bootstrap5.min.css">
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/js/tom-select.complete.min.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/card-search.js"></script>
<script>
(function() {
    var engine = CardSearch({
        apiBase:     'https://cards.alteredcore.org',
        uniquesApiBase: <?= json_encode(defined('UNIQUES_API_URL') ? UNIQUES_API_URL : '') ?>,
        debug:       AlteredDB.debug,
        lang:        AlteredDB.lang,
        uiLang:      AlteredDB.uiLang,
        prefix:      'db',
        mode:        'deck',
        cdnUrl:      AlteredDB.cdnUrl,
        rendererSrc: AlteredDB.rendererSrc,
        pushState:   false,
        autoSearch:  true,
        closeFiltersOnSearch: true,
        collectionMode:    AlteredDB.collectionMode,
        collectionData:    AlteredDB.collection,
        collectionEntries: AlteredDB.collectionEntries,
        collectionCsrf:    AlteredDB.collectionCsrf,
        collectionUrl:     AlteredDB.collectionUrl,
        collApiUrl:        AlteredDB.collApiUrl,
        ownershipApiUrl:   AlteredDB.ownershipApiUrl,
        favoritesEnabled:  AlteredDB.favoritesEnabled,
        favoritesData:     AlteredDB.favoritesData,
        favoritesCsrf:     AlteredDB.favoritesCsrf,
        favToggleUrl:      AlteredDB.favToggleUrl,
        favApiUrl:         AlteredDB.favApiUrl,
        setChildren:  AlteredDB.setChildren,
        subSets:      AlteredDB.subSets,
        uniqueType:   ['CHARACTER'],
        uniqueRarity: ['UNIQUE'],
        uniqueExtraSets: <?= json_encode(array_values(array_intersect(['COREKS'], $validSets))) ?>,
        defaults: {
            factions:   <?= json_encode($defaultFactions) ?>,
            types:      <?= json_encode($defaultTypes) ?>,
            rarities:   <?= json_encode($defaultRarities) ?>,
            sets:       <?= json_encode($defaultSets) ?>,
            variations: <?= json_encode($_defaultVariations) ?>,
            sort1:      <?= json_encode($defaultSort1) ?>,
            sort2:      <?= json_encode($defaultSort2) ?>,
            cols:       <?= (int)$_defaultDbCols ?>,
            perPage:    <?= CARDS_DISPLAY_PER_PAGE ?>,
        },
        initial: {
            faction:        <?= json_encode($_existingHeroFaction ? [$_existingHeroFaction] : $defaultFactions) ?>,
            factionExplicit:<?= $_existingHeroFaction ? 'true' : 'false' ?>,
            type:           <?= json_encode($_defaultDeckTypes) ?>,
            typeExplicit:   true,
            rarity:         <?= json_encode($defaultRarities) ?>,
            rarityExplicit: false,
        },
        tsOptions: {
            setOptions:       AlteredDB.setOptionsJson,
            subtypeOptions:   AlteredDB.subtypeOptionsJson,
            keywordOptions:   AlteredDB.keywordOptionsJson,
            variationOptions: AlteredDB.variationOptionsJson,
            defaultCollection: AlteredDB.defaultCollection,
        },
        typesMerged: AlteredDB.typesMerged,
        renderDeckCard: window.renderBrowserCard,
        formatCount: function(n) { return n + ' ' + AlteredDB.txt.deck_cards; },
        txt: { prev: AlteredDB.txt.prev, next: AlteredDB.txt.next, favorite: AlteredDB.favoriteLabel },
        getFormatLegality: function() { return window.getDeckFormatLegality ? window.getDeckFormatLegality() : null; },
    });
    window.updateFilterCount = engine.updateFilterCount;
    window.loadCards         = engine.search;
    window.CardSearchInstances = window.CardSearchInstances || {};
    window.CardSearchInstances.db = engine;

    // "Réinitialiser" clears every filter, including faction and type — re-apply
    // the hero's faction and the deckbuilder's default types right after, so a
    // deck's card search doesn't lose its useful scope on reset. Registered after
    // CardSearch's own reset listener so resetFilters() has already run by the
    // time this fires.
    var DB_DEFAULT_TYPES = <?= json_encode($_defaultDeckTypes) ?>;
    var _dbResetBtn = document.getElementById('db-reset-btn');
    if (_dbResetBtn) {
        _dbResetBtn.addEventListener('click', function() {
            var root = document.getElementById('db-panel');
            if (root) {
                DB_DEFAULT_TYPES.forEach(function(t) {
                    var btn = root.querySelector('.filter-toggle[data-filter="type"][data-value="' + t + '"]');
                    if (btn && !btn.classList.contains('active')) btn.click();
                });
            }
            var heroFaction = window.getDeckHeroFaction && window.getDeckHeroFaction();
            if (heroFaction) {
                window.updateHeroFactionFilter(heroFaction); // also runs the single search(1) below
            } else {
                engine.search(1);
            }
        });
    }

    // The format picks which of banned/suspended cards are hidden by default
    // (see getFormatLegality above). When it changes: re-run the search so the
    // grid reflects the new format immediately, and grey out the "Banni"/
    // "Suspendu" buttons when the new format allows them anyway (toggling
    // would have no effect since nothing is being hidden to include back).
    function _syncStatusButtonsToFormat() {
        var root = document.getElementById('db-panel');
        var legality = window.getDeckFormatLegality && window.getDeckFormatLegality();
        if (!root || !legality) return;
        var bannedBtn    = root.querySelector('[data-bool-filter="isBanned"]');
        var suspendedBtn = root.querySelector('[data-bool-filter="isSuspended"]');
        if (bannedBtn) {
            bannedBtn.classList.toggle('filter-toggle-soon', legality.allowBanned);
            bannedBtn.title = legality.allowBanned ? AlteredDB.txt.tt_banned_allowed : AlteredDB.txt.tt_show_banned;
        }
        if (suspendedBtn) {
            suspendedBtn.classList.toggle('filter-toggle-soon', legality.allowSuspended);
            suspendedBtn.title = legality.allowSuspended ? AlteredDB.txt.tt_suspended_allowed : AlteredDB.txt.tt_show_suspended;
        }
    }
    _syncStatusButtonsToFormat();
    var _dbFormatSelect = document.getElementById('db-deck-format');
    if (_dbFormatSelect) {
        _dbFormatSelect.addEventListener('change', function() {
            _syncStatusButtonsToFormat();
            engine.search(1);
        });
    }
})();
</script>

<!-- Playtest card modals (mana / board / discard list + card zoom) -->
<?php include __DIR__ . '/_card-list-modal.php'; ?>
<?php include __DIR__ . '/_card-zoom-modal.php'; ?>

<!-- Starting-hand tab: shared stats + draw-odds, recomputed live from the deck via renderHandPane() -->
<script>
    window.handLang       = <?= json_encode($uiLang) ?>;
    window.handTypeLabels = <?= json_encode($txt['types'], JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
    window.handOddsTxt    = {
        both:         <?= json_encode($txt['nc_both']) ?>,
        ratio:        <?= json_encode($txt['ho_ratio']) ?>,
        ratioGeneric: <?= json_encode($txt['ho_ratio_generic']) ?>,
        card: <?= json_encode($txt['ohs_card']) ?>, cards: <?= json_encode($txt['ohs_cards']) ?>,
        play: <?= json_encode($txt['ohs_play']) ?>, plays: <?= json_encode($txt['ohs_plays']) ?>,
        expNone: <?= json_encode($txt['ohs_b4_none']) ?>, expOne: <?= json_encode($txt['ohs_b4_one']) ?>, expBoth: <?= json_encode($txt['ohs_b4_both']) ?>
    };
    window.handDeckCards  = window.handDeckCards  || [];
    window.handDeckGroups = window.handDeckGroups || [];
    window.handDeckSize   = window.handDeckSize   || 0;
    window.handTxt = {
        empty:      <?= json_encode($txt['hand_empty']) ?>,
        characters: <?= json_encode($txt['hand_characters']) ?>,
        spells:     <?= json_encode($txt['hand_spells']) ?>,
        permanents: <?= json_encode($txt['hand_permanents']) ?>,
        avgCost:    <?= json_encode($txt['hand_avg_cost']) ?>,
        manaList:   <?= json_encode($txt['pt_mana_list']) ?>,
        toMana:     <?= json_encode($txt['pt_to_mana']) ?>,
        playBoard:  <?= json_encode($txt['pt_play_board']) ?>,
        zoom:       <?= json_encode($txt['pt_zoom']) ?>,
        cancel:     <?= json_encode($txt['pt_cancel']) ?>,
        discard:    <?= json_encode($txt['pt_discard']) ?>,
        returnHand: <?= json_encode($txt['pt_return_hand']) ?>,
        boardList:  <?= json_encode($txt['pt_board_list']) ?>,
        discardList:<?= json_encode($txt['pt_discard_list']) ?>
    };
</script>
<script src="<?= h($pluginAssetsUrl) ?>/hand-odds-math.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/hand-odds.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/hand-tester.js"></script>

