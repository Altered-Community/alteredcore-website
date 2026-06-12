// card-search.js — direct browser→API card search engine
// Usage: var cs = CardSearch(config);
var CARD_SEARCH_DEBUG = false;
//
// config.apiBase:       'https://cards.alteredcore.org'
// config.lang:          'en' | 'fr'
// config.prefix:        DOM ID prefix  ('cs' for cards page, 'db' for deckbuilder)
// config.mode:          'cards' | 'deck'
// config.cdnUrl:        CDN base URL for card images
// config.rendererSrc:   URL to altered-card-renderer (lazy-loaded for UNIQUE cards)
// config.defaults:      { types[], rarities[], sets[], variations[], sort1, sort2, perPage, cols }
// config.initial:       { q, faction[], type[], typeExplicit, rarity[], rarityExplicit,
//                         sets[], subtypes[], keywords[], variations[],
//                         mainCost, recallCost, forest, mountain, ocean,
//                         isBanned, isErrated, isSuspended, sort }
// config.autoSearch:    bool — call search(1) on init (when URL has filters)
// config.pushState:     bool — enable History API URL sync (cards mode)
// config.cardDetailUrl: base URL for card detail page (e.g. '/pages/card')
// config.closeFiltersOnSearch: bool
// config.txt:           { prev, next, err_api, api_later, no_results, showing, detail_label, loading }
// config.tsOptions:     { setOptions[], subtypeOptions[], keywordOptions[], variationOptions[],
//                         initialSets[], initialSubtypes[], initialKeywords[], initialVariations[],
//                         initialMainCosts[], initialRecallCosts[], initialForestPowers[],
//                         initialMountainPowers[], initialOceanPowers[], defaultCollection }
// config.renderDeckCard:  function(card) → HTMLElement  [deck mode]
// config.onSearchStart:   function()
// config.onCardsRendered: function(cards[])
// config.onEmpty:         function()
// config.onError:         function(err)
// config.onColsChange:    function(cols)
// config.onModalOpen:     function(ref, modalInner)  [called before detail button, cards mode]
// config.formatCount:     function(n) → string
//
// Returns: { search, resetFilters, updateFilterCount, filters, tsInstances }

