<?php
/** Deckbuilder overlays: lightbox, hero picker, new-deck wizard, rules, unsaved. */
?>
<!-- Card lightbox (deck list) -->
<div id="db-card-modal" class="ac-lightbox-overlay" style="display:none">
    <div id="db-card-modal-inner" class="ac-lightbox-inner" onclick="event.stopPropagation()"></div>
</div>

<!-- Hero selector modal -->
<?php // Heroes are browsed one faction at a time — Axiom opens by default.
      $_heroDefaultFaction = isset($factionsData['AX']) ? 'AX' : (string)array_key_first($factionsData); ?>
<div id="db-hero-modal" class="ac-lightbox-overlay" style="display:none;overflow:hidden;z-index:9998" onclick="if(event.target===this)dbHeroBackdrop()">
    <div class="db-hero-panel" onclick="event.stopPropagation()">
        <button onclick="dbHeroClose()" class="db-hero-close-btn">×</button>
        <h3 class="db-hero-title"><?= h($txt['choose_hero']) ?></h3>
        <p class="db-hero-intro"><?= h($txt['wizard_hero_msg']) ?></p>
        <div class="db-hero-toolbar">
            <div id="db-hero-factions">
            <?php foreach ($factionsData as $fCode => $fData): ?>
            <button type="button" onclick="dbLoadHeroes('<?= $fCode ?>')"
                    class="db-faction-btn<?= $fCode === $_heroDefaultFaction ? ' active' : '' ?>"
                    data-faction="<?= $fCode ?>"
                    style="--faction-color:<?= h($fData['color'] ?? '#888') ?>">
                <img src="<?= $pluginAssetsUrl ?>/faction/<?= $fCode ?>.png" alt="">
                <span><?= h($fData[$uiLang] ?? $fData['en']) ?></span>
            </button>
            <?php endforeach; ?>
        </div>
        <?php if (!$_altArtGlobalMode): ?>
        <label class="cs-switch db-hero-altarts" title="<?= h($txt['show_promo'] ?? 'Alt arts') ?>">
            <input type="checkbox" id="db-hero-altarts-toggle">
            <span class="cs-switch-track"><span class="cs-switch-thumb"></span></span>
            <span class="cs-switch-label"><i class="fa-solid fa-star me-1"></i><?= h($txt['show_promo'] ?? 'Alt arts') ?></span>
        </label>
        <?php endif; ?>
        </div>
        <div id="db-hero-loading" class="db-hero-loading"><?= h($txt['loading']) ?></div>
        <div id="db-hero-grid">
            <!-- populated by JS -->
        </div>
        <div class="db-hero-footer">
            <button type="button" id="db-hero-confirm" class="btn btn-primary-altered btn-sm" disabled>
                <?= h($txt['hero_confirm']) ?>
            </button>
        </div>
    </div>
</div>

<!-- New deck creation dialog -->
<?php
// Board Game Arena runs its competitive "Arena" queue on one format at a time, and
// which one changes on BGA's schedule. The pointer lives in altered.json so it can
// be corrected from the admin JSON editor without a deploy.
$_bgaArenaFormat = (string)(loadAlteredData('bgaArena')['format'] ?? '');

// One-line format descriptors, derived from the rules themselves so they cannot
// drift from altered.json.
$_fmtDesc = [];
foreach ($formatsData as $_fk => $_fv) {
    if (!empty($_fv['hidden'])) continue;
    $_bits = [sprintf($txt['fmt_cards'], $_fv['minCards'], $_fv['maxCards'])];
    if (($_fv['maxCopiesPerRef'] ?? null) === 1)              $_bits[] = $txt['fmt_singleton'];
    if (($_fv['maxUnique'] ?? null) === 0)                    $_bits[] = $txt['fmt_no_unique'];
    elseif (!empty($_fv['requireUniqueLegality']))            $_bits[] = $txt['fmt_frontier'];
    elseif (!empty($_fv['maxUnique']))                        $_bits[] = sprintf($txt['fmt_max_unique'], $_fv['maxUnique']);
    if (count($_bits) === 1 && ($_fv['maxCopiesPerRef'] ?? null) === null) $_bits[] = $txt['fmt_free'];
    $_fmtDesc[$_fk] = implode(' · ', $_bits);
}

// Display order: the Arena format, then the other BGA formats, then the free-for-all
// ones, then the rest — each group alphabetical on the displayed name. Puts what most
// players are looking for at the top instead of the reference data's own order.
// A format with no card restrictions at all (Sandbox) sits last among the BGA ones:
// it is a scratchpad, not something anyone plays competitively.
$_fmtKeys = array_keys($_fmtDesc);
usort($_fmtKeys, function ($a, $b) use ($formatsData, $uiLang, $_bgaArenaFormat) {
    $rank = function ($k) use ($formatsData, $_bgaArenaFormat) {
        if ($_bgaArenaFormat !== '' && $k === $_bgaArenaFormat) return 0;
        if (empty($formatsData[$k]['bgalegal'])) return 3;
        $unrestricted = ($formatsData[$k]['maxCopiesPerRef'] ?? null) === null
                     && ($formatsData[$k]['maxUnique'] ?? null) === null;
        return $unrestricted ? 2 : 1;
    };
    $ra = $rank($a);
    $rb = $rank($b);
    if ($ra !== $rb) return $ra <=> $rb;
    $label = fn($k) => $formatsData[$k][$uiLang] ?? $formatsData[$k]['en'] ?? $k;
    return strcasecmp($label($a), $label($b));
});
?>
<!-- No backdrop dismissal: this step holds typed input, and leaving means
     abandoning the deck. The × and Cancel are the deliberate exits. -->
