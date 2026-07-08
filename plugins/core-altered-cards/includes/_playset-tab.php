<?php
/*
 * Playset dashboard tab (Profile G — Physical playset) markup.
 *
 * Split out of card-search.php to give the playset feature a clear boundary.
 * This is a partial: it is include()d from within card-search.php and relies on
 * that file's scope — the h() helper plus the $_csP / $_csPs* / $_cs* variables
 * defined there. The matching behaviour lives in assets/card-search-playset.js.
 */
?>
    <!-- ===== Playset dashboard (Profile G — Player playset) ===== -->
    <div id="<?= h($_csP) ?>-playset" class="cs-playset" data-tabs="playset" style="display:none">

        <!-- Zone 1 — parameter / header -->
        <div class="cs-ps-header mb-3">
            <p class="cs-ps-intro"><?= h($_csPsIntro) ?></p>
        </div>

        <!-- Rarity selector (COMMON / RARE / EXALTED) — filters KPIs and heatmap -->
        <div class="cs-ps-rarity-row" id="<?= h($_csP) ?>-playset-rarities">
            <span class="cs-ps-rarity-label"><?= h($_csPsRarityLabel) ?></span>
            <?php foreach ($_csPsRarityCodes as $_rk): if (!isset($_csRarities[$_rk])) continue; ?>
            <button type="button" class="filter-toggle cs-ps-rarity active" data-rarity="<?= h($_rk) ?>">
                <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/gems/<?= h($_csRarityGems[$_rk] ?? substr($_rk, 0, 1)) ?>.png"
                     alt="" style="width:15px;height:15px">
                <?= h($_csRarityTxt[$_rk] ?? $_rk) ?>
            </button>
            <?php endforeach; ?>
        </div>

        <!-- Loading -->
        <div id="<?= h($_csP) ?>-playset-loading" class="ac-state-pane">
            <div class="spinner-border" role="status"
                 style="width:1.4rem;height:1.4rem;border-width:3px;color:var(--primary-400)"></div>
            <div class="mt-2 small text-muted"><?= h($_csTxt['loading'] ?? '') ?></div>
        </div>

        <!-- Error -->
        <div id="<?= h($_csP) ?>-playset-error" class="ac-state-pane" style="display:none">
            <i class="fa-solid fa-triangle-exclamation ac-state-icon" style="opacity:1;color:#f87171"></i>
            <p class="small text-muted mb-0"><?= h($_csTxt['err_api'] ?? 'Could not load data.') ?></p>
        </div>

        <!-- Dashboard content -->
        <div id="<?= h($_csP) ?>-playset-dash" style="display:none">
            <div class="cs-ps-kpis">
                <!-- Overall completion -->
                <div class="cs-ps-kpi cs-ps-kpi-global">
                    <div class="cs-ps-kpi-label"><?= h($_csPsKpiGlobal) ?></div>
                    <div class="cs-ps-kpi-value">
                        <span id="<?= h($_csP) ?>-playset-pct">0</span><span class="cs-ps-kpi-unit">%</span>
                    </div>
                    <div class="cs-ps-kpi-sub" id="<?= h($_csP) ?>-playset-copies"
                         data-copies-label="<?= h($_csPsCopies) ?>"></div>
                </div>

                <!-- Card distribution (by line: complete / in progress / missing) -->
                <div class="cs-ps-kpi cs-ps-kpi-dist">
                    <div class="cs-ps-kpi-label"><?= h($_csPsKpiDist) ?></div>
                    <div class="cs-ps-stacked" role="img"
                         aria-label="<?= h($_csPsKpiDist) ?>">
                        <div class="cs-ps-seg complete"    id="<?= h($_csP) ?>-seg-complete"></div>
                        <div class="cs-ps-seg in-progress" id="<?= h($_csP) ?>-seg-progress"></div>
                        <div class="cs-ps-seg missing"     id="<?= h($_csP) ?>-seg-missing"></div>
                    </div>
                    <div class="cs-ps-legend">
                        <span class="cs-ps-leg"><span class="cs-ps-dot complete"></span><?= h($_csPsComplete) ?> <span class="cs-ps-leg-frac">3+/3</span></span>
                        <span class="cs-ps-leg"><span class="cs-ps-dot in-progress"></span><?= h($_csPsProgress) ?> <span class="cs-ps-leg-frac">1&ndash;2/3</span></span>
                        <span class="cs-ps-leg"><span class="cs-ps-dot missing"></span><?= h($_csPsMissing) ?> <span class="cs-ps-leg-frac">0/3</span></span>
                    </div>
                </div>

                <!-- Copies owned (counted toward the playset, capped at 3 / reference) -->
                <div class="cs-ps-kpi cs-ps-kpi-metric">
                    <div class="cs-ps-kpi-label"><?= h($_csPsOwned) ?></div>
                    <div class="cs-ps-kpi-value" id="<?= h($_csP) ?>-playset-owned">0</div>
                    <div class="cs-ps-kpi-sub"><?= h($_csPsOwnedSub) ?></div>
                </div>

                <!-- Cards to complete (references below 3/3) -->
                <div class="cs-ps-kpi cs-ps-kpi-metric">
                    <div class="cs-ps-kpi-label"><?= h($_csPsToComplete) ?></div>
                    <div class="cs-ps-kpi-value" id="<?= h($_csP) ?>-playset-tocomplete">0</div>
                    <div class="cs-ps-kpi-sub"><?= h($_csPsToCompleteSub) ?></div>
                </div>

                <!-- Copies to acquire (to reach 3/3) -->
                <div class="cs-ps-kpi cs-ps-kpi-metric">
                    <div class="cs-ps-kpi-label"><?= h($_csPsToAcquire) ?></div>
                    <div class="cs-ps-kpi-value" id="<?= h($_csP) ?>-playset-toacquire">0</div>
                    <div class="cs-ps-kpi-sub"><?= h($_csPsToAcquireSub) ?></div>
                </div>
            </div>

            <!-- Heatmap — completion by faction × set -->
            <div class="cs-ps-section-title"><?= h($_csPsHeatTitle) ?></div>
            <div class="cs-ps-heatmap-wrap">
                <table class="cs-ps-heatmap" id="<?= h($_csP) ?>-heatmap"
                       data-faction-label="<?= h($_csPsFaction) ?>"
                       data-total-label="<?= h($_csPsTotal) ?>"
                       data-copies-label="<?= h($_csPsCopies) ?>"
                       data-allsets-label="<?= h($_csPsAllSets) ?>"
                       data-allfactions-label="<?= h($_csPsAllFactions) ?>"
                       data-complete-label="<?= h($_csPsComplete) ?>"></table>
            </div>
        </div><!-- /#{prefix}-playset-dash (KPIs + heatmap only) -->

        <!-- ===== Zone 3 — Exploration (independent section: own filters, loading & list) ===== -->
            <div class="cs-ps-section-title cs-ps-explore-title"><?= h($_csPsExploreTitle) ?></div>

            <div class="cs-ps-explore-top">
            <div class="cs-ps-filters">

            <!-- Name search (above the sets) -->
            <div class="cs-ps-name-row">
                <input type="text" id="<?= h($_csP) ?>-playset-name" class="form-control form-control-sm cs-ps-name-input"
                       placeholder="<?= h($_csTxt['search_ph'] ?? 'Search…') ?>" autocomplete="off">
            </div>

            <!-- Set filter (reuses the "All cards" set quick-filter design).
                 Excluded: COREKS (KS, folded into CORE) and FUGUE (no playset cards). -->
            <?php $_psSetSkip = ['COREKS', 'FUGUE']; ?>
            <?php if (!empty($_csOfficialSets)): ?>
            <div class="filter-row filter-row--scroll cs-ps-set-filter" id="<?= h($_csP) ?>-playset-set-filter">
                <?php foreach (array_reverse($_csOfficialSets, true) as $_psSk => $_psSv): if (in_array($_psSk, $_psSetSkip, true)) continue; ?>
                <button type="button" class="filter-toggle set-qf-btn cs-ps-set active" data-set="<?= h($_psSk) ?>"
                        style="background-image:url('<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/set/small_bg/<?= h($_psSk) ?>.webp')">
                    <span class="set-qf-inner">
                        <?php if (!empty($_psSv['icon'])): ?><i class="<?= h($_psSv['icon']) ?>"></i><?php endif; ?>
                        <span><?= h($_psSv[$_csLang] ?? $_psSv['en'] ?? $_psSk) ?></span>
                    </span>
                </button>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- Faction filter (reuses the "All cards" faction pill design) -->
            <?php if (!empty($_csFactions)): ?>
            <div class="filter-row filter-row--scroll cs-ps-faction-filter" id="<?= h($_csP) ?>-playset-faction-filter">
                <?php foreach ($_csFactions as $_pfk => $_pfv): ?>
                <button type="button" class="filter-toggle cs-ps-faction active" data-faction="<?= h($_pfk) ?>"
                        title="<?= h($_csFactionNames[$_pfk] ?? $_pfk) ?>">
                    <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/faction/<?= h($_pfk) ?>.png" alt="<?= h($_pfk) ?>">
                    <?= h($_csFactionNames[$_pfk] ?? $_pfk) ?>
                </button>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- Rarity filter (scope, under the factions) — gem + full name pills -->
            <?php if (!empty($_csRarities)): ?>
            <div class="filter-row filter-row--scroll cs-ps-rarity-filter" id="<?= h($_csP) ?>-playset-explore-rarities">
                <?php foreach ($_csPsRarityCodes as $_prk): if (!isset($_csRarities[$_prk])) continue; ?>
                <button type="button" class="filter-toggle cs-ps-explore-rarity active" data-rarity="<?= h($_prk) ?>">
                    <img src="<?= h($_csBaseUrl) ?>/plugins/core-altered-cards/assets/gems/<?= h($_csRarityGems[$_prk] ?? substr($_prk, 0, 1)) ?>.png"
                         alt="" style="width:15px;height:15px">
                    <?= h($_csRarityTxt[$_prk] ?? $_prk) ?>
                </button>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- Number of copies filter (card-level, multi-select; default 0 + 1-2, saved in localStorage) -->
            <div class="filter-row cs-ps-copies-filter" id="<?= h($_csP) ?>-playset-copies-filter">
                <span class="cs-ps-copies-label"><?= h($_csPsCopiesLabel) ?></span>
                <button type="button" class="filter-toggle cs-ps-copies active" data-copies="0">0</button>
                <button type="button" class="filter-toggle cs-ps-copies active" data-copies="1-2"><?= h($_csPsCopies12) ?></button>
                <button type="button" class="filter-toggle cs-ps-copies active" data-copies="3">3</button>
                <button type="button" class="filter-toggle cs-ps-copies active" data-copies="4plus"><?= h($_csPsCopies4) ?></button>
            </div>

            </div><!-- /.cs-ps-filters -->

            <!-- Right column: summary panel + layout switcher stacked, matching the
                 filters' height (summary shrinks to leave room for the switcher). -->
            <div class="cs-ps-explore-right">

            <!-- Summary panel (totals + donut of owned buckets) — reflects the current filters -->
            <div class="cs-ps-summary" id="<?= h($_csP) ?>-playset-summary"
                 data-lbl-12="<?= h($_csPsCopies12) ?>" data-lbl-4plus="<?= h($_csPsCopies4) ?>">
                <div class="cs-ps-sum-loading" id="<?= h($_csP) ?>-playset-summary-loading" style="display:none">
                    <div class="spinner-border" role="status"
                         style="width:1.4rem;height:1.4rem;border-width:3px;color:var(--primary-400)"></div>
                </div>
                <div class="cs-ps-sum-stats">
                    <div class="cs-ps-sum-stat">
                        <span class="cs-ps-sum-lbl"><?= h($_csPsVersions) ?></span>
                        <span class="cs-ps-sum-val" id="<?= h($_csP) ?>-playset-sum-versions">&ndash;</span>
                    </div>
                    <div class="cs-ps-sum-stat">
                        <span class="cs-ps-sum-lbl"><?= h($_csPsCopiesLabel) ?></span>
                        <span class="cs-ps-sum-val" id="<?= h($_csP) ?>-playset-sum-owned">&ndash;</span>
                    </div>
                </div>
                <div class="cs-ps-sum-divider"></div>
                <div class="cs-ps-sum-chart">
                    <div class="cs-ps-chart-title"><?= h($_csPsDonutTitle) ?></div>
                    <div class="cs-ps-chart-body">
                        <div class="cs-ps-donut" id="<?= h($_csP) ?>-playset-donut"></div>
                        <div class="cs-ps-donut-legend" id="<?= h($_csP) ?>-playset-donut-legend"></div>
                    </div>
                </div>
            </div><!-- /.cs-ps-summary -->

            <!-- Layout switcher (card density). Persisted client-side; default 2 per row. -->
            <div class="cs-ps-layout-row">
                <span class="cs-ps-layout-label"><?= h($_csPsLayout) ?></span>
                <div class="cs-ps-layout-switch" id="<?= h($_csP) ?>-playset-layout" role="group" aria-label="<?= h($_csPsLayout) ?>">
                    <button type="button" class="cs-ps-layout-btn" data-layout="cols-list"
                            title="<?= h($_csPsLayoutList) ?>" aria-label="<?= h($_csPsLayoutList) ?>">
                        <i class="fa-solid fa-list"></i>
                    </button>
                    <button type="button" class="cs-ps-layout-btn active" data-layout="cols-2"
                            title="<?= h($_csPsLayout2) ?>" aria-label="<?= h($_csPsLayout2) ?>">
                        <i class="fa-solid fa-table-cells-large"></i>
                    </button>
                    <button type="button" class="cs-ps-layout-btn" data-layout="cols-3"
                            title="<?= h($_csPsLayout3) ?>" aria-label="<?= h($_csPsLayout3) ?>">
                        <i class="fa-solid fa-table-cells"></i>
                    </button>
                    <button type="button" class="cs-ps-layout-btn" data-layout="cols-visual"
                            title="<?= h($_csPsLayoutVisual) ?>" aria-label="<?= h($_csPsLayoutVisual) ?>">
                        <i class="fa-solid fa-images"></i>
                    </button>
                </div>
            </div>

            </div><!-- /.cs-ps-explore-right -->

            </div><!-- /.cs-ps-explore-top -->

            <!-- Exploration loading / error (independent of the dashboard) -->
            <div id="<?= h($_csP) ?>-playset-explore-loading" class="ac-state-pane" style="display:none">
                <div class="spinner-border" role="status"
                     style="width:1.4rem;height:1.4rem;border-width:3px;color:var(--primary-400)"></div>
                <div class="mt-2 small text-muted"><?= h($_csTxt['loading'] ?? '') ?></div>
            </div>
            <div id="<?= h($_csP) ?>-playset-explore" class="cs-ps-explore"
                 data-cards-label="<?= h($_csPsExploreCards) ?>"></div>
            <div id="<?= h($_csP) ?>-playset-explore-pag" class="cs-ps-explore-pag"></div>

    </div><!-- /#{prefix}-playset -->
