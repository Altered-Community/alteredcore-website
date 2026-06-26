/*
 * CardSearchPlayset — the "Physical playset" tab (Profile G) for the Cards page.
 *
 * Split out of card-search.js so the playset feature lives behind a clear
 * boundary: its own state, DOM lookups, fetches and rendering. CardSearch
 * instantiates it (when the playset config is present) and only ever calls
 * .init() once and .load() when the tab is opened.
 *
 * ctx provides the small surface it shares with the host:
 *   cfg     — the CardSearch config (playsetApiUrl, playsetCardsApiUrl, playsetMeta, …)
 *   q       — id helper: q('playset-x') → document.getElementById(prefix + '-playset-x')
 *   uiLang  — UI language (en/fr) used for the API locale param
 *   debug   — console logging flag
 *   txt     — i18n strings (pagination labels)
 *   cdnUrl  — reference → card image URL (same source as the card grid)
 */
function CardSearchPlayset(ctx) {
    var cfg     = ctx.cfg || {};
    var q       = ctx.q;
    var UI_LANG = ctx.uiLang || 'en';
    var DEBUG   = ctx.debug === true;
    var txt     = ctx.txt || {};
    var cdnUrl  = ctx.cdnUrl || function () { return ''; };

    // Playset DOM elements (a non-grid tab).
    var elPlaysetLoading = q('playset-loading');
    var elPlaysetError   = q('playset-error');
    var elPlaysetDash    = q('playset-dash');
    var elPlaysetExplore     = q('playset-explore');
    var elPlaysetExploreMeta = q('playset-explore-meta');
    var elPlaysetExplorePag  = q('playset-explore-pag');
    var elPlaysetExploreLoading = q('playset-explore-loading');
    var elPlaysetSummaryLoading = q('playset-summary-loading');
    var _playsetLoaded      = false;
    var _playsetCardsLoaded = false;

    // ── Playset dashboard (Profile G — Player playset) ──────────────────────────
    // Fetches the physical-collection playset completion (faction × set quantity
    // buckets) and renders the dashboard KPIs + heatmap. Completion is copies-based,
    // capped at 3 per reference: owned = 1·n1 + 2·n2 + 3·n(3+), needed = 3 · totalRefs.
    // The rarity selector (COMMON/RARE/EXALTED) narrows the universe server-side.
    function loadPlayset() {           // lazy: first time the tab is opened
        if (cfg.playsetApiUrl && !_playsetLoaded) fetchPlayset();
        if (cfg.playsetCardsApiUrl && !_playsetCardsLoaded) {
            _playsetCardsLoaded = true;
            fetchPlaysetCards(1);
        }
    }
    function fetchPlayset() {          // (re)fetch with the current rarity selection
        if (!cfg.playsetApiUrl) return;
        _playsetLoaded = true;
        if (elPlaysetError)   elPlaysetError.style.display   = 'none';

        var rar = _psRarities || [];
        // No rarity selected → empty universe (don't query: an empty rarity list
        // would be omitted upstream and wrongly return everything).
        if (!rar.length) {
            if (elPlaysetLoading) elPlaysetLoading.style.display = 'none';
            renderPlayset({ byFaction: [], bySet: [], byFactionAndSet: [] });
            return;
        }

        if (elPlaysetLoading) elPlaysetLoading.style.display = '';
        if (elPlaysetDash)    elPlaysetDash.style.display    = 'none';

        var qs = 'locale=' + encodeURIComponent(UI_LANG);
        rar.forEach(function(r) { qs += '&rarity[]=' + encodeURIComponent(r); });

        fetch(cfg.playsetApiUrl + '?' + qs, { headers: { 'Accept': 'application/json' } })
            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function(data) {
                if (DEBUG) console.log('[CardSearch] playset response:', data);
                renderPlayset(data);
            })
            .catch(function(err) {
                _playsetLoaded = false; // allow a retry on the next tab switch
                if (elPlaysetLoading) elPlaysetLoading.style.display = 'none';
                if (elPlaysetError)   elPlaysetError.style.display   = '';
                if (cfg.onError) cfg.onError(err);
            });
    }

    // Rarity selector state — persisted in localStorage, default all selected.
    var _psRarities = null;
    var PS_RARITY_KEY = 'ac_playset_rarities';
    function psRarityButtons() {
        var wrap = q('playset-rarities');
        return wrap ? wrap.querySelectorAll('[data-rarity]') : [];
    }
    function syncPsRarityButtons() {
        Array.prototype.forEach.call(psRarityButtons(), function(b) {
            b.classList.toggle('active', _psRarities.indexOf(b.dataset.rarity) >= 0);
        });
    }
    function initPlaysetRarities() {
        var btns = psRarityButtons();
        if (!btns.length) return;
        var all = Array.prototype.map.call(btns, function(b) { return b.dataset.rarity; });
        var stored = null;
        try { stored = JSON.parse(localStorage.getItem(PS_RARITY_KEY)); } catch (e) {}
        if (!Array.isArray(stored)) stored = all.slice();          // default: all
        _psRarities = stored.filter(function(r) { return all.indexOf(r) >= 0; });
        syncPsRarityButtons();
        Array.prototype.forEach.call(btns, function(b) {
            b.addEventListener('click', function() {
                var r = b.dataset.rarity, i = _psRarities.indexOf(r);
                if (i >= 0) _psRarities.splice(i, 1); else _psRarities.push(r);
                try { localStorage.setItem(PS_RARITY_KEY, JSON.stringify(_psRarities)); } catch (e) {}
                syncPsRarityButtons();
                fetchPlayset();
            });
        });
    }

    // Exploration filters (set, faction) — default all selected. Clicking one
    // while all are selected narrows to just it; subsequent clicks add/remove;
    // emptying the selection resets it to all.
    function psToggleSelection(sel, all, code) {
        if (sel.length === all.length) return [code];        // all → narrow to this one
        var next = sel.slice(), i = next.indexOf(code);
        if (i >= 0) next.splice(i, 1); else next.push(code);
        return next.length ? next : all.slice();             // emptied → back to all
    }
    // Wire a [data-<attr>] button row into a selection that drives the exploration.
    // get()/set() read/write the backing state; allRef stores the full code list.
    function initPsFilterRow(wrapId, attr, get, set, allRef) {
        var wrap = q(wrapId);
        var btns = wrap ? wrap.querySelectorAll('[data-' + attr + ']') : [];
        if (!btns.length) return;
        allRef.all = Array.prototype.map.call(btns, function(b) { return b.dataset[attr]; });
        set(allRef.all.slice());   // default: all selected
        function sync() {
            var cur = get();
            Array.prototype.forEach.call(btns, function(b) { b.classList.toggle('active', cur.indexOf(b.dataset[attr]) >= 0); });
        }
        sync();
        Array.prototype.forEach.call(btns, function(b) {
            b.addEventListener('click', function() {
                set(psToggleSelection(get(), allRef.all, b.dataset[attr]));
                sync();
                fetchPlaysetCards(1);   // filter changed → back to page 1
            });
        });
    }
    var _psSets = { sel: null, all: [] };
    var _psFactions = { sel: null, all: [] };
    var _psExpRarities = { sel: null, all: [] };
    var _psName = '';
    function initPlaysetSets() {
        initPsFilterRow('playset-set-filter', 'set',
            function() { return _psSets.sel; }, function(v) { _psSets.sel = v; }, _psSets);
    }
    function initPlaysetFactions() {
        initPsFilterRow('playset-faction-filter', 'faction',
            function() { return _psFactions.sel; }, function(v) { _psFactions.sel = v; }, _psFactions);
    }
    function initPlaysetExploreRarities() {
        initPsFilterRow('playset-explore-rarities', 'rarity',
            function() { return _psExpRarities.sel; }, function(v) { _psExpRarities.sel = v; }, _psExpRarities);
    }
    // Name search — debounced; resets to page 1.
    function initPlaysetName() {
        var inp = q('playset-name');
        if (!inp) return;
        var timer = null;
        inp.addEventListener('input', function() {
            _psName = inp.value.trim();
            clearTimeout(timer);
            timer = setTimeout(function() { fetchPlaysetCards(1); }, 300);
        });
    }
    // Number-of-copies filter — plain multi-select (no narrow logic), default
    // all 4 buckets, persisted in localStorage. Empty selection = no filter (all).
    var _psCopies = null;
    var PS_COPIES_KEY = 'ac_playset_copies';
    function psCopiesButtons() {
        var wrap = q('playset-copies-filter');
        return wrap ? wrap.querySelectorAll('[data-copies]') : [];
    }
    function syncPsCopiesButtons() {
        Array.prototype.forEach.call(psCopiesButtons(), function(b) {
            b.classList.toggle('active', _psCopies.indexOf(b.dataset.copies) >= 0);
        });
    }
    function initPlaysetCopies() {
        var btns = psCopiesButtons();
        if (!btns.length) return;
        var all = Array.prototype.map.call(btns, function(b) { return b.dataset.copies; });
        var stored = null;
        try { stored = JSON.parse(localStorage.getItem(PS_COPIES_KEY)); } catch (e) {}
        if (!Array.isArray(stored)) stored = ['0', '1-2', '3', '4plus'];   // default: all
        _psCopies = stored.filter(function(c) { return all.indexOf(c) >= 0; });
        syncPsCopiesButtons();
        Array.prototype.forEach.call(btns, function(b) {
            b.addEventListener('click', function() {
                var c = b.dataset.copies, i = _psCopies.indexOf(c);
                if (i >= 0) _psCopies.splice(i, 1); else _psCopies.push(c);
                try { localStorage.setItem(PS_COPIES_KEY, JSON.stringify(_psCopies)); } catch (e) {}
                syncPsCopiesButtons();
                fetchPlaysetCards(1);
            });
        });
    }

    // Exploration layout switcher (card density) — toggles a class on the grid,
    // persisted in localStorage. Default 2 per row (no extra class = base 2-col).
    var PS_LAYOUT_KEY = 'ac_playset_layout';
    var PS_LAYOUTS = ['cols-list', 'cols-2', 'cols-3', 'cols-visual'];
    function applyPsLayout(layout) {
        if (!elPlaysetExplore) return;
        PS_LAYOUTS.forEach(function(l) { elPlaysetExplore.classList.remove(l); });
        if (layout && layout !== 'cols-2') elPlaysetExplore.classList.add(layout);
    }
    function initPlaysetLayout() {
        var wrap = q('playset-layout');
        var btns = wrap ? wrap.querySelectorAll('[data-layout]') : [];
        if (!btns.length) return;
        var stored = null;
        try { stored = localStorage.getItem(PS_LAYOUT_KEY); } catch (e) {}
        if (PS_LAYOUTS.indexOf(stored) < 0) stored = 'cols-2';   // default
        applyPsLayout(stored);
        Array.prototype.forEach.call(btns, function(b) {
            b.classList.toggle('active', b.dataset.layout === stored);
            b.addEventListener('click', function() {
                var layout = b.dataset.layout;
                applyPsLayout(layout);
                Array.prototype.forEach.call(btns, function(o) { o.classList.toggle('active', o === b); });
                try { localStorage.setItem(PS_LAYOUT_KEY, layout); } catch (e) {}
            });
        });
    }

    function renderPlayset(data) {
        // Sum the quantity buckets across the whole playset universe.
        var rows = (data && data.byFaction) || [];
        var n0 = 0, n1 = 0, n2 = 0, n3 = 0;
        rows.forEach(function(row) {
            var qb = (row && row.quantities) || {};
            n0 += qb['0'] || 0; n1 += qb['1'] || 0; n2 += qb['2'] || 0; n3 += qb['3+'] || 0;
        });
        var total = n0 + n1 + n2 + n3;

        // ── Overall completion (copies-based, capped at 3 per reference) ──
        var ownedCapped = n1 + 2 * n2 + 3 * n3;
        var needed      = 3 * total;
        var pct         = needed > 0 ? Math.round((ownedCapped / needed) * 100) : 0;

        var pctEl = q('playset-pct');
        if (pctEl) pctEl.textContent = pct;
        var copiesEl = q('playset-copies');
        if (copiesEl) {
            var word = copiesEl.getAttribute('data-copies-label') || '';
            copiesEl.textContent = ownedCapped.toLocaleString() + ' / ' + needed.toLocaleString() + ' ' + word;
        }

        // ── Card distribution (by line: complete 3/3 · in progress 1–2/3 · missing 0/3) ──
        var dist = { complete: n3, progress: n1 + n2, missing: n0 };
        ['complete', 'progress', 'missing'].forEach(function(key) {
            var seg = q('seg-' + key);
            if (!seg) return;
            var val = dist[key];
            seg.style.flexGrow = val;                 // proportional width
            seg.style.display  = val > 0 ? '' : 'none';
            seg.textContent    = val > 0 ? val.toLocaleString() : '';
        });

        // ── Metric KPIs ──
        var cardsToComplete = n0 + n1 + n2;           // references below 3/3
        var copiesToAcquire = 3 * n0 + 2 * n1 + n2;   // = needed - ownedCapped
        function setMetric(id, val) { var el = q(id); if (el) el.textContent = val.toLocaleString(); }
        setMetric('playset-owned',      ownedCapped);
        setMetric('playset-tocomplete', cardsToComplete);
        setMetric('playset-toacquire',  copiesToAcquire);

        // ── Heatmap (faction × set) ──
        renderPlaysetHeatmap(data);

        if (elPlaysetLoading) elPlaysetLoading.style.display = 'none';
        if (elPlaysetError)   elPlaysetError.style.display   = 'none';
        if (elPlaysetDash)    elPlaysetDash.style.display    = '';
    }

    // Custom heatmap hover popover — three lines (set · faction · count) shown
    // above the cell. position:fixed → relative to the viewport, so the scroll
    // container never clips it and it causes no layout reflow.
    var _hmTip = null;
    function hmTipEl() {
        if (!_hmTip) {
            _hmTip = document.createElement('div');
            _hmTip.className = 'cs-ps-hm-tip';
            _hmTip.style.display = 'none';
            document.body.appendChild(_hmTip);
        }
        return _hmTip;
    }
    function showHmTip(cell) {
        if (!cell.dataset.count) return;
        var tip = hmTipEl();
        tip.innerHTML = '';
        // A line is an icon (font <i> for sets, <img> for factions) + label text.
        function line(cls, txt, iconClass, iconImg) {
            var d = document.createElement('div'); d.className = cls;
            if (iconClass) { var i = document.createElement('i'); i.className = 'cs-ps-tip-icon ' + iconClass; d.appendChild(i); }
            else if (iconImg) { var im = document.createElement('img'); im.className = 'cs-ps-tip-icon'; im.src = iconImg; im.alt = ''; d.appendChild(im); }
            d.appendChild(document.createTextNode(txt));
            tip.appendChild(d);
        }
        line('cs-ps-tip-set',      cell.dataset.set || '',      cell.dataset.setIcon || '', '');
        line('cs-ps-tip-faction',  cell.dataset.faction || '',  '', cell.dataset.factionIcon || '');
        line('cs-ps-tip-count',    cell.dataset.count || '');
        if (cell.dataset.complete) line('cs-ps-tip-count', cell.dataset.complete + ' ' + (cell.dataset.completeLabel || 'Complete'));
        tip.style.display = 'block';
        var r = cell.getBoundingClientRect(), t = tip.getBoundingClientRect();
        var left = r.left + r.width / 2 - t.width / 2;
        left = Math.max(6, Math.min(left, window.innerWidth - t.width - 6));
        var top = r.top - t.height - 8;
        if (top < 6) top = r.bottom + 8; // flip below the cell when there's no room above
        tip.style.left = left + 'px';
        tip.style.top  = top + 'px';
    }
    function hideHmTip() { if (_hmTip) _hmTip.style.display = 'none'; }

    // Cross-highlight overlays: two blue rectangles (one row, one column) layered
    // over the table — no per-cell borders. Lazily created inside the scroll wrap.
    var _hmCol = null, _hmRow = null;
    function hmRects(wrap) {
        if (!_hmCol) {
            _hmCol = document.createElement('div'); _hmCol.className = 'cs-ps-hm-cross';
            _hmRow = document.createElement('div'); _hmRow.className = 'cs-ps-hm-cross';
            wrap.appendChild(_hmCol); wrap.appendChild(_hmRow);
        }
        return [_hmCol, _hmRow];
    }
    function hideHmCross() { if (_hmCol) { _hmCol.style.display = 'none'; _hmRow.style.display = 'none'; } }

    // Build the faction × set completion table. Each cell is copies-based and
    // capped at 3/reference (owned/needed), with an absolute 0–100% heatmap
    // background. Margins (right column, bottom row, grand total) aggregate the
    // same buckets so they always reconcile with the KPIs.
    function renderPlaysetHeatmap(data) {
        var table = q('heatmap');
        if (!table) return;
        var meta         = cfg.playsetMeta || {};
        var metaFactions = meta.factions || [];
        var metaSets     = meta.sets || [];
        var fbs          = (data && data.byFactionAndSet) || [];

        // Aggregate buckets into grid[faction][set] = {owned, needed, complete}.
        var grid = {}, present = {};
        fbs.forEach(function(r) {
            var qb = r.quantities || {};
            var n0 = qb['0'] || 0, n1 = qb['1'] || 0, n2 = qb['2'] || 0, n3 = qb['3+'] || 0;
            if (!grid[r.faction]) grid[r.faction] = {};
            grid[r.faction][r.cardSet] = { owned: n1 + 2 * n2 + 3 * n3, needed: 3 * (n0 + n1 + n2 + n3), complete: n3 };
            present[r.cardSet] = true;
        });

        // Columns: meta order (recent-first), kept only if present; unknown sets appended.
        var cols = metaSets.filter(function(s) { return present[s.code]; });
        var known = {}; cols.forEach(function(c) { known[c.code] = true; });
        Object.keys(present).forEach(function(code) { if (!known[code]) cols.push({ code: code, name: code }); });
        // Rows: meta faction order, kept only if present (fallback to all).
        var rows = metaFactions.filter(function(f) { return grid[f.code]; });
        if (!rows.length) rows = metaFactions;

        var factionLabel   = table.getAttribute('data-faction-label')     || 'Faction';
        var totalLabel     = table.getAttribute('data-total-label')       || 'Total';
        var copiesLabel    = table.getAttribute('data-copies-label')      || '';
        var allSetsLabel   = table.getAttribute('data-allsets-label')     || totalLabel;
        var allFacLabel    = table.getAttribute('data-allfactions-label') || totalLabel;
        var completeLabel  = table.getAttribute('data-complete-label')    || 'Complete';

        function dataCell(owned, needed, complete, cls, setLabel, factionLabel, setIcon, factionIcon) {
            var td = document.createElement('td');
            td.className = 'cs-ps-hm ' + cls;
            if (!needed) { td.classList.add('empty'); td.textContent = '–'; return td; }
            var pct = Math.round(owned / needed * 100);
            // Three-stop heatmap: light gray (0%) → orange (50%) → green (100%).
            var p = pct / 100;
            var gray   = [45, 10, 95];   // light warm gray
            var orange = [32, 60, 72];
            var green  = [135, 38, 66];
            var from, to, t;
            if (p < 0.5) { from = gray;   to = orange; t = p / 0.5; }
            else         { from = orange; to = green;  t = (p - 0.5) / 0.5; }
            var h = from[0] + (to[0] - from[0]) * t;
            var s = from[1] + (to[1] - from[1]) * t;
            var l = from[2] + (to[2] - from[2]) * t;
            td.style.background = 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
            // Cell shows the percentage only; the hover popover carries the detail
            // (set · faction · count), positioned over the cell with no reflow.
            td.dataset.set        = setLabel || '';
            td.dataset.faction    = factionLabel || '';
            td.dataset.count      = owned.toLocaleString() + ' / ' + needed.toLocaleString() + (copiesLabel ? ' ' + copiesLabel : '');
            if (complete != null) { td.dataset.complete = complete.toLocaleString(); td.dataset.completeLabel = completeLabel; }
            if (setIcon)     td.dataset.setIcon     = setIcon;
            if (factionIcon) td.dataset.factionIcon = factionIcon;
            td.addEventListener('mouseenter', function() { showHmTip(td); highlightCross(td, true); });
            td.addEventListener('mouseleave', function() { hideHmTip(); highlightCross(td, false); });
            var p = document.createElement('span'); p.className = 'cs-ps-hm-pct';
            p.textContent = pct + '%';
            td.appendChild(p);
            return td;
        }
        function th(cls, text, scope) { var e = document.createElement('th'); if (cls) e.className = cls; if (text != null) e.textContent = text; if (scope) e.setAttribute('scope', scope); return e; }
        // Cross-highlight: position the two overlay rectangles over the hovered
        // cell's full column and full row.
        function highlightCross(td, on) {
            var wrap = table.parentNode;
            var r = hmRects(wrap);
            if (!on) { hideHmCross(); return; }
            var wr = wrap.getBoundingClientRect(), tb = table.getBoundingClientRect();
            var cr = td.getBoundingClientRect(), rr = td.parentNode.getBoundingClientRect();
            var ox = -wr.left - wrap.clientLeft + wrap.scrollLeft;
            var oy = -wr.top  - wrap.clientTop  + wrap.scrollTop;
            var col = r[0], row = r[1];
            col.style.display = 'block';
            col.style.left = (cr.left + ox) + 'px'; col.style.top = (tb.top + oy) + 'px';
            col.style.width = cr.width + 'px';       col.style.height = tb.height + 'px';
            row.style.display = 'block';
            row.style.left = (tb.left + ox) + 'px'; row.style.top = (rr.top + oy) + 'px';
            row.style.width = tb.width + 'px';       row.style.height = rr.height + 'px';
        }
        // Rich set-column header: set background image + kit icon + name (mirrors
        // the set quick-filter buttons in the "All cards" tab).
        function setHeaderTh(s) {
            var el = document.createElement('th');
            el.className = 'cs-ps-hm-setcol';
            el.setAttribute('scope', 'col');
            var chip = document.createElement('div');
            chip.className = 'cs-ps-setchip';
            if (s.code && meta.setBg) chip.style.backgroundImage = "url('" + meta.setBg + s.code + ".webp')";
            var inner = document.createElement('span'); inner.className = 'cs-ps-setchip-inner';
            if (s.icon) { var ic = document.createElement('i'); ic.className = s.icon; inner.appendChild(ic); }
            var nm = document.createElement('span'); nm.className = 'cs-ps-setchip-name'; nm.textContent = s.name;
            inner.appendChild(nm);
            chip.appendChild(inner);
            // Optional explanatory note (e.g. CORE merging the Kickstarter edition).
            if (s.note) {
                var nb = document.createElement('span'); nb.className = 'cs-ps-setchip-note';
                nb.textContent = '?'; nb.title = s.note;
                chip.appendChild(nb);
            }
            el.appendChild(chip);
            return el;
        }

        table.innerHTML = '';

        // Header row — Faction · Total · then each set
        var thead = document.createElement('thead'), htr = document.createElement('tr');
        htr.appendChild(th('cs-ps-hm-corner', factionLabel, 'col'));
        htr.appendChild(th('cs-ps-hm-th-total', totalLabel, 'col'));
        cols.forEach(function(c) { htr.appendChild(setHeaderTh(c)); });
        thead.appendChild(htr); table.appendChild(thead);

        // Body rows (one per faction) + accumulate column / grand totals
        var tbody = document.createElement('tbody'), colTot = {}, grandO = 0, grandN = 0, grandC = 0;
        cols.forEach(function(c) { colTot[c.code] = { owned: 0, needed: 0, complete: 0 }; });
        rows.forEach(function(f) {
            var tr = document.createElement('tr');
            var facIcon = meta.factionIcon ? meta.factionIcon + f.code + '.png' : '';
            var rowHead = th('cs-ps-hm-rowhead', null, 'row');
            if (facIcon) { var fih = document.createElement('img'); fih.className = 'cs-ps-hm-ficon'; fih.src = facIcon; fih.alt = ''; rowHead.appendChild(fih); }
            rowHead.appendChild(document.createTextNode(f.name));
            tr.appendChild(rowHead);
            // Tally the row first so the leading Total cell can be filled.
            var rowO = 0, rowN = 0, rowC = 0, setCells = [];
            cols.forEach(function(c) {
                var cell = (grid[f.code] || {})[c.code] || { owned: 0, needed: 0, complete: 0 };
                setCells.push(dataCell(cell.owned, cell.needed, cell.complete, 'cs-ps-hm-cell', c.name, f.name, c.icon, facIcon));
                rowO += cell.owned; rowN += cell.needed; rowC += cell.complete || 0;
                colTot[c.code].owned += cell.owned; colTot[c.code].needed += cell.needed; colTot[c.code].complete += cell.complete || 0;
            });
            tr.appendChild(dataCell(rowO, rowN, rowC, 'cs-ps-hm-rowtot', allSetsLabel, f.name, '', facIcon));   // Total column first
            setCells.forEach(function(td) { tr.appendChild(td); });
            grandO += rowO; grandN += rowN; grandC += rowC;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        // Footer — Total label · grand total · then per-set totals
        var tfoot = document.createElement('tfoot'), ftr = document.createElement('tr');
        ftr.className = 'cs-ps-hm-foot';
        ftr.appendChild(th('cs-ps-hm-rowhead', totalLabel, 'row'));
        ftr.appendChild(dataCell(grandO, grandN, grandC, 'cs-ps-hm-grand', allSetsLabel, allFacLabel));
        cols.forEach(function(c) { ftr.appendChild(dataCell(colTot[c.code].owned, colTot[c.code].needed, colTot[c.code].complete, 'cs-ps-hm-coltot', c.name, allFacLabel, c.icon, '')); });
        tfoot.appendChild(ftr); table.appendChild(tfoot);
    }

    // ── Playset exploration (Zone 3 — shopping list, card by card) ──────────────
    var PS_PER_PAGE = 30;
    function fetchPlaysetCards(page) {
        if (!cfg.playsetCardsApiUrl || !elPlaysetExplore) return;
        page = page || 1;
        elPlaysetExplore.classList.add('is-loading');
        if (elPlaysetExploreLoading) elPlaysetExploreLoading.style.display = '';
        if (elPlaysetSummaryLoading) elPlaysetSummaryLoading.style.display = '';
        var qs = 'locale=' + encodeURIComponent(UI_LANG) + '&page=' + page + '&itemsPerPage=' + PS_PER_PAGE;
        // Set / faction filters: send params only for a strict subset (all selected = no filter).
        if (_psSets.sel && _psSets.sel.length && _psSets.sel.length < _psSets.all.length) {
            _psSets.sel.forEach(function(s) { qs += '&cardSet[]=' + encodeURIComponent(s); });
        }
        if (_psFactions.sel && _psFactions.sel.length && _psFactions.sel.length < _psFactions.all.length) {
            _psFactions.sel.forEach(function(f) { qs += '&faction[]=' + encodeURIComponent(f); });
        }
        if (_psExpRarities.sel && _psExpRarities.sel.length && _psExpRarities.sel.length < _psExpRarities.all.length) {
            _psExpRarities.sel.forEach(function(r) { qs += '&rarity[]=' + encodeURIComponent(r); });
        }
        if (_psName) qs += '&name=' + encodeURIComponent(_psName);
        // Copies buckets (card-level): send each selected; empty = no filter (all).
        if (_psCopies && _psCopies.length) {
            _psCopies.forEach(function(c) { qs += '&copies[]=' + encodeURIComponent(c); });
        }
        fetch(cfg.playsetCardsApiUrl + '?' + qs, { headers: { 'Accept': 'application/json' } })
            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function(d) { if (DEBUG) console.log('[CardSearch] playset cards:', d); renderPlaysetCards(d); })
            .catch(function(err) {
                // Allow a retry on the next tab open (loadPlayset gates on this flag).
                _playsetCardsLoaded = false;
                elPlaysetExplore.classList.remove('is-loading');
                if (elPlaysetExploreLoading) elPlaysetExploreLoading.style.display = 'none';
                if (elPlaysetSummaryLoading) elPlaysetSummaryLoading.style.display = 'none';
                if (elPlaysetExploreMeta) elPlaysetExploreMeta.textContent = '';
                elPlaysetExplore.innerHTML = '<div class="ac-state-pane"><i class="fa-solid fa-triangle-exclamation ac-state-icon" style="opacity:1;color:#f87171"></i></div>';
                if (cfg.onError) cfg.onError(err);
            });
    }

    // Lookups from meta (faction name/color, rarity name/gem).
    function _psFactionMeta(code) {
        var fs = (cfg.playsetMeta || {}).factions || [];
        for (var i = 0; i < fs.length; i++) if (fs[i].code === code) return fs[i];
        return { code: code, name: code, color: '#888' };
    }
    function _psRarityMeta(code) {
        var rs = (cfg.playsetMeta || {}).rarities || {};
        return rs[code] || { name: code, gem: code.charAt(0) };
    }

    function renderPlaysetCards(d) {
        if (!elPlaysetExplore) return;
        elPlaysetExplore.classList.remove('is-loading');
        if (elPlaysetExploreLoading) elPlaysetExploreLoading.style.display = 'none';
        if (elPlaysetSummaryLoading) elPlaysetSummaryLoading.style.display = 'none';
        var items   = (d && d.items) || [];
        var page    = (d && d.page) || 1;
        var total   = (d && d.totalItems) || 0;
        var pages   = (d && d.totalPages) || 1;
        var cardsLbl = elPlaysetExplore.getAttribute('data-cards-label') || 'cards';

        if (elPlaysetExploreMeta) {
            elPlaysetExploreMeta.textContent = total.toLocaleString() + ' ' + cardsLbl +
                (pages > 1 ? '  ·  ' + page + ' / ' + pages : '');
        }
        elPlaysetExplore.innerHTML = '';
        items.forEach(function(card) { elPlaysetExplore.appendChild(renderExploreCard(card)); });
        renderExplorePagination(page, pages);
        renderPlaysetSummary(d && d.summary);
    }

    // Summary panel — totals + donut of owned-version buckets (reflects filters).
    function renderPlaysetSummary(summary) {
        var panel = q('playset-summary');
        if (!panel) return;
        if (!summary || !summary.ownedBuckets) { panel.style.visibility = 'hidden'; return; }
        panel.style.visibility = '';
        var ownedEl = q('playset-sum-owned');    if (ownedEl) ownedEl.textContent = (summary.totalOwned || 0).toLocaleString();
        var verEl   = q('playset-sum-versions'); if (verEl)   verEl.textContent   = (summary.totalVersions || 0).toLocaleString();

        var b = summary.ownedBuckets;
        var segs = [
            { label: '0',                                color: 'var(--ps-missing)',  val: b['0'] || 0 },
            { label: panel.getAttribute('data-lbl-12') || '1-2',   color: 'var(--ps-progress)', val: b['1-2'] || 0 },
            { label: '3',                                color: 'var(--ps-complete)', val: b['3'] || 0 },
            { label: panel.getAttribute('data-lbl-4plus') || '4+', color: 'var(--ps-extra)',    val: b['4plus'] || 0 }
        ];
        var total = segs.reduce(function(s, x) { return s + x.val; }, 0);

        // Donut (SVG, stroke-dasharray on a circumference-100 circle).
        var donut = q('playset-donut');
        if (donut) {
            var svg = '<svg viewBox="0 0 42 42" class="cs-ps-donut-svg">' +
                '<circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--neutral-200)" stroke-width="5"></circle>';
            var acc = 0;
            if (total > 0) segs.forEach(function(s) {
                if (!s.val) return;
                var pct = s.val / total * 100;
                svg += '<circle cx="21" cy="21" r="15.915" fill="none" stroke="' + s.color +
                    '" stroke-width="5" stroke-dasharray="' + pct.toFixed(2) + ' ' + (100 - pct).toFixed(2) +
                    '" stroke-dashoffset="' + (25 - acc).toFixed(2) + '"></circle>';
                acc += pct;
            });
            svg += '</svg>';
            donut.innerHTML = svg;

            // The chart encodes its buckets by color only, so give screen readers
            // a text equivalent: chart title + per-bucket count and share.
            var titleEl = panel.querySelector('.cs-ps-chart-title');
            var donutTitle = titleEl ? titleEl.textContent.trim() : '';
            var parts = segs.filter(function(s) { return s.val; }).map(function(s) {
                return s.label + ': ' + s.val.toLocaleString() +
                    ' (' + (total > 0 ? Math.round(s.val / total * 100) : 0) + '%)';
            });
            var label = (donutTitle ? donutTitle + ' — ' : '') + (parts.length ? parts.join(', ') : '0');
            var svgEl = donut.querySelector('svg');
            if (svgEl) {
                svgEl.setAttribute('role', 'img');
                svgEl.setAttribute('aria-label', label);
                var titleNode = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                titleNode.textContent = label;
                svgEl.insertBefore(titleNode, svgEl.firstChild);
            }
        }

        // Legend (colored dot + bucket label + count).
        var legend = q('playset-donut-legend');
        if (legend) {
            legend.innerHTML = '';
            segs.forEach(function(s) {
                var row = document.createElement('div'); row.className = 'cs-ps-leg-row';
                var dot = document.createElement('span'); dot.className = 'cs-ps-leg-dot'; dot.style.background = s.color;
                var lab = document.createElement('span'); lab.className = 'cs-ps-leg-lab'; lab.textContent = s.label;
                var val = document.createElement('span'); val.className = 'cs-ps-leg-val'; val.textContent = s.val.toLocaleString();
                var pct = document.createElement('span'); pct.className = 'cs-ps-leg-pct';
                pct.textContent = (total > 0 ? Math.round(s.val / total * 100) : 0) + '%';
                row.appendChild(dot); row.appendChild(lab); row.appendChild(val); row.appendChild(pct);
                legend.appendChild(row);
            });
        }
    }

    function renderExploreCard(card) {
        var versions  = card.versions || [];

        var row = document.createElement('div'); row.className = 'cs-ps-card';

        // Mini visual — default to the Common art (else first version); swaps on version hover.
        var def = null;
        for (var i = 0; i < versions.length; i++) { if (versions[i].rarity === 'COMMON') { def = versions[i]; break; } }
        if (!def) def = versions[0] || {};
        var mini = document.createElement('div'); mini.className = 'cs-ps-card-mini';
        var img = document.createElement('img'); img.loading = 'lazy'; img.alt = card.name || '';
        // Use the site's CDN (reference → .webp), same source as the card grid,
        // rather than the API's imagePath (which points at a dev S3 bucket).
        var defImg = def.reference ? cdnUrl(def.reference) : '';
        if (defImg) img.src = defImg;
        img.onerror = function() { this.style.display = 'none'; };
        mini.appendChild(img);
        row.appendChild(mini);

        var info = document.createElement('div'); info.className = 'cs-ps-card-info';

        // Header: name with inline type · set tags (set icon, no faction here) + a capped X/Y summary.
        var head = document.createElement('div'); head.className = 'cs-ps-card-head';
        var headL = document.createElement('div'); headL.className = 'cs-ps-card-titlewrap';
        var title = document.createElement('span'); title.className = 'cs-ps-card-title'; title.textContent = card.name || '';
        headL.appendChild(title);
        var meta = document.createElement('span'); meta.className = 'cs-ps-card-meta';
        var typeName = ((cfg.playsetMeta || {}).types || {})[card.cardType] || card.cardType || '';
        meta.appendChild(_tag([document.createTextNode(typeName)]));
        var sm = setMeta(card.cardSet);
        var setTag = [];
        if (sm.icon) { var si = document.createElement('i'); si.className = 'cs-ps-card-seticon ' + sm.icon; setTag.push(si); }
        setTag.push(document.createTextNode(sm.name));
        meta.appendChild(_tag(setTag));
        headL.appendChild(meta);
        head.appendChild(headL);

        var capped = 0, needed = 3 * versions.length;
        versions.forEach(function(v) { capped += Math.min(v.owned || 0, 3); });
        var summary = document.createElement('div'); summary.className = 'cs-ps-card-summary';
        var sv = document.createElement('div'); sv.className = 'cs-ps-card-summary-val';
        sv.textContent = capped + '/' + needed;
        summary.appendChild(sv);
        head.appendChild(summary);
        info.appendChild(head);

        // Version sub-rows
        var vwrap = document.createElement('div'); vwrap.className = 'cs-ps-versions';
        versions.forEach(function(v) {
            var rm = _psRarityMeta(v.rarity);
            var fmv = _psFactionMeta(v.faction);
            var vr = document.createElement('div'); vr.className = 'cs-ps-version';

            var label = document.createElement('span'); label.className = 'cs-ps-version-label';
            if ((cfg.playsetMeta || {}).gemBase && rm.gem) {
                var gem = document.createElement('img'); gem.className = 'cs-ps-gem';
                gem.src = cfg.playsetMeta.gemBase + rm.gem + '.png'; gem.alt = '';
                label.appendChild(gem);
            }
            var rar = document.createElement('span'); rar.className = 'cs-ps-version-rarity'; rar.textContent = rm.name;
            label.appendChild(rar);
            var fac = document.createElement('span'); fac.className = 'cs-ps-version-faction';
            if ((cfg.playsetMeta || {}).factionIcon && v.faction) {
                var ficon = document.createElement('img'); ficon.className = 'cs-ps-version-ficon';
                ficon.src = cfg.playsetMeta.factionIcon + v.faction + '.png'; ficon.alt = '';
                fac.appendChild(ficon);
            }
            var fname = document.createElement('span'); fname.className = 'cs-ps-version-fname';
            fname.textContent = fmv.name;
            fac.appendChild(fname);
            label.appendChild(fac);
            vr.appendChild(label);

            var owned = v.owned || 0;
            var bar = document.createElement('div'); bar.className = 'cs-ps-bar';
            var fill = document.createElement('div');
            fill.className = 'cs-ps-bar-fill p' + (owned >= 4 ? 4 : owned);
            bar.appendChild(fill);
            vr.appendChild(bar);

            var frac = document.createElement('span');
            // NB: avoid the bare class name "progress" — it collides with Bootstrap's
            // .progress component (pale rounded background bleeds onto the X/3 text).
            frac.className = 'cs-ps-frac ' + (owned === 0 ? 'zero' : owned >= 4 ? 'extra' : owned >= 3 ? 'full' : 'partial');
            frac.textContent = owned + '/3';
            vr.appendChild(frac);

            // Hover a version → mini shows that version's art.
            if (v.reference) {
                var vImg = cdnUrl(v.reference);
                vr.addEventListener('mouseenter', function() { img.style.display = ''; img.src = vImg; });
                vr.addEventListener('mouseleave', function() { if (defImg) { img.style.display = ''; img.src = defImg; } });
            }
            vwrap.appendChild(vr);
        });
        info.appendChild(vwrap);
        row.appendChild(info);
        return row;
    }

    function _tag(children) {
        var s = document.createElement('span'); s.className = 'cs-ps-card-tag';
        children.forEach(function(c) { s.appendChild(c); });
        return s;
    }
    function setMeta(code) {
        var sets = (cfg.playsetMeta || {}).sets || [];
        for (var i = 0; i < sets.length; i++) if (sets[i].code === code) return sets[i];
        return { name: code || '', icon: '' };
    }

    function renderExplorePagination(page, pages) {
        if (!elPlaysetExplorePag) return;
        elPlaysetExplorePag.innerHTML = '';
        if (pages <= 1) return;
        function btn(label, target, disabled) {
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'btn btn-sm btn-outline-secondary'; b.textContent = label;
            b.disabled = !!disabled;
            if (!disabled) b.addEventListener('click', function() {
                fetchPlaysetCards(target);
                if (elPlaysetExplore && elPlaysetExplore.scrollIntoView) elPlaysetExplore.scrollIntoView({ block: 'start' });
            });
            return b;
        }
        elPlaysetExplorePag.appendChild(btn(txt.prev || '← Prev', page - 1, page <= 1));
        var info = document.createElement('span'); info.className = 'cs-ps-pag-info';
        info.textContent = page + ' / ' + pages;
        elPlaysetExplorePag.appendChild(info);
        elPlaysetExplorePag.appendChild(btn(txt.next || 'Next →', page + 1, page >= pages));
    }

    // Wire up all the playset controls. Rarities first, because a tab restore
    // from the URL may immediately trigger load().
    function init() {
        initPlaysetRarities();
        initPlaysetSets();
        initPlaysetFactions();
        initPlaysetExploreRarities();
        initPlaysetName();
        initPlaysetCopies();
        initPlaysetLayout();
    }

    return { init: init, load: loadPlayset };
}
