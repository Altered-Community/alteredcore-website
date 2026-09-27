/* Deckbuilder — panes.js
 * Stats, grid/list view, starting-hand pane (wizard state lives in hero-picker.js).
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    function renderStatsPane() {
        var pane = document.getElementById('db-deck-pane-stats');
        if (!pane) return;

        var keys = Object.keys(deck.cards);
        if (!keys.length) {
            pane.innerHTML = '<p style="font-size:.82rem;color:var(--neutral-400);padding:.5rem 0">' + escHtml(AlteredDB.txt.no_cards) + '</p>';
            return;
        }

        var costCurve   = {};
        var recallCurve = {};
        var typeTotals  = {};
        var powers      = {};
        Object.keys(AlteredDB.powers).forEach(function(pk) { powers[pk] = 0; });
        var powerCount  = 0;

        keys.forEach(function(ref) {
            var c      = deck.cards[ref];
            var main   = Math.min(c.mainCost   || 0, 7);
            var recall = Math.min(c.recallCost || 0, 7);
            costCurve[main]     = (costCurve[main]     || 0) + c.qty;
            recallCurve[recall] = (recallCurve[recall] || 0) + c.qty;
            typeTotals[c.type || 'OTHER'] = (typeTotals[c.type || 'OTHER'] || 0) + c.qty;
            Object.keys(AlteredDB.powers).forEach(function(pk) {
                powers[pk] += (c[pk + 'Power'] || 0) * c.qty;
            });
            powerCount += c.qty;
        });

        var avg = {};
        Object.keys(AlteredDB.powers).forEach(function(pk) {
            avg[pk] = powerCount > 0 ? Math.round(powers[pk] / powerCount * 10) / 10 : 0;
        });
        var maxCost   = Math.max.apply(null, Object.values(costCurve).concat([1]));
        var maxRecall = Math.max.apply(null, Object.values(recallCurve).concat([1]));
        var maxType   = Math.max.apply(null, Object.values(typeTotals).concat([1]));
        var maxPwr    = Math.max.apply(null, Object.values(avg).concat([1]));

        function vCurve(curve, maxQty, color) {
            var counts = '';
            var bars   = '';
            var labels = '';
            for (var i = 1; i <= 7; i++) {
                var qty = curve[i] || 0;
                var h   = maxQty > 0 ? Math.round(qty / maxQty * 100) : 0;
                var lbl = i < 7 ? String(i) : '7+';
                counts += '<span>' + (qty > 0 ? qty : '') + '</span>';
                bars   += '<div class="db-vcurve-bar" style="height:' + h + '%;background:' + color + '"></div>';
                labels += '<span>' + lbl + '</span>';
            }
            return '<div class="db-vcurve-counts">' + counts + '</div>'
                 + '<div class="db-vcurve-bars">'   + bars   + '</div>'
                 + '<div class="db-vcurve-labels">' + labels + '</div>';
        }

        function bar(label, val, max, color) {
            var pct = Math.round(val / max * 100);
            return '<div class="db-stat-bar-row">'
                + '<span class="db-stat-bar-lbl">' + escHtml(String(label)) + '</span>'
                + '<div class="db-stat-bar-track"><div class="db-stat-bar-fill" style="width:' + pct + '%;'
                + (color ? 'background:' + color : '') + '"></div></div>'
                + '<span class="db-stat-bar-val">' + val + '</span>'
                + '</div>';
        }

        var html = '<div class="db-stat-section-title">' + escHtml(AlteredDB.txt.stats_cost_main) + '</div>';
        html += vCurve(costCurve, maxCost, 'var(--primary-400)');
        html += '<div class="db-stat-section-title">' + escHtml(AlteredDB.txt.stats_cost_recall) + '</div>';
        html += vCurve(recallCurve, maxRecall, 'var(--secondary-400,#a78bfa)');

        html += '<div class="db-stat-section-title" style="margin-top:16px">' + escHtml(AlteredDB.txt.stats_types) + '</div>';
        TYPE_ORDER.forEach(function(t) {
            if (!typeTotals[t]) return;
            var lbl = (AlteredDB.txt.types || {})[t] || t;
            html += '<div class="db-stat-bar-row">'
                + '<span class="db-stat-bar-lbl" style="min-width:66px;text-align:left">' + escHtml(lbl) + '</span>'
                + '<div class="db-stat-bar-track"><div class="db-stat-bar-fill" style="width:' + Math.round(typeTotals[t] / maxType * 100) + '%"></div></div>'
                + '<span class="db-stat-bar-val">' + typeTotals[t] + '</span>'
                + '</div>';
        });

        html += '<div class="db-stat-section-title" style="margin-top:16px">' + escHtml(AlteredDB.txt.stats_powers) + '</div>';
        var B = AlteredDB.pluginAssetsUrl;
        Object.keys(AlteredDB.powers).forEach(function(pk) {
            var p = AlteredDB.powers[pk];
            html += '<div class="db-stat-bar-row">'
                + '<span class="db-stat-bar-lbl"><img src="' + B + '/biome/' + p.img + '" style="width:16px;height:16px;object-fit:contain" alt="' + pk + '"></span>'
                + '<div class="db-stat-bar-track"><div class="db-stat-bar-fill" style="width:' + Math.round(avg[pk] / maxPwr * 100) + '%;background:' + p.color + '"></div></div>'
                + '<span class="db-stat-bar-val">' + avg[pk] + '</span>'
                + '</div>';
        });

        pane.innerHTML = html;
    }

    // deck preview pane (grid / list view)
    var dbGridViewMode = 'grid';

    function renderGridPane() {
        var pane = document.getElementById('db-search-pane-view');
        if (!pane || pane.style.display === 'none') return;

        var content = document.getElementById('db-deckgrid-content');
        if (!content) return;

        var keys = Object.keys(deck.cards);
        if (!keys.length) {
            content.innerHTML = '<p style="font-size:.82rem;color:var(--neutral-400);padding:.5rem 0">' + escHtml(AlteredDB.txt.no_cards) + '</p>';
            return;
        }

        var grouped = {};
        TYPE_ORDER.forEach(function(t) { grouped[t] = []; });
        keys.forEach(function(ref) {
            var c = deck.cards[ref];
            var t = c.type || 'OTHER';
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push({
                ref: ref, qty: c.qty, name: c.name,
                faction: c.factionCode || null,
                rarity: c.rarity || rarityCode(ref),
                mainCost: c.mainCost || 0, recallCost: c.recallCost || 0,
                oceanPower: c.oceanPower || 0, mountainPower: c.mountainPower || 0, forestPower: c.forestPower || 0,
            });
        });

        var hasUnique = keys.some(function(ref) { var p = ref.split('_'); return p[5] && p[5][0] === 'U'; });
        if (hasUnique) ensureRenderer();

        var html = '';
        if (dbGridViewMode === 'grid') {
            TYPE_ORDER.forEach(function(type) {
                var group = grouped[type] || [];
                if (!group.length) return;
                group.sort(function(a, b) { return a.mainCost - b.mainCost; });
                var typeLabel = (AlteredDB.txt.types || {})[type] || type;
                var total = group.reduce(function(s, c) { return s + c.qty; }, 0);
                html += '<div class="db-deckgrid-type">' + escHtml(typeLabel) + ' (' + total + ')</div>';
                html += '<div class="deck-cards-grid">';
                group.forEach(function(c) {
                    var dName = typeof c.name === 'object' ? (c.name[AlteredDB.lang] || c.name.en || '') : (c.name || '');
                    var p = c.ref.split('_');
                    var cardImg = (p[5] && p[5][0] === 'U')
                        ? '<altered-card ref="' + escAttr(c.ref) + '" locale="' + escAttr(AlteredDB.uniqueLocale) + '" style="display:block;width:100%;border-radius:7px;overflow:hidden;aspect-ratio:63.5/88"></altered-card>'
                        : '<img src="' + cdnUrl(c.ref) + '" alt="' + escAttr(dName) + '" loading="lazy">';
                    html += '<div class="db-deckgrid-card" onclick="openDbCardModal(\'' + escAttr(c.ref) + '\')" title="' + escAttr(dName) + '">'
                        + cardImg
                        + (c.qty > 1 ? '<span class="db-deckgrid-qty">\xd7' + c.qty + '</span>' : '')
                        + '</div>';
                });
                html += '</div>';
            });
        } else {
            var B = AlteredDB.pluginAssetsUrl;
            TYPE_ORDER.forEach(function(type) {
                var group = grouped[type] || [];
                if (!group.length) return;
                group.sort(function(a, b) { return a.mainCost - b.mainCost; });
                var typeLabel = (AlteredDB.txt.types || {})[type] || type;
                var total = group.reduce(function(s, c) { return s + c.qty; }, 0);
                html += '<div class="db-deckgrid-type">' + escHtml(typeLabel) + ' (' + total + ')</div>';
                group.forEach(function(c) {
                    var dName = typeof c.name === 'object' ? (c.name[AlteredDB.lang] || c.name.en || '') : (c.name || '');
                    var rGem = {C:'C',R:'R',U:'U',E:'E'}[c.rarity] || 'C';
                    html += '<div class="db-decklist-row" onclick="openDbCardModal(\'' + escAttr(c.ref) + '\')">'
                        + '<span class="db-decklist-qty">' + c.qty + '</span>'
                        + (c.faction ? '<img src="' + B + '/faction/' + c.faction + '.png" alt="' + c.faction + '" class="deck-list-gem">' : '')
                        + '<img src="' + B + '/gems/' + rGem + '.png" alt="' + rGem + '" class="deck-list-gem">'
                        + '<span class="db-decklist-name" title="' + escAttr(dName) + '">' + escHtml(dName) + '</span>'
                        + '<span class="decklist-stats">'
                        + '<span class="decklist-stat"><i class="fak fa-altered-h" style="font-size:.8rem"></i>' + c.mainCost + '</span>'
                        + '<span class="decklist-stat"><i class="fak fa-altered-r" style="font-size:.8rem"></i>' + c.recallCost + '</span>'
                        + '<span class="decklist-stat"><img src="' + B + '/biome/F.webp" alt="F" style="width:11px;height:11px">' + c.forestPower + '</span>'
                        + '<span class="decklist-stat"><img src="' + B + '/biome/M.webp" alt="M" style="width:11px;height:11px">' + c.mountainPower + '</span>'
                        + '<span class="decklist-stat"><img src="' + B + '/biome/O.webp" alt="O" style="width:11px;height:11px">' + c.oceanPower + '</span>'
                        + '</span>'
                        + '</div>';
                });
            });
        }
        content.innerHTML = html;
    }

    // Starting-hand pane: rebuild the hand-odds globals from the live deck, then recompute.
    // (deck.cards holds no hero — heroes live on deck.hero — so the pool needs no filtering.)
    function renderHandPane() {
        ensureRenderer();   // the calculators' unique thumbnails use the <altered-card> web component
        var cards = [], groups = {};
        Object.keys(deck.cards).forEach(function(ref) {
            var c = deck.cards[ref], nm = cardName(c), uniq = isUnique(ref), img = cdnUrl(ref);
            cards.push({ ref: ref, name: nm, qty: c.qty, type: c.type, mainCost: c.mainCost, recallCost: c.recallCost, unique: uniq, img: img });
            // Uniques are distinct cards (own art + costs): key by ref; others group by name+rarity.
            var key = uniq ? ref : (nm + '|' + (c.rarity || ''));
            if (!groups[key]) groups[key] = { key: key, name: nm, rarity: c.rarity || '', type: c.type, mainCost: c.mainCost, recallCost: c.recallCost, qty: 0, unique: uniq, ref: ref, img: img };
            groups[key].qty += c.qty;
        });
        window.handDeckCards  = cards;
        window.handDeckGroups = Object.keys(groups).map(function(k) { return groups[k]; });
        window.handDeckSize   = cards.reduce(function(s, c) { return s + c.qty; }, 0);
        if (window.HandOdds) window.HandOdds.refresh();
    }
