/* Hand-odds UI: opening-hand stats + draw-odds calculators.
 * Reads globals from the page: handDeckCards, handLang, handDeckSize, handDeckGroups,
 * handTypeLabels, handOddsTxt. Math from hand-odds-math.js (window.HandOddsMath).
 * Exposes window.HandOdds.refresh() so the deck-builder can recompute live as the deck changes. */
(function () {
    var M = window.HandOddsMath;
    var oddsRoot = document.getElementById('hand-odds');
    if (!M || !oddsRoot || typeof handDeckCards === 'undefined') return;

    var HAND_SIZE = 6;
    var DEC = handLang === 'en' ? '.' : ',';
    function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function dec1(x) { return x.toFixed(1).replace('.', DEC); }
    function precisePct(p) { return (p * 100).toFixed(2).replace('.', DEC) + '%'; }
    // % with nuance: 0%, "< 1%" (rare but possible), "> 99%", 100%.
    function fmtPct(p) {
        if (p <= 0) return '0%';
        if (p >= 1) return '100%';
        var v = p * 100;
        if (v < 1) return '< 1%';
        if (v > 99) return '> 99%';
        return v.toFixed(0) + '%';
    }

    // Deck-level context, rebuilt on every refresh() so the edit page can recompute live.
    var groupQty = {};
    var STATS = null;
    function rebuildContext() {
        groupQty = {};
        handDeckGroups.forEach(function (g) { groupQty[g.key] = g.qty; });
        STATS = M.handStats(handDeckCards.map(function (c) {
            return { cost: c.mainCost, isCharacter: c.type === 'CHARACTER', qty: c.qty };
        }), HAND_SIZE);
    }

    function initTooltips(root) {
        if (!(window.bootstrap && window.bootstrap.Tooltip)) return;
        (root || oddsRoot).querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
            if (!el._tt) el._tt = new window.bootstrap.Tooltip(el);
        });
    }

    // ----- Average-composition card (donut + legend), injected into #ohs-comp -----
    var TYPE_COLORS = { CHARACTER: '#2f7d57', SPELL: '#C9A84C', REST: '#5b7aa8' };
    function compBody() {
        var tc = { CHARACTER: 0, SPELL: 0, REST: 0 };
        handDeckCards.forEach(function (c) {
            tc[c.type === 'CHARACTER' ? 'CHARACTER' : (c.type === 'SPELL' ? 'SPELL' : 'REST')] += c.qty;
        });
        var total = tc.CHARACTER + tc.SPELL + tc.REST || 1;
        var per = function (qty) { return dec1(handDeckSize ? HAND_SIZE * qty / handDeckSize : 0); };
        var L = handTypeLabels || {};
        // Donut: conic-gradient slices sized by the deck's type proportions.
        var a = tc.CHARACTER / total * 100, b = a + tc.SPELL / total * 100;
        var ring = 'conic-gradient(' + TYPE_COLORS.CHARACTER + ' 0 ' + a.toFixed(2) + '%,' +
                   TYPE_COLORS.SPELL + ' ' + a.toFixed(2) + '% ' + b.toFixed(2) + '%,' +
                   TYPE_COLORS.REST + ' ' + b.toFixed(2) + '% 100%)';
        function row(color, qty, label) {
            return '<div class="ho-comp-item"><span class="ho-comp-dot" style="background:' + color + '"></span>' +
                   '<span class="ho-comp-lbl">' + esc(label) + '</span>' +
                   '<span class="ho-comp-n" style="color:' + color + '">' + per(qty) + '</span></div>';
        }
        return '<div class="ho-donut" style="background:' + ring + '"></div>' +
               '<div class="ho-comp-legend">' +
               row(TYPE_COLORS.CHARACTER, tc.CHARACTER, L.CHARACTER || 'Characters') +
               row(TYPE_COLORS.SPELL, tc.SPELL, L.SPELL || 'Spells') +
               row(TYPE_COLORS.REST, tc.REST, L.PERMANENT || 'Permanents') +
               '</div>';
    }

    // ----- Detailed "Opening hand stats" blocks -----
    function ohsBars(rows) {                                          // rows: [label, p, warn?]
        return rows.map(function (r) {
            var p = r[1], pct = p * 100, w = pct <= 0 ? 0 : Math.max(pct, 0.8);
            return '<div class="ohs-bar' + (r[2] ? ' ohs-bar--warn' : '') + '">' +
                   '<span class="ohs-bar-l">' + esc(r[0]) + '</span>' +
                   '<span class="ohs-bar-t"><i style="width:' + w.toFixed(2) + '%"></i></span>' +
                   '<span class="ohs-bar-v">' + esc(fmtPct(p)) + '</span></div>';
        }).join('');
    }
    // Hero number: rounded value shown, exact 2-decimal value on hover. The tooltip lives on an
    // inner inline span so the hover target is just the digits, not the full-width value box.
    function ohsText(id, p) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '<span tabindex="0" data-bs-toggle="tooltip" title="' + esc(precisePct(p)) + '">' + esc(fmtPct(p)) + '</span>';
    }
    function ohsFill(id, rows) { var el = document.getElementById(id); if (el) el.innerHTML = ohsBars(rows); }
    function renderBlocks() {
        var ms = STATS.manaSpent, ex = STATS.expensive, pl = STATS.plays, xp = STATS.expeditions;
        var card = handOddsTxt.card, cards = handOddsTxt.cards, play = handOddsTxt.play, plays = handOddsTxt.plays;
        var comp = document.getElementById('ohs-comp');
        if (comp) comp.innerHTML = compBody();
        // Mana used on day 1: optimal start (3) vs dead hand (0)
        ohsText('ohs-b1-h1', ms[3]);
        ohsText('ohs-b1-h2', ms[0]);
        ohsFill('ohs-b1-bars', [['3 mana', ms[3]], ['2 mana', ms[2]], ['1 mana', ms[1]], ['0 mana', ms[0], true]]);
        // Expensive cards (cost >= 4): headline P(>=3), warn bars at >=3
        ohsText('ohs-b2-v', STATS.heavy);
        ohsFill('ohs-b2-bars', ex.map(function (p, k) { return [k + ' ' + (k === 1 ? card : cards), p, k >= 3]; }));
        // Reactivity: plays chainable on day 1; headline P(>=2 plays)
        ohsText('ohs-b3-v', STATS.tempo);
        ohsFill('ohs-b3-bars', [['0 ' + plays, pl[0], true], ['1 ' + play, pl[1]], ['2 ' + plays, pl[2]], ['3 ' + plays, pl[3]]]);
        // Contestable Expeditions: both (>=2 chars) vs none (0)
        ohsText('ohs-b4-h1', xp[2]);
        ohsText('ohs-b4-h2', xp[0]);
        ohsFill('ohs-b4-bars', [[handOddsTxt.expNone, xp[0]], [handOddsTxt.expOne, xp[1]], [handOddsTxt.expBoth, xp[2]]]);
        initTooltips(document.querySelector('.ohs-section'));
    }

    // ----- Calculators -----
    var deckSizeEl = document.getElementById('ho-deck-size');
    var drawnEl    = document.getElementById('ho-drawn');

    function drawn() {
        var n = parseInt(drawnEl && drawnEl.value, 10) || HAND_SIZE;
        return Math.max(1, Math.min(n, handDeckSize));
    }
    function copies(ts) {
        return (ts ? ts.getValue() : []).reduce(function (s, k) { return s + (groupQty[k] || 0); }, 0);
    }
    // Best proper fraction with denominator ≤5 (e.g. 0.72 → 3/4); null for extreme odds.
    function bestFraction(p) {
        if (p <= 0 || p >= 1) return null;
        var bestX = 0, bestY = 0, bestErr = Infinity;
        for (var y = 1; y <= 5; y++) {
            var x = Math.round(p * y);
            if (x <= 0 || x >= y) continue;
            var err = Math.abs(p - x / y);
            if (err < bestErr - 1e-12) { bestErr = err; bestX = x; bestY = y; }
        }
        return bestY ? { x: bestX, y: bestY } : null;
    }
    // ----- Multiselect (tom-select): card thumbnails, grouped by type, sorted by cost then name -----
    var TYPE_ORDER = ['CHARACTER', 'SPELL', 'PERMANENT', 'TOKEN_MANA', 'TOKEN', 'EXPEDITION_PERMANENT', 'LANDMARK_PERMANENT', 'OTHER'];
    function optgroups() {
        var present = {};
        handDeckGroups.forEach(function (g) { present[g.type] = true; });
        var ordered = TYPE_ORDER.filter(function (t) { return present[t]; });
        Object.keys(present).forEach(function (t) { if (ordered.indexOf(t) < 0) ordered.push(t); });
        return ordered.map(function (t) { return { value: t, label: (handTypeLabels && handTypeLabels[t]) || t }; });
    }
    function rar(d) { return d.rarity ? esc(d.rarity) + ' ' : ''; }
    function tail(d) { return d.unique ? (d.mainCost + '/' + d.recallCost) : ('×' + d.qty); }
    function optHtml(d) {
        var thumb = d.unique
            ? '<altered-card class="ho-thumb ho-thumb-uniq" ref="' + esc(d.ref) + '" locale="' + esc(handLang) + '"></altered-card>'
            : '<img class="ho-thumb" loading="lazy" src="' + esc(d.img) + '" alt="">';
        return '<div class="ho-opt">' + thumb + '<span class="ho-opt-l">' + esc(d.name) + ' <b>' + rar(d) + tail(d) + '</b></span></div>';
    }
    function itemHtml(d) {
        // Selected tag: faded card image as background. Uniques have no static image →
        // a pale-gold gradient instead (opaque so it never shows tom-select's default tint).
        var bg = d.unique
            ? 'linear-gradient(90deg,#fff 30%,#f3e6c4)'
            : 'linear-gradient(90deg,#fff 36%,rgba(255,255,255,.35)),url(' + esc(d.img) + ')';
        return '<div class="ho-item" style="background-image:' + bg + '">' + esc(d.name) + ' ' + rar(d) + tail(d) + '</div>';
    }
    function optgroupHeader(d) { return '<div class="ho-optgroup-h">' + esc(d.label) + '</div>'; }
    function buildSelect(el, onChange) {
        return new TomSelect(el, {
            options: handDeckGroups, optgroups: optgroups(),
            valueField: 'key', labelField: 'name', searchField: ['name', 'rarity'],
            optgroupField: 'type', optgroupValueField: 'value', optgroupLabelField: 'label',
            lockOptgroupOrder: true,
            sortField: [{ field: 'mainCost', direction: 'asc' }, { field: 'recallCost', direction: 'asc' }, { field: 'name', direction: 'asc' }],
            plugins: ['remove_button'], maxOptions: 1000,
            render: { option: optHtml, item: itemHtml, optgroup_header: optgroupHeader },
            onChange: onChange
        });
    }
    // Re-sync a multiselect's options to the current deck (edit page). updateOption() re-renders
    // the selected item too, so a quantity change is reflected on the chip — not just the dropdown.
    function syncSelect(ts) {
        if (!ts) return;
        optgroups().forEach(function (g) { if (!ts.optgroups[g.value]) ts.addOptionGroup(g.value, g); });
        handDeckGroups.forEach(function (g) {
            if (ts.options[g.key]) ts.updateOption(g.key, g); else ts.addOption(g);
        });
        Object.keys(ts.options).forEach(function (k) { if (!groupQty[k]) ts.removeOption(k, true); });
        ts.refreshOptions(false);
    }

    // ----- Calculators (bar layout) -----
    function renderBars(el, rows) {
        if (!el) return;
        el.innerHTML = rows.map(function (r) {
            var p = r[1], has = p != null, w = has ? Math.round(p * 100) : 0;
            return '<div class="nc-bar"><span class="nc-bar-l">' + esc(r[0]) + '</span>' +
                   '<span class="nc-bar-track"><i style="width:' + w + '%"></i></span>' +
                   '<span class="nc-bar-v">' + (has ? w + '%' : '') + '</span></div>';
        }).join('');
    }
    // "≈ X in Y hands" (or "≈ X chances in Y" for a non-6 draw) for the headline probability.
    function ratioPhrase(p) {
        var fr = bestFraction(p);
        if (!fr) return '';
        var tpl = drawn() === HAND_SIZE ? handOddsTxt.ratio : handOddsTxt.ratioGeneric;
        return String(tpl).replace('{x}', fr.x).replace('{y}', fr.y);
    }
    var ncCardBars = document.getElementById('ncx-card-bars');
    var ncCardSel = document.getElementById('ncx-card-key');
    var ncCardRatio = document.getElementById('ncx-card-ratio');
    var ncCardTS = ncCardSel ? buildSelect(ncCardSel, function () { recalcNcCard(); }) : null;
    function recalcNcCard() {
        if (!ncCardBars) return;
        var K = copies(ncCardTS), n = drawn();
        renderBars(ncCardBars, [
            ['0',  K ? 1 - M.pAtLeastOne(handDeckSize, K, n) : null],
            ['1+', K ? M.pAtLeast(handDeckSize, K, n, 1) : null],
            ['2+', K ? M.pAtLeast(handDeckSize, K, n, 2) : null],
            ['3+', K ? M.pAtLeast(handDeckSize, K, n, 3) : null]
        ]);
        if (ncCardRatio) ncCardRatio.textContent = K ? ratioPhrase(M.pAtLeast(handDeckSize, K, n, 1)) : '';
    }
    var ncComboBars = document.getElementById('ncx-combo-bars');
    var ncComboRatio = document.getElementById('ncx-combo-ratio');
    var ncAsel = document.getElementById('ncx-combo-a'), ncBsel = document.getElementById('ncx-combo-b');
    var ncAts = ncAsel ? buildSelect(ncAsel, function () { recalcNcCombo(); }) : null;
    var ncBts = ncBsel ? buildSelect(ncBsel, function () { recalcNcCombo(); }) : null;
    function sumCopies(keys) { return keys.reduce(function (s, k) { return s + (groupQty[k] || 0); }, 0); }
    function recalcNcCombo() {
        if (!ncComboBars) return;
        var n = drawn();
        var aKeys = ncAts ? ncAts.getValue() : [];
        // A combo needs two *different* cards: drop from B any group already chosen in A, so the
        // shared copies aren't double-counted (pComboBoth assumes A and B are disjoint sets).
        var bKeys = (ncBts ? ncBts.getValue() : []).filter(function (k) { return aKeys.indexOf(k) === -1; });
        var a = sumCopies(aKeys), b = sumCopies(bKeys);
        var both = (a && b) ? M.pComboBoth(handDeckSize, a, b, n) : null;
        renderBars(ncComboBars, [
            ['A', a ? M.pAtLeastOne(handDeckSize, a, n) : null],
            ['B', b ? M.pAtLeastOne(handDeckSize, b, n) : null],
            [handOddsTxt.both, both]
        ]);
        if (ncComboRatio) ncComboRatio.textContent = (both != null) ? ratioPhrase(both) : '';
    }
    function updateDrawnLabels() {
        var n = drawn();
        document.querySelectorAll('.ncx-drawn').forEach(function (el) { el.textContent = n; });
    }
    function recalcAll() { recalcNcCard(); recalcNcCombo(); updateDrawnLabels(); }

    // ----- Live refresh (deck-builder): recompute everything from the current globals -----
    function refresh() {
        rebuildContext();
        renderBlocks();
        if (deckSizeEl) deckSizeEl.textContent = handDeckSize;
        if (drawnEl) drawnEl.max = handDeckSize;
        syncSelect(ncCardTS); syncSelect(ncAts); syncSelect(ncBts);
        recalcAll();
    }

    // ----- Initial render -----
    rebuildContext();
    renderBlocks();
    if (deckSizeEl) deckSizeEl.textContent = handDeckSize;
    if (drawnEl) drawnEl.max = handDeckSize;
    if (drawnEl) drawnEl.addEventListener('input', recalcAll);
    recalcAll();

    window.HandOdds = { refresh: refresh };
}());
