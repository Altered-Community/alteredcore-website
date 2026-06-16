<?php
/**
 * Shared "Starting hand" stats + draw-odds block.
 * Included by the deck detail page (deck.php) and the deck builder (deckbuilder.php).
 *
 * Expects in scope:
 *   - $txt: must contain the starting-hand keys (see cacStartingHandStatsTxt()).
 * The including page is responsible for defining the JS globals
 * (handDeckCards / handDeckGroups / handDeckSize / handLang / handTypeLabels / handOddsTxt)
 * and loading hand-odds-math.js + hand-odds.js after this markup.
 */
?>
<div id="hand-odds" class="hand-odds">
    <!-- Opening hand stats -->
    <div class="ohs-section">
        <div class="ho-sec"><?= h($txt['ohs_title']) ?></div>
        <div class="ohs-grid">
            <!-- Average composition (stat card, first) -->
            <div class="ohs-block ohs-block-comp">
                <div class="ohs-b-title"><?= h($txt['ho_types_label']) ?></div>
                <div class="ohs-b-sub"><?= h($txt['ohs_comp_sub']) ?></div>
                <div class="ho-comp-body" id="ohs-comp"></div>
            </div>
            <!-- Expensive cards -->
            <div class="ohs-block">
                <div class="ohs-b-title"><?= h($txt['ohs_b2_title']) ?></div>
                <div class="ohs-b-sub"><?= h($txt['ohs_b2_sub']) ?></div>
                <div class="ohs-head">
                    <div class="ohs-big-v" id="ohs-b2-v"></div>
                    <div class="ohs-big-note"><?= h($txt['ohs_b2_note']) ?></div>
                </div>
                <button type="button" class="ohs-toggle" data-bs-toggle="collapse" data-bs-target="#ohs-d2" aria-expanded="false">
                    <?= h($txt['ohs_detail']) ?> <i class="fa-solid fa-chevron-up ohs-caret"></i>
                </button>
                <div class="collapse" id="ohs-d2">
                    <div class="ohs-d-label"><?= h($txt['ohs_b2_detail']) ?></div>
                    <div class="ohs-bars" id="ohs-b2-bars"></div>
                </div>
            </div>
            <!-- Reactivity (after you) -->
            <div class="ohs-block">
                <div class="ohs-b-title"><?= h($txt['ohs_b3_title']) ?></div>
                <div class="ohs-b-sub"><?= h($txt['ohs_b3_sub']) ?></div>
                <div class="ohs-head">
                    <div class="ohs-big-v" id="ohs-b3-v"></div>
                    <div class="ohs-big-note"><?= h($txt['ohs_b3_note']) ?></div>
                </div>
                <button type="button" class="ohs-toggle" data-bs-toggle="collapse" data-bs-target="#ohs-d3" aria-expanded="false">
                    <?= h($txt['ohs_detail']) ?> <i class="fa-solid fa-chevron-up ohs-caret"></i>
                </button>
                <div class="collapse" id="ohs-d3">
                    <div class="ohs-d-label"><?= h($txt['ohs_b3_detail']) ?></div>
                    <div class="ohs-bars" id="ohs-b3-bars"></div>
                </div>
            </div>
            <!-- Mana used on day 1 -->
            <div class="ohs-block">
                <div class="ohs-b-title"><?= h($txt['ohs_b1_title']) ?></div>
                <div class="ohs-b-sub"><?= h($txt['ohs_b1_sub']) ?></div>
                <div class="ohs-head"><div class="ohs-highlights">
                    <div class="ohs-hl">
                        <div class="ohs-hl-l"><?= h($txt['ohs_b1_h1']) ?></div>
                        <div class="ohs-hl-v" id="ohs-b1-h1"></div>
                        <div class="ohs-hl-note"><?= h($txt['ohs_b1_h1_note']) ?></div>
                    </div>
                    <div class="ohs-hl ohs-hl--warn">
                        <div class="ohs-hl-l"><?= h($txt['ohs_b1_h2']) ?></div>
                        <div class="ohs-hl-v" id="ohs-b1-h2"></div>
                        <div class="ohs-hl-note"><?= h($txt['ohs_b1_h2_note']) ?></div>
                    </div>
                </div></div>
                <button type="button" class="ohs-toggle" data-bs-toggle="collapse" data-bs-target="#ohs-d1" aria-expanded="false">
                    <?= h($txt['ohs_detail']) ?> <i class="fa-solid fa-chevron-up ohs-caret"></i>
                </button>
                <div class="collapse" id="ohs-d1">
                    <div class="ohs-d-label"><?= h($txt['ohs_b1_detail']) ?></div>
                    <div class="ohs-bars" id="ohs-b1-bars"></div>
                </div>
            </div>
            <!-- Contestable Expeditions on day 1 -->
            <div class="ohs-block">
                <div class="ohs-b-title"><?= h($txt['ohs_b4_title']) ?></div>
                <div class="ohs-b-sub"><?= h($txt['ohs_b4_sub']) ?></div>
                <div class="ohs-head"><div class="ohs-highlights">
                    <div class="ohs-hl">
                        <div class="ohs-hl-l"><?= h($txt['ohs_b4_h1']) ?></div>
                        <div class="ohs-hl-v" id="ohs-b4-h1"></div>
                        <div class="ohs-hl-note"><?= h($txt['ohs_b4_h1_note']) ?></div>
                    </div>
                    <div class="ohs-hl">
                        <div class="ohs-hl-l"><?= h($txt['ohs_b4_h2']) ?></div>
                        <div class="ohs-hl-v" id="ohs-b4-h2"></div>
                        <div class="ohs-hl-note"><?= h($txt['ohs_b4_h2_note']) ?></div>
                    </div>
                </div></div>
                <button type="button" class="ohs-toggle" data-bs-toggle="collapse" data-bs-target="#ohs-d4" aria-expanded="false">
                    <?= h($txt['ohs_detail']) ?> <i class="fa-solid fa-chevron-up ohs-caret"></i>
                </button>
                <div class="collapse" id="ohs-d4">
                    <div class="ohs-d-label"><?= h($txt['ohs_b4_detail']) ?></div>
                    <div class="ohs-bars ohs-bars--wide" id="ohs-b4-bars"></div>
                </div>
            </div>
        </div>
    </div>
    <!-- Draw-odds calculators (full width, below the stats) -->
    <div class="ho-calc">
        <div class="ho-sec"><?= h($txt['ho_calc']) ?></div>
        <div class="ho-calc-head">
            <span class="ho-calc-deck"><i class="fa-solid fa-layer-group"></i> <?= h($txt['ho_deck']) ?> <b id="ho-deck-size">0</b></span>
            <span class="ho-calc-draw"><label for="ho-drawn"><?= h($txt['ho_drawn']) ?></label><input type="number" id="ho-drawn" class="ho-drawn" value="6" min="1"></span>
        </div>
        <div id="hand-odds-x" class="hand-odds-x">
            <div class="ncalc">
                <div class="nc-head"><?= h($txt['nc_atleast']) ?></div>
                <div class="nc-bars" id="ncx-card-bars"></div>
                <div class="nc-mid"><?= h($txt['nc_among']) ?></div>
                <select id="ncx-card-key" multiple placeholder="<?= h($txt['ho_pick']) ?>"></select>
                <div class="nc-foot"><?= h($txt['nc_draw_a']) ?> <b class="ncx-drawn">6</b> <?= h($txt['nc_draw_b']) ?></div>
                <div class="nc-ratio" id="ncx-card-ratio"></div>
            </div>
            <div class="ncalc">
                <div class="nc-head"><?= h($txt['nc_atleast_combo']) ?></div>
                <div class="nc-bars" id="ncx-combo-bars"></div>
                <div class="nc-mid"><?= h($txt['nc_among_combo']) ?></div>
                <div class="ho-ab"><span><?= h($txt['ho_group_a']) ?></span><select id="ncx-combo-a" multiple placeholder="<?= h($txt['ho_pick']) ?>"></select></div>
                <div class="ho-ab"><span><?= h($txt['ho_group_b']) ?></span><select id="ncx-combo-b" multiple placeholder="<?= h($txt['ho_pick']) ?>"></select></div>
                <div class="nc-foot"><?= h($txt['nc_draw_a']) ?> <b class="ncx-drawn">6</b> <?= h($txt['nc_draw_b']) ?></div>
                <div class="nc-ratio" id="ncx-combo-ratio"></div>
            </div>
        </div>
    </div>
</div>
