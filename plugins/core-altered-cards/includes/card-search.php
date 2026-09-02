<?php
/**
 * Reusable card search widget — tabbed layout.
 * Set $_cs before including.
 */

$_csP          = $_cs['prefix']             ?? 'cs';
$_csMode       = $_cs['mode']               ?? 'cards';
$_csLang       = $_cs['lang']               ?? 'en';
$_csTxt        = $_cs['txt']                ?? [];
$_csData       = $_cs['data']               ?? [];
$_csDef        = $_cs['defaults']           ?? [];
$_csSel        = $_cs['selected']           ?? [];
$_csColOpt     = $_cs['col_options']        ?? [2, 3, 4, 5];
$_csShowCols   = $_cs['show_cols']          ?? true;
$_csCollMode   = $_cs['collection_mode']    ?? false;
$_csCollEnabled= $_cs['collection_enabled'] ?? false;
$_csOwnMode    = $_cs['ownership_mode']      ?? false;
$_csOwnEnabled = $_cs['ownership_enabled']   ?? false;
$_csPlaysetMode= $_cs['playset_mode']        ?? false;
$_csFavMode    = $_cs['favorites_mode']      ?? false;
$_csBaseUrl    = $_cs['base_url']           ?? (defined('BASE_URL') ? BASE_URL : '');

$_csFactions   = $_csData['factions']   ?? [];
$_csTypes      = $_csData['types']      ?? [];
$_csRarities   = $_csData['rarities']   ?? [];
$_csSets       = $_csData['sets']       ?? [];
$_csSubtypes   = $_csData['subtypes']   ?? [];
$_csKeywords   = $_csData['keywords']   ?? [];
$_csVariations = $_csData['variations'] ?? [];

$_csSelFactions = $_csSel['faction'] ?? [];
$_csSelTypes    = $_csSel['type']    ?? [];
$_csSelRarities = $_csSel['rarity'] ?? [];
$_csSelSets     = $_csSel['sets']   ?? [];
$_csSelSort     = $_csSel['sort']   ?? ($_csDef['sort1'] ?? 'default');
$_csSelQ        = $_csSel['q']      ?? '';
$_csIsBanned    = !empty($_csSel['isBanned']);
$_csIsErrated   = !empty($_csSel['isErrated']);
$_csIsSuspended = !empty($_csSel['isSuspended']);

$_csDefCols    = max(2, min(5, (int)($_csDef['cols'] ?? 4)));
$_csMobileCols = $_csDefCols >= 3 ? 2 : $_csDefCols;
$_csSorts      = $_csTxt['sorts'] ?? [];
$_csValidCost  = array_map('strval', range(0, 12));

$_csFactionNames = [];
foreach ($_csFactions as $_fk => $_fv) {
    $_csFactionNames[$_fk] = $_fv[$_csLang] ?? $_fv['en'] ?? $_fk;
}
$_csTypeTxt = [];
foreach ($_csTypes as $_tk => $_tv) {
    $_csTypeTxt[$_tk] = $_tv[$_csLang] ?? $_tv['en'] ?? $_tk;
}
$_csRarityTxt  = [];
$_csRarityGems = [];
foreach ($_csRarities as $_rk => $_rv) {
    $_csRarityTxt[$_rk]  = $_rv[$_csLang] ?? $_rv['en'] ?? $_rk;
    $_csRarityGems[$_rk] = $_rv['gem']    ?? substr($_rk, 0, 1);
}

$_csCollOpts      = [];
$_csSeenColl      = [];
$_csDefCollection = $_csDef['collection'] ?? 'official';
foreach ($_csSets as $_sr => $_sd) {
    $_ct = $_sd['type'] ?? 'official';
    if (!isset($_csSeenColl[$_ct])) {
        $_csSeenColl[$_ct] = true;
        $_csCollOpts[] = ['value' => $_ct, 'label' => $_csTxt[$_ct] ?? ucfirst($_ct)];
    }
}
$_csHasCollFilter = !empty($_csCollOpts);

// Main (standard) editions shown in the quick-filter bar.
$_csOfficialSets = array_filter($_csSets, fn($s) => ($s['subtype'] ?? '') === 'main');
// Deckbuilder only: COREKS is CORE with a handful of alt arts BGA doesn't even
// render, so it'd be a confusing near-duplicate on the regular tabs — but its
// *uniques* are genuinely different cards, not just alt arts. Restrict it to
// the Uniques tab instead of dropping it (dropping it left an invisible,
// unremovable filter there: deselecting CORE still showed its COREKS twins).
$_csUniquesOnlySets = ($_csMode === 'deck') ? ['COREKS'] : [];
// Promotional / sub editions — revealed under the "show promo" toggle. Standard
// sets never appear here.
$_csPromoSets    = array_filter($_csSets, fn($s) => ($s['subtype'] ?? '') === 'sub');

