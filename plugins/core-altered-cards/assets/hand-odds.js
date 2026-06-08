/* Hand-odds UI: opening-hand stats + draw-odds calculators.
 * Reads globals from deck.php: handDeckCards, handLang, handDeckSize, handDeckGroups,
 * handTypeLabels, handOddsTxt. Math from hand-odds-math.js (window.HandOddsMath). */
(function () {
    var M = window.HandOddsMath;
    var statsGrid = document.getElementById('ho-stats-grid');
    if (!M || !statsGrid || typeof handDeckCards === 'undefined') return;

    var HAND_SIZE = 6;
    var DEC = handLang === 'en' ? '.' : ',';
    function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    var groupQty = {}; handDeckGroups.forEach(function (g) { groupQty[g.key] = g.qty; });

    // ----- Stats -----
    function computeStats() {
        var cards = handDeckCards.map(function (c) {
            return { cost: c.mainCost, isCharacter: c.type === 'CHARACTER', qty: c.qty };
        });
        return M.handStats(cards, HAND_SIZE);
    }
    function dec1(x) { return x.toFixed(1).replace('.', DEC); }
    function clampPct(x) { return Math.max(0, Math.min(100, x)).toFixed(1) + '%'; }
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
    // Abbreviate large counts so the value stays short at full size (12345 → "12k", 3.3M).
    function compact(x) {
        if (x >= 1000000) return (x / 1000000).toFixed(1).replace('.', DEC) + 'M';
        if (x >= 10000) return Math.round(x / 1000) + 'k';
        return String(x);
    }
    // "1 game in X" frequency, for very rare events shown as odds rather than a %.
    function freqText(p) {
        return p <= 0 ? String(handOddsTxt.never) : String(handOddsTxt.freq).replace('{x}', compact(Math.round(1 / p)));
    }
    // opts: { bar: 0..100 (progress bar), tipPct: 0..1 (hover tooltip, 2 decimals), small: bool }
    // Every row (label / value / bar / hint / explainer) keeps a fixed slot so cards line up.
    function statCard(key, valueText, opts) {
        opts = opts || {};
        var t = handOddsTxt[key] || ['', '', ''];
        var vAttr = (opts.tipPct != null) ? ' tabindex="0" data-bs-toggle="tooltip" title="' + esc(precisePct(opts.tipPct)) + '"' : '';
        var num = '<span class="ho-v-n"' + vAttr + '>' + valueText + '</span>';
        var bar = (opts.bar != null)
            ? '<div class="ho-bar"><i style="width:' + clampPct(opts.bar) + '"></i></div>'
            : '<div class="ho-bar ho-bar-empty"></div>';
        return '<div class="ho-card"><div class="ho-l">' + t[0] + '</div>' +
               '<div class="ho-v">' + num + '</div>' + bar +
               '<div class="ho-s">' + t[1] + '</div>' +
               (t[2] ? '<div class="ho-x">' + t[2] + '</div>' : '') + '</div>';
    }
    var TYPE_COLORS = { CHARACTER: '#2f7d57', SPELL: '#C9A84C', REST: '#5b7aa8' };
    function typesCard() {
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
        return '<div class="ho-card ho-card-wide ho-comp"><div class="ho-l">' + esc(handOddsTxt.typesLabel) + '</div>' +
               '<div class="ho-comp-body">' +
               '<div class="ho-donut" style="background:' + ring + '"></div>' +
               '<div class="ho-comp-legend">' +
               row(TYPE_COLORS.CHARACTER, tc.CHARACTER, L.CHARACTER || 'Characters') +
               row(TYPE_COLORS.SPELL, tc.SPELL, L.SPELL || 'Spells') +
               row(TYPE_COLORS.REST, tc.REST, L.PERMANENT || 'Permanents') +
               '</div></div></div>';
    }
    function pctOpts(p) { return { bar: p * 100, tipPct: p }; }
    function renderStats() {
        var s = computeStats();
        statsGrid.innerHTML =
            typesCard() +                                                            // full width, first
            statCard('oncurve',    fmtPct(s.onCurve),     pctOpts(s.onCurve)) +
            statCard('tempo',      fmtPct(s.tempo),       pctOpts(s.tempo)) +
            statCard('avg',        dec1(s.avgPlayable),   {}) +
            statCard('slowfreq',   freqText(s.slowStart), { tipPct: s.slowStart }) +
            statCard('noearly',    fmtPct(s.noEarlyChar), pctOpts(s.noEarlyChar)) +
            statCard('double',     fmtPct(s.doubleChar),  pctOpts(s.doubleChar)) +
            statCard('heavy',      fmtPct(s.heavy),       pctOpts(s.heavy)) +
            statCard('congestion', fmtPct(s.congestion),  pctOpts(s.congestion));
        initTooltips();
    }
    function initTooltips() {
        if (!(window.bootstrap && window.bootstrap.Tooltip)) return;
        statsGrid.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
            if (!el._tt) el._tt = new window.bootstrap.Tooltip(el);
        });
    }
    renderStats();   // deck-level: compute once on load (does not change on redraw)

    // ----- Calculators -----
    var deckSizeEl = document.getElementById('ho-deck-size');
    var drawnEl    = document.getElementById('ho-drawn');
    if (deckSizeEl) deckSizeEl.textContent = handDeckSize;
    if (drawnEl) drawnEl.max = handDeckSize;

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
    function recalcNcCombo() {
        if (!ncComboBars) return;
        var a = copies(ncAts), b = copies(ncBts), n = drawn();
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

    if (drawnEl) drawnEl.addEventListener('input', recalcAll);
    recalcAll();
}());
