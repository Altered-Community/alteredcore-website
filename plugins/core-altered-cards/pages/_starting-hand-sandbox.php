<?php
/**
 * Shared "Starting hand" playtest sandbox (toolbar + table + hand grid + summary).
 * Included by the deck detail page (deck.php) and the deck builder (deckbuilder.php).
 *
 * Expects $txt (with the starting-hand keys, see cacStartingHandStatsTxt()) in scope.
 * The including page defines the JS globals (handDeckCards / handLang / handTxt) and loads
 * hand-tester.js after this markup.
 */
?>
<div class="pt-root">
<div class="hand-test-toolbar">
    <button type="button" id="hand-draw-btn" class="btn btn-primary-altered btn-sm">
        <i class="fa-solid fa-rotate-right me-1"></i><?= h($txt['pt_restart']) ?>
    </button>
    <button type="button" id="pt-toggle-playground" class="btn btn-sm pt-toggle" aria-pressed="false" title="<?= h($txt['pt_toggle_playground']) ?>">
        <i class="fa-solid fa-toggle-off me-1"></i><?= h($txt['pt_toggle_playground']) ?>
    </button>
    <span id="pt-phase-hint" class="pt-phase-hint"><?= h($txt['pt_setup_hint']) ?></span>
</div>

<div class="pt-table-wrap">
<div class="pt-table">
    <div id="pt-board" class="pt-zone pt-board pt-dropzone" data-zone="board">
        <div class="pt-zone-label"><?= h($txt['pt_board']) ?>
            <a href="#" id="pt-board-more" class="pt-board-more" style="display:none"><?= h($txt['pt_board_more']) ?></a></div>
        <div id="pt-board-cards" class="pt-board-cards"></div>
        <div id="pt-mana" class="pt-mana" role="button" tabindex="0" title="<?= h($txt['pt_mana_list']) ?>">
            <i class="fa-solid fa-droplet"></i>
            <span class="pt-mana-label"><?= h($txt['pt_mana']) ?></span>
            <span id="pt-mana-count" class="pt-mana-count">0</span>
        </div>
    </div>
    <div class="pt-aside">
        <div class="pt-resources-row">
            <div id="pt-discard" class="pt-discard pt-dropzone" data-zone="discard" role="button" tabindex="0">
                <div class="pt-zone-label"><?= h($txt['pt_discard']) ?></div>
                <div id="pt-discard-pile" class="pt-discard-pile"></div>
                <span id="pt-discard-count" class="pt-discard-count">0</span>
            </div>
            <div id="pt-deck" class="pt-deck" role="button" tabindex="0" title="<?= h($txt['pt_draw']) ?>">
                <div class="pt-zone-label"><?= h($txt['pt_deck']) ?></div>
                <div class="pt-deck-pile">
                    <span id="pt-deck-count" class="pt-deck-count">0</span>
                    <span class="pt-deck-hint"><?= h($txt['pt_draw']) ?></span>
                </div>
            </div>
        </div>
    </div>
</div>
</div>

<div id="hand-cards" class="deck-cards-grid hand-cards-grid pt-dropzone" data-zone="hand"></div>
<div class="pt-hand-actions">
    <button type="button" id="pt-commit-mana" class="btn btn-primary-altered btn-sm" style="display:none" disabled>
        <i class="fa-solid fa-droplet me-1"></i><?= h($txt['pt_commit_mana']) ?>
    </button>
</div>
<div id="hand-summary" class="hand-summary"></div>
</div><!-- .pt-root -->
