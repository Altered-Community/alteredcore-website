<?php
/** Deckbuilder layout (wizard, search, sidebar, modals). */
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
                include __DIR__ . '/../card-search.php';
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
                <?php include __DIR__ . '/../../pages/_starting-hand-sandbox.php'; ?>
                <?php include __DIR__ . '/../../pages/_starting-hand-stats.php'; ?>
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
                    <span class="d-flex align-items-center gap-1 d-none" id="db-gem-<?= $r ?>">
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

                <?php if ($_ownMode && !$_altArtGlobalMode): ?>
                <button type="button" id="db-choose-tokens-btn" class="btn btn-outline-secondary btn-sm w-100 mb-2">
                    <i class="fa-solid fa-images me-1"></i><?= h($txt['choose_token_arts_btn']) ?>
                </button>
                <?php endif; ?>

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
            <?php if ($_ownMode && !$_altArtGlobalMode): ?>
            <div class="card-altered p-3 mt-2 db-info-banner">
                <div class="d-flex align-items-start gap-2">
                    <i class="fa-solid fa-circle-info flex-shrink-0 text-secondary" style="margin-top:.15em"></i>
                    <span><?= h($txt['bga_alt_art_info']) ?></span>
                </div>
            </div>
            <?php endif; ?>
        </div>

    </div>

    <?php endif; ?>
</div>