<div id="db-new-modal" class="ac-lightbox-overlay" style="display:none;overflow:hidden;z-index:9998">
    <div class="db-hero-panel db-new-panel" onclick="event.stopPropagation()">
        <button onclick="dbNewCancel()" class="db-hero-close-btn">×</button>
        <h3 class="db-hero-title"><?= h($txt['new_deck']) ?></h3>

        <div class="db-new-body">
            <!-- Hero: a field of this form, opening the picker as a sub-dialog.
                 Starts empty — nothing is preselected. -->
            <div class="filter-label mb-1"><?= h($txt['hero_label']) ?> <span class="db-new-req">*</span></div>
            <button type="button" id="db-new-hero" class="db-new-hero empty" onclick="dbNewPickHero()">
                <img id="db-new-hero-img" alt="" style="display:none">
                <i id="db-new-hero-icon" class="fa-solid fa-person-rays"></i>
                <span class="db-new-hero-id">
                    <span id="db-new-hero-name"><?= h($txt['hero_slot']) ?></span>
                    <small id="db-new-hero-faction"></small>
                    <span id="db-new-hero-bga" class="db-bga-pill ko" style="display:none"></span>
                </span>
                <span class="db-new-hero-action" id="db-new-hero-action"><?= h($txt['choose_hero']) ?></span>
            </button>

            <!-- Name -->
            <label class="filter-label mb-1" for="db-new-name"><?= h($txt['deck_name']) ?> <span class="db-new-req">*</span></label>
            <input type="text" id="db-new-name" class="form-control form-control-sm mb-3" maxlength="120">

            <!-- Format -->
            <div class="filter-label mb-1"><?= h($txt['format']) ?> <span class="db-new-req">*</span></div>
            <div class="db-new-formats mb-3">
                <?php foreach ($_fmtKeys as $fmtKey): $fmtData = $formatsData[$fmtKey]; ?>
                <label class="db-new-format" style="--format-color:<?= h($fmtData['color'] ?? 'var(--neutral-300)') ?>">
                    <input type="radio" name="db-new-format" value="<?= h($fmtKey) ?>">
                    <span class="db-new-format-txt">
                        <span class="db-new-format-head">
                            <span class="db-new-format-name"><?= h($fmtData[$uiLang] ?? $fmtData['en']) ?></span>
                            <?php // Text and colour set by JS: the verdict also depends on the hero. ?>
                            <span class="db-bga-pill" data-fmt-key="<?= h($fmtKey) ?>" data-fmt-bga="<?= !empty($fmtData['bgalegal']) ? '1' : '0' ?>"
                                  data-fmt-arena="<?= ($_bgaArenaFormat !== '' && $fmtKey === $_bgaArenaFormat) ? '1' : '0' ?>"></span>
                            <?php if ($_bgaArenaFormat !== '' && $fmtKey === $_bgaArenaFormat): ?>
                            <span class="db-arena-pill" title="<?= h($txt['bga_arena_title']) ?>">
                                <i class="fa-solid fa-trophy"></i><?= h($txt['bga_arena']) ?>
                            </span>
                            <?php endif; ?>
                        </span>
                        <small><?= h($_fmtDesc[$fmtKey] ?? '') ?></small>
                    </span>
                </label>
                <?php endforeach; ?>
            </div>

            <?php if (!$isGuest): ?>
            <!-- Visibility -->
            <div class="filter-label mb-1"><?= h($txt['visibility']) ?></div>
            <div class="db-new-vis mb-1">
                <button type="button" class="db-new-vis-btn active" data-public="0">
                    <i class="fa-solid fa-lock"></i><?= h($txt['private']) ?>
                </button>
                <button type="button" class="db-new-vis-btn" data-public="1">
                    <i class="fa-solid fa-eye"></i><?= h($txt['public']) ?>
                </button>
            </div>
            <p class="db-new-note mb-3" id="db-new-vis-note"><?= h($txt['wizard_vis_priv']) ?></p>
            <?php endif; ?>

            <!-- Description, folded away: nobody writes one before building the deck -->
            <button type="button" id="db-new-desc-toggle" class="db-new-desc-toggle" onclick="dbNewToggleDesc()">
                <i class="fa-solid fa-plus"></i><?= h($txt['wizard_desc_add']) ?>
            </button>
            <div id="db-new-desc-wrap" style="display:none">
                <label class="filter-label mb-1" for="db-new-desc"><?= h($txt['description']) ?></label>
                <textarea id="db-new-desc" class="form-control form-control-sm" rows="3"></textarea>
            </div>

            <div id="db-new-error" class="alert alert-danger p-2 mt-3 mb-0 small" style="display:none"></div>
        </div>

        <div class="db-hero-footer">
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="dbNewCancel()">
                <?= h($txt['wizard_cancel']) ?>
            </button>
            <button type="button" id="db-new-submit" class="btn btn-primary-altered btn-sm"><?= h($txt['wizard_create']) ?></button>
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