function CardSearch(cfg) {

    var API_BASE = cfg.apiBase     || 'https://cards.alteredcore.org';
    var LANG     = cfg.lang        || 'en';
    var UI_LANG  = cfg.uiLang      || 'en'; // en/fr only — used for CDN image paths
    var MODE     = cfg.mode        || 'cards';
    var P        = cfg.prefix      || 'cs';
    var CDN_URL  = cfg.cdnUrl      || '';
    var RENDERER = cfg.rendererSrc || '';
    var DEBUG    = cfg.debug === true || CARD_SEARCH_DEBUG;

    var def = cfg.defaults || {};
    var DEFAULT_FACTIONS   = (def.factions   || []).slice();
    var DEFAULT_TYPES      = (def.types      || []).slice();
    var DEFAULT_RARITIES   = (def.rarities   || []).slice();
    var DEFAULT_SETS       = (def.sets       || []).slice();
    var DEFAULT_VARIATIONS = (def.variations || []).slice();
    var DEFAULT_SORT_1     = def.sort1   || 'default';
    var DEFAULT_SORT_2     = def.sort2   || null;
    var PER_PAGE           = def.perPage || 30;
    var BASE_PER_PAGE      = PER_PAGE;

    var txt = cfg.txt || {};

    // dOM helpers
    var _root = document.getElementById(P + '-panel');
    function q(id) { return document.getElementById(P + '-' + id); }
    function qa(sel) {
        return _root ? _root.querySelectorAll(sel) : [];
    }

    var elGrid        = q('grid');
    var elLoading     = q('loading');
    var elEmpty       = q('empty');
    var elError       = q('error');
    var elPagin       = q('pagination');
    var elSearch      = q('search');
    var elFilterBtn     = q('filter-btn');
    var elFilterModal   = document.getElementById(P + '-filter-modal');
    var elModalResetBtn = document.getElementById(P + '-modal-reset-btn');
    var elModalApplyBtn = document.getElementById(P + '-modal-apply-btn');
    var elFilterCount = q('filter-count');

    // Close the filter modal if open (safe to call before Bootstrap has loaded)
    function hideFilterModal() {
        if (!elFilterModal || typeof bootstrap === 'undefined') return;
        var m = bootstrap.Modal.getInstance(elFilterModal);
        if (m) m.hide();
    }
    var elSortSelect  = q('sort');
    var elColsSelect  = q('cols');
    var elResetBtn    = q('reset-btn');
    var elApplyBtn    = q('apply-btn');
    var elCount       = q('count');
    var elInitial     = q('initial');

    // filter state
    var ini = cfg.initial || {};
    var _factionDirty   = !!ini.factionExplicit;
    var _typeDirty      = !!ini.typeExplicit;
    var _rarityDirty    = !!ini.rarityExplicit;
    var _setsDirty      = !!ini.setsExplicit;
    var _variationDirty = !!ini.variationsExplicit;
    var _collDirty      = false;

    var filters = {
        q:              ini.q              || '',
        faction:        (_factionDirty ? (ini.faction || []) : DEFAULT_FACTIONS.slice()),
        type:           (_typeDirty   ? (ini.type   || []) : DEFAULT_TYPES.slice()),
        rarity:         (_rarityDirty ? (ini.rarity || []) : DEFAULT_RARITIES.slice()),
        // Numeric fields hold a raw text expression (e.g. "3", "1,3", "1-3", "<4", ">=2")
        // parsed by parseNumExpr() at URL-build time. null/'' when empty.
        mainCost:    ini.mainCost    != null && ini.mainCost    !== '' ? String(ini.mainCost)    : null,
        recallCost:  ini.recallCost  != null && ini.recallCost  !== '' ? String(ini.recallCost)  : null,
        forest:      ini.forest      != null && ini.forest      !== '' ? String(ini.forest)      : null,
        mountain:    ini.mountain    != null && ini.mountain    !== '' ? String(ini.mountain)    : null,
        ocean:       ini.ocean       != null && ini.ocean       !== '' ? String(ini.ocean)       : null,
        costRelation:  '',
        showPromo:     !!ini.showPromo,
        sets:           (_setsDirty ? (ini.sets || []) : DEFAULT_SETS.slice()),
        subtypes:       (ini.subtypes       || []).slice(),
        keywords:       (ini.keywords       || []).slice(),
        // Keyword OR/AND toggle was removed from the UI; keywords always match as AND.
        keywordMode:    'and',
        variations:     (ini.variations     || DEFAULT_VARIATIONS).slice(),
        isBanned:       !!ini.isBanned,
        isErrated:      !!ini.isErrated,
        isSuspended:    !!ini.isSuspended,
        hasNoEffect:    !!ini.hasNoEffect,
        effects:        [],
        effectMode:     'or',
        sort:           ini.sort            || DEFAULT_SORT_1,
    };

    var currentPage        = 1;
    var _abortCtrl         = null;
    var _rendererLoaded    = false;
    // Search scope: 'all' (cards API) | 'collection' (physical) | 'ownership' (digital).
    // _scopeCollection stays true for both owned-card scopes — they share the same UI
    // mechanics (single-select filters, collection field mapping); only the proxy differs.
    var _scope             = 'all';
    var _scopeCollection   = false;
    // Active UI tab: 'all' | 'unique' | 'collection' | 'ownership'.
    // 'unique' uses the cards API (scope 'all') with forced rarity/type presets.
    var _tab               = 'all';
    var tsInst             = {};
    var _collEl            = null;
    var _defaultCollection = '';
    var _effectData    = null;
    var _effectLoading = false;
    var _effectQueue   = [];

    // sort key → API order params
    var SORT_MAP = {
        'collector_asc':  [['collectorNumberFormatedId', 'asc']],
        'collector_desc': [['collectorNumberFormatedId', 'desc']],
        'number_asc':     [['cardNumber',   'asc']],
        'number_desc':    [['cardNumber',   'desc']],
        'mana_asc':       [['mainCost',     'asc']],
        'mana_desc':      [['mainCost',     'desc']],
        'reserve_asc':    [['recallCost',   'asc']],
        'reserve_desc':   [['recallCost',   'desc']],
        'forest_asc':     [['forestPower',  'asc']],
        'forest_desc':    [['forestPower',  'desc']],
        'mountain_asc':   [['mountainPower','asc']],
        'mountain_desc':  [['mountainPower','desc']],
        'ocean_asc':      [['oceanPower',   'asc']],
        'ocean_desc':     [['oceanPower',   'desc']],
        'set_date_asc':   [['set.date',     'asc']],
        'set_date_desc':  [['set.date',     'desc']],
    };
    SORT_MAP['name_asc']  = [['name.' + LANG, 'asc']];
    SORT_MAP['name_desc'] = [['name.' + LANG, 'desc']];

    // collection scope field mapping
    var FIELD_MAP = {
        cards: {
            ref:  function(c) { return c.reference || ''; },
            name: function(c) { return c.name || {}; },
            qty:  function()  { return 0; },
        },
        collection: {
            ref:  function(c) { return c.cardReference || ''; },
            name: function(c) { var n = c.name || ''; return { en: n, fr: n }; },
            qty:  function(c) { return c.quantity || 0; },
        },
    };

    function normalizeCard(c) {
        var map = FIELD_MAP[_scopeCollection ? 'collection' : 'cards'];
        return Object.assign({}, c, { reference: map.ref(c), name: map.name(c), _qty: map.qty(c) });
    }

    // Resolve the proxy URL for the active owned-card scope ('' for 'all' or when unconfigured).
    function scopeApiUrl() {
        if (_scope === 'ownership') return cfg.ownershipApiUrl || '';
        if (_scope === 'collection') return cfg.collApiUrl || '';
        return '';
    }

    function setScope(s) {
        _scope = (s === 'collection' || s === 'ownership') ? s : 'all';
        _scopeCollection = _scope !== 'all';
    }

    function syncScopeButtons() {
        [['all', 'scope-all'], ['collection', 'scope-collection'], ['ownership', 'scope-ownership']]
            .forEach(function(pair) {
                var el = q(pair[1]);
                if (el) el.classList.toggle('active', _scope === pair[0]);
            });
    }

    function updateScopeUi() {
        var active = _scopeCollection && !!scopeApiUrl();
        if (_root) _root.classList.toggle('coll-scope-active', active);
        if (elSortSelect) {
            elSortSelect.disabled = active;
            if (active) {
                filters.sort      = DEFAULT_SORT_1;
                elSortSelect.value = DEFAULT_SORT_1;
            }
        }
        if (tsInst.keyword) {
            if (active) {
                tsInst.keyword.disable();
            } else {
                tsInst.keyword.enable();
            }
        }
        var _kwScopeEl = document.getElementById(P + '-kw-mode');
        if (_kwScopeEl) {
            _kwScopeEl.querySelectorAll('.kw-mode-btn').forEach(function(b) { b.disabled = active; });
        }
        var _hneScopeEl = document.getElementById(P + '-filter-hasnoeffect');
        if (_hneScopeEl) {
            _hneScopeEl.disabled = active;
            if (active && _hneScopeEl.checked) {
                _hneScopeEl.checked = false;
                filters.hasNoEffect = false;
            }
        }
        if (active && _scope === 'collection') {
            // Physical-collection scope only: clear rarity (the collection API returns no
            // rarity data) and enforce single-value filters (its API/proxy collapse repeated
            // params to one). The digital-ownership API populates rarity and filters with IN,
            // so it keeps rarity and allows multiple values.
            if (filters.rarity.length) {
                filters.rarity.length = 0;
                qa('.filter-toggle[data-filter="rarity"]').forEach(function(b) { b.classList.remove('active'); });
            }
            _rarityDirty = false;
            // Enforce single-select on toggle button groups (faction, type)
            ['faction', 'type'].forEach(function(key) {
                var arr = filters[key];
                if (!Array.isArray(arr) || arr.length <= 1) return;
                var keep = arr[0];
                arr.length = 0;
                arr.push(keep);
                qa('.filter-toggle[data-filter="' + key + '"]').forEach(function(b) {
                    b.classList.toggle('active', b.dataset.value === keep);
                });
                if (key === 'faction' && tsInst.faction) tsInst.faction.setValue([keep], true);
            });
            // Enforce single-select on TomSelect dropdowns (set, subtype, variation)
            ['set', 'subtype', 'variation'].forEach(function(key) {
                if (!tsInst[key]) return;
                var vals = tsInst[key].getValue();
                if (!Array.isArray(vals) || vals.length <= 1) return;
                tsInst[key].setValue([vals[0]], true);
            });
        }
    }

    // utility
    function ensureRenderer() {
        if (_rendererLoaded || !RENDERER) return;
        _rendererLoaded = true;
        var s = document.createElement('script');
        s.src = RENDERER;
        document.head.appendChild(s);
    }

    function isUnique(ref) {
        return (ref.split('_')[5] || '')[0] === 'U';
    }

    function cdnUrl(ref) {
        var p = ref.split('_');
        return CDN_URL + '/cards/' + UI_LANG + '/' + (p[1] || '') + '/' + ref + '.webp';
    }

    function cardName(card) {
        var n = card.name;
        if (!n) return ' ';
        var s = typeof n === 'object' ? (n[LANG] || n.en || '') : String(n);
        return s || ' ';
    }

    // ── Numeric range filters (text expressions) ─────────────────────────────
    // Five numeric filters, each driven by a free-text input. filters[key] holds
    // the raw expression; the DOM input id is P + '-filter-' + id; api is the
    // API field name.
    var NUM_FIELDS = [
        { key: 'mainCost',   id: 'maincost',      api: 'mainCost' },
        { key: 'recallCost', id: 'recallcost',    api: 'recallCost' },
        { key: 'forest',     id: 'forestpower',   api: 'forestPower' },
        { key: 'mountain',   id: 'mountainpower', api: 'mountainPower' },
        { key: 'ocean',      id: 'oceanpower',    api: 'oceanPower' },
    ];

    // Parse a numeric filter expression into a structured form, or null if empty/invalid.
    //   "3"      → { kind:'exact', val:3 }
    //   "1,3"    → { kind:'list',  vals:[1,3] }
    //   "1-3"    → { kind:'range', min:1, max:3 }   (bounds reordered if reversed)
    //   "<4" ">2" "<=4" ">=2" → { kind:'bound', op:'lt'|'gt'|'lte'|'gte', val:N }
    //   "4+" (≥4) "4-" (≤4)   → { kind:'bound', op:'gte'|'lte', val:N }
    function parseNumExpr(raw) {
        if (raw == null) return null;
        var s = String(raw).replace(/\s+/g, '');
        if (!s) return null;
        var m = s.match(/^(<=|>=|<|>)(\d+)$/);
        if (m) {
            var op = { '<': 'lt', '>': 'gt', '<=': 'lte', '>=': 'gte' }[m[1]];
            return { kind: 'bound', op: op, val: parseInt(m[2], 10) };
        }
        // Trailing-sign bounds: "4+" → ≥4, "4-" → ≤4.
        m = s.match(/^(\d+)([+-])$/);
        if (m) {
            return { kind: 'bound', op: m[2] === '+' ? 'gte' : 'lte', val: parseInt(m[1], 10) };
        }
        m = s.match(/^(\d+)-(\d+)$/);
        if (m) {
            var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
            if (a > b) { var t = a; a = b; b = t; }
            return { kind: 'range', min: a, max: b };
        }
        if (/^\d+(,\d+)*$/.test(s)) {
            var vals = s.split(',').map(function(v) { return parseInt(v, 10); });
            var uniq = [];
            vals.forEach(function(v) { if (uniq.indexOf(v) < 0) uniq.push(v); });
            return uniq.length === 1 ? { kind: 'exact', val: uniq[0] } : { kind: 'list', vals: uniq };
        }
        return null;
    }

    // True when the expression yields an active filter.
    function numExprActive(raw) { return parseNumExpr(raw) !== null; }

    // Cards API (API Platform) query parts for one numeric field.
    function numCardsParts(api, raw) {
        var p = parseNumExpr(raw);
        if (!p) return [];
        if (p.kind === 'exact') return [api + '=' + p.val];
        if (p.kind === 'list')  return p.vals.map(function(v) { return api + '[]=' + v; });
        if (p.kind === 'range') return [api + '[gte]=' + p.min, api + '[lte]=' + p.max];
        return [api + '[' + p.op + ']=' + p.val]; // bound
    }

    // Collection proxy query parts (reads mainCost[gte]/[lte]/[gt]/[lt]).
    // exact → equal bounds; list → min..max envelope (degraded); range/bound direct.
    function numCollParts(api, raw) {
        var p = parseNumExpr(raw);
        if (!p) return [];
        if (p.kind === 'exact') return [api + '[gte]=' + p.val, api + '[lte]=' + p.val];
        if (p.kind === 'list') {
            var mn = Math.min.apply(null, p.vals), mx = Math.max.apply(null, p.vals);
            return [api + '[gte]=' + mn, api + '[lte]=' + mx];
        }
        if (p.kind === 'range') return [api + '[gte]=' + p.min, api + '[lte]=' + p.max];
        return [api + '[' + p.op + ']=' + p.val]; // bound
    }

    // Ownership proxy supports exact only (mainCost=N). Returns [] for non-exact.
    function numOwnParts(api, raw) {
        var p = parseNumExpr(raw);
        if (p && p.kind === 'exact') return [api + '=' + p.val];
        return [];
    }

    // ── Effect filter ────────────────────────────────────────────────────────

    function _loadEffectData(cb) {
        if (_effectData) { cb(_effectData); return; }
        _effectQueue.push(cb);
        if (_effectLoading) return;
        _effectLoading = true;
        var done = 0;
        var res  = { triggers: [], conditions: [], effects: [] };
        ['triggers', 'conditions', 'effects'].forEach(function(key) {
            fetch(API_BASE + '/api/' + key)
                .then(function(r) { return r.json(); })
                .then(function(data) { res[key] = Array.isArray(data) ? data : []; })
                .catch(function() {})
                .then(function() {
                    done++;
                    if (done < 3) return;
                    _effectData    = res;
                    _effectLoading = false;
                    _effectQueue.forEach(function(fn) { fn(_effectData); });
                    _effectQueue   = [];
                });
        });
    }

    function _effectLabel(item) {
        var t = item.translations || {};
        return t[LANG] || t.en || String(item.alteredId);
    }

    function _effectLabelPlain(item) {
        return _effectLabel(item).replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim() || String(item.alteredId);
    }

    function _alteredIconHtml(escaped) {
        return escaped.replace(/\{([^}]+)\}/g, function(_, code) {
            return '<i class="fak fa-altered-' + code.toLowerCase() + '" style="font-size:.9em;vertical-align:middle;margin:0 1px"></i>';
        });
    }

    function _asArr(v) { return Array.isArray(v) ? v.filter(Boolean) : (v ? [String(v)] : []); }
    function _selectedVals(sel) {
        return Array.from(sel.selectedOptions).map(function(o) { return o.value; }).filter(Boolean);
    }

    // Multi-select dropdown of effect items. currentVals may be a value or array.
    function _buildEffectSel(items, currentVals) {
        var sorted = items.slice().sort(function(a, b) {
            return _effectLabelPlain(a).localeCompare(_effectLabelPlain(b));
        });
        var cur = _asArr(currentVals).map(String);
        var sel = document.createElement('select');
        sel.multiple = true;
        sorted.forEach(function(item) {
            var o = document.createElement('option');
            o.value = String(item.alteredId);
            o.textContent = _effectLabel(item);
            if (cur.indexOf(String(item.alteredId)) >= 0) o.selected = true;
            sel.appendChild(o);
        });
        return sel;
    }

    function _buildEffectRow(n, data, saved) {
        saved = saved || {};
        var rowEl = document.createElement('div');
        rowEl.className = 'effect-row d-flex gap-1 align-items-start mb-1';
        rowEl.dataset.effectN = n;

        var sels = [
            _buildEffectSel(data.triggers,   saved.trigger),
            _buildEffectSel(data.conditions, saved.condition),
            _buildEffectSel(data.effects,    saved.effect),
        ];
        var phs = [txt.any_trigger || '—', txt.any_condition || '—', txt.any_effect || '—'];

        var tsRender = typeof TomSelect !== 'undefined' ? {
            option: function(d, e) {
                return '<div style="white-space:normal;line-height:1.3">' + _alteredIconHtml(e(d.text)) + '</div>';
            },
            item: function(d, e) {
                return '<div>' + _alteredIconHtml(e(d.text)) + '</div>';
            }
        } : null;

        // OR mode → multi-select per dropdown (a single row, options OR'd).
        // AND mode → single value per dropdown (one slot per row, rows AND'd).
        var _multiSel = filters.effectMode !== 'and';

        var tsInsts = [];
        sels.forEach(function(sel, idx) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'flex:1;min-width:160px';
            wrap.appendChild(sel);
            rowEl.appendChild(wrap);
            if (tsRender) {
                var ts = new TomSelect(sel, {
                    create: false,
                    maxItems: _multiSel ? null : 1,
                    plugins: _multiSel ? ['remove_button'] : [],
                    placeholder: phs[idx], hideSelected: _multiSel,
                    onChange: updateFilterCount,
                    render: tsRender,
                });
                tsInsts.push(ts);
            } else {
                sel.addEventListener('change', updateFilterCount);
                tsInsts.push(null);
            }
        });
        rowEl._tsInsts = tsInsts;

        var rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'btn btn-sm btn-outline-secondary flex-shrink-0 effect-rm-btn align-self-start';
        rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        rmBtn.addEventListener('click', function() { _removeEffectRow(rowEl); });
        rowEl.appendChild(rmBtn);
        return rowEl;
    }

    function _syncEffectUi() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        var addBtn = document.getElementById(P + '-effect-add');
        var count  = rowsEl ? rowsEl.querySelectorAll('.effect-row').length : 0;
        var isAnd  = filters.effectMode === 'and';
        if (rowsEl) {
            rowsEl.querySelectorAll('.effect-row').forEach(function(r) {
                var rm = r.querySelector('.effect-rm-btn');
                if (rm) rm.style.display = (isAnd && count > 1) ? '' : 'none';
            });
        }
        // "Add effect" only in AND mode (OR uses a single multi-select row).
        if (addBtn) addBtn.style.display = (isAnd && count < 3) ? '' : 'none';
    }

    function _removeEffectRow(rowEl) {
        if (rowEl._tsInsts) rowEl._tsInsts.forEach(function(ts) { if (ts) ts.destroy(); });
        if (rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
        _syncEffectUi();
        updateFilterCount();
    }

    function _addEffectRow(saved) {
        var rowsEl = document.getElementById(P + '-effect-rows');
        if (!rowsEl) return;
        var count = rowsEl.querySelectorAll('.effect-row').length;
        if (count >= 3) return;
        var n = count;
        if (_effectData) {
            rowsEl.appendChild(_buildEffectRow(n, _effectData, saved));
            _syncEffectUi();
        } else {
            var ph = document.createElement('div');
            ph.className = 'effect-row text-muted small py-1';
            ph.dataset.effectN = n;
            ph.textContent = '…';
            rowsEl.appendChild(ph);
            _syncEffectUi();
            _loadEffectData(function(data) {
                var real = _buildEffectRow(n, data, saved);
                if (ph.parentNode) ph.parentNode.replaceChild(real, ph);
                _syncEffectUi();
            });
        }
    }

    function _readEffectRows() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        var modeEl = document.getElementById(P + '-effect-mode');
        filters.effects    = [];
        filters.effectMode = modeEl ? (modeEl.dataset.mode || 'or') : 'or';
        if (!rowsEl) return;
        rowsEl.querySelectorAll('.effect-row').forEach(function(row) {
            var insts = row._tsInsts;
            var t = [], c = [], e = [];
            if (insts && insts.length >= 3) {
                t = _asArr(insts[0] && insts[0].getValue());
                c = _asArr(insts[1] && insts[1].getValue());
                e = _asArr(insts[2] && insts[2].getValue());
            } else {
                var sels = row.querySelectorAll('select');
                if (sels.length >= 3) {
                    t = _selectedVals(sels[0]); c = _selectedVals(sels[1]); e = _selectedVals(sels[2]);
                }
            }
            // Cartesian product: the API accepts one value per slot field, so each
            // combination of the row's selections becomes its own effect slot.
            var T = t.length ? t : [''], C = c.length ? c : [''], E = e.length ? e : [''];
            T.forEach(function(tt) { C.forEach(function(cc) { E.forEach(function(ee) {
                if (tt || cc || ee) filters.effects.push({ trigger: tt, condition: cc, effect: ee });
            }); }); });
        });
    }

    function _destroyEffectRows() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        if (!rowsEl) return;
        rowsEl.querySelectorAll('.effect-row').forEach(function(r) {
            if (r._tsInsts) r._tsInsts.forEach(function(ts) { if (ts) ts.destroy(); });
        });
        rowsEl.innerHTML = '';
    }

    // Selections of the first effect row (arrays), to carry across a mode switch.
    function _firstRowSaved() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        var row = rowsEl ? rowsEl.querySelector('.effect-row') : null;
        if (!row || !row._tsInsts) return null;
        return {
            trigger:   _asArr(row._tsInsts[0] && row._tsInsts[0].getValue()),
            condition: _asArr(row._tsInsts[1] && row._tsInsts[1].getValue()),
            effect:    _asArr(row._tsInsts[2] && row._tsInsts[2].getValue()),
        };
    }

    // True if any effect dropdown currently holds more than one value.
    function _anyEffectMultiSelected() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        if (!rowsEl) return false;
        var found = false;
        rowsEl.querySelectorAll('.effect-row').forEach(function(row) {
            if (row._tsInsts) row._tsInsts.forEach(function(ts) {
                if (ts && _asArr(ts.getValue()).length > 1) found = true;
            });
        });
        return found;
    }

    function _syncEffectModeButtons() {
        var modeEl = document.getElementById(P + '-effect-mode');
        if (!modeEl) return;
        modeEl.dataset.mode = filters.effectMode;
        modeEl.querySelectorAll('.effect-mode-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.mode === filters.effectMode);
        });
    }

    // OR → one multi-select row (options OR'd). AND → single value per dropdown,
    // multiple rows AND'd. Mixing the two (multi-select inside AND) isn't supported.
    function _setEffectMode(mode) {
        mode = mode === 'and' ? 'and' : 'or';
        if (mode === filters.effectMode) return;
        if (mode === 'and' && _anyEffectMultiSelected()) {
            window.alert(txt.effect_mix_warning || (UI_LANG === 'fr'
                ? "Il n'est pas encore possible de mélanger des ET et des OU dans la recherche d'effets. Retirez les sélections multiples avant de passer en ET."
                : "Mixing AND and OR in the effect search isn't possible yet. Remove the multiple selections before switching to AND."));
            _syncEffectModeButtons(); // keep the toggle on the current (OR) mode
            return;
        }
        var saved = _firstRowSaved();
        filters.effectMode = mode;
        _syncEffectModeButtons();
        _destroyEffectRows();
        _addEffectRow(saved);
        _syncEffectUi();
        updateFilterCount();
    }

    function _resetEffectRows() {
        filters.effectMode = 'or';
        _syncEffectModeButtons();
        _destroyEffectRows();
        _addEffectRow(null);
        _syncEffectUi();
    }

    function initEffects() {
        var addBtn = document.getElementById(P + '-effect-add');
        var modeEl = document.getElementById(P + '-effect-mode');
        if (addBtn) {
            addBtn.addEventListener('click', function() { _addEffectRow(null); _syncEffectUi(); });
        }
        if (modeEl) {
            modeEl.addEventListener('click', function(e) {
                var btn = e.target.closest('.effect-mode-btn');
                if (btn) _setEffectMode(btn.dataset.mode);
            });
        }
        _syncEffectModeButtons();
        _addEffectRow(null);
        _syncEffectUi();
    }

    // ── End effect filter ────────────────────────────────────────────────────

    // build direct API URL
    function buildApiUrl(page) {
        // Reference lookup: bypass all filters and collection scope
        if (filters.q && /^ALT_[A-Z0-9_]+$/i.test(filters.q)) {
            return API_BASE + '/api/cards?reference=' + encodeURIComponent(filters.q.toUpperCase())
                + '&page=' + page + '&itemsPerPage=' + PER_PAGE;
        }

        if (_scopeCollection && scopeApiUrl()) return buildCollApiUrl(page);

        var parts = [
            'page='         + page,
            'itemsPerPage=' + PER_PAGE,
        ];

        var sortKey = filters.sort || DEFAULT_SORT_1;
        var primary = sortKey === 'default' ? DEFAULT_SORT_1 : sortKey;

        if (primary === 'random') {
            parts.push('random=true');
        } else {
            var sf = SORT_MAP[primary] || null;
            if (sf) {
                sf.forEach(function(s) { parts.push('order[' + s[0] + ']=' + s[1]); });
            }
            // Always apply DEFAULT_SORT_1 as tiebreaker when it differs from primary
            if (primary !== DEFAULT_SORT_1 && DEFAULT_SORT_1 && DEFAULT_SORT_1 !== 'default') {
                var sf_tb = SORT_MAP[DEFAULT_SORT_1] || null;
                if (sf_tb) sf_tb.forEach(function(s) { parts.push('order[' + s[0] + ']=' + s[1]); });
            }
            if (DEFAULT_SORT_2 && DEFAULT_SORT_2 !== primary && DEFAULT_SORT_2 !== DEFAULT_SORT_1) {
                var sf2 = SORT_MAP[DEFAULT_SORT_2] || null;
                if (sf2) sf2.forEach(function(s) { parts.push('order[' + s[0] + ']=' + s[1]); });
            }
        }

        (_factionDirty ? filters.faction : DEFAULT_FACTIONS).forEach(function(v) { parts.push('faction.code[]=' + encodeURIComponent(v)); });
        var _tmExpanded = [];
        (_typeDirty ? filters.type : DEFAULT_TYPES).forEach(function(v) {
            var mapped = cfg.typesMerged && cfg.typesMerged[v];
            (mapped || [v]).forEach(function(t) { if (_tmExpanded.indexOf(t) < 0) _tmExpanded.push(t); });
        });
        _tmExpanded.forEach(function(v) { parts.push('cardType[]=' + encodeURIComponent(v)); });
        var _statusActive = filters.isBanned || filters.isErrated || filters.isSuspended;
        (_rarityDirty ? filters.rarity : (_statusActive ? [] : DEFAULT_RARITIES)).forEach(function(v) { parts.push('rarity[]='   + encodeURIComponent(v)); });
        (_setsDirty ? filters.sets : DEFAULT_SETS).slice().reverse().forEach(function(v) { parts.push('set.reference[]=' + encodeURIComponent(v)); });
        filters.keywords.forEach(function(v) { parts.push('effectKeyword[]=' + encodeURIComponent(v)); });
        if (filters.keywords.length > 1 && filters.keywordMode === 'and') {
            parts.push('effectKeywordMode=and');
        }
        filters.subtypes.forEach(function(v)   { parts.push('subTypes[]='  + encodeURIComponent(v)); });
        filters.variations.forEach(function(v) { parts.push('variation[]=' + encodeURIComponent(v)); });

        NUM_FIELDS.forEach(function(f) {
            numCardsParts(f.api, filters[f.key]).forEach(function(p) { parts.push(p); });
        });
        if (filters.costRelation === 'eq')        parts.push('costRelation=equal');
        else if (filters.costRelation === 'main_gt')   parts.push('costRelation=mainHigher');
        else if (filters.costRelation === 'recall_gt') parts.push('costRelation=recallHigher');
        if (filters.isBanned)    parts.push('isBanned=true');
        if (filters.isErrated)   parts.push('isErrated=true');
        if (filters.isSuspended) parts.push('isSuspended=true');
        if (filters.hasNoEffect) parts.push('hasNoEffect=true');

        _readEffectRows();
        var _activeEffects = filters.effects.filter(function(ef) {
            return ef.trigger || ef.condition || ef.effect;
        });
        if (_activeEffects.length > 24) _activeEffects = _activeEffects.slice(0, 24);
        if (_activeEffects.length) {
            if (_activeEffects.length > 1) parts.push('effectSlotMode=' + filters.effectMode);
            _activeEffects.forEach(function(ef, i) {
                var n = i;
                if (ef.trigger)   parts.push('effectSlot[' + n + '][trigger]='   + encodeURIComponent(ef.trigger));
                if (ef.condition) parts.push('effectSlot[' + n + '][condition]=' + encodeURIComponent(ef.condition));
                if (ef.effect)    parts.push('effectSlot[' + n + '][effect]='    + encodeURIComponent(ef.effect));
            });
        }

        if (filters.q) parts.push('name=' + encodeURIComponent(filters.q));

        return API_BASE + '/api/cards?' + parts.join('&');
    }

    // build collection proxy URL
    function buildCollApiUrl(page) {
        var parts = [
            'locale='       + encodeURIComponent(LANG),
            'page='         + page,
            'itemsPerPage=' + PER_PAGE,
        ];

        // Array filters use bracketed keys (faction[]=A&faction[]=B) so PHP $_GET keeps
        // every value — a plain repeated key (faction=A&faction=B) collapses to the last
        // one, which silently drops all but one selection (e.g. the promo toggle's
        // "all variations"). The collection/ownership proxies remap these to each API.
        (_factionDirty ? filters.faction : DEFAULT_FACTIONS).forEach(function(v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        (_typeDirty   ? filters.type   : []).forEach(function(v) { parts.push('cardType[]=' + encodeURIComponent(v)); });
        (_rarityDirty ? filters.rarity : []).forEach(function(v) { parts.push('rarity[]='   + encodeURIComponent(v)); });
        // Ownership scope applies the default editions by default, matching the pre-selected
        // edition chips in the UI. The collection scope sends nothing by default (no edition
        // restriction): its API/proxy collapse repeated cardSet params to one, so sending the
        // default set would wrongly narrow results to a single edition.
        (_setsDirty ? filters.sets : (_scope === 'ownership' ? DEFAULT_SETS : [])).forEach(function(v) { parts.push('cardSet[]='  + encodeURIComponent(v)); });
        filters.subtypes.forEach(function(v)  { parts.push('subTypes[]='  + encodeURIComponent(v)); });
        // The collection API filters variation by exact match and can't express "any
        // variation", which would hide promos/alt-arts. Omit it entirely on the collection
        // scope so every owned printing (incl. promos) shows. The ownership API supports
        // variation IN, so it still gets the filter (driven by the promo toggle there).
        if (_scope === 'ownership') {
            filters.variations.forEach(function(v){ parts.push('variation[]=' + encodeURIComponent(v)); });
        }

        if (filters.isBanned)    parts.push('isBanned=true');
        if (filters.isErrated)   parts.push('isErrated=true');
        if (filters.isSuspended) parts.push('isSuspended=true');

        // Numeric filters: ownership proxy wants exact (mainCost=N); collection
        // proxy wants bracketed ranges (mainCost[gte]/[lte]/[gt]/[lt]).
        var _numFn = _scope === 'ownership' ? numOwnParts : numCollParts;
        NUM_FIELDS.forEach(function(f) {
            _numFn(f.api, filters[f.key]).forEach(function(p) { parts.push(p); });
        });

        if (filters.q) parts.push('name=' + encodeURIComponent(filters.q));

        return scopeApiUrl() + '?' + parts.join('&');
    }

    // build shareable URL for pushState
    function buildPageUrl(page) {
        var parts = [];
        if (_tab && _tab !== 'all') parts.push('tab=' + _tab);
        if (filters.q) parts.push('q=' + encodeURIComponent(filters.q));
        if (_factionDirty) filters.faction.forEach(function(v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        if (_typeDirty)   filters.type.forEach(function(v)   { parts.push('type[]='   + encodeURIComponent(v)); });
        if (_rarityDirty) filters.rarity.forEach(function(v) { parts.push('rarity[]=' + encodeURIComponent(v)); });
        if (_setsDirty) filters.sets.forEach(function(v) { parts.push('set[]=' + encodeURIComponent(v)); });
        filters.keywords.forEach(function(v)      { parts.push('keyword[]='      + encodeURIComponent(v)); });
        filters.subtypes.forEach(function(v)      { parts.push('subtype[]='      + encodeURIComponent(v)); });
        filters.variations.forEach(function(v)    { parts.push('variation[]='    + encodeURIComponent(v)); });
        if (filters.mainCost)   parts.push('mainCost='   + encodeURIComponent(filters.mainCost));
        if (filters.recallCost) parts.push('recallCost=' + encodeURIComponent(filters.recallCost));
        if (filters.forest)     parts.push('forest='     + encodeURIComponent(filters.forest));
        if (filters.mountain)   parts.push('mountain='   + encodeURIComponent(filters.mountain));
        if (filters.ocean)      parts.push('ocean='      + encodeURIComponent(filters.ocean));
        if (filters.showPromo)   parts.push('promo=true');
        if (filters.isBanned)    parts.push('isBanned=true');
        if (filters.isErrated)   parts.push('isErrated=true');
        if (filters.isSuspended) parts.push('isSuspended=true');
        if (filters.hasNoEffect) parts.push('hasNoEffect=true');
        if (filters.keywordMode === 'and' && filters.keywords.length > 1) parts.push('kwMode=and');
        if (filters.sort && filters.sort !== 'default' && filters.sort !== DEFAULT_SORT_1) {
            parts.push('sort=' + encodeURIComponent(filters.sort));
        }
        if (page > 1) parts.push('page=' + page);
        return location.pathname + (parts.length ? '?' + parts.join('&') : '');
    }

    // read TomSelect values into filters
    function readTsValues() {
        function sv(key) {
            var el = document.getElementById(P + '-filter-' + key);
            return el ? Array.from(el.selectedOptions).map(function(o) { return o.value; }) : [];
        }
        filters.sets          = sv('set');
        if (tsInst.faction) filters.faction = sv('faction');
        filters.subtypes      = sv('subtype');
        filters.keywords      = sv('keyword');
        filters.variations    = sv('variation');
        // Numeric filters: read the raw text expression (null when empty).
        NUM_FIELDS.forEach(function(f) {
            var el = document.getElementById(P + '-filter-' + f.id);
            filters[f.key] = el && el.value.trim() !== '' ? el.value.trim() : null;
        });
        // Card status is held by data-bool-filter buttons (set on click); nothing to read here.
        var hneEl = document.getElementById(P + '-filter-hasnoeffect');
        filters.hasNoEffect = hneEl ? hneEl.checked : false;
        filters.keywordMode = 'and';
        var _crEl = document.getElementById(P + '-filter-cost-relation');
        filters.costRelation = _crEl ? _crEl.value : '';
        _readEffectRows();
    }

    // filter count badge
    function updateFilterCount() {
        readTsValues();
        var n = (_factionDirty ? filters.faction.length : 0)
            + (_typeDirty   ? filters.type.length   : 0)
            + (_rarityDirty ? filters.rarity.length : 0)
            + NUM_FIELDS.reduce(function(acc, f) { return acc + (numExprActive(filters[f.key]) ? 1 : 0); }, 0)
            + (_setsDirty ? filters.sets.length : 0) + filters.subtypes.length + filters.keywords.length
            + (_variationDirty ? filters.variations.length : 0) + (_collDirty ? 1 : 0)
            + (filters.isBanned ? 1 : 0) + (filters.isErrated ? 1 : 0) + (filters.isSuspended ? 1 : 0)
            + (filters.hasNoEffect ? 1 : 0)
            + (filters.costRelation ? 1 : 0)
            + filters.effects.filter(function(ef) { return ef.trigger || ef.condition || ef.effect; }).length;
        if (elFilterCount) {
            elFilterCount.textContent = n || '';
            elFilterCount.style.display = n > 0 ? '' : 'none';
        }
        // Advanced-accordion badge: count of filters living inside the accordion.
        var advN = filters.subtypes.length + filters.keywords.length
            + (filters.isBanned ? 1 : 0) + (filters.isErrated ? 1 : 0) + (filters.isSuspended ? 1 : 0)
            + (filters.hasNoEffect ? 1 : 0) + (filters.costRelation ? 1 : 0)
            + (numExprActive(filters.forest)   ? 1 : 0)
            + (numExprActive(filters.mountain) ? 1 : 0)
            + (numExprActive(filters.ocean)    ? 1 : 0);
        var advBadge = document.getElementById(P + '-adv-count');
        if (advBadge) {
            advBadge.textContent = advN || '';
            advBadge.style.display = advN > 0 ? '' : 'none';
        }
    }

    // pagination
    function renderPagination(page, total) {
        if (!elPagin) return;
        if (total <= 1) { elPagin.style.setProperty('display', 'none', 'important'); return; }
        elPagin.innerHTML = '';
        elPagin.style.removeProperty('display');

        function makePgBtn(n, active) {
            var b = document.createElement('button');
            b.className = 'btn btn-sm ' + (active ? 'btn-primary-altered' : 'btn-outline-secondary');
            b.textContent = n;
            b.disabled = active;
            if (!active) b.onclick = function() { search(n); };
            return b;
        }
        function makeDots() {
            var s = document.createElement('span');
            s.className = 'text-muted small align-self-center px-1';
            s.textContent = '…';
            return s;
        }

        if (page > 1) {
            var prev = document.createElement('button');
            prev.className = 'btn btn-outline-secondary btn-sm';
            prev.textContent = txt.prev || '← Prev';
            prev.onclick = function() { search(page - 1); };
            elPagin.appendChild(prev);
        }

        var pgNums = [];
        for (var pi = 1; pi <= total; pi++) {
            if (pi === 1 || pi === total || (pi >= page - 2 && pi <= page + 2)) {
                pgNums.push(pi);
            }
        }
        var lastPg = 0;
        for (var pj = 0; pj < pgNums.length; pj++) {
            if (lastPg && pgNums[pj] > lastPg + 1) elPagin.appendChild(makeDots());
            elPagin.appendChild(makePgBtn(pgNums[pj], pgNums[pj] === page));
            lastPg = pgNums[pj];
        }

        if (page < total) {
            var next = document.createElement('button');
            next.className = 'btn btn-outline-secondary btn-sm';
            next.textContent = txt.next || 'Next →';
            next.onclick = function() { search(page + 1); };
            elPagin.appendChild(next);
        }

        if (total > 5) {
            var sep = document.createElement('span');
            sep.style.cssText = 'width:1px;background:var(--neutral-300);align-self:stretch;margin:0 4px';
            elPagin.appendChild(sep);

            var inp = document.createElement('input');
            inp.type = 'number';
            inp.min = '1';
            inp.max = String(total);
            inp.placeholder = String(page);
            inp.className = 'form-control form-control-sm';
            inp.style.cssText = 'width:60px;text-align:center';
            elPagin.appendChild(inp);

            var go = document.createElement('button');
            go.className = 'btn btn-sm btn-outline-secondary';
            go.textContent = 'Go';
            (function(input, totalPages) {
                go.onclick = function() {
                    var v = parseInt(input.value, 10);
                    if (v >= 1 && v <= totalPages) search(v);
                };
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') go.onclick();
                });
            })(inp, total);
            elPagin.appendChild(go);
        }
    }

    // shared collection POST helper
    function _collPost(ref, newQty, entryId, btn1, btn2, fbEl, onSuccess) {
        btn1.disabled = true;
        btn2.disabled = true;
        fbEl.textContent = '…';
        fbEl.style.color = 'rgba(255,255,255,.5)';

        var body = new URLSearchParams();
        body.append('csrf_token', cfg.collectionCsrf || '');
        body.append('action',     'set_qty');
        body.append('ref',        ref);
        body.append('qty',        newQty);
        body.append('entry_id',   entryId);

        fetch(cfg.collectionUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    body.toString(),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            btn1.disabled = false;
            btn2.disabled = false;
            if (data.ok) {
                var newEid = data.entry_id !== undefined ? parseInt(data.entry_id, 10) : entryId;
                if (cfg.collectionData)    cfg.collectionData[ref]    = newQty;
                if (cfg.collectionEntries) cfg.collectionEntries[ref] = newEid;
                fbEl.textContent = '✓';
                fbEl.style.color = '#4ade80';
                setTimeout(function() { fbEl.textContent = ''; }, 2000);
                onSuccess(newQty, newEid);
            } else {
                fbEl.textContent = '✗';
                fbEl.style.color = '#f87171';
            }
        })
        .catch(function() {
            btn1.disabled = false;
            btn2.disabled = false;
            fbEl.textContent = '✗';
            fbEl.style.color = '#f87171';
        });
    }

    // render card (cards mode)
    function renderCard(card) {
        var ref  = card.reference || '';
        var name = cardName(card);
        var uniq = isUnique(ref);

        var item = document.createElement('div');
        item.className = 'card-item';
        item.dataset.ref = ref;

        var nameEl = document.createElement('div');
        nameEl.className = 'card-name';
        nameEl.title = name;
        nameEl.textContent = name;
        item.appendChild(nameEl);

        var wrap = document.createElement('div');
        wrap.className = 'card-img-wrap';
        wrap.dataset.ref = ref;
        wrap.dataset.unique = uniq ? '1' : '0';
        wrap.dataset.lang = LANG;

        if (uniq) {
            ensureRenderer();
            var ac = document.createElement('altered-card');
            ac.setAttribute('ref', ref);
            ac.setAttribute('locale', UI_LANG);
            wrap.appendChild(ac);
        } else {
            var img = document.createElement('img');
            img.src = cdnUrl(ref);
            img.alt = name;
            img.loading = 'lazy';
            wrap.appendChild(img);
        }

        if (_scope === 'ownership') {
            // Digital-ownership tab: read-only count of digital copies returned by
            // the ownership API, marked with a key icon. No editable footer — the
            // ownership service is the source of truth and isn't edited from here.
            var oqty = card._qty || 0;

            var obadge = document.createElement('span');
            obadge.className = 'card-own-badge';
            obadge.dataset.ref = ref;
            obadge.innerHTML = '<i class="fa-solid fa-key"></i> \xd7' + oqty;
            wrap.appendChild(obadge);
        } else if (cfg.collectionMode && cfg.collectionData) {
            var cqty = cfg.collectionData[ref] || 0;

            var cbadge = document.createElement('span');
            cbadge.className = 'card-coll-badge';
            cbadge.dataset.ref = ref;
            cbadge.innerHTML = '<i class="fa-solid fa-box-archive"></i> \xd7' + cqty;
            wrap.appendChild(cbadge);

            var collBar = document.createElement('div');
            collBar.className = 'card-coll-bar';

            // Archive icon — keeps the collection cue visible once the badge fades on hover.
            var collIcon = document.createElement('i');
            collIcon.className = 'fa-solid fa-box-archive card-coll-bar-icon';

            var btnM = document.createElement('button');
            btnM.type = 'button';
            btnM.className = 'card-coll-btn';
            btnM.textContent = '−';

            var qtySpan = document.createElement('span');
            qtySpan.className = 'card-coll-qty';
            qtySpan.dataset.ref = ref;
            qtySpan.textContent = cqty;

            var btnP = document.createElement('button');
            btnP.type = 'button';
            btnP.className = 'card-coll-btn';
            btnP.textContent = '+';

            var fbSpan = document.createElement('span');
            fbSpan.style.cssText = 'font-size:.85rem;min-width:14px;flex-shrink:0';

            collBar.appendChild(collIcon);
            collBar.appendChild(btnM);
            collBar.appendChild(qtySpan);
            collBar.appendChild(btnP);
            collBar.appendChild(fbSpan);
            wrap.appendChild(collBar);

            (function(qtyEl, bM, bP, fb) {
                function _gridSetQty(newQty) {
                    newQty = Math.max(0, Math.min(99, newQty));
                    var entryId = (cfg.collectionEntries || {})[ref] || 0;
                    _collPost(ref, newQty, entryId, bM, bP, fb, function(qty) {
                        cqty = qty;
                        qtyEl.textContent = qty;
                        if (cbadge) cbadge.innerHTML = '<i class="fa-solid fa-box-archive"></i> \xd7' + qty;
                    });
                }
                bM.addEventListener('click', function(e) { e.stopPropagation(); _gridSetQty(cqty - 1); });
                bP.addEventListener('click', function(e) { e.stopPropagation(); _gridSetQty(cqty + 1); });
            })(qtySpan, btnM, btnP, fbSpan);
        }

        item.appendChild(wrap);
        return item;
    }

    // main search
    function search(page, skipPushState) {
        updateScopeUi();
        readTsValues();
        currentPage = page || 1;

        if (_abortCtrl) { _abortCtrl.abort(); }
        _abortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;

        if (elInitial) elInitial.style.display  = 'none';
        if (elEmpty)   elEmpty.style.display    = 'none';
        if (elError)   elError.style.display    = 'none';
        if (elGrid)    elGrid.style.display     = 'none';
        if (elPagin)   elPagin.style.setProperty('display', 'none', 'important');
        if (elLoading) elLoading.style.display  = 'block';
        if (cfg.closeFiltersOnSearch) hideFilterModal();
        if (cfg.onSearchStart) cfg.onSearchStart();

        if (MODE === 'cards' && cfg.pushState && !skipPushState) {
            history.pushState({ page: currentPage }, '', buildPageUrl(currentPage));
        }

        var url  = buildApiUrl(currentPage);
        var opts = _abortCtrl ? { signal: _abortCtrl.signal } : {};

        if (DEBUG) console.log('[CardSearch] API call:', url);
        fetch(url, opts)
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(data) {
                if (DEBUG) console.log('[CardSearch] API response:', data);
                if (elLoading) elLoading.style.display = 'none';
                _abortCtrl = null;

                var cards      = data.member     || [];
                var totalItems = parseInt(data.totalItems || 0, 10);
                var totalPages = totalItems > 0 ? Math.ceil(totalItems / PER_PAGE) : 1;

                if (!cards.length) {
                    if (elEmpty) elEmpty.style.display = 'block';
                    if (elCount) elCount.textContent = '';
                    if (cfg.onEmpty) cfg.onEmpty();
                    renderPagination(currentPage, totalPages);
                    return;
                }

                if (elGrid) {
                    elGrid.innerHTML = '';
                    cards.forEach(function(c) {
                        var norm = normalizeCard(c);
                        // Only the physical-collection scope feeds collectionData; the
                        // ownership scope renders its own read-only key badge from _qty.
                        if (_scope === 'collection' && norm._qty && norm.reference) {
                            cfg.collectionData = cfg.collectionData || {};
                            cfg.collectionData[norm.reference] = norm._qty;
                        }
                        var el = (MODE === 'deck' && cfg.renderDeckCard)
                            ? cfg.renderDeckCard(norm)
                            : renderCard(norm);
                        if (el) elGrid.appendChild(el);
                    });
                    elGrid.style.display = '';
                }

                renderPagination(currentPage, totalPages);

                if (elCount && totalItems) {
                    elCount.textContent = cfg.formatCount
                        ? cfg.formatCount(totalItems)
                        : (txt.showing ? String(txt.showing).replace('%d', totalItems) : totalItems);
                }

                if (cfg.onCardsRendered) cfg.onCardsRendered(cards);
            })
            .catch(function(err) {
                if (err && err.name === 'AbortError') return;
                if (elLoading) elLoading.style.display = 'none';
                if (elError)   elError.style.display   = 'block';
                if (cfg.onError) cfg.onError(err);
                _abortCtrl = null;
            });
    }

    // collection filter
    function applyCollectionFilter(coll, keepSelected) {
        if (!tsInst.set) return;
        var allOpts = ((cfg.tsOptions || {}).setOptions || []);
        var avail = (coll ? allOpts.filter(function(o) { return o.type === coll; }) : allOpts)
            .map(function(o) { return Object.assign({}, o, { optgroup: o.subtype === 'sub' ? 'sub' : 'main' }); });
        var kept = keepSelected ? tsInst.set.getValue().filter(function(v) {
            return avail.some(function(o) { return o.value === v; });
        }) : [];
        tsInst.set.clear(true);
        tsInst.set.clearOptions();
        tsInst.set.addOptions(avail, false);
        if (kept.length) tsInst.set.setValue(kept, true);
        updateFilterCount();
    }

    // sync default filter values to UI toggle buttons
    function syncDefaultsToUi() {
        // No default rarity preselection on the digital-ownership tab: by default it sends
        // no rarity filter (all rarities), so the buttons should reflect that — none active.
        var effectiveRarities = _rarityDirty ? filters.rarity
            : (_tab === 'ownership' ? [] : DEFAULT_RARITIES);
        var effectiveSets     = _setsDirty   ? filters.sets   : DEFAULT_SETS;
        qa('.filter-toggle[data-filter="faction"]').forEach(function(b) {
            b.classList.toggle('active', _factionDirty && filters.faction.indexOf(b.dataset.value) >= 0);
        });
        qa('.filter-toggle[data-filter="type"]').forEach(function(b) {
            b.classList.toggle('active', _typeDirty && filters.type.indexOf(b.dataset.value) >= 0);
        });
        qa('.filter-toggle[data-filter="rarity"]').forEach(function(b) {
            b.classList.toggle('active', effectiveRarities.indexOf(b.dataset.value) >= 0);
        });
        qa('.filter-toggle[data-filter="sets"]').forEach(function(b) {
            b.classList.toggle('active', effectiveSets.indexOf(b.dataset.value) >= 0);
        });
        if (tsInst.set && !_setsDirty) tsInst.set.setValue(DEFAULT_SETS, true);
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────
    function syncTabButtons() {
        qa('.cs-tab[data-tab]').forEach(function(b) {
            b.classList.toggle('active', b.dataset.tab === _tab);
        });
    }

    // Show/hide filter blocks based on the active tab. Each block opts in via
    // data-tabs="all unique collection ownership".
    function applyTabVisibility() {
        if (!_root) return;
        _root.querySelectorAll('[data-tabs]').forEach(function(el) {
            var tabs = el.getAttribute('data-tabs').split(/\s+/);
            el.style.display = tabs.indexOf(_tab) >= 0 ? '' : 'none';
        });
    }

    // Switch tab. On a user click, filters are reset first (resetFilters) and the
    // 'unique' preset is applied. When restoring from the URL (keepFilters=true),
    // the URL-loaded filters are preserved and only scope/visibility are applied.
    function setTab(t, keepFilters) {
        _tab = (t === 'unique' || t === 'collection' || t === 'ownership') ? t : 'all';
        setScope(_tab === 'collection' || _tab === 'ownership' ? _tab : 'all');
        if (_tab === 'unique') {
            if (!keepFilters) {
                _rarityDirty = true; filters.rarity = (cfg.uniqueRarity || ['UNIQUE']).slice();
                _typeDirty   = true; filters.type   = (cfg.uniqueType   || ['CHARACTER']).slice();
                // Uniques also live in the KS edition — add it to the default sets.
                var _uExtra = cfg.uniqueExtraSets || [];
                if (_uExtra.length) {
                    _setsDirty = true;
                    filters.sets = DEFAULT_SETS.slice();
                    _uExtra.forEach(function(s) { if (filters.sets.indexOf(s) < 0) filters.sets.push(s); });
                    if (tsInst.set) tsInst.set.setValue(filters.sets, true);
                }
            }
            // Effect search defaults to OR (multi-select). The mode is managed by
            // the always-visible OR/AND toggle and reset by resetFilters().
        }
        syncTabButtons();
        applyTabVisibility();
        updateScopeUi();
        syncDefaultsToUi();
        updateFilterCount();
    }

    // ── Promo sets ────────────────────────────────────────────────────────────
    function syncSetButtons() {
        qa('.filter-toggle[data-filter="sets"]').forEach(function(b) {
            b.classList.toggle('active', filters.sets.indexOf(b.dataset.value) >= 0);
        });
    }

    // Recompute the promo (sub) set selection from the currently-active main sets:
    // promo sets follow their parent, discarding any manual promo picks.
    function recomputePromoSetsFromMains() {
        var children = cfg.setChildren || {};
        var subs     = cfg.subSets     || [];
        var activeMains = filters.sets.filter(function(s) { return subs.indexOf(s) < 0; });
        var next = activeMains.slice();
        activeMains.forEach(function(m) {
            (children[m] || []).forEach(function(ch) { if (next.indexOf(ch) < 0) next.push(ch); });
        });
        filters.sets = next;
    }

    // All variation codes. Source from TomSelect's internal option registry, which always
    // holds every registered variation — the native <select> is pruned by TomSelect to the
    // currently-selected options, so reading it would return only what's already picked
    // (e.g. just "standard" by default), silently dropping serialized/promo/etc. when the
    // promo toggle tries to select "all variations".
    function _allVariationValues() {
        if (tsInst.variation && tsInst.variation.options) {
            var keys = Object.keys(tsInst.variation.options);
            if (keys.length) return keys;
        }
        var el = document.getElementById(P + '-filter-variation');
        return el ? Array.from(el.options).map(function(o) { return o.value; }) : DEFAULT_VARIATIONS.slice();
    }

    // Reflect the promo (sub) sets currently in filters.sets into the promo dropdown.
    function syncPromoDropdown() {
        if (!tsInst.promoset) return;
        var subs = cfg.subSets || [];
        tsInst.promoset.setValue(filters.sets.filter(function(s) { return subs.indexOf(s) >= 0; }), true);
    }

    // Merge a manual promo-dropdown selection with the current main-set selection.
    function applyPromoSelection(promoVals) {
        var subs = cfg.subSets || [];
        var next = filters.sets.filter(function(s) { return subs.indexOf(s) < 0; });
        (promoVals || []).forEach(function(v) { if (next.indexOf(v) < 0) next.push(v); });
        filters.sets = next;
        _setsDirty = true;
        if (tsInst.set) tsInst.set.setValue(filters.sets, true);
        syncSetButtons();
        updateFilterCount();
    }

    function setShowPromo(on) {
        filters.showPromo = !!on;
        var panel = document.getElementById(P + '-promo-panel');
        if (panel) panel.style.display = on ? '' : 'none';
        var subs = cfg.subSets || [];
        if (on) {
            // Select all variations, and pull in the promo editions belonging to
            // the currently-selected main sets.
            if (tsInst.variation) tsInst.variation.setValue(_allVariationValues(), true);
            _variationDirty = false;
            recomputePromoSetsFromMains();
            _setsDirty = true;
            if (tsInst.set) tsInst.set.setValue(filters.sets, true);
            syncSetButtons();
            syncPromoDropdown();
        } else {
            // Drop promo (sub) sets and reset variations back to standard.
            if (filters.sets.some(function(s) { return subs.indexOf(s) >= 0; })) {
                filters.sets = filters.sets.filter(function(s) { return subs.indexOf(s) < 0; });
                _setsDirty = true;
                if (tsInst.set) tsInst.set.setValue(filters.sets, true);
                syncSetButtons();
            }
            if (tsInst.promoset) tsInst.promoset.clear(true);
            _variationDirty = false;
            if (tsInst.variation) {
                tsInst.variation.clear(true);
                if (DEFAULT_VARIATIONS.length) tsInst.variation.setValue(DEFAULT_VARIATIONS.slice(), true);
            }
        }
        updateFilterCount();
    }

    function initPromoToggle() {
        var t = document.getElementById(P + '-promo-toggle');
        if (!t) return;
        t.checked = !!filters.showPromo;
        var panel = document.getElementById(P + '-promo-panel');
        if (panel) panel.style.display = filters.showPromo ? '' : 'none';
        t.addEventListener('change', function() { setShowPromo(this.checked); });
    }

    // reset filters
    function resetFilters() {
        _factionDirty   = false;
        _typeDirty      = false;
        _rarityDirty    = false;
        _setsDirty      = false;
        _variationDirty = false;
        _collDirty      = false;
        filters.q              = '';
        filters.faction        = DEFAULT_FACTIONS.slice();
        filters.type           = DEFAULT_TYPES.slice();
        filters.rarity         = DEFAULT_RARITIES.slice();
        filters.mainCost    = null;
        filters.recallCost  = null;
        filters.forest      = null;
        filters.mountain    = null;
        filters.ocean       = null;
        filters.sets           = DEFAULT_SETS.slice();
        filters.subtypes       = [];
        filters.keywords       = [];
        filters.keywordMode    = 'and';
        filters.variations     = DEFAULT_VARIATIONS.slice();
        filters.isBanned       = false;
        filters.isErrated      = false;
        filters.isSuspended    = false;
        filters.hasNoEffect    = false;
        filters.effects        = [];
        filters.effectMode     = 'or';
        filters.costRelation   = '';
        filters.showPromo      = false;
        filters.sort           = DEFAULT_SORT_1;

        if (elSearch)     elSearch.value     = '';
        if (elSortSelect) elSortSelect.value = DEFAULT_SORT_1;

        setScope('all');
        syncScopeButtons();

        qa('.filter-toggle[data-filter="faction"]').forEach(function(b) { b.classList.remove('active'); });
        qa('.filter-toggle[data-bool-filter]').forEach(function(b) { b.classList.remove('active'); });

        ['faction','subtype','keyword'].forEach(function(k) {
            if (tsInst[k]) tsInst[k].clear(true);
        });
        NUM_FIELDS.forEach(function(f) {
            var el = document.getElementById(P + '-filter-' + f.id);
            if (el) el.value = '';
        });
        var _hneReset = document.getElementById(P + '-filter-hasnoeffect');
        if (_hneReset) _hneReset.checked = false;
        var _crReset = document.getElementById(P + '-filter-cost-relation');
        if (_crReset) _crReset.value = '';
        _resetEffectRows();
        var _promoReset = document.getElementById(P + '-promo-toggle');
        if (_promoReset) _promoReset.checked = false;
        var _promoPanel = document.getElementById(P + '-promo-panel');
        if (_promoPanel) _promoPanel.style.display = 'none';
        if (tsInst.promoset) tsInst.promoset.clear(true);
        if (tsInst.collection) {
            tsInst.collection.setValue(_defaultCollection, true);
        } else if (_collEl && _defaultCollection) {
            _collEl.value = _defaultCollection;
        }
        applyCollectionFilter(_defaultCollection, false);
        if (tsInst.variation) {
            tsInst.variation.clear(true);
            if (DEFAULT_VARIATIONS.length) tsInst.variation.setValue(DEFAULT_VARIATIONS, true);
        }

        syncDefaultsToUi();
        updateFilterCount();
    }

    // restore from URL (popstate)
    function restoreFromUrl(qs) {
        var p = new URLSearchParams(qs);

        _factionDirty = p.has('faction[]');
        _typeDirty    = p.has('type[]');
        _rarityDirty  = p.has('rarity[]');
        _setsDirty    = p.has('set[]');

        filters.q              = p.get('q') || '';
        filters.faction        = _factionDirty ? p.getAll('faction[]') : DEFAULT_FACTIONS.slice();
        filters.type           = _typeDirty   ? p.getAll('type[]')   : DEFAULT_TYPES.slice();
        filters.rarity         = _rarityDirty ? p.getAll('rarity[]') : [];
        filters.mainCost   = p.get('mainCost')   || null;
        filters.recallCost = p.get('recallCost') || null;
        filters.forest     = p.get('forest')     || null;
        filters.mountain   = p.get('mountain')   || null;
        filters.ocean      = p.get('ocean')      || null;
        filters.sets           = _setsDirty ? p.getAll('set[]') : DEFAULT_SETS.slice();
        filters.subtypes       = p.getAll('subtype[]');
        filters.keywords       = p.getAll('keyword[]');
        filters.keywordMode    = p.get('kwMode') === 'or' ? 'or' : 'and';
        filters.variations     = p.getAll('variation[]');
        filters.isBanned       = p.get('isBanned')    === 'true';
        filters.isErrated      = p.get('isErrated')   === 'true';
        filters.isSuspended    = p.get('isSuspended') === 'true';
        filters.hasNoEffect    = p.get('hasNoEffect') === 'true';
        filters.showPromo      = p.get('promo')       === 'true';
        filters.sort           = p.get('sort') || DEFAULT_SORT_1;
        var pg = parseInt(p.get('page') || '1', 10);

        if (elSearch)     elSearch.value     = filters.q;
        if (elSortSelect) elSortSelect.value = filters.sort;

        qa('.filter-toggle[data-filter="faction"]').forEach(function(b) {
            b.classList.toggle('active', filters.faction.indexOf(b.dataset.value) >= 0);
        });
        if (tsInst.faction) {
            tsInst.faction.clear(true);
            if (filters.faction.length) tsInst.faction.setValue(filters.faction, true);
        }
        qa('.filter-toggle[data-filter="sets"]').forEach(function(b) {
            b.classList.toggle('active', _setsDirty && filters.sets.indexOf(b.dataset.value) >= 0);
        });
        qa('.filter-toggle[data-filter="type"]').forEach(function(b) {
            b.classList.toggle('active', filters.type.indexOf(b.dataset.value) >= 0);
        });
        qa('.filter-toggle[data-filter="rarity"]').forEach(function(b) {
            b.classList.toggle('active', filters.rarity.indexOf(b.dataset.value) >= 0);
        });
        qa('.filter-toggle[data-bool-filter]').forEach(function(b) {
            b.classList.toggle('active', !!filters[b.dataset.boolFilter]);
        });

        function setTs(key, vals) {
            if (tsInst[key]) { tsInst[key].clear(true); tsInst[key].setValue(vals, true); }
        }
        if (tsInst.set) {
            var _currColl = tsInst.collection ? tsInst.collection.getValue() : (_collEl ? _collEl.value : '');
            applyCollectionFilter(!_setsDirty ? _currColl : '', false);
            if (_setsDirty) tsInst.set.setValue(filters.sets, true);
        }
        setTs('subtype',      filters.subtypes);
        setTs('keyword',      filters.keywords);
        setTs('variation',    filters.variations);
        function setNativeSel(id, val) {
            var el = document.getElementById(P + '-filter-' + id);
            if (el) el.value = val !== null ? String(val) : '';
        }
        setNativeSel('maincost',      filters.mainCost);
        setNativeSel('recallcost',    filters.recallCost);
        setNativeSel('forestpower',   filters.forest);
        setNativeSel('mountainpower', filters.mountain);
        setNativeSel('oceanpower',    filters.ocean);
        // Card status restored onto the data-bool-filter buttons above.

        var _hneRestore = document.getElementById(P + '-filter-hasnoeffect');
        if (_hneRestore) _hneRestore.checked = !!filters.hasNoEffect;
        var _promoRestore = document.getElementById(P + '-promo-toggle');
        if (_promoRestore) _promoRestore.checked = !!filters.showPromo;
        var _promoPanelR = document.getElementById(P + '-promo-panel');
        if (_promoPanelR) _promoPanelR.style.display = filters.showPromo ? '' : 'none';
        if (filters.showPromo) syncPromoDropdown();

        var _urlTab = p.get('tab');
        if (_urlTab === 'collection' && !cfg.collApiUrl)      _urlTab = null;
        if (_urlTab === 'ownership'  && !cfg.ownershipApiUrl) _urlTab = null;
        setTab(_urlTab && /^(unique|collection|ownership)$/.test(_urlTab) ? _urlTab : 'all', true);

        updateFilterCount();
        search(pg, true);
    }

    // tomSelect
    function makeTs(suffix, opts) {
        var id = P + '-filter-' + suffix;
        var el = document.getElementById(id);
        if (!el || typeof TomSelect === 'undefined') return null;
        var userInit = (opts || {}).onInitialize;
        var merged = Object.assign({ plugins: ['remove_button'], create: false, maxOptions: null }, opts || {});
        merged.onInitialize = function() {
            if (!this.settings.placeholder) {
                this.control_input.style.cssText =
                    'width:0!important;min-width:0!important;padding:0!important;margin:0!important;opacity:0!important;flex:0 0 0!important;';
                this.control_input.setAttribute('inputmode', 'none');
                this.control_input.readOnly = true;
            }
            if (userInit) userInit.call(this);
        };
        var inst = new TomSelect('#' + id, merged);
        inst.on('change', updateFilterCount);
        return inst;
    }

    function initTomSelects() {
        var opts = cfg.tsOptions || {};
        var allSetOptions = opts.setOptions || [];

        var _mainSets = allSetOptions.filter(function(o) { return o.subtype !== 'sub'; });
        var _subSets  = allSetOptions.filter(function(o) { return o.subtype === 'sub'; });
        var groupedSetOpts = _mainSets.map(function(o) { return Object.assign({}, o, { optgroup: 'main' }); })
            .concat(_subSets.map(function(o) { return Object.assign({}, o, { optgroup: 'sub' }); }));

        var setRender = {
            option: function(d, e) {
                return '<div style="display:flex;align-items:center;gap:7px">'
                    + (d.icon ? '<i class="' + e(d.icon) + '" style="width:14px;text-align:center;flex-shrink:0"></i>' : '')
                    + '<span>' + e(d.text) + '</span></div>';
            },
            item: function(d, e) {
                return '<div style="display:flex;align-items:center;gap:4px">'
                    + (d.icon ? '<i class="' + e(d.icon) + '" style="font-size:.8em"></i>' : '')
                    + '<span>' + e(d.text) + '</span></div>';
            },
            optgroup_header: function(d) {
                if (d.value === 'sub') {
                    return '<div style="border-top:1px solid var(--sand-200,#dee2e6);margin:4px 0;padding:0;height:0;overflow:hidden"></div>';
                }
                return '<div style="display:none"></div>';
            },
        };

        tsInst.set = makeTs('set', {
            options: groupedSetOpts,
            optgroups: [{ value: 'main', label: '' }, { value: 'sub', label: '' }],
            render: setRender,
        });
        if (tsInst.set) {
            if (_setsDirty && opts.initialSets && opts.initialSets.length) {
                tsInst.set.setValue(opts.initialSets, true);
            }
            tsInst.set.on('change', function() { _setsDirty = true; });
            tsInst.set.on('change', function() {
                var vals = tsInst.set.getValue();
                filters.sets = Array.isArray(vals) ? vals : (vals ? [vals] : []);
                qa('.filter-toggle[data-filter="sets"]').forEach(function(b) {
                    b.classList.toggle('active', filters.sets.indexOf(b.dataset.value) >= 0);
                });
            });
        }

        _collEl = document.getElementById(P + '-filter-collection');
        _defaultCollection = opts.defaultCollection || '';

        if (_collEl && tsInst.set && typeof TomSelect !== 'undefined') {
            tsInst.collection = makeTs('collection', {
                maxItems: 1,
                plugins: [],
                onChange: function(val) { _collDirty = true; applyCollectionFilter(val, true); },
            });
            if (tsInst.collection && _defaultCollection) {
                tsInst.collection.setValue(_defaultCollection, true);
                if (!_setsDirty) applyCollectionFilter(_defaultCollection, false);
            }
        }

        var _factionEl = document.getElementById(P + '-filter-faction');
        var _factionOpts = _factionEl ? Array.from(_factionEl.options).map(function(o) {
            return { value: o.value, text: o.text };
        }) : [];
        tsInst.faction = makeTs('faction', { options: _factionOpts });
        if (tsInst.faction) {
            if (_factionDirty && ini.faction && ini.faction.length) {
                tsInst.faction.setValue(ini.faction, true);
            }
            tsInst.faction.on('change', function() {
                _factionDirty = true;
                var vals = tsInst.faction.getValue();
                filters.faction = Array.isArray(vals) ? vals : (vals ? [vals] : []);
                qa('.filter-toggle[data-filter="faction"]').forEach(function(b) {
                    b.classList.toggle('active', filters.faction.indexOf(b.dataset.value) >= 0);
                });
            });
        }

        tsInst.subtype   = makeTs('subtype',   { options: opts.subtypeOptions || [], items: opts.initialSubtypes || [], placeholder: txt.lbl_subtype || 'Subtype' });
        tsInst.keyword   = makeTs('keyword',   { options: opts.keywordOptions || [], items: opts.initialKeywords || [], placeholder: txt.lbl_keyword || 'Keyword' });
        tsInst.variation = makeTs('variation', { options: opts.variationOptions || [], onChange: function() { _variationDirty = true; updateFilterCount(); } });
        var _initVars = (opts.initialVariations && opts.initialVariations.length) ? opts.initialVariations : DEFAULT_VARIATIONS.slice();
        if (tsInst.variation && _initVars.length) tsInst.variation.setValue(_initVars, true);

        // Promo editions dropdown — options come from the <select> markup. Manual
        // changes merge into the set selection; main-set toggles override it.
        tsInst.promoset = makeTs('promoset', { onChange: function() { applyPromoSelection(tsInst.promoset.getValue()); } });

        // In the physical-collection scope, faction/set/subtype/variation only support a
        // single value (the collection API/proxy collapses repeated params to one). The
        // digital-ownership API filters these with IN, so it allows multiple values.
        ['faction', 'set', 'subtype', 'variation'].forEach(function(key) {
            if (!tsInst[key]) return;
            tsInst[key].on('item_add', function(value) {
                if (_scope !== 'collection' || !scopeApiUrl()) return;
                var self = this;
                this.getValue().forEach(function(v) {
                    if (v !== value) self.removeItem(v, true);
                });
            });
        });
        // Numeric text inputs: set initial expression + live count update
        var _iniRange = cfg.initial || {};
        NUM_FIELDS.forEach(function(f) {
            var el = document.getElementById(P + '-filter-' + f.id);
            if (!el) return;
            var v = _iniRange[f.key];
            if (v !== null && v !== undefined && v !== '') el.value = String(v);
            el.addEventListener('input',  updateFilterCount);
            el.addEventListener('change', updateFilterCount);
        });

        // hasNoEffect checkbox
        var _hneEl = document.getElementById(P + '-filter-hasnoeffect');
        if (_hneEl) {
            if (_iniRange.hasNoEffect) _hneEl.checked = true;
            _hneEl.addEventListener('change', updateFilterCount);
        }

        // Cost relation select
        var _crEl2 = document.getElementById(P + '-filter-cost-relation');
        if (_crEl2) _crEl2.addEventListener('change', updateFilterCount);

        initPromoToggle();
        initEffects();
    }

    // wire up events
    if (_root) {
        _root.addEventListener('click', function(e) {
            var btn = e.target.closest('.cs-tab[data-tab]');
            if (!btn || !_root.contains(btn) || btn.disabled) return;
            if (btn.dataset.tab === _tab) return;
            resetFilters();
            setTab(btn.dataset.tab);
            if (MODE === 'cards') search(1);
        });

        _root.addEventListener('click', function(e) {
            var btn = e.target.closest('.filter-toggle[data-filter]');
            if (!btn || !_root.contains(btn)) return;
            var key = btn.dataset.filter;
            var val = btn.dataset.value;
            if (key === 'faction') { if (!_factionDirty) { _factionDirty = true; filters.faction = []; } }
            if (key === 'type')    { if (!_typeDirty)    { _typeDirty    = true; filters.type    = []; } }
            if (key === 'rarity')  _rarityDirty  = true;
            if (key === 'sets')    _setsDirty    = true;
            var arr = filters[key];
            if (!Array.isArray(arr)) { arr = []; filters[key] = arr; }
            var idx = arr.indexOf(val);
            if (_scope === 'collection' && scopeApiUrl()) {
                // Physical-collection scope is single-value only (see TomSelect note above).
                var wasActive = idx >= 0;
                qa('.filter-toggle[data-filter="' + key + '"]').forEach(function(b) { b.classList.remove('active'); });
                arr.length = 0;
                if (!wasActive) { arr.push(val); btn.classList.add('active'); }
            } else {
                if (idx >= 0) { arr.splice(idx, 1); btn.classList.remove('active'); }
                else          { arr.push(val);       btn.classList.add('active'); }
            }
            // Promo linking: toggling a MAIN set recomputes its promo children
            // (only while "show promo" is active), discarding manual promo picks.
            if (key === 'sets' && filters.showPromo && (cfg.subSets || []).indexOf(val) < 0) {
                recomputePromoSetsFromMains();
                syncSetButtons();
                syncPromoDropdown();
            }
            if (key === 'faction' && tsInst.faction) tsInst.faction.setValue(filters.faction, true);
            if (key === 'sets'   && tsInst.set)     tsInst.set.setValue(filters.sets, true);
            updateFilterCount();
        });

        _root.addEventListener('click', function(e) {
            var btn = e.target.closest('.filter-toggle[data-bool-filter]');
            if (!btn || !_root.contains(btn)) return;
            var key = btn.dataset.boolFilter;
            filters[key] = !filters[key];
            btn.classList.toggle('active', !!filters[key]);
            updateFilterCount();
        });
    }

    if (elSearch) {
        elSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { filters.q = this.value.trim(); search(1); }
        });
    }
    if (elApplyBtn) {
        elApplyBtn.addEventListener('click', function() {
            if (elSearch) filters.q = elSearch.value.trim();
            search(1);
        });
    }
    if (elResetBtn) {
        elResetBtn.addEventListener('click', function() {
            resetFilters();
            // Stay on the current tab: resetFilters() forces scope back to 'all',
            // so re-apply the active tab's scope/presets before searching.
            setTab(_tab);
            if (MODE === 'cards') search(1);
        });
    }
    if (elSortSelect) {
        elSortSelect.addEventListener('change', function() {
            filters.sort = this.value;
        });
    }
    if (elColsSelect && elGrid) {
        elColsSelect.addEventListener('change', function() {
            var n      = parseInt(this.value, 10);
            var cssVar = MODE === 'deck' ? '--db-cols' : '--cards-cols';
            elGrid.style.setProperty(cssVar, n);
            if (MODE === 'cards') elGrid.style.setProperty('--cards-mobile-cols', n >= 3 ? 2 : n);
            if (MODE === 'cards') {
                PER_PAGE = Math.max(BASE_PER_PAGE, Math.round(BASE_PER_PAGE / n) * n);
                search(1);
            }
            if (cfg.onColsChange) cfg.onColsChange(n);
        });
    }
    if (elModalResetBtn) {
        elModalResetBtn.addEventListener('click', function() {
            resetFilters();
            // Stay on the current tab (see elResetBtn handler).
            setTab(_tab);
            if (MODE === 'cards') search(1);
        });
    }
    if (elModalApplyBtn) {
        elModalApplyBtn.addEventListener('click', function() {
            if (elSearch) filters.q = elSearch.value.trim();
            search(1);
        });
    }

    if (MODE === 'cards' && cfg.pushState) {
        window.addEventListener('popstate', function() { restoreFromUrl(location.search); });
        window.addEventListener('pageshow', function() {
            if (elLoading) elLoading.style.display = 'none';
        });
    }

    // card modal (cards mode)
    if (MODE === 'cards') {
        var _modal      = document.getElementById(P + '-modal');
        var _modalInner = document.getElementById(P + '-modal-inner');

        function buildCollBlock(ref) {
            var collData    = cfg.collectionData    || {};
            var collEntries = cfg.collectionEntries || {};
            var qty         = collData[ref]    || 0;
            var entryId     = collEntries[ref] || 0;

            var wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px 10px;background:rgba(0,0,0,.55);border-radius:8px';

            var icon = document.createElement('i');
            icon.className = 'fa-solid fa-box-archive';
            icon.style.cssText = 'color:rgba(255,255,255,.65);font-size:.85rem';

            var label = document.createElement('span');
            label.style.cssText = 'color:rgba(255,255,255,.65);font-size:.82rem;flex:1';
            label.textContent = 'Collection';

            var btnStyle = 'border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;border-radius:5px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:1rem;cursor:pointer;flex-shrink:0';

            var btnMinus = document.createElement('button');
            btnMinus.type = 'button';
            btnMinus.textContent = '−';
            btnMinus.style.cssText = btnStyle;

            var qtyEl = document.createElement('span');
            qtyEl.style.cssText = 'color:#fff;font-weight:700;font-size:1rem;min-width:1.5em;text-align:center;flex-shrink:0';
            qtyEl.textContent = qty;

            var btnPlus = document.createElement('button');
            btnPlus.type = 'button';
            btnPlus.textContent = '+';
            btnPlus.style.cssText = btnStyle;

            var feedback = document.createElement('span');
            feedback.style.cssText = 'font-size:.85rem;min-width:14px;flex-shrink:0';

            wrap.appendChild(icon);
            wrap.appendChild(label);
            wrap.appendChild(btnMinus);
            wrap.appendChild(qtyEl);
            wrap.appendChild(btnPlus);
            wrap.appendChild(feedback);

            function setQty(newQty) {
                newQty = Math.max(0, Math.min(99, newQty));
                _collPost(ref, newQty, entryId, btnMinus, btnPlus, feedback, function(newQ, newEid) {
                    qty     = newQ;
                    entryId = newEid;
                    qtyEl.textContent = qty;
                    var gridQty   = elGrid ? elGrid.querySelector('.card-coll-qty[data-ref="'   + ref + '"]') : null;
                    var gridBadge = elGrid ? elGrid.querySelector('.card-coll-badge[data-ref="' + ref + '"]') : null;
                    if (gridQty)   gridQty.textContent = qty;
                    if (gridBadge) gridBadge.innerHTML = '<i class="fa-solid fa-box-archive"></i> \xd7' + qty;
                });
            }

            btnMinus.addEventListener('click', function() { setQty(qty - 1); });
            btnPlus.addEventListener('click',  function() { setQty(qty + 1); });

            return wrap;
        }

        function openModal(ref) {
            if (!_modal || !_modalInner) return;
            var uniq = isUnique(ref);
            _modalInner.innerHTML = '';

            var cardEl;
            if (uniq) {
                ensureRenderer();
                cardEl = document.createElement('altered-card');
                cardEl.setAttribute('ref', ref);
                cardEl.setAttribute('locale', UI_LANG);
                cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6)';
            } else {
                cardEl = document.createElement('img');
                cardEl.src = cdnUrl(ref);
                cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6)';
            }
            cardEl.addEventListener('click', closeModal);
            _modalInner.appendChild(cardEl);

            if (cfg.onModalOpen) cfg.onModalOpen(ref, _modalInner);

            if (cfg.collectionMode) {
                _modalInner.appendChild(buildCollBlock(ref));
            }

            if (cfg.cardDetailUrl) {
                var btn = document.createElement('a');
                btn.href      = cfg.cardDetailUrl + '?ref=' + encodeURIComponent(ref) + '&card_lang=' + LANG;
                btn.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i>' + (txt.detail_label || 'View detail');
                btn.className = 'btn btn-sm btn-primary-altered';
                btn.style.cssText = 'display:block;width:100%;margin-top:8px;text-decoration:none';
                _modalInner.appendChild(btn);
            }

            _modal.style.display    = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            if (_modal) { _modal.style.display = 'none'; }
            if (_modalInner) { _modalInner.innerHTML = ''; }
            document.body.style.overflow = '';
        }

        if (elGrid) {
            elGrid.addEventListener('click', function(e) {
                var wrap = e.target.closest('.card-img-wrap');
                if (wrap) openModal(wrap.dataset.ref);
            });
        }
        if (_modal) { _modal.addEventListener('click', closeModal); }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && _modal && _modal.style.display !== 'none') closeModal();
        });
    }

    // init
    initTomSelects();
    syncDefaultsToUi();
    // Restore the active tab from the URL (cards mode) so a refresh keeps it.
    var _initTab = (MODE === 'cards') ? new URLSearchParams(location.search).get('tab') : null;
    if (_initTab === 'collection' && !cfg.collApiUrl)      _initTab = null;
    if (_initTab === 'ownership'  && !cfg.ownershipApiUrl) _initTab = null;
    if (_initTab && /^(unique|collection|ownership)$/.test(_initTab)) {
        setTab(_initTab, true); // keepFilters: URL already carries the filter state
    } else {
        syncTabButtons();
        applyTabVisibility();
    }
    updateFilterCount();
    if (cfg.autoSearch) {
        var _initPage = parseInt(new URLSearchParams(location.search).get('page') || '1', 10);
        search(_initPage, true);
    }

    return {
        search:            search,
        resetFilters:      resetFilters,
        updateFilterCount: updateFilterCount,
        filters:           filters,
        tsInstances:       tsInst,
    };
}
