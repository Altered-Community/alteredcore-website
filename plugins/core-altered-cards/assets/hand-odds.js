/* Hand-odds UI: opening-hand stats + draw-odds calculators.
 * Reads globals from deck.php: handDeckCards, handLang, handDeckSize, handDeckGroups, handOddsTxt.
 * Math from hand-odds-math.js (window.HandOddsMath). */
(function () {
    var M = window.HandOddsMath;
    var statsGrid = document.getElementById('ho-stats-grid');
    if (!M || !statsGrid || typeof handDeckCards === 'undefined') return;

    var HAND_SIZE = 6;
    // Tunable colour thresholds. dir:'low' => lower is better; 'high' => higher is better.
    var TH = {
        slow:    { dir: 'low',  g: 10, a: 20 },
        noearly: { dir: 'low',  g: 15, a: 30 },
        tempo:   { dir: 'high', g: 65, a: 40 },
        double:  { dir: 'high', g: 45, a: 25 },
        avg:     { dir: 'high', g: 2.5, a: 1.5, isCount: true },
        keep:    { dir: 'high', g: 80, a: 60 }
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
            card('slow',    s.slowStart * 100,   pct(s.slowStart)) +
            card('noearly', s.noEarlyChar * 100, pct(s.noEarlyChar)) +
            card('tempo',   s.tempo * 100,       pct(s.tempo)) +
            card('double',  s.doubleChar * 100,  pct(s.doubleChar)) +
            card('avg',     s.avgPlayable,       s.avgPlayable.toFixed(1).replace('.', ',')) +
            card('keep',    s.keepable * 100,    pct(s.keepable));
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
    function showRes(el, p) {
        if (p <= 0 && el.dataset.empty === '1') { el.innerHTML = ''; return; }
        var ratio = p > 0 ? '≈ ' + Math.round(1 / p) : '';
        el.innerHTML = '<div class="ho-pct">' + (p * 100).toFixed(0) + '%</div>' +
                       '<div class="ho-c">' + esc(handOddsTxt.inHand) + (p > 0 ? ' · ' + ratio + ' → 1' : '') + '</div>';
    }

    function renders(variant) {
        function optHtml(d) {
            var label = esc(d.name) + ' <b>' + (d.rarity ? esc(d.rarity) + ' ' : '') + '×' + d.qty + '</b>';
            if (variant === '3') return '<div class="ho-opt3"><img loading="lazy" src="' + esc(d.img) + '" alt="">' + label + '</div>';
            return '<div class="ho-opt">' + label + '</div>';
        }
        function itemHtml(d) {
            if (variant === '2') return '<div class="ho-item2" style="background-image:linear-gradient(90deg,#fff 38%,rgba(255,255,255,.25)),url(' + esc(d.img) + ')">' + esc(d.name) + ' ' + (d.rarity ? esc(d.rarity) : '') + ' ×' + d.qty + '</div>';
            return '<div>' + esc(d.name) + ' ' + (d.rarity ? esc(d.rarity) : '') + ' ×' + d.qty + '</div>';
        }
        return { option: optHtml, item: itemHtml };
    }

    var currentVariant = '1';
    var instances = []; // {el, ts, onChange}
    function tsConfig(onChange) {
        return {
            options: handDeckGroups, valueField: 'key', labelField: 'name',
            searchField: ['name', 'rarity'], plugins: ['remove_button'],
            maxOptions: 500, render: renders(currentVariant), onChange: onChange
        };
    }
    function buildSelect(el, onChange) {
        var ts = new TomSelect(el, tsConfig(onChange));
        instances.push({ el: el, ts: ts, onChange: onChange });
        return ts;
    }
    function rebuildAll() {
        instances.forEach(function (inst) {
            var vals = inst.ts.getValue();
            inst.ts.destroy();
            inst.ts = new TomSelect(inst.el, tsConfig(inst.onChange));
            inst.ts.setValue(vals, true);
        });
        recalcAll();
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
    var variantBar = document.getElementById('ho-variant');
    if (variantBar) variantBar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-variant]'); if (!btn) return;
        currentVariant = btn.dataset.variant;
        variantBar.querySelectorAll('[data-variant]').forEach(function (b) { b.classList.toggle('active', b === btn); });
        rebuildAll();
    });

    // Init Bootstrap tooltips for the calculators' info icons, if Bootstrap is present.
    if (window.bootstrap && window.bootstrap.Tooltip) {
        document.querySelectorAll('#hand-odds [data-bs-toggle="tooltip"]').forEach(function (e) { new window.bootstrap.Tooltip(e); });
    }

    recalcAll();
}());
