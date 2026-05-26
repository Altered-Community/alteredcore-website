<?php
/**
 * Reusable card search widget.
 * Set $_cs before including:
 *
 * prefix              string   'cs' | 'db'
 * mode                string   'cards' | 'deck'
 * lang                string   'en' | 'fr'
 * txt                 array    translations (lbl_faction, lbl_type, lbl_rarity,
 *                              lbl_cost_m, lbl_cost_r, lbl_forest, lbl_mountain, lbl_ocean,
 *                              lbl_set, lbl_subtype, lbl_keyword, lbl_variation,
 *                              lbl_card_status, lbl_banned, lbl_errated, lbl_suspended,
 *                              lbl_collection, lbl_scope, scope_all, scope_collection,
 *                              search_ph, filters, reset, search, loading, initial_msg,
 *                              no_results, err_api, api_later, showing, sorts{})
 * data                array    { factions, types, rarities, sets, subtypes, keywords, variations }
 * defaults            array    { types[], rarities[], sets[], variations[], sort1, sort2, cols, perPage }
 * selected            array    { q, faction[], type[], rarity[], sets[], sort,
 *                               isBanned, isErrated, isSuspended }
 * col_options         array    [2,3,4,5]
 * show_cols           bool
 * collection_mode     bool
 * collection_enabled  bool
 * base_url            string   BASE_URL
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

$_csSelFactions  = $_csSel['faction']   ?? [];
$_csSelTypes     = $_csSel['type']      ?? [];
$_csSelRarities  = $_csSel['rarity']    ?? [];
$_csSelSets      = $_csSel['sets']      ?? [];
$_csSelSort      = $_csSel['sort']      ?? ($_csDef['sort1']    ?? 'default');
$_csSelQ         = $_csSel['q']         ?? '';
$_csIsBanned     = !empty($_csSel['isBanned']);
$_csIsErrated    = !empty($_csSel['isErrated']);
$_csIsSuspended  = !empty($_csSel['isSuspended']);

$_csDefCols    = max(2, min(5, (int)($_csDef['cols'] ?? 4)));
$_csMobileCols = $_csDefCols >= 3 ? 2 : $_csDefCols;
$_csSorts      = $_csTxt['sorts']  ?? [];
$_csValidCost  = array_map('strval', range(0, 12));

// Derived labels
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
    $_csRarityGems[$_rk] = $_rv['gem'] ?? substr($_rk, 0, 1);
}

// Collection filter options by type
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
?>
<div id="<?= h($_csP) ?>-panel">

    <div class="card-altered p-3 mb-3">

        <!-- Search + filter toggle + always-visible actions -->
        <div class="d-flex gap-2 align-items-center">
            <input type="text" id="<?= h($_csP) ?>-search"
                   value="<?= h($_csSelQ) ?>"
                   placeholder="<?= h($_csTxt['search_ph'] ?? 'Search cards…') ?>"
                   class="form-control form-control-sm" autocomplete="off" style="min-width:0">
            <button type="button" id="<?= h($_csP) ?>-filter-btn"
                    class="btn btn-sm btn-outline-secondary flex-shrink-0"
                    data-bs-toggle="modal" data-bs-target="#<?= h($_csP) ?>-filter-modal">
                <i class="fa-solid fa-sliders"></i>
                <span class="d-none d-sm-inline ms-1"><?= h($_csTxt['filters'] ?? 'Filters') ?></span>
                <span id="<?= h($_csP) ?>-filter-count"
                      class="cs-filter-count" style="display:none"></span>
            </button>
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
        </div>

        <!-- Quick-filter: Official sets only -->
        <?php
        $_csOfficialSets = array_filter($_csSets, function($s) { return ($s['type'] ?? '') === 'official' && ($s['subtype'] ?? '') === 'main'; });
        if (!empty($_csOfficialSets)):
        ?>
        <div class="filter-row filter-row--scroll mt-2">
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

        <!-- Quick-filter: Faction -->
        <?php if (!empty($_csFactions)): ?>
        <div class="filter-row filter-row--scroll mt-1">
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

        <!-- Quick-filter: Rarity -->
        <?php if (!empty($_csRarities)): ?>
        <div class="filter-row filter-row--scroll mt-1">
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

        <!-- Quick-filter: Type -->
        <?php if (!empty($_csTypes)): ?>
        <div class="filter-row filter-row--scroll mt-1">
            <?php foreach ($_csTypes as $_tk => $_tv): ?>
            <button type="button"
                    class="filter-toggle<?= in_array($_tk, $_csSelTypes) ? ' active' : '' ?>"
                    data-filter="type" data-value="<?= h($_tk) ?>">
                <?= h($_csTypeTxt[$_tk] ?? $_tk) ?>
            </button>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <span id="<?= h($_csP) ?>-count" style="display:block;margin-top:.4rem;font-size:.8rem;color:var(--neutral-500)"></span>

    </div><!-- /.card-altered -->

    <!-- Filter modal -->
    <div class="modal fade" id="<?= h($_csP) ?>-filter-modal" tabindex="-1"
         aria-labelledby="<?= h($_csP) ?>-filter-modal-label" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div class="modal-content">

                <div class="modal-header py-2">
                    <h6 class="modal-title" id="<?= h($_csP) ?>-filter-modal-label">
                        <i class="fa-solid fa-sliders me-2"></i><?= h($_csTxt['filters'] ?? 'Filters') ?>
                    </h6>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body">

                    <!-- Sort + cols row -->
                    <div class="filter-row mb-2">
                        <div class="ms-auto d-flex align-items-center gap-2 flex-shrink-0">
                            <div style="display:flex;align-items:center;gap:6px">
                                <i class="fa-solid fa-arrow-down-a-z" style="font-size:.8rem;color:var(--neutral-400)"></i>
                                <select id="<?= h($_csP) ?>-sort" class="form-select form-select-sm" style="width:auto">
                                    <?php foreach ($_csSorts as $_sv => $_sl): ?>
                                    <option value="<?= h($_sv) ?>"<?= $_csSelSort === $_sv ? ' selected' : '' ?>><?= h($_sl) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <?php if ($_csShowCols): ?>
                            <div style="display:flex;align-items:center;gap:6px">
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

                    <!-- Scope (search in all / my collection) -->
                    <div class="filter-row mb-2">
                        <span class="filter-label"><?= h($_csTxt['lbl_scope'] ?? 'Search in') ?></span>
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
                    </div>

                    <!-- Faction (TomSelect, syncs with quick-filter toggles above) -->
                    <div class="filter-row mb-2">
                        <span class="filter-label"><?= h($_csTxt['lbl_faction'] ?? 'Faction') ?></span>
                        <div style="flex:1;min-width:0">
                            <select id="<?= h($_csP) ?>-filter-faction" multiple>
                                <?php foreach ($_csFactions as $_fk => $_fv): ?>
                                <option value="<?= h($_fk) ?>"><?= h($_csFactionNames[$_fk] ?? $_fk) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>

                    <!-- Type -->
                    <div class="filter-row mb-2">
                        <span class="filter-label"><?= h($_csTxt['lbl_type'] ?? 'Type') ?></span>
                        <?php foreach ($_csTypes as $_tk => $_tv): ?>
                        <button type="button"
                                class="filter-toggle<?= in_array($_tk, $_csSelTypes) ? ' active' : '' ?>"
                                data-filter="type" data-value="<?= h($_tk) ?>">
                            <?= h($_csTypeTxt[$_tk] ?? $_tk) ?>
                        </button>
                        <?php endforeach; ?>
                    </div>

                    <!-- Rarity -->
                    <div class="filter-row mb-2">
                        <span class="filter-label"><?= h($_csTxt['lbl_rarity'] ?? 'Rarity') ?></span>
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

                    <!-- Row 1: Main + Reserve + Forest + Mountain + Ocean (single exact-value selects 0-12) -->
                    <div class="row g-2 mb-2">
                        <?php
                        $_csRangeFields = [
                            'maincost'     => ['icon_html' => '<i class="fak fa-altered-h" style="font-size:1.25rem;flex-shrink:0"></i>',                                                              'title' => $_csTxt['lbl_cost_m']   ?? 'Hand'],
                            'recallcost'   => ['icon_html' => '<i class="fak fa-altered-r" style="font-size:1.25rem;flex-shrink:0"></i>',                                                              'title' => $_csTxt['lbl_cost_r']   ?? 'Reserve'],
                            'forestpower'  => ['icon_html' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/F.webp" style="height:22px;width:auto;flex-shrink:0" alt="">',                            'title' => $_csTxt['lbl_forest']   ?? 'Forest'],
                            'mountainpower'=> ['icon_html' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/M.webp" style="height:22px;width:auto;flex-shrink:0" alt="">',                            'title' => $_csTxt['lbl_mountain'] ?? 'Mountain'],
                            'oceanpower'   => ['icon_html' => '<img src="' . h($_csBaseUrl) . '/plugins/core-altered-cards/assets/biome/O.webp" style="height:22px;width:auto;flex-shrink:0" alt="">',                            'title' => $_csTxt['lbl_ocean']    ?? 'Ocean'],
                        ];
                        foreach ($_csRangeFields as $_rfKey => $_rfData): ?>
                        <div class="col">
                            <div class="d-flex align-items-center gap-1" title="<?= h($_rfData['title']) ?>">
                                <?= $_rfData['icon_html'] ?>
                                <select id="<?= h($_csP) ?>-filter-<?= h($_rfKey) ?>" class="form-select form-select-sm" style="min-width:0;flex:1;padding-left:4px;padding-right:2px">
                                    <option value="">—</option>
                                    <?php foreach ($_csValidCost as $_v): ?>
                                    <option value="<?= h($_v) ?>"><?= h($_v) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>

                    <!-- Row 3: Collection (optional) + Set -->
                    <div class="row g-2 mb-2">
                        <?php if ($_csHasCollFilter): ?>
                        <div class="col-4">
                            <div class="filter-label mb-1"><?= h($_csTxt['lbl_collection'] ?? 'Collection') ?></div>
                            <select id="<?= h($_csP) ?>-filter-collection">
                                <?php foreach ($_csCollOpts as $_co): ?>
                                <option value="<?= h($_co['value']) ?>"<?= $_co['value'] === $_csDefCollection ? ' selected' : '' ?>><?= h($_co['label']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-8">
                        <?php else: ?>
                        <div class="col-12">
                        <?php endif; ?>
                            <div class="filter-label mb-1"><?= h($_csTxt['lbl_set'] ?? 'Set') ?></div>
                            <select id="<?= h($_csP) ?>-filter-set" multiple>
                                <?php foreach ($_csSets as $_sk => $_sv): ?>
                                <option value="<?= h($_sk) ?>"<?= in_array($_sk, $_csSelSets) ? ' selected' : '' ?>><?= h($_sv[$_csLang] ?? $_sv['en'] ?? $_sk) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>

                    <!-- Row 4: Subtype + Keyword -->
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <div class="filter-label mb-1"><?= h($_csTxt['lbl_subtype'] ?? 'Subtype') ?></div>
                            <select id="<?= h($_csP) ?>-filter-subtype" multiple>
                                <?php foreach ($_csSubtypes as $_sk => $_sv): ?>
                                <option value="<?= h($_sk) ?>"><?= h($_sv[$_csLang] ?? $_sv['en'] ?? $_sk) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-6">
                            <div class="filter-label mb-1 d-flex align-items-center justify-content-between">
                                <span><?= h($_csTxt['lbl_keyword'] ?? 'Keyword') ?></span>
                                <div id="<?= h($_csP) ?>-kw-mode" data-mode="or"
                                     class="btn-group btn-group-sm flex-shrink-0" role="group">
                                    <button type="button" class="btn btn-outline-secondary kw-mode-btn active" data-mode="or" style="padding:1px 6px;font-size:.65rem"><?= h($_csTxt['kw_mode_or'] ?? 'OR') ?></button>
                                    <button type="button" class="btn btn-outline-secondary kw-mode-btn" data-mode="and" style="padding:1px 6px;font-size:.65rem"><?= h($_csTxt['kw_mode_and'] ?? 'AND') ?></button>
                                </div>
                            </div>
                            <select id="<?= h($_csP) ?>-filter-keyword" multiple>
                                <?php foreach ($_csKeywords as $_kk => $_kv): ?>
                                <option value="<?= h($_kk) ?>"><?= h($_kv[$_csLang] ?? $_kv['en'] ?? $_kk) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>

                    <!-- Row 5: Variation + Status -->
                    <div class="row g-2 mb-0">
                        <div class="col-6">
                            <div class="filter-label mb-1"><?= h($_csTxt['lbl_variation'] ?? 'Variation') ?></div>
                            <select id="<?= h($_csP) ?>-filter-variation" multiple>
                                <?php foreach ($_csVariations as $_vk => $_vv): ?>
                                <option value="<?= h($_vk) ?>"><?= h($_vv[$_csLang] ?? $_vv['en'] ?? $_vk) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-6">
                            <div class="filter-label mb-1"><?= h($_csTxt['lbl_card_status'] ?? 'Status') ?></div>
                            <select id="<?= h($_csP) ?>-filter-status" multiple>
                                <option value="banned"<?= $_csIsBanned ? ' selected' : '' ?>><?= h($_csTxt['lbl_banned'] ?? 'Banned') ?></option>
                                <option value="errated"<?= $_csIsErrated ? ' selected' : '' ?>><?= h($_csTxt['lbl_errated'] ?? 'Errated') ?></option>
                                <option value="suspended"<?= $_csIsSuspended ? ' selected' : '' ?>><?= h($_csTxt['lbl_suspended'] ?? 'Suspended') ?></option>
                            </select>
                            <div class="form-check mt-2">
                                <input class="form-check-input" type="checkbox" id="<?= h($_csP) ?>-filter-hasnoeffect">
                                <label class="form-check-label" style="font-size:.85rem" for="<?= h($_csP) ?>-filter-hasnoeffect">
                                    <?= h($_csTxt['lbl_no_effect'] ?? 'No effect') ?>
                                </label>
                            </div>
                        </div>
                    </div>

                </div><!-- /.modal-body -->

                <div class="modal-footer py-2">
                    <button type="button" id="<?= h($_csP) ?>-modal-reset-btn"
                            class="btn btn-sm btn-outline-secondary me-auto"
                            title="<?= h($_csTxt['reset'] ?? 'Reset') ?>"
                            data-bs-dismiss="modal">
                        <i class="fa-solid fa-rotate-left me-1"></i><?= h($_csTxt['reset'] ?? 'Reset') ?>
                    </button>
                    <button type="button" id="<?= h($_csP) ?>-modal-apply-btn"
                            class="btn btn-sm btn-primary-altered"
                            data-bs-dismiss="modal">
                        <i class="fa-solid fa-magnifying-glass me-1"></i><?= h($_csTxt['search'] ?? 'Search') ?>
                    </button>
                </div>

            </div><!-- /.modal-content -->
        </div><!-- /.modal-dialog -->
    </div><!-- /.modal -->

    <!-- Loading -->
    <div id="<?= h($_csP) ?>-loading" class="ac-state-pane" style="display:none">
        <div class="spinner-border" role="status"
             style="width:1.4rem;height:1.4rem;border-width:3px;color:var(--primary-400)"></div>
        <div class="mt-2 small text-muted"><?= h($_csTxt['loading'] ?? '') ?></div>
    </div>

    <!-- Initial state -->
    <div id="<?= h($_csP) ?>-initial" class="ac-state-pane">
        <i class="fa-solid fa-magnifying-glass ac-state-icon"></i>
        <?= h($_csTxt['initial_msg'] ?? 'Use filters or search to display cards.') ?>
    </div>

    <!-- Empty -->
    <div id="<?= h($_csP) ?>-empty" class="ac-state-pane" style="display:none">
        <i class="fa-solid fa-layer-group ac-state-icon"></i>
        <?= h($_csTxt['no_results'] ?? 'No cards found.') ?>
    </div>

    <!-- API error -->
    <div id="<?= h($_csP) ?>-error" class="ac-state-pane" style="display:none">
        <i class="fa-solid fa-triangle-exclamation ac-state-icon" style="opacity:1;color:#f87171"></i>
        <p class="small text-muted mb-1"><?= h($_csTxt['err_api'] ?? 'Could not load cards.') ?></p>
        <p class="small text-muted"><?= h($_csTxt['api_later'] ?? '') ?></p>
    </div>

    <!-- Card grid -->
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
<!-- Card lightbox modal -->
<div id="<?= h($_csP) ?>-modal"
     class="ac-lightbox-overlay" style="display:none">
    <div id="<?= h($_csP) ?>-modal-inner"
         class="ac-lightbox-inner"
         onclick="event.stopPropagation()"></div>
</div>
<?php endif; ?>
