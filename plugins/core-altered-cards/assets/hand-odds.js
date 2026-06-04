/* Hand-odds UI: opening-hand stats + draw-odds calculators.
 * Reads globals from deck.php: handDeckCards, handLang, handDeckSize, handDeckGroups,
 * handTypeLabels, handOddsTxt. Math from hand-odds-math.js (window.HandOddsMath). */
(function () {
    var M = window.HandOddsMath;
    var statsGrid = document.getElementById('ho-stats-grid');
    if (!M || !statsGrid || typeof handDeckCards === 'undefined') return;

    var HAND_SIZE = 6;
    // Tunable colour thresholds. dir:'low' => lower is better; 'high' => higher is better.
    var TH = {
        keep:      { dir: 'high', g: 80, a: 60 },
        tempo:     { dir: 'high', g: 65, a: 40 },
        slow:      { dir: 'low',  g: 10, a: 20 },
        noearly:   { dir: 'low',  g: 15, a: 30 },
        double:    { dir: 'high', g: 45, a: 25 },
        explosive: { dir: 'high', g: 35, a: 20 },
        avg:       { dir: 'high', g: 2.5, a: 1.5, isCount: true },
        heavy:     { dir: 'low',  g: 15, a: 30 },
        balanced:  { dir: 'high', g: 75, a: 55 }
    };
    function band(v, th) {
        if (th.dir === 'low')  return v <= th.g ? 'good' : (v <= th.a ? 'warn' : 'bad');
        return v >= th.g ? 'good' : (v >= th.a ? 'warn' : 'bad');
    }
    function pct(x) { return (x * 100).toFixed(0) + '%'; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    var groupQty = {}; handDeckGroups.forEach(function (g) { groupQty[g.key] = g.qty; });

    function computeStats() {
        var cards = handDeckCards.map(function (c) {
            return { cost: c.mainCost, isCharacter: c.type === 'CHARACTER', qty: c.qty };
        });
        return M.handStats(cards, HAND_SIZE);
    }
    function card(key, valueNum, displayVal) {
        var th = TH[key], t = handOddsTxt[key] || ['', ''];
        var b = band(valueNum, th);
        return '<div class="ho-card ' + b + '"><div class="ho-l">' + t[0] + '</div>' +
               '<div class="ho-v">' + displayVal + '</div><div class="ho-s">' + t[1] + '</div></div>';
    }
    function renderStats() {
        var s = computeStats();
        statsGrid.innerHTML =
            // Row 1 — the essentials
            card('keep',      s.keepable * 100,    pct(s.keepable)) +
            card('tempo',     s.tempo * 100,       pct(s.tempo)) +
            card('slow',      s.slowStart * 100,   pct(s.slowStart)) +
            // Row 2 — early development
            card('noearly',   s.noEarlyChar * 100, pct(s.noEarlyChar)) +
            card('double',    s.doubleChar * 100,  pct(s.doubleChar)) +
            card('explosive', s.explosive * 100,   pct(s.explosive)) +
            // Row 3 — curve & composition
            card('avg',       s.avgPlayable,       s.avgPlayable.toFixed(1).replace('.', ',')) +
            card('heavy',     s.heavy * 100,       pct(s.heavy)) +
            card('balanced',  s.balanced * 100,    pct(s.balanced));
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
    // Friendly "≈ X in Y hands" — best proper fraction with denominator ≤5; omitted for extreme odds.
    function niceRatio(p) {
        if (p <= 0 || p >= 1) return '';
        var bestX = 0, bestY = 0, bestErr = Infinity;
        for (var y = 1; y <= 5; y++) {
            var x = Math.round(p * y);
            if (x <= 0 || x >= y) continue;
            var err = Math.abs(p - x / y);
            if (err < bestErr - 1e-12) { bestErr = err; bestX = x; bestY = y; }
        }
        if (!bestY) return '';
        return String(handOddsTxt.ratio).replace('{x}', bestX).replace('{y}', bestY);
    }
    function showRes(el, p) {
        if (p <= 0 && el.dataset.empty === '1') { el.innerHTML = ''; return; }
        var sub = esc(handOddsTxt.inHand), r = p > 0 ? niceRatio(p) : '';
        if (r) sub += ' · ' + esc(r);
        el.innerHTML = '<div class="ho-pct">' + (p * 100).toFixed(0) + '%</div>' +
                       '<div class="ho-c">' + sub + '</div>';
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

    var cardSel = document.getElementById('ho-card-key');
    var cardRes = document.getElementById('ho-card-res');
    var cardTS = cardSel ? buildSelect(cardSel, function () { recalcCard(); }) : null;
    function recalcCard() {
        if (!cardRes) return;
        var K = copies(cardTS);
        cardRes.dataset.empty = K ? '0' : '1';
        showRes(cardRes, M.pAtLeastOne(handDeckSize, K, drawn()));
    }

    var aSel = document.getElementById('ho-combo-a'), bSel = document.getElementById('ho-combo-b');
    var comboRes = document.getElementById('ho-combo-res');
    var aTS = aSel ? buildSelect(aSel, function () { recalcCombo(); }) : null;
    var bTS = bSel ? buildSelect(bSel, function () { recalcCombo(); }) : null;
    function recalcCombo() {
        if (!comboRes) return;
        var a = copies(aTS), b = copies(bTS);
        comboRes.dataset.empty = (a && b) ? '0' : '1';
        showRes(comboRes, (a && b) ? M.pComboBoth(handDeckSize, a, b, drawn()) : 0);
    }
    function recalcAll() { recalcCard(); recalcCombo(); }

    if (drawnEl) drawnEl.addEventListener('input', recalcAll);
    recalcAll();
}());
