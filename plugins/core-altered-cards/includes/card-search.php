<?php
/**
 * Reusable card search widget — flat layout, no modal.
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

$_csOfficialSets = array_filter($_csSets, fn($s) => ($s['type'] ?? '') === 'official' && ($s['subtype'] ?? '') === 'main');

$_csRangeFields = [
    'maincost'      => ['icon' => '<i class="fak fa-altered-h" style="font-size:1.1rem;flex-shrink:0"></i>',                                                                                  'title' => $_csTxt['lbl_cost_m']   ?? 'Hand'],
    'recallcost'    => ['icon' => '<i class="fak fa-altered-r" style="font-size:1.1rem;flex-shrink:0"></i>',                                                                                  'title' => $_csTxt['lbl_cost_r']   ?? 'Reserve'],
    'forestpower'   => ['icon' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/F.webp" style="height:20px;width:auto;flex-shrink:0" alt="">',                    'title' => $_csTxt['lbl_forest']   ?? 'Forest'],
    'mountainpower' => ['icon' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/M.webp" style="height:20px;width:auto;flex-shrink:0" alt="">',                    'title' => $_csTxt['lbl_mountain'] ?? 'Mountain'],
    'oceanpower'    => ['icon' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/O.webp" style="height:20px;width:auto;flex-shrink:0" alt="">',                    'title' => $_csTxt['lbl_ocean']    ?? 'Ocean'],
];

$_csOpEq = $_csLang === 'fr' ? 'égal'       : 'equal';
$_csOpLt = $_csLang === 'fr' ? 'inférieur'  : 'less than';
$_csOpGt = $_csLang === 'fr' ? 'supérieur'  : 'greater than';
$_csHeroLabel = $_csTxt['lbl_hero'] ?? ($_csLang === 'fr' ? 'Héros' : 'Hero');
$_csHeroAll   = $_csTxt['hero_all'] ?? ($_csLang === 'fr' ? 'Tous les héros' : 'All heroes');
?>

<!-- Card count — outside the search box -->
<span id="<?= h($_csP) ?>-count" style="display:block;font-size:.85rem;color:var(--neutral-500);min-height:1.2em;margin-bottom:.5rem"></span>

<div id="<?= h($_csP) ?>-panel">

    <div class="card-altered p-3 mb-3">

        <!-- Row 1: scope + sort + controls -->
        <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
            <button type="button" id="<?= h($_csP) ?>-scope-all"
                    class="filter-toggle active" data-scope="all">
                <i class="fa-solid fa-table-cells"></i>
                <?= h($_csTxt['scope_all'] ?? 'All cards') ?>
            </button>
            <button type="button" id="<?= h($_csP) ?>-scope-collection"
                    class="filter-toggle<?= $_csCollMode ? '' : ' filter-toggle-soon' ?>"
                    data-scope="collection"<?= $_csCollMode ? '' : ' disabled' ?>>
                <i class="fa-solid fa-box-archive"></i>
                <?= h($_csTxt['scope_collection'] ?? 'My collection') ?>
            </button>
            <select id="<?= h($_csP) ?>-sort" class="form-select form-select-sm flex-shrink-0 ms-auto" style="width:auto">
                <?php foreach ($_csSorts as $_sv => $_sl): ?>
                <option value="<?= h($_sv) ?>"<?= $_csSelSort === $_sv ? ' selected' : '' ?>><?= h($_sl) ?></option>
                <?php endforeach; ?>
            </select>
            <?php if ($_csShowCols): ?>
            <div class="d-flex align-items-center gap-1 flex-shrink-0">
                <i class="fa-solid fa-table-cells" style="font-size:.8rem;color:var(--neutral-400)"></i>
                <select id="<?= h($_csP) ?>-cols" class="form-select form-select-sm" style="width:auto">
                    <?php foreach ($_csColOpt as $_cv): ?>
                    <option value="<?= (int)$_cv ?>"<?= (int)$_cv === $_csDefCols ? ' selected' : '' ?>><?= (int)$_cv ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>
            <button type="button" id="<?= h($_csP) ?>-reset-btn"
                    class="btn btn-sm btn-outline-secondary flex-shrink-0"
                    title="<?= h($_csTxt['reset'] ?? 'Reset') ?>">
                <i class="fa-solid fa-rotate-left"></i>
                <span class="d-none d-sm-inline ms-1"><?= h($_csTxt['reset'] ?? 'Reset') ?></span>
            </button>
            <button type="button" id="<?= h($_csP) ?>-apply-btn"
                    class="btn btn-sm btn-primary-altered flex-shrink-0">
                <i class="fa-solid fa-magnifying-glass me-1"></i><?= h($_csTxt['search'] ?? 'Search') ?>
            </button>
            <span id="<?= h($_csP) ?>-filter-count" class="cs-filter-count" style="display:none"></span>
        </div>

        <!-- Row 2: name + keyword + variation + status -->
        <div class="d-flex gap-2 align-items-center flex-wrap mb-2">
            <input type="text" id="<?= h($_csP) ?>-search"
                   value="<?= h($_csSelQ) ?>"
                   placeholder="<?= h($_csTxt['search_ph'] ?? 'Search…') ?>"
                   class="form-control form-control-sm" autocomplete="off" style="min-width:140px;flex:2">
            <div style="flex:1;min-width:160px;max-width:280px;display:flex;align-items:center;gap:6px">
                <div id="<?= h($_csP) ?>-kw-mode" data-mode="or"
                     class="btn-group btn-group-sm flex-shrink-0" role="group">
                    <button type="button" class="btn btn-outline-secondary kw-mode-btn active" data-mode="or" style="padding:1px 5px;font-size:.65rem"><?= h($_csTxt['kw_mode_or'] ?? 'OR') ?></button>
                    <button type="button" class="btn btn-outline-secondary kw-mode-btn" data-mode="and" style="padding:1px 5px;font-size:.65rem"><?= h($_csTxt['kw_mode_and'] ?? 'AND') ?></button>
                </div>
                <div style="flex:1;min-width:0">
                    <select id="<?= h($_csP) ?>-filter-keyword" multiple>
                        <?php foreach ($_csKeywords as $_kk => $_kv): ?>
                        <option value="<?= h($_kk) ?>"><?= h($_kv[$_csLang] ?? $_kv['en'] ?? $_kk) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            <div style="flex:1;min-width:130px;max-width:200px">
                <select id="<?= h($_csP) ?>-filter-variation" multiple>
                    <?php foreach ($_csVariations as $_vk => $_vv): ?>
                    <option value="<?= h($_vk) ?>"><?= h($_vv[$_csLang] ?? $_vv['en'] ?? $_vk) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div style="flex:1;min-width:130px;max-width:200px">
                <select id="<?= h($_csP) ?>-filter-status" multiple>
                    <option value="banned"<?= $_csIsBanned ? ' selected' : '' ?>><?= h($_csTxt['lbl_banned'] ?? 'Banned') ?></option>
                    <option value="errated"<?= $_csIsErrated ? ' selected' : '' ?>><?= h($_csTxt['lbl_errated'] ?? 'Errated') ?></option>
                    <option value="suspended"<?= $_csIsSuspended ? ' selected' : '' ?>><?= h($_csTxt['lbl_suspended'] ?? 'Suspended') ?></option>
                </select>
            </div>
        </div>

        <!-- Set — quick-filter buttons -->
        <?php if (!empty($_csOfficialSets)): ?>
        <div class="filter-row filter-row--scroll mb-1">
            <?php foreach (array_reverse($_csOfficialSets, true) as $_sk => $_sv): ?>
            <button type="button"
                    class="filter-toggle set-qf-btn<?= in_array($_sk, $_csSelSets) ? ' active' : '' ?>"
                    data-filter="sets" data-value="<?= h($_sk) ?>"
                    style="background-image:url('<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/set/small_bg/<?= h($_sk) ?>.webp')">
                <span class="set-qf-inner">
                    <?php if (!empty($_sv['icon'])): ?><i class="<?= h($_sv['icon']) ?>"></i><?php endif; ?>
                    <span><?= h($_sv[$_csLang] ?? $_sv['en'] ?? $_sk) ?></span>
                </span>
            </button>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
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

        <!-- Faction + Rarity -->
        <?php if (!empty($_csFactions) || !empty($_csRarities)): ?>
        <div class="filter-row filter-row--scroll mb-1">
            <?php foreach ($_csFactions as $_fk => $_fv): ?>
            <button type="button"
                    class="filter-toggle<?= in_array($_fk, $_csSelFactions) ? ' active' : '' ?>"
                    data-filter="faction" data-value="<?= h($_fk) ?>"
                    title="<?= h($_csFactionNames[$_fk] ?? $_fk) ?>">
                <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/faction/<?= h($_fk) ?>.png" alt="<?= h($_fk) ?>">
                <?= h($_csFactionNames[$_fk] ?? $_fk) ?>
            </button>
            <?php endforeach; ?>
            <?php if (!empty($_csFactions) && !empty($_csRarities)): ?>
            <span style="width:1px;background:var(--neutral-300,#dee2e6);align-self:stretch;margin:0 4px;flex-shrink:0"></span>
            <?php endif; ?>
            <?php foreach ($_csRarities as $_rk => $_rv): ?>
            <button type="button"
                    class="filter-toggle<?= in_array($_rk, $_csSelRarities) ? ' active' : '' ?>"
                    data-filter="rarity" data-value="<?= h($_rk) ?>">
                <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/gems/<?= h($_csRarityGems[$_rk] ?? substr($_rk, 0, 1)) ?>.png"
                     alt="<?= h($_rk) ?>" style="width:15px;height:15px">
                <?= h($_csRarityTxt[$_rk] ?? $_rk) ?>
            </button>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <!-- Type + Subtype -->
        <?php if (!empty($_csTypes)): ?>
        <div class="filter-row filter-row--scroll mb-1">
            <?php foreach ($_csTypes as $_tk => $_tv): ?>
            <button type="button"
                    class="filter-toggle<?= in_array($_tk, $_csSelTypes) ? ' active' : '' ?>"
                    data-filter="type" data-value="<?= h($_tk) ?>">
                <?= h($_csTypeTxt[$_tk] ?? $_tk) ?>
            </button>
            <?php endforeach; ?>
            <?php if (!empty($_csSubtypes)): ?>
            <span style="width:1px;background:var(--neutral-300,#dee2e6);align-self:stretch;margin:0 4px;flex-shrink:0"></span>
            <div style="min-width:140px;max-width:200px;flex-shrink:0">
                <select id="<?= h($_csP) ?>-filter-subtype" multiple>
                    <?php foreach ($_csSubtypes as $_sk => $_sv): ?>
                    <option value="<?= h($_sk) ?>"><?= h($_sv[$_csLang] ?? $_sv['en'] ?? $_sk) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <!-- Cost (operator + value per type) + subtype + gestion -->
        <div class="filter-row flex-wrap mb-1" style="row-gap:.5rem">
            <?php foreach ($_csRangeFields as $_rfKey => $_rfData): ?>
            <div class="d-flex align-items-center gap-1" title="<?= h($_rfData['title']) ?>">
                <?= $_rfData['icon'] ?>
                <select id="<?= h($_csP) ?>-filter-<?= h($_rfKey) ?>-op"
                        class="form-select form-select-sm" style="width:auto">
                    <option value="eq">&#61;</option>
                    <option value="lt">&lt;</option>
                    <option value="lte">&#8804;</option>
                    <option value="gt">&gt;</option>
                    <option value="gte">&#8805;</option>
                </select>
                <input type="number" id="<?= h($_csP) ?>-filter-<?= h($_rfKey) ?>"
                       min="0" max="12" placeholder="—"
                       class="form-control form-control-sm" style="width:52px">
            </div>
            <?php endforeach; ?>
            <select id="<?= h($_csP) ?>-filter-cost-relation" class="form-select form-select-sm" style="width:auto">
                <option value=""><?= h($_csTxt['cost_relation_ph'] ?? ($_csLang === 'fr' ? 'Gestion des coûts' : 'Cost management')) ?></option>
                <option value="eq"><?= h($_csTxt['cost_main_eq_recall']    ?? ($_csLang === 'fr' ? 'Coût main = réserve'       : 'Main cost = reserve')) ?></option>
                <option value="main_gt"><?= h($_csTxt['cost_main_gt_recall'] ?? ($_csLang === 'fr' ? 'Coût main plus élevé'     : 'Higher main cost')) ?></option>
                <option value="recall_gt"><?= h($_csTxt['cost_recall_gt_main'] ?? ($_csLang === 'fr' ? 'Coût réserve plus élevé' : 'Higher reserve cost')) ?></option>
            </select>
        </div>

        <!-- Effects -->
        <div class="filter-row flex-wrap mb-0" style="row-gap:.5rem;align-items:flex-start;min-width:0">
            <div style="flex:1;min-width:0">
                <div id="<?= h($_csP) ?>-effect-mode" data-mode="or"
                     class="btn-group btn-group-sm mb-1" style="display:none">
                    <button type="button" class="btn btn-outline-secondary effect-mode-btn active"
                            data-mode="or" style="padding:1px 6px;font-size:.65rem">OR</button>
                    <button type="button" class="btn btn-outline-secondary effect-mode-btn"
                            data-mode="and" style="padding:1px 6px;font-size:.65rem">AND</button>
                </div>
                <div id="<?= h($_csP) ?>-effect-rows"></div>
                <button type="button" id="<?= h($_csP) ?>-effect-add"
                        class="btn btn-sm btn-outline-secondary mt-1" style="font-size:.8rem">
                    <i class="fa-solid fa-plus me-1"></i><?= h($_csTxt['add_effect'] ?? ($_csLang === 'fr' ? 'Ajouter un effet' : 'Add effect')) ?>
                </button>
            </div>
        </div>

    </div><!-- /.card-altered -->

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

</div><!-- /#{prefix}-panel -->

<?php if ($_csMode === 'cards'): ?>
<div id="<?= h($_csP) ?>-modal" class="ac-lightbox-overlay" style="display:none">
    <div id="<?= h($_csP) ?>-modal-inner" class="ac-lightbox-inner" onclick="event.stopPropagation()"></div>
</div>
<?php endif; ?>

<script>
(function() {
    document.querySelectorAll('.filter-row--scroll').forEach(function(el) {
        el.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY; }
        }, { passive: false });
    });
})();
</script>