$_csRangeFields = [
    'maincost'      => ['icon' => '<i class="fak fa-altered-h" style="font-size:1.1rem;flex-shrink:0"></i>',                                                                'title' => $_csTxt['lbl_cost_m']   ?? 'Hand'],
    'recallcost'    => ['icon' => '<i class="fak fa-altered-r" style="font-size:1.1rem;flex-shrink:0"></i>',                                                                'title' => $_csTxt['lbl_cost_r']   ?? 'Reserve'],
    'forestpower'   => ['icon' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/F.webp" style="height:20px;width:auto;flex-shrink:0" alt="">', 'title' => $_csTxt['lbl_forest']   ?? 'Forest'],
    'mountainpower' => ['icon' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/M.webp" style="height:20px;width:auto;flex-shrink:0" alt="">', 'title' => $_csTxt['lbl_mountain'] ?? 'Mountain'],
    'oceanpower'    => ['icon' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/O.webp" style="height:20px;width:auto;flex-shrink:0" alt="">', 'title' => $_csTxt['lbl_ocean']    ?? 'Ocean'],
];

// Labels (fall back to FR/EN literals when not provided via search_settings)
$_csLblSortBy   = $_csTxt['sort_by']    ?? ($_csLang === 'fr' ? 'Trier par'                : 'Sort by');
$_csLblUnique   = $_csTxt['tab_unique'] ?? ($_csLang === 'fr' ? 'Uniques'                  : 'Uniques');
$_csLblAllCards = $_csTxt['scope_all']  ?? ($_csLang === 'fr' ? 'Toutes les cartes'        : 'All cards');
$_csLblColl     = $_csTxt['scope_collection'] ?? ($_csLang === 'fr' ? 'Collection physique' : 'Physical collection');
$_csLblOwn      = $_csTxt['scope_ownership']  ?? ($_csLang === 'fr' ? 'Propriété numérique' : 'Digital ownership');
// Playset dashboard (Profile G — Player playset). All labels live under the
// "playset" object in search_settings.json (translations.{lang}.playset); the
// literals below are only fallbacks when a key is missing.
$_csPs = $_csTxt['playset'] ?? [];
$_csLblPlayset  = $_csPs['tab_playset'] ?? ($_csLang === 'fr' ? 'Playset physique'   : 'Physical playset');
$_csPsIntro     = $_csPs['intro']       ?? ($_csLang === 'fr'
    ? 'Suivez votre progression vers 3 exemplaires de chaque carte Commune, Rare, Rare OOF et Exaltée. Les Héros, Uniques et alternatives ne sont pas comptabilisés dans cette vue.'
    : 'Track your progress toward 3 copies of each Common, Rare, Rare OOF and Exalted card. Heroes, Uniques and alternatives are not counted in this view.');
$_csPsRarityLabel = $_csPs['rarity_label'] ?? ($_csLang === 'fr' ? 'Raretés incluses' : 'Rarities included');
$_csPsRarityCodes = ['COMMON', 'RARE', 'EXALTED']; // playset scope (no Unique)
$_csPsKpiGlobal = $_csPs['kpi_global'] ?? ($_csLang === 'fr' ? 'Complétude globale' : 'Overall completion');
$_csPsCopies    = $_csPs['copies']     ?? ($_csLang === 'fr' ? 'exemplaires'        : 'copies');
$_csPsKpiDist   = $_csPs['kpi_dist']   ?? ($_csLang === 'fr' ? 'Distribution des cartes' : 'Card distribution');
$_csPsComplete  = $_csPs['complete']   ?? ($_csLang === 'fr' ? 'Complètes'   : 'Complete');
$_csPsProgress  = $_csPs['progress']   ?? ($_csLang === 'fr' ? 'En cours'    : 'In progress');
$_csPsMissing   = $_csPs['missing']    ?? ($_csLang === 'fr' ? 'Manquantes'  : 'Missing');
$_csPsOwned        = $_csPs['owned']        ?? ($_csLang === 'fr' ? 'Exemplaires possédés'   : 'Copies owned');
$_csPsOwnedSub     = $_csPs['owned_sub']    ?? ($_csLang === 'fr' ? 'au total'               : 'total');
$_csPsToComplete   = $_csPs['to_complete']  ?? ($_csLang === 'fr' ? 'Cartes à compléter'     : 'Cards to complete');
$_csPsToCompleteSub= $_csPs['to_complete_sub'] ?? ($_csLang === 'fr' ? 'références < 3/3'     : 'references < 3/3');
$_csPsToAcquire    = $_csPs['to_acquire']   ?? ($_csLang === 'fr' ? 'Exemplaires à acquérir' : 'Copies to acquire');
$_csPsToAcquireSub = $_csPs['to_acquire_sub'] ?? ($_csLang === 'fr' ? 'pour atteindre 3/3'   : 'to reach 3/3');
$_csPsHeatTitle = $_csPs['heat_title'] ?? ($_csLang === 'fr' ? 'Complétude par faction × extension' : 'Completion by faction × set');
$_csPsFaction   = $_csPs['faction']    ?? ($_csLang === 'fr' ? 'Faction' : 'Faction');
$_csPsTotal     = $_csPs['total']      ?? ($_csLang === 'fr' ? 'Total'   : 'Total');
$_csPsAllSets     = $_csPs['all_sets']     ?? ($_csLang === 'fr' ? 'Tous les sets'        : 'All sets');
$_csPsAllFactions = $_csPs['all_factions'] ?? ($_csLang === 'fr' ? 'Toutes les factions'  : 'All factions');
$_csPsExploreTitle = $_csPs['explore_title'] ?? ($_csLang === 'fr' ? 'Exploration' : 'Exploration');
$_csPsExploreCards = $_csPs['explore_cards'] ?? ($_csLang === 'fr' ? 'cartes' : 'cards');
$_csPsVersions     = $_csPs['versions']      ?? ($_csLang === 'fr' ? 'versions' : 'versions');
$_csPsCopiesLabel  = $_csPs['copies_label'] ?? ($_csLang === 'fr' ? 'Exemplaires possédés' : 'Copies owned');
$_csPsCopies12     = $_csPs['copies_1_2']   ?? ($_csLang === 'fr' ? '1 ou 2' : '1 or 2');
$_csPsCopies4      = $_csPs['copies_4plus'] ?? ($_csLang === 'fr' ? '4 et +' : '4 or more');
$_csPsDonutTitle   = $_csPs['donut_title'] ?? ($_csLang === 'fr' ? 'Cartes par nombre d\'exemplaires possédés' : 'Cards by number of copies owned');
$_csPsLayout       = $_csPs['layout']        ?? ($_csLang === 'fr' ? 'Affichage' : 'Layout');
$_csPsLayout2      = $_csPs['layout_2col']   ?? ($_csLang === 'fr' ? '2 par ligne' : '2 per row');
$_csPsLayout3      = $_csPs['layout_3col']   ?? ($_csLang === 'fr' ? '3 par ligne' : '3 per row');
$_csPsLayoutVisual = $_csPs['layout_visual'] ?? ($_csLang === 'fr' ? 'Vue visuelle' : 'Visual view');
$_csPsLayoutList   = $_csPs['layout_list']   ?? ($_csLang === 'fr' ? 'Vue liste' : 'List view');
$_csLblFav      = $_csTxt['scope_favoris']    ?? ($_csLang === 'fr' ? 'Favoris' : 'Favorites');
$_csLblPromo    = $_csTxt['show_promo'] ?? 'Alt arts';
$_csLblPromoEd  = $_csTxt['promo_editions'] ?? ($_csLang === 'fr' ? 'Éditions promo' : 'Promo editions');
$_csLblAdvanced = $_csTxt['advanced']   ?? ($_csLang === 'fr' ? 'Recherche avancée'        : 'Advanced search');
$_csLblUniqueNudge   = $_csTxt['unique_nudge']     ?? ($_csLang === 'fr' ? 'Cherchez-vous une Unique ?' : 'Looking for a Unique?');
$_csLblUniqueNudgeCta= $_csTxt['unique_nudge_cta'] ?? ($_csLang === 'fr' ? 'Essayez l\'onglet dédié, avec recherche par effet et format' : 'Try the dedicated tab, with effect and format search');
$_csLblUniqueNotAllowed = $_csTxt['unique_not_allowed'] ?? ($_csLang === 'fr' ? 'Le format sélectionné n\'autorise aucune carte Unique dans ce deck.' : 'The selected format doesn\'t allow any Unique cards in this deck.');
$_csLblFormat   = $_csTxt['lbl_format'] ?? ($_csLang === 'fr' ? 'Environnement' : 'Format');
$_csLblFormatAll = $_csTxt['format_all'] ?? ($_csLang === 'fr' ? 'Toutes les Uniques' : 'All Uniques');
$_csLblFormatFrontier = $_csTxt['format_frontier'] ?? ($_csLang === 'fr' ? 'Frontier' : 'Frontier');
$_csLblFormatNextFrontier = $_csTxt['format_next_frontier'] ?? ($_csLang === 'fr' ? 'Prochain Frontier' : 'Next Frontier');
$_csLblSupportEffect = $_csTxt['lbl_support_effect'] ?? ($_csLang === 'fr' ? 'Effet de réserve (Support)' : 'Support effect');
$_csLblBannedSuspended = $_csTxt['lbl_banned_suspended'] ?? ($_csLang === 'fr' ? 'Suspendus et bannis' : 'Suspended & banned');
$_csLblManage   = $_csTxt['manage_link']    ?? ($_csLang === 'fr' ? 'Gérer' : 'Manage');
$_csLblManageColl = $_csTxt['manage_coll']  ?? ($_csLang === 'fr' ? 'Importer / gérer ma collection' : 'Import / manage my collection');
$_csLblManageOwn  = $_csTxt['manage_own']   ?? ($_csLang === 'fr' ? 'Gérer ma propriété numérique'   : 'Manage my digital ownership');

// "Manage" link targets: physical collection → import page; digital ownership →
// the ownership app (falls back to the collection page when no URL is configured).
$_csCollManageUrl = $_csBaseUrl . '/pages/collection';
$_csOwnManageUrl  = !empty($_cs['ownership_url']) ? $_cs['ownership_url'] : $_csCollManageUrl;
$_csOwnIsExternal = !empty($_cs['ownership_url']);
$_csNumPh       = $_csLang === 'fr' ? 'ex : 3, 1-3, 4+' : 'e.g. 3, 1-3, 4+';
$_csNumTitle    = $_csLang === 'fr'
    ? "3 (=3) · 1,3 (∈ {1, 3}) · 1-3 (1 à 3 inclus) · 4+ (≥4) · 4- (≤4) · <4 · >2 · <=4 · >=2"
    : "3 (=3) · 1,3 (∈ {1, 3}) · 1-3 (1 to 3) · 4+ (≥4) · 4- (≤4) · <4 · >2 · <=4 · >=2";

// Render one numeric (text-expression) filter input.
$_csNumInput = function($key) use ($_csP, $_csRangeFields, $_csNumPh, $_csNumTitle) {
    $rf = $_csRangeFields[$key];
    ob_start(); ?>
    <div class="cs-num d-flex align-items-center gap-1" title="<?= h($rf['title']) ?> — <?= h($_csNumTitle) ?>">
        <?= $rf['icon'] ?>
        <input type="text" id="<?= h($_csP) ?>-filter-<?= h($key) ?>"
               class="form-control form-control-sm cs-num-input"
               placeholder="<?= h($_csNumPh) ?>" autocomplete="off" spellcheck="false"
               aria-label="<?= h($rf['title']) ?>">
    </div>
    <?php return ob_get_clean();
};
?>

<div id="<?= h($_csP) ?>-panel">

    <!-- Search tabs -->
    <div class="cs-tabs">
        <button type="button" class="cs-tab active" data-tab="all" data-scope="all">
            <i class="fa-solid fa-table-cells"></i>
            <span><?= h($_csLblAllCards) ?></span>
        </button>
        <button type="button" class="cs-tab" data-tab="unique" data-scope="all">
            <i class="fa-solid fa-gem"></i>
            <span><?= h($_csLblUnique) ?></span>
        </button>
        <button type="button" class="cs-tab<?= $_csCollMode ? '' : ' cs-tab-soon' ?>"
                data-tab="collection" data-scope="collection"<?= $_csCollMode ? '' : ' disabled' ?>>
            <i class="fa-solid fa-box-archive"></i>
            <span><?= h($_csLblColl) ?></span>
            <!-- Shown (via CSS) only when this tab is active -->
            <span class="cs-tab-manage" data-href="<?= h($_csCollManageUrl) ?>" title="<?= h($_csLblManageColl) ?>">
                <i class="fa-solid fa-file-import"></i><span class="cs-tab-manage-txt"><?= h($_csLblManage) ?></span>
            </span>
        </button>
        <button type="button" class="cs-tab<?= $_csOwnMode ? '' : ' cs-tab-soon' ?>"
                data-tab="ownership" data-scope="ownership"<?= $_csOwnMode ? '' : ' disabled' ?>>
            <i class="fa-solid fa-key"></i>
            <span><?= h($_csLblOwn) ?></span>
            <span class="cs-tab-manage" data-href="<?= h($_csOwnManageUrl) ?>"<?= $_csOwnIsExternal ? ' data-external="1"' : '' ?> title="<?= h($_csLblManageOwn) ?>">
                <i class="fa-solid fa-<?= $_csOwnIsExternal ? 'arrow-up-right-from-square' : 'file-import' ?>"></i><span class="cs-tab-manage-txt"><?= h($_csLblManage) ?></span>
            </span>
        </button>
        <?php if ($_csMode === 'cards'): ?>
        <button type="button" class="cs-tab<?= $_csPlaysetMode ? '' : ' cs-tab-soon' ?>"
                data-tab="playset" data-scope="all"<?= $_csPlaysetMode ? '' : ' disabled' ?>>
            <i class="fa-solid fa-layer-group"></i>
            <span><?= h($_csLblPlayset) ?></span>
        </button>
        <?php endif; ?>
        <?php if ($_csFavMode): ?>
        <button type="button" class="cs-tab" data-tab="favoris" data-scope="favoris">
            <i class="fa-solid fa-star"></i>
            <span><?= h($_csLblFav) ?></span>
        </button>
        <?php endif; ?>
    </div>

    <div class="card-altered p-3 mb-3" data-tabs="all unique collection ownership">

        <!-- Unique-related nudge/warning — content and color swap between a
             gold "try the dedicated Uniques tab" nudge (both pages) and an
             orange "this format doesn't allow Uniques" warning (deckbuilder
             only). Fully driven by _syncUniqueNudge() in card-search.js — no
             data-tabs here on purpose, to avoid fighting the generic
             tab-visibility sweep over what should show on which tab. -->
        <div id="<?= h($_csP) ?>-unique-banner" class="cs-unique-banner" style="display:none">
            <div class="cs-unique-banner-nudge">
                <i class="fa-solid fa-circle-info"></i>
                <span><strong><?= h($_csLblUniqueNudge) ?></strong> <?= h($_csLblUniqueNudgeCta) ?></span>
                <button type="button" class="cs-unique-nudge-btn" data-goto-tab="unique">
                    <?= h($_csLblUnique) ?> <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
            <?php if ($_csMode === 'deck'): ?>
            <div class="cs-unique-banner-blocked" style="display:none">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span><?= h($_csLblUniqueNotAllowed) ?></span>
            </div>
            <?php endif; ?>
        </div>

        <!-- Name + hand/reserve costs (same line) -->
        <div class="cs-name-row d-flex gap-2 align-items-center flex-wrap mb-2"
             data-tabs="all unique collection ownership">
            <input type="text" id="<?= h($_csP) ?>-search"
                   value="<?= h($_csSelQ) ?>"
                   placeholder="<?= h($_csTxt['search_ph'] ?? 'Search…') ?>"
                   class="form-control form-control-sm" autocomplete="off"
                   style="flex:1;min-width:160px">
            <!-- One pair, one group: the row's flex-wrap must not split hand from
                 reserve, so they wrap together instead of one per line. -->
            <span class="cs-costs cs-scroll-x">
                <?= $_csNumInput('maincost') ?>
                <?= $_csNumInput('recallcost') ?>
            </span>
        </div>

        <!-- Main editions — quick-filter buttons -->
        <?php if (!empty($_csOfficialSets)): ?>
        <div class="filter-row filter-row--scroll mb-2" data-tabs="all unique collection ownership favoris">
            <?php foreach (array_reverse($_csOfficialSets, true) as $_sk => $_sv): ?>
            <?php
                // Which tabs this set's quick-filter shows on:
                //  - Uniques-only sets (see $_csUniquesOnlySets above).
                //  - Sets the uniques API doesn't know about yet
                //    ("uniques": false) must NOT appear on the Uniques tab:
                //    sending one makes it reject the whole query (HTTP 400
                //    "invalid set value"), so the search fails outright
                //    instead of just returning nothing for that set.
                if (in_array($_sk, $_csUniquesOnlySets, true)) {
                    $_sTabs = 'unique';
                } elseif ($_sv['uniques'] ?? true) {
                    $_sTabs = 'all unique collection ownership favoris';
                } else {
                    $_sTabs = 'all collection ownership favoris';
                }
            ?>
            <button type="button"
                    class="filter-toggle set-qf-btn<?= in_array($_sk, $_csSelSets) ? ' active' : '' ?>"
                    data-filter="sets" data-value="<?= h($_sk) ?>" data-tabs="<?= $_sTabs ?>"
                    style="background-image:url('<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/set/small_bg/<?= h($_sk) ?>.webp')">
                <span class="set-qf-inner">
                    <?php if (!empty($_sv['icon'])): ?><i class="<?= h($_sv['icon']) ?>"></i><?php endif; ?>
                    <span><?= h($_sv[$_csLang] ?? $_sv['en'] ?? $_sk) ?></span>
                </span>
            </button>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <!-- Faction (+ rarity) — hidden in deckbuilder mode (moved to advanced) -->
        <?php if (($_csMode !== 'deck') && (!empty($_csFactions) || !empty($_csRarities))): ?>
        <div class="filter-row filter-row--scroll cs-faction-row mb-2" data-tabs="all unique collection ownership favoris">
            <?php foreach ($_csFactions as $_fk => $_fv): ?>
            <button type="button"
                    class="filter-toggle<?= in_array($_fk, $_csSelFactions) ? ' active' : '' ?>"
                    data-filter="faction" data-value="<?= h($_fk) ?>"
                    title="<?= h($_csFactionNames[$_fk] ?? $_fk) ?>">
                <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/faction/<?= h($_fk) ?>.png" alt="<?= h($_fk) ?>">
                <?= h($_csFactionNames[$_fk] ?? $_fk) ?>
            </button>
            <?php endforeach; ?>
            <?php if (!empty($_csRarities)): ?>
            <!-- Rarities (compact: gem + first letter). Hidden on Uniques (forced) and physical collection (no rarity data). -->
            <span class="cs-rarities cs-scroll-x" data-tabs="all ownership favoris">
                <?php if (!empty($_csFactions)): ?>
                <span class="cs-sep"></span>
                <?php endif; ?>
                <?php foreach ($_csRarities as $_rk => $_rv): ?>
                <button type="button"
                        class="filter-toggle filter-toggle--compact<?= in_array($_rk, $_csSelRarities) ? ' active' : '' ?>"
                        data-filter="rarity" data-value="<?= h($_rk) ?>"
                        title="<?= h($_csRarityTxt[$_rk] ?? $_rk) ?>">
                    <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/gems/<?= h($_csRarityGems[$_rk] ?? substr($_rk, 0, 1)) ?>.png"
                         alt="<?= h($_rk) ?>" style="width:15px;height:15px">
                    <?= h(mb_strtoupper(mb_substr($_csRarityTxt[$_rk] ?? $_rk, 0, 1))) ?>
                </button>
                <?php endforeach; ?>
            </span>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <!-- Type (hidden on Uniques: all characters); in deckbuilder mode the
             rarity row shares this same line instead of getting its own row. -->
        <?php
        // In deckbuilder mode, Hero and Token aren't real search targets (the hero
        // has its own picker; tokens aren't deckbuilder-legal cards), so drop them
        // from the type filter row. Cards page keeps the full list.
        $_csTypesFilterRow = ($_csMode === 'deck')
            ? array_diff_key($_csTypes, array_flip(['HERO', 'TOKEN']))
            : $_csTypes;
        $_csDeckRarityInline = ($_csMode === 'deck') && !empty($_csRarities);
        ?>
        <?php if (!empty($_csTypesFilterRow) || $_csDeckRarityInline): ?>
        <div class="filter-row filter-row--scroll cs-rarity-type-row mb-2">
            <?php if ($_csDeckRarityInline): ?>
            <span class="cs-rarities cs-scroll-x" data-tabs="all ownership favoris">
                <?php foreach ($_csRarities as $_rk => $_rv): ?>
                <button type="button"
                        class="filter-toggle filter-toggle--compact<?= in_array($_rk, $_csSelRarities) ? ' active' : '' ?>"
                        data-filter="rarity" data-value="<?= h($_rk) ?>"
                        title="<?= h($_csRarityTxt[$_rk] ?? $_rk) ?>">
                    <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/gems/<?= h($_csRarityGems[$_rk] ?? substr($_rk, 0, 1)) ?>.png"
                         alt="<?= h($_rk) ?>" style="width:15px;height:15px">
                    <?= h(mb_strtoupper(mb_substr($_csRarityTxt[$_rk] ?? $_rk, 0, 1))) ?>
                </button>
                <?php endforeach; ?>
            </span>
            <?php endif; ?>
            <?php if ($_csDeckRarityInline && !empty($_csTypesFilterRow)): ?>
            <!-- Grows to fill the gap between the two groups, keeping the bar centered in it -->
            <span class="cs-rarity-type-spacer" data-tabs="all ownership">
                <span class="cs-sep"></span>
            </span>
            <?php endif; ?>
            <?php if (!empty($_csTypesFilterRow)): ?>
            <span class="cs-types cs-scroll-x" data-tabs="all collection ownership">
                <?php foreach ($_csTypesFilterRow as $_tk => $_tv): ?>
                <button type="button"
                        class="filter-toggle<?= in_array($_tk, $_csSelTypes) ? ' active' : '' ?>"
                        data-filter="type" data-value="<?= h($_tk) ?>">
                    <?= h($_csTypeTxt[$_tk] ?? $_tk) ?>
                </button>
                <?php endforeach; ?>
            </span>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <!-- Format / environment (Uniques tab only) -->
        <div class="mb-2" id="<?= h($_csP) ?>-format-wrap" data-tabs="unique">
            <span class="filter-label mb-1 d-block"><?= h($_csLblFormat) ?></span>
            <div class="filter-row filter-row--scroll">
                <button type="button" class="filter-toggle active" data-filter="format" data-value="">
                    <?= h($_csLblFormatAll) ?>
                </button>
                <button type="button" class="filter-toggle" data-filter="format" data-value="frontier">
                    <?= h($_csLblFormatFrontier) ?>
                </button>
                <!--<button type="button" class="filter-toggle" data-filter="format" data-value="next_frontier">
                    <?= h($_csLblFormatNextFrontier) ?>
                </button>-->
            </div>
        </div>

        <!-- Effects (Uniques tab only) — shown before the advanced section. Rows
             combine with AND; each dropdown is multi-select and combines with OR. -->
        <div class="mb-2" data-tabs="unique" style="min-width:0">
            <span class="filter-label mb-1 d-block"><?= h($_csTxt['lbl_effects'] ?? 'Effects') ?></span>
            <div id="<?= h($_csP) ?>-effect-rows"></div>
            <button type="button" id="<?= h($_csP) ?>-effect-add"
                    class="btn btn-sm btn-outline-secondary mt-1" style="font-size:.8rem">
                <i class="fa-solid fa-plus me-1"></i><?= h($_csTxt['add_effect'] ?? ($_csLang === 'fr' ? 'Ajouter un effet' : 'Add effect')) ?>
            </button>
        </div>

        <!-- Support effect (Uniques tab only) — a single fixed row, filtered to
             catalog entries valid on the echo/support line. No matchCount, no add/remove. -->
        <div class="mb-2" data-tabs="unique" style="min-width:0">
            <span class="filter-label mb-1 d-block"><?= h($_csLblSupportEffect) ?></span>
            <div id="<?= h($_csP) ?>-support-row"></div>
        </div>

        <!-- Advanced search + promo toggle (same line) -->
        <div class="cs-adv-wrap mb-2" data-tabs="all unique collection ownership">
            <div class="cs-adv-head d-flex align-items-center gap-3 flex-wrap">
                <button type="button" class="cs-adv-toggle" aria-expanded="false">
                    <i class="fa-solid fa-chevron-right cs-adv-chevron"></i>
                    <span><?= h($_csLblAdvanced) ?></span>
                    <span id="<?= h($_csP) ?>-adv-count" class="cs-filter-count" style="display:none"></span>
                </button>
                <?php if (!empty($_csPromoSets)): ?>
                <label class="cs-switch" data-tabs="all ownership">
                    <input type="checkbox" id="<?= h($_csP) ?>-promo-toggle">
                    <span class="cs-switch-track"><span class="cs-switch-thumb"></span></span>
                    <span class="cs-switch-label"><i class="fa-solid fa-star me-1"></i><?= h($_csLblPromo) ?></span>
                </label>
                <?php endif; ?>
                <div class="cs-actions d-flex align-items-center gap-2">
                    <button type="button" id="<?= h($_csP) ?>-reset-btn"
                            class="btn btn-sm btn-outline-secondary"
                            title="<?= h($_csTxt['reset'] ?? 'Reset') ?>">
                        <i class="fa-solid fa-rotate-left me-1"></i><?= h($_csTxt['reset'] ?? 'Reset') ?>
                    </button>
                    <button type="button" id="<?= h($_csP) ?>-apply-btn"
                            class="btn btn-sm btn-primary-altered">
                        <i class="fa-solid fa-magnifying-glass me-1"></i><?= h($_csTxt['search'] ?? 'Search') ?>
                    </button>
                    <span id="<?= h($_csP) ?>-filter-count" class="cs-filter-count" style="display:none"></span>
                </div>
            </div>

            <div class="cs-advanced" style="display:none">

                <!-- Faction (duplicate for deckbuilder mode) -->
                <?php if ($_csMode === 'deck' && !empty($_csFactions)): ?>
                <div class="filter-row filter-row--scroll mb-2" data-tabs="all unique collection ownership favoris">
                    <?php foreach ($_csFactions as $_fk => $_fv): ?>
                    <button type="button"
                            class="filter-toggle<?= in_array($_fk, $_csSelFactions) ? ' active' : '' ?>"
                            data-filter="faction" data-value="<?= h($_fk) ?>"
                            title="<?= h($_csFactionNames[$_fk] ?? $_fk) ?>">
                        <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/faction/<?= h($_fk) ?>.png" alt="<?= h($_fk) ?>">
                        <?= h($_csFactionNames[$_fk] ?? $_fk) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

                <!-- Biome powers (top of accordion) -->
                <div class="filter-row flex-wrap mb-2" style="row-gap:.5rem" data-tabs="all unique collection ownership">
                    <?= $_csNumInput('forestpower') ?>
                    <?= $_csNumInput('mountainpower') ?>
                    <?= $_csNumInput('oceanpower') ?>
                </div>

                <!-- Promo options (shown when "show promo" is on; all-cards tab only).
                     Deckbuilder has no "show promo" toggle to reveal this, so skip it there. -->
                <?php if (!empty($_csPromoSets)): ?>
                <div id="<?= h($_csP) ?>-promo-panel" class="cs-promo-panel mb-2" style="display:none">
                    <div class="cs-promo-variation mb-2">
                        <div class="filter-label mb-1"><?= h($_csTxt['lbl_variation'] ?? 'Variation') ?></div>
                        <select id="<?= h($_csP) ?>-filter-variation" multiple>
                            <?php foreach ($_csVariations as $_vk => $_vv): ?>
                            <option value="<?= h($_vk) ?>"><?= h($_vv[$_csLang] ?? $_vv['en'] ?? $_vk) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-0">
                        <div class="filter-label mb-1"><?= h($_csLblPromoEd) ?></div>
                        <select id="<?= h($_csP) ?>-filter-promoset" multiple>
                            <?php foreach ($_csPromoSets as $_pk => $_pv): ?>
                            <option value="<?= h($_pk) ?>"<?= in_array($_pk, $_csSelSets) ? ' selected' : '' ?>><?= h($_pv[$_csLang] ?? $_pv['en'] ?? $_pk) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <?php endif; ?>

                <!-- Keyword + subtype (same line) -->
                <div class="cs-adv-grid mb-2">
                    <div data-tabs="all">
                        <div class="filter-label mb-1"><?= h($_csTxt['lbl_keyword'] ?? 'Keyword') ?></div>
                        <select id="<?= h($_csP) ?>-filter-keyword" multiple>
                            <?php foreach ($_csKeywords as $_kk => $_kv): ?>
                            <option value="<?= h($_kk) ?>"><?= h($_kv[$_csLang] ?? $_kv['en'] ?? $_kk) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <?php if (!empty($_csSubtypes)): ?>
                    <div data-tabs="all collection ownership">
                        <div class="filter-label mb-1"><?= h($_csTxt['lbl_subtype'] ?? 'Subtype') ?></div>
                        <select id="<?= h($_csP) ?>-filter-subtype" multiple>
                            <?php foreach ($_csSubtypes as $_sk => $_sv): ?>
                            <option value="<?= h($_sk) ?>"><?= h($_sv[$_csLang] ?? $_sv['en'] ?? $_sk) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <?php endif; ?>
                </div>

                <!-- Status + cost management + no-effect (grouped on one wrapping line) -->
                <div class="filter-row flex-wrap mb-0" style="row-gap:.5rem" data-tabs="all unique collection ownership">
                    <?php if ($_csMode === 'deck'): ?>
                    <label class="cs-switch" data-bool-filter="bannedOrSuspended" data-tabs="all collection ownership">
                        <input type="checkbox" id="<?= h($_csP) ?>-filter-bannedorsuspended"<?= ($_csIsBanned || $_csIsSuspended) ? ' checked' : '' ?>>
                        <span class="cs-switch-track"><span class="cs-switch-thumb"></span></span>
                        <span class="cs-switch-label"><i class="fa-solid fa-ban me-1"></i><i class="fa-solid fa-pause me-1"></i><?= h($_csLblBannedSuspended) ?></span>
                    </label>
                    <?php else: ?>
                    <span class="filter-label"><?= h($_csTxt['lbl_card_status'] ?? 'Status') ?></span>
                    <button type="button" class="filter-toggle<?= $_csIsBanned ? ' active' : '' ?>" data-bool-filter="isBanned" data-tabs="all collection ownership">
                        <i class="fa-solid fa-ban"></i> <?= h($_csTxt['lbl_banned'] ?? 'Banned') ?>
                    </button>
                    <button type="button" class="filter-toggle<?= $_csIsErrated ? ' active' : '' ?>"
                            data-bool-filter="isErrated" data-tabs="all">
                        <i class="fa-solid fa-pen-to-square"></i> <?= h($_csTxt['lbl_errated'] ?? 'Errated') ?>
                    </button>
                    <button type="button" class="filter-toggle<?= $_csIsSuspended ? ' active' : '' ?>" data-bool-filter="isSuspended" data-tabs="all collection ownership">
                        <i class="fa-solid fa-pause"></i> <?= h($_csTxt['lbl_suspended'] ?? 'Suspended') ?>
                    </button>
                    <?php endif; ?>
                    <span class="cs-sep" data-tabs="all"></span>
                    <select id="<?= h($_csP) ?>-filter-cost-relation" class="form-select form-select-sm" style="width:auto" data-tabs="all">
                        <option value=""><?= h($_csTxt['cost_relation_ph'] ?? ($_csLang === 'fr' ? 'Gestion des coûts' : 'Cost management')) ?></option>
                        <option value="eq"><?= h($_csTxt['cost_main_eq_recall']    ?? ($_csLang === 'fr' ? 'Coût main = réserve'      : 'Main cost = reserve')) ?></option>
                        <option value="main_gt"><?= h($_csTxt['cost_main_gt_recall'] ?? ($_csLang === 'fr' ? 'Coût main plus élevé'    : 'Higher main cost')) ?></option>
                        <option value="recall_gt"><?= h($_csTxt['cost_recall_gt_main'] ?? ($_csLang === 'fr' ? 'Coût réserve plus élevé' : 'Higher reserve cost')) ?></option>
                    </select>
                    <?php if ($_csMode !== 'deck'): ?>
                    <label class="cs-check d-flex align-items-center gap-1" data-tabs="all">
                        <input type="checkbox" id="<?= h($_csP) ?>-filter-hasnoeffect">
                        <span><?= h($_csTxt['lbl_no_effect'] ?? ($_csLang === 'fr' ? 'Sans effet' : 'No effect')) ?></span>
                    </label>
                    <?php endif; ?>
                </div>

            </div><!-- /.cs-advanced -->
        </div>

        <!-- Hidden selects for TomSelect / collection filter JS -->
        <div class="d-none">
            <?php if ($_csHasCollFilter): ?>
            <select id="<?= h($_csP) ?>-filter-collection">
                <?php foreach ($_csCollOpts as $_co): ?>
                <option value="<?= h($_co['value']) ?>"<?= $_co['value'] === $_csDefCollection ? ' selected' : '' ?>><?= h($_co['label']) ?></option>
                <?php endforeach; ?>
            </select>
            <?php endif; ?>
            <select id="<?= h($_csP) ?>-filter-set" multiple>
                <?php foreach ($_csSets as $_sk => $_sv): ?>
                <option value="<?= h($_sk) ?>"<?= in_array($_sk, $_csSelSets) ? ' selected' : '' ?>><?= h($_sv[$_csLang] ?? $_sv['en'] ?? $_sk) ?></option>
                <?php endforeach; ?>
            </select>
        </div>

    </div><!-- /.card-altered -->

    <!-- Results control bar: count + sort + columns (between search and grid) -->
    <div class="cs-controlbar mb-2" data-tabs="all unique collection ownership">
        <span id="<?= h($_csP) ?>-count" class="cs-count"></span>
        <div class="cs-controlbar-end">
            <div class="d-flex align-items-center gap-1" data-tabs="all collection ownership">
                <span class="cs-control-label"><?= h($_csLblSortBy) ?></span>
                <select id="<?= h($_csP) ?>-sort" class="form-select form-select-sm" style="width:auto">
                    <?php foreach ($_csSorts as $_sv => $_sl): ?>
                    <option value="<?= h($_sv) ?>"<?= $_csSelSort === $_sv ? ' selected' : '' ?>><?= h($_sl) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php if ($_csShowCols): ?>
            <div class="d-flex align-items-center gap-1">
                <i class="fa-solid fa-table-cells" style="font-size:.8rem;color:var(--neutral-400)"></i>
                <select id="<?= h($_csP) ?>-cols" class="form-select form-select-sm" style="width:auto">
                    <?php foreach ($_csColOpt as $_cv): ?>
                    <option value="<?= (int)$_cv ?>"<?= (int)$_cv === $_csDefCols ? ' selected' : '' ?>><?= (int)$_cv ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Loading -->
    <div id="<?= h($_csP) ?>-loading" class="ac-state-pane" style="display:none">
        <div class="spinner-border" role="status"
             style="width:1.4rem;height:1.4rem;border-width:3px;color:var(--primary-400)"></div>
        <div class="mt-2 small text-muted"><?= h($_csTxt['loading'] ?? '') ?></div>
    </div>

    <!-- Initial -->
    <div id="<?= h($_csP) ?>-initial" class="ac-state-pane">
        <i class="fa-solid fa-magnifying-glass ac-state-icon"></i>
        <?= h($_csTxt['initial_msg'] ?? 'Use filters or search to display cards.') ?>
    </div>

    <!-- Empty -->
    <div id="<?= h($_csP) ?>-empty" class="ac-state-pane" style="display:none">
        <i class="fa-solid fa-layer-group ac-state-icon"></i>
        <?= h($_csTxt['no_results'] ?? 'No cards found.') ?>
    </div>

    <!-- Error -->
    <div id="<?= h($_csP) ?>-error" class="ac-state-pane" style="display:none">
        <i class="fa-solid fa-triangle-exclamation ac-state-icon" style="opacity:1;color:#f87171"></i>
        <p class="small text-muted mb-1"><?= h($_csTxt['err_api'] ?? 'Could not load cards.') ?></p>
        <p class="small text-muted"><?= h($_csTxt['api_later'] ?? '') ?></p>
    </div>

    <!-- Grid -->
    <?php $_csGridClass = $_csMode === 'deck' ? 'cards-grid-db' : 'cards-grid'; ?>
    <?php $_csCssVar    = $_csMode === 'deck' ? '--db-cols' : '--cards-cols'; ?>
    <div id="<?= h($_csP) ?>-grid"
         class="<?= h($_csGridClass) ?>"
         style="display:none;<?= h($_csCssVar) ?>:<?= $_csDefCols ?><?= $_csMode === 'cards' ? ';--cards-mobile-cols:' . $_csMobileCols : '' ?>"></div>

    <!-- Pagination -->
    <div id="<?= h($_csP) ?>-pagination"
         class="d-flex align-items-center justify-content-center gap-2 mt-3 flex-wrap"
         style="display:none!important"></div>

    <?php if ($_csMode === 'cards'): ?>
    <?php include __DIR__ . '/_playset-tab.php'; ?>
    <?php endif; ?>

</div><!-- /#{prefix}-panel -->

<?php if ($_csMode === 'cards'): ?>
<div id="<?= h($_csP) ?>-modal" class="ac-lightbox-overlay" style="display:none">
    <div id="<?= h($_csP) ?>-modal-inner" class="ac-lightbox-inner" onclick="event.stopPropagation()"></div>
</div>
<?php endif; ?>

<script>
(function() {
    var root = document.getElementById('<?= h($_csP) ?>-panel');
    if (!root) return;
    // Horizontal wheel-scroll for filter rows
    root.querySelectorAll('.filter-row--scroll').forEach(function(el) {
        el.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY; }
        }, { passive: false });
    });
    // Advanced-search accordion
    var advToggle = root.querySelector('.cs-adv-toggle');
    var advBody   = root.querySelector('.cs-advanced');
    if (advToggle && advBody) {
        advToggle.addEventListener('click', function() {
            var open = advBody.style.display !== 'none';
            advBody.style.display = open ? 'none' : '';
            advToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
            advToggle.classList.toggle('open', !open);
        });
    }
    // "Manage" pill inside the active collection/ownership tab. It lives inside the
    // tab <button>, so stop the click from bubbling to the tab-switch handler.
    root.querySelectorAll('.cs-tab-manage[data-href]').forEach(function(el) {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var href = el.getAttribute('data-href');
            if (!href) return;
            if (el.getAttribute('data-external')) window.open(href, '_blank', 'noopener');
            else window.location.href = href;
        });
    });
})();
</script>
