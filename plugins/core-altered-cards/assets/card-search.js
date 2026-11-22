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
    var UNIQUES_API_BASE = cfg.uniquesApiBase || '';
    var LANG     = cfg.lang        || 'en';
    var UI_LANG  = cfg.uiLang      || 'en'; // en/fr only — UI strings (alerts, etc.)
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
    var elAuthError   = q('auth-error');
    var elPagin       = q('pagination');
    var elSearch      = q('search');
    // Playset dashboard (Profile G) — a non-grid tab implemented in its own
    // module (card-search-playset.js). Instantiated only when that script is
    // loaded (cards mode); deck/deckbuilder pages never include it, so the
    // typeof guard keeps CardSearch working without it.
    var _playset = (typeof CardSearchPlayset === 'function')
        ? CardSearchPlayset({ cfg: cfg, q: q, uiLang: UI_LANG, debug: DEBUG, txt: txt, cdnUrl: cdnUrl })
        : null;
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
        costRelation:  ini.costRelation || '',
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
        // Deckbuilder-only combined toggle (see _statusFilterParts): replaces
        // isBanned/isSuspended there with a single "include them anyway" flag.
        bannedOrSuspended: !!ini.bannedOrSuspended,
        hasNoEffect:    !!ini.hasNoEffect,
        effects:        [],
        // Effect OR/AND toggle was removed from the UI: rows always combine with AND,
        // each row's dropdowns are always multi-select and combine with OR within the row.
        effectMode:     'and',
        // The single support/echo-line filter (support[t|c|o]), separate from the
        // main effect[N] slots above — see initSupport().
        support:        { trigger: [], condition: [], effect: [] },
        format:         ini.format || '',
        sort:           ini.sort            || DEFAULT_SORT_1,
    };

    var currentPage        = 1;
    // Uniques tab (rust-cards-api) pagination: opaque cursor, "load more" style.
    // null = first page; undefined (from the API) = no more pages.
    var _uniqueCursor      = null;
    var _abortCtrl         = null;
    var _rendererLoaded    = false;
    // Mounts/unmounts the heavy <altered-card> renderer as unique-card wraps enter/leave
    // the viewport, so an hours-long "load more" session on the Uniques tab doesn't pile
    // up thousands of live renderer instances in memory.
    var _cardVisObserver   = null;
    // Search scope: 'all' (cards API) | 'collection' (physical) | 'ownership' (digital).
    // _scopeCollection stays true for both owned-card scopes — they share the same UI
    // mechanics (single-select filters, collection field mapping); only the proxy differs.
    var _scope             = 'all';
    var _scopeCollection   = false;
    // Favorites scope: browse the user's favorite cards (local DB proxy). Kept separate from
    // _scopeCollection so cards keep the normal 'cards' field mapping (the fav proxy returns
    // cards-API-shaped objects).
    var _scopeFavoris      = false;
    // Active UI tab: 'all' | 'unique' | 'collection' | 'ownership'.
    // 'unique' uses the cards API (scope 'all') with forced rarity/type presets.
    var _tab               = 'all';
    var tsInst             = {};
    var _collEl            = null;
    var _defaultCollection = '';
    var _effectData    = null;
    var _effectLoading = false;
    var _effectQueue   = [];
    var _supportRowEl  = null; // the single support/echo effect row (region 'echo')
    var _subtypeOptions = null; // every subtype option, as given in cfg.tsOptions
    var _facetsAbort    = null; // in-flight /api/v2/search/facets call

    // sort key → API order params
    var SORT_MAP = {
        'collector_asc':  [['collectorNumberFormatedId', 'asc']],
        'collector_desc': [['collectorNumberFormatedId', 'desc']],
        'number_asc':     [['reference',    'asc']],
        'number_desc':    [['reference',    'desc']],
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
        'set_date_asc':   [['setDate',      'asc']],
        'set_date_desc':  [['setDate',      'desc']],
    };
    SORT_MAP['name_asc']  = [['name.' + LANG, 'asc']];
    SORT_MAP['name_desc'] = [['name.' + LANG, 'desc']];

    // sort key → uniques-search-api `sort=` value (`default` and `random` omitted)
    var UNIQUES_SORT_MAP = {
        'collector_asc':  'collector:asc',
        'collector_desc': 'collector:desc',
        'number_asc':     'reference:asc',
        'number_desc':    'reference:desc',
        'mana_asc':       'mainCost:asc',
        'mana_desc':      'mainCost:desc',
        'reserve_asc':    'recallCost:asc',
        'reserve_desc':   'recallCost:desc',
        'forest_asc':     'forestPower:asc',
        'forest_desc':    'forestPower:desc',
        'mountain_asc':   'mountainPower:asc',
        'mountain_desc':  'mountainPower:desc',
        'ocean_asc':      'oceanPower:asc',
        'ocean_desc':     'oceanPower:desc',
        'set_date_asc':   'setDate:asc',
        'set_date_desc':  'setDate:desc',
        'name_asc':       'name:' + LANG + ':asc',
        'name_desc':      'name:' + LANG + ':desc',
    };

    // Classic altered.json keyword codes use French stems; uniques-search-api indexes canonical English codes.
    var KEYWORD_TO_UNIFIED = {
        'AGUERRI': 'SEASONED', 'ANCRE': 'ANCHORED', 'BOOSTE': 'BOOSTED', 'CORIACE': 'TOUGH',
        'DEFENSEUR': 'DEFENDER', 'DON': 'GIFT', 'ENDORMI': 'ASLEEP', 'ETERNEL': 'ETERNAL',
        'FONCER': 'RUSH', 'FUGACE': 'FLEETING', 'GIGANTESQUE': 'GIGANTIC',
        'RAFRAICHISSEMENT': 'COOLDOWN', 'RAVITAILLEZ': 'RESUPPLY', 'RAVITAILLEZ_EPUISE': 'RESUPPLY',
        'REPERAGE': 'SCOUT', 'SABOTEZ': 'SABOTAGE', 'ASCENDS': 'ASCEND',
    };

    // Sorts whose field can hold equal values across many cards (name, costs,
    // biome powers), so ties need the default sort's own criteria (set date,
    // then collector number) to stay deterministic. Collector No and Reference
    // are unique per card and never tie, so they're left out on purpose.
    var TIEBREAK_SORTS = {
        'name_asc': 1, 'name_desc': 1,
        'mana_asc': 1, 'mana_desc': 1,
        'reserve_asc': 1, 'reserve_desc': 1,
        'forest_asc': 1, 'forest_desc': 1,
        'mountain_asc': 1, 'mountain_desc': 1,
        'ocean_asc': 1, 'ocean_desc': 1,
    };

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
        if (_scope === 'favoris')   return cfg.favApiUrl || '';
        return '';
    }

    function setScope(s) {
        _scope = (s === 'collection' || s === 'ownership' || s === 'favoris') ? s : 'all';
        _scopeCollection = (_scope === 'collection' || _scope === 'ownership');
        _scopeFavoris    = (_scope === 'favoris');
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
        // Favorites scope: hide the search-engine toolbar via CSS (only tabbed filters remain).
        if (_root) _root.classList.toggle('cs-scope-fav', _scopeFavoris);
        if (elSortSelect) {
            elSortSelect.disabled = active;
            var _noRandSort = _tab === 'unique' || (_tab === 'all' && !!UNIQUES_API_BASE);
            var _randOpt = elSortSelect.querySelector ? elSortSelect.querySelector('option[value="random"]') : null;
            if (_randOpt) {
                _randOpt.hidden   = _noRandSort;
                _randOpt.disabled = _noRandSort;
            }
            if (active || _scopeFavoris || (_noRandSort && filters.sort === 'random')) {
                // 'default' (not the resolved DEFAULT_SORT_1 key) so the dropdown
                // still matches a real <option> — set_date_desc itself isn't one.
                filters.sort      = 'default';
                elSortSelect.value = 'default';
            }
        } else if (active || _scopeFavoris || ((_tab === 'unique' || (_tab === 'all' && !!UNIQUES_API_BASE)) && filters.sort === 'random')) {
            filters.sort = 'default';
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
            // Enforce single-select on subtype TomSelect dropdown only (faction, type, set,
            // and variation support multi-select on the collection & ownership proxies).
            ['subtype'].forEach(function(key) {
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

    // altered-card web component supports en/fr only
    function rendererLocale() {
        return (LANG === 'en' || LANG === 'fr') ? LANG : 'en';
    }

    function cdnUrl(ref) {
        var p = ref.split('_');
        return CDN_URL + '/cards/' + LANG + '/' + (p[1] || '') + '/' + ref + '.webp';
    }

    // rust-cards-api (Uniques) locale maps use long codes (en_US, fr_FR, ...); the
    // site's LANG/UI strings use short codes (en, fr). Try both.
    var LOCALE_MAP = { en: 'en_US', fr: 'fr_FR', de: 'de_DE', es: 'es_ES', it: 'it_IT' };
    function pickLocale(map, lang) {
        if (!map) return '';
        return map[lang] || map[LOCALE_MAP[lang]] || map.en_US || map.en || Object.values(map)[0] || '';
    }

    function cardName(card) {
        var n = card.name;
        if (!n) return ' ';
        var s = typeof n === 'object' ? pickLocale(n, LANG) : String(n);
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
    var MAX_NUM_OPEN = 15;

    function _parseNumToken(tok) {
        var m = tok.match(/^(<=|>=|<|>)(\d{1,2})$/);
        if (m) {
            var op = { '<': 'lt', '>': 'gt', '<=': 'lte', '>=': 'gte' }[m[1]];
            return { kind: 'bound', op: op, val: parseInt(m[2], 10) };
        }
        // Trailing-sign bounds: "4+" → ≥4, "4-" → ≤4.
        m = tok.match(/^(\d{1,2})([+-])$/);
        if (m) {
            return { kind: 'bound', op: m[2] === '+' ? 'gte' : 'lte', val: parseInt(m[1], 10) };
        }
        m = tok.match(/^(\d{1,2})-(\d{1,2})$/);
        if (m) {
            var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
            if (a > b) { var t = a; a = b; b = t; }
            return { kind: 'range', min: a, max: b };
        }
        if (/^\d{1,2}$/.test(tok)) {
            return { kind: 'exact', val: parseInt(tok, 10) };
        }
        return null;
    }

    function _expandNumToken(p, outMap) {
        var lo, hi, v;
        if (p.kind === 'exact') { outMap[p.val] = true; return; }
        if (p.kind === 'range') {
            lo = Math.max(0, p.min);
            hi = Math.min(50, p.max);
        } else if (p.op === 'lt')  { lo = 0; hi = Math.min(MAX_NUM_OPEN, p.val - 1); }
        else if (p.op === 'lte')   { lo = 0; hi = Math.min(MAX_NUM_OPEN, p.val); }
        else if (p.op === 'gt')    { lo = Math.max(0, p.val + 1); hi = MAX_NUM_OPEN; }
        else                       { lo = Math.max(0, p.val); hi = MAX_NUM_OPEN; }
        for (v = lo; v <= hi; v++) outMap[v] = true;
    }

    function parseNumExpr(raw) {
        if (raw == null) return null;
        var s = String(raw).replace(/[\u2013\u2014\u2212]/g, '-').replace(/\s+/g, '');
        if (!s) return null;
        var tokens = s.replace(/;/g, ',').split(',');
        if (tokens.some(function(t) { return !t; })) return null;
        if (tokens.length === 1) return _parseNumToken(tokens[0]);

        var map = {};
        for (var i = 0; i < tokens.length; i++) {
            var parsed = _parseNumToken(tokens[i]);
            if (!parsed) return null;
            _expandNumToken(parsed, map);
        }
        var uniq = Object.keys(map).map(function(k) { return parseInt(k, 10); }).sort(function(a, b) { return a - b; });
        if (!uniq.length) return null;
        return uniq.length === 1 ? { kind: 'exact', val: uniq[0] } : { kind: 'list', vals: uniq };
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

    // rust-cards-api (Uniques) query parts. Only values 0..=15 are accepted by
    // parse_cost_u8 (HTTP 400 above 15), so values above 15 are clamped or mapped
    // to an impossible in-range predicate (field[gt]=15 => 0 results).
    function numUniquesParts(api, raw) {
        var p = parseNumExpr(raw);
        if (!p) return [];
        if (p.kind === 'range') {
            var lo = Math.max(p.min, 0), hi = Math.min(p.max, 15);
            if (lo > hi) return [api + '[gt]=15'];
            var out = [];
            for (var v = lo; v <= hi; v++) out.push(api + '[]=' + v);
            return out;
        }
        if (p.kind === 'exact') {
            return (p.val >= 0 && p.val <= 15) ? [api + '=' + p.val] : [api + '[gt]=15'];
        }
        if (p.kind === 'list') {
            var kept = p.vals.filter(function(v) { return v >= 0 && v <= 15; });
            return kept.length ? kept.map(function(v) { return api + '[]=' + v; }) : [api + '[gt]=15'];
        }
        // bound
        if ((p.op === 'gt' || p.op === 'gte') && p.val > 15) return [api + '[gt]=15'];
        if ((p.op === 'lte' && p.val > 15) || (p.op === 'lt' && p.val >= 16)) return [api + '[lte]=15'];
        return numCardsParts(api, raw);
    }

    // Collection & ownership proxy query parts: both proxies accept exact (=N),
    // bracketed bounds ([gte]/[lte]/[gt]/[lt]), and discrete arrays (field[]=...)
    // for disjoint lists (narrowed upstream to [min..max] and filtered in PHP).
    function numProxyParts(api, raw) {
        var p = parseNumExpr(raw);
        if (!p) return [];
        if (p.kind === 'exact') return [api + '=' + p.val];
        if (p.kind === 'range') return [api + '[gte]=' + p.min, api + '[lte]=' + p.max];
        if (p.kind === 'bound') return [api + '[' + p.op + ']=' + p.val];
        var min = p.vals[0], max = p.vals[p.vals.length - 1];
        if (p.vals.length === max - min + 1) {
            return [api + '[gte]=' + min, api + '[lte]=' + max];
        }
        return p.vals.map(function(v) { return api + '[]=' + v; });
    }

    // ── Effect filter ────────────────────────────────────────────────────────

    // Remap rust-cards-api's /api/v2/effects shape ({triggers,conditions,output},
    // items {idGd,text,isMain,isEcho}) into the shape the rest of this file expects
    // ({triggers,conditions,effects}, items {alteredId,translations}) so
    // _effectLabel/_buildEffectSel/_buildEffectRow need no further changes.
    function _remapUniquesEffects(data) {
        function remapList(list) {
            return (Array.isArray(list) ? list : []).map(function(item) {
                return {
                    alteredId: item.idGd, translations: item.text || {},
                    isMain: !!item.isMain, isEcho: !!item.isEcho,
                };
            });
        }
        return {
            triggers:   remapList(data.triggers),
            conditions: remapList(data.conditions),
            effects:    remapList(data.output),
        };
    }

    // Main effect slots only show catalog entries valid on a main line (isMain);
    // the support/echo row only shows entries valid on the echo line (isEcho).
    function _catalogForRegion(items, region) {
        return items.filter(function(item) { return region === 'echo' ? item.isEcho : item.isMain; });
    }

    function _loadEffectData(cb) {
        if (_effectData) { cb(_effectData); return; }
        _effectQueue.push(cb);
        if (_effectLoading) return;
        _effectLoading = true;

        // The effect dropdowns only ever render inside the Uniques tab's filter UI
        // (see includes/card-search.php data-tabs="unique"), so this data source
        // check does not need to look at the currently active tab.
        if (UNIQUES_API_BASE) {
            fetch(UNIQUES_API_BASE + '/api/v2/effects')
                .then(function(r) { return r.json(); })
                .then(function(data) { return _remapUniquesEffects(data); })
                .catch(function() { return { triggers: [], conditions: [], effects: [] }; })
                .then(function(res) {
                    _effectData    = res;
                    _effectLoading = false;
                    _effectQueue.forEach(function(fn) { fn(_effectData); });
                    _effectQueue   = [];
                });
            return;
        }

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
        return pickLocale(t, LANG) || String(item.alteredId);
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

    // Rebuild a dropdown's option list down to `idGds` (plus whatever is currently
    // selected, so existing chips keep their label even if a filter change made
    // them no longer suggested). Mirrors the clear+re-add+restore idiom already
    // used for the set filter in applyCollectionFilter().
    function _applyEffectNarrowing(ts, items, idGds) {
        var keep = {};
        idGds.forEach(function(id) { keep[String(id)] = true; });
        _asArr(ts.getValue()).forEach(function(v) { keep[v] = true; });
        var narrowed = items.filter(function(item) { return keep[String(item.alteredId)]; });
        narrowed.sort(function(a, b) { return _effectLabelPlain(a).localeCompare(_effectLabelPlain(b)); });
        ts.clearOptions();
        narrowed.forEach(function(item) {
            ts.addOption({ value: String(item.alteredId), text: _effectLabel(item) });
        });
        ts.refreshOptions(false);
    }

    // region: 'main' (default, an effect[N] slot) or 'echo' (the support row,
    // n === 'support' — see initSupport()). Support has no remove button (there's
    // only ever one) and its catalog is filtered to isEcho entries instead of isMain.
    function _buildEffectRow(n, data, saved, region) {
        region = region || 'main';
        saved = saved || {};
        var rowEl = document.createElement('div');
        rowEl.className = 'effect-row d-flex gap-1 align-items-start mb-1';
        rowEl.dataset.effectN = n;

        var sels = [
            _buildEffectSel(_catalogForRegion(data.triggers,   region), saved.trigger),
            _buildEffectSel(_catalogForRegion(data.conditions, region), saved.condition),
            _buildEffectSel(_catalogForRegion(data.effects,    region), saved.effect),
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

        // Each dropdown is always multi-select (options within a row combine with
        // OR); each row combines with the others via AND (see filters.effectMode).
        var partKeys  = ['triggers', 'conditions', 'effects'];  // _effectData keys
        var partNames = ['trigger', 'condition', 'output'];     // API 'editing' vocabulary
        var tsInsts = [];
        sels.forEach(function(sel, idx) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'flex:1;min-width:160px';
            wrap.appendChild(sel);
            rowEl.appendChild(wrap);
            if (tsRender) {
                var ts = new TomSelect(sel, {
                    create: false,
                    maxItems: null,
                    plugins: ['remove_button'],
                    placeholder: phs[idx], hideSelected: true,
                    onChange: updateFilterCount,
                    render: tsRender,
                    // Narrow this box's options to what still yields a card given
                    // the current filters (rust-cards-api only — see
                    // buildEffectsFilteredUrl / GET /api/v2/effects/filtered).
                    onDropdownOpen: !UNIQUES_API_BASE ? undefined : function() {
                        fetch(buildEffectsFilteredUrl(partNames[idx], n))
                            .then(function(r) { return r.ok ? r.json() : null; })
                            .then(function(res) {
                                if (res && Array.isArray(res.idGds)) {
                                    _applyEffectNarrowing(ts, _catalogForRegion(data[partKeys[idx]], region), res.idGds);
                                }
                            })
                            .catch(function() {});
                    },
                });
                tsInsts.push(ts);
            } else {
                sel.addEventListener('change', updateFilterCount);
                tsInsts.push(null);
            }
        });
        rowEl._tsInsts = tsInsts;

        if (region === 'main') {
            var rmBtn = document.createElement('button');
            rmBtn.type = 'button';
            rmBtn.className = 'btn btn-sm btn-outline-secondary flex-shrink-0 effect-rm-btn align-self-start';
            rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            rmBtn.addEventListener('click', function() { _removeEffectRow(rowEl); });
            rowEl.appendChild(rmBtn);
        }
        return rowEl;
    }

    function _syncEffectUi() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        var addBtn = document.getElementById(P + '-effect-add');
        var count  = rowsEl ? rowsEl.querySelectorAll('.effect-row').length : 0;
        if (rowsEl) {
            rowsEl.querySelectorAll('.effect-row').forEach(function(r) {
                var rm = r.querySelector('.effect-rm-btn');
                if (rm) rm.style.display = count > 1 ? '' : 'none';
            });
        }
        if (addBtn) addBtn.style.display = count < 3 ? '' : 'none';
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

    // One entry per row, each field an array of selected ids (possibly empty).
    // rust-cards-api's effect[n][t|c|o] accepts a comma-separated OR list directly,
    // so a row's multi-selects map to ONE slot; see _cartesianEffectSlots() for the
    // old Cards API, which needs one value per field per slot.
    function _readEffectRows() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        filters.effects = [];
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
            if (t.length || c.length || e.length) {
                filters.effects.push({ trigger: t, condition: c, effect: e });
            }
        });
    }

    // Read the single support/echo row (see initSupport()) into filters.support.
    function _readSupportRow() {
        filters.support = { trigger: [], condition: [], effect: [] };
        var insts = _supportRowEl && _supportRowEl._tsInsts;
        if (insts && insts.length >= 3) {
            filters.support.trigger   = _asArr(insts[0] && insts[0].getValue());
            filters.support.condition = _asArr(insts[1] && insts[1].getValue());
            filters.support.effect    = _asArr(insts[2] && insts[2].getValue());
        }
    }

    // Expand each row's multi-select combinations into one slot per combination,
    // for the old Cards API (effectSlot[n][trigger|condition|effect] takes only one
    // value per field, unlike rust-cards-api's comma-separated OR lists).
    function _cartesianEffectSlots(effects) {
        var out = [];
        effects.forEach(function(ef) {
            var T = ef.trigger.length ? ef.trigger : [''];
            var C = ef.condition.length ? ef.condition : [''];
            var E = ef.effect.length ? ef.effect : [''];
            T.forEach(function(tt) { C.forEach(function(cc) { E.forEach(function(ee) {
                if (tt || cc || ee) out.push({ trigger: tt, condition: cc, effect: ee });
            }); }); });
        });
        return out;
    }

    function _destroyEffectRows() {
        var rowsEl = document.getElementById(P + '-effect-rows');
        if (!rowsEl) return;
        rowsEl.querySelectorAll('.effect-row').forEach(function(r) {
            if (r._tsInsts) r._tsInsts.forEach(function(ts) { if (ts) ts.destroy(); });
        });
        rowsEl.innerHTML = '';
    }

    function _resetEffectRows() {
        _destroyEffectRows();
        _addEffectRow(null);
        _syncEffectUi();
        _resetSupportRow();
    }

    // Build (or rebuild) the single support/echo row into #<prefix>-support-row.
    function _buildSupportInto(wrap, data) {
        wrap.innerHTML = '';
        _supportRowEl = _buildEffectRow('support', data, null, 'echo');
        wrap.appendChild(_supportRowEl);
    }

    function initSupport() {
        var wrap = document.getElementById(P + '-support-row');
        if (!wrap) return;
        if (_effectData) {
            _buildSupportInto(wrap, _effectData);
        } else {
            _loadEffectData(function(data) { _buildSupportInto(wrap, data); });
        }
    }

    function _resetSupportRow() {
        var wrap = document.getElementById(P + '-support-row');
        if (!wrap) return;
        if (_supportRowEl && _supportRowEl._tsInsts) {
            _supportRowEl._tsInsts.forEach(function(ts) { if (ts) ts.destroy(); });
        }
        _supportRowEl = null;
        initSupport();
    }

    function initEffects() {
        var addBtn = document.getElementById(P + '-effect-add');
        if (addBtn) {
            addBtn.addEventListener('click', function() { _addEffectRow(null); _syncEffectUi(); });
        }
        _addEffectRow(null);
        _syncEffectUi();
        initSupport();
    }

    // ── End effect filter ────────────────────────────────────────────────────

    // isBanned/isSuspended query params.
    // Cards page (and any mode without cfg.getFormatLegality): the buttons
    // ISOLATE — toggling "Banni" narrows results to banned cards only.
    // Deckbuilder: cfg.getFormatLegality() reports whether the deck's current
    // format allows banned/suspended cards at all. When it doesn't, those
    // cards are excluded by default (isBanned=false / isSuspended=false) and
    // the single "Suspendus et bannis" toggle (filters.bannedOrSuspended)
    // becomes an "include them anyway" override — never isolating, since
    // isolating would hide the *legal* cards instead.
    function _statusFilterParts() {
        var parts = [];
        var legality = (MODE === 'deck' && cfg.getFormatLegality) ? (cfg.getFormatLegality() || {}) : null;
        if (legality) {
            var includeAnyway = !!filters.bannedOrSuspended;
            if (legality.allowBanned === false && !includeAnyway)    parts.push('isBanned=false');
            if (legality.allowSuspended === false && !includeAnyway) parts.push('isSuspended=false');
        } else {
            if (filters.isBanned)    parts.push('isBanned=true');
            if (filters.isSuspended) parts.push('isSuspended=true');
        }
        if (filters.isErrated) parts.push('isErrated=true');
        return parts;
    }

    function expandTypes(types) {
        var expanded = [];
        types.forEach(function(v) {
            var mapped = cfg.typesMerged && cfg.typesMerged[v];
            (mapped || [v]).forEach(function(t) { if (expanded.indexOf(t) < 0) expanded.push(t); });
        });
        return expanded;
    }

    // build direct API URL
    function buildApiUrl(page) {
        // Reference lookup: bypass all filters and collection scope
        if (filters.q && /^ALT_[A-Z0-9_]+$/i.test(filters.q)) {
            if (UNIQUES_API_BASE) {
                return UNIQUES_API_BASE + '/api/v2/search?ref[]=' + encodeURIComponent(filters.q.toUpperCase())
                    + '&page=' + page + '&limit=' + PER_PAGE;
            }
            return API_BASE + '/api/cards?reference=' + encodeURIComponent(filters.q.toUpperCase())
                + '&page=' + page + '&itemsPerPage=' + PER_PAGE;
        }

        if (_scopeFavoris && cfg.favApiUrl) return buildFavApiUrl(page);
        if (_scopeCollection && scopeApiUrl()) return buildCollApiUrl(page);
        if (UNIQUES_API_BASE) return buildUnifiedApiUrl(page);

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
            // The default sort, and any sort whose field can tie (name/costs/biome
            // powers — see TIEBREAK_SORTS), gets the default sort's own criteria
            // (set date, then collector number) appended to break ties
            // deterministically. Collector No and Reference are unique per card —
            // no ties possible — so they're sent alone, with nothing appended.
            if (primary === DEFAULT_SORT_1 || TIEBREAK_SORTS[primary]) {
                if (primary !== DEFAULT_SORT_1 && DEFAULT_SORT_1 && DEFAULT_SORT_1 !== 'default') {
                    var sf_tb = SORT_MAP[DEFAULT_SORT_1] || null;
                    if (sf_tb) sf_tb.forEach(function(s) { parts.push('order[' + s[0] + ']=' + s[1]); });
                }
                if (DEFAULT_SORT_2 && DEFAULT_SORT_2 !== primary && DEFAULT_SORT_2 !== DEFAULT_SORT_1) {
                    var sf2 = SORT_MAP[DEFAULT_SORT_2] || null;
                    if (sf2) sf2.forEach(function(s) { parts.push('order[' + s[0] + ']=' + s[1]); });
                }
            }
        }

        (_factionDirty ? filters.faction : DEFAULT_FACTIONS).forEach(function(v) { parts.push('faction.code[]=' + encodeURIComponent(v)); });
        expandTypes(_typeDirty ? filters.type : DEFAULT_TYPES).forEach(function(v) {
            parts.push('cardType[]=' + encodeURIComponent(v));
        });
        // Cards page: isBanned/isSuspended/isErrated ISOLATE, so dropping the default
        // rarity restriction makes sense — someone browsing "all banned cards" wants
        // every rarity, not just the defaults. Deckbuilder: isBanned/isSuspended mean
        // "include them anyway" (see _statusFilterParts), not isolate — they must NOT
        // also widen the rarity scope to Unique, or "include suspended cards" silently
        // floods the grid with unrelated unique cards. Only isErrated still isolates
        // there, so it's the only one left able to drop the rarity restriction.
        //
        // TODO(discuss with team): the Cards-page isolate behavior itself is being
        // questioned — should isBanned/isSuspended/isErrated ever silently widen the
        // rarity scope to Unique there either? If we decide no, this MODE==='deck'
        // branch becomes the behavior everywhere and this whole condition collapses
        // to `filters.isErrated`.
        var _statusActive = (MODE === 'deck' && cfg.getFormatLegality)
            ? filters.isErrated
            : (filters.isBanned || filters.isErrated || filters.isSuspended);
        (_rarityDirty ? filters.rarity : (_statusActive ? [] : DEFAULT_RARITIES)).forEach(function(v) { parts.push('rarity[]='   + encodeURIComponent(v)); });
        (_setsDirty ? filters.sets : DEFAULT_SETS).slice().reverse().forEach(function(v) { parts.push('set.reference[]=' + encodeURIComponent(v)); });
        filters.keywords.forEach(function(v) { parts.push('effectKeyword[]=' + encodeURIComponent(v)); });
        if (filters.keywords.length > 1 && filters.keywordMode === 'and') {
            parts.push('effectKeywordMode=and');
        }
        _appendSubtypesParts(parts);
        filters.variations.forEach(function(v) { parts.push('variation[]=' + encodeURIComponent(v)); });

        NUM_FIELDS.forEach(function(f) {
            numCardsParts(f.api, filters[f.key]).forEach(function(p) { parts.push(p); });
        });
        _appendCostRelationPart(parts);
        _statusFilterParts().forEach(function(p) { parts.push(p); });
        if (filters.hasNoEffect) parts.push('hasNoEffect=true');

        _readEffectRows();
        var _activeEffects = _cartesianEffectSlots(filters.effects);
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

    // Unified search (rust-cards-api /api/v2/search) for the "all" tab when UNIQUES_API_BASE
    // is configured: handles accurate global mana/power/localized-name sorting and filters,
    // while keeping effect/support filters exclusive to the Uniques tab.
    function buildUnifiedApiUrl(page) {
        var parts = [
            'page='  + page,
            'limit=' + PER_PAGE,
        ];

        var sortKey = filters.sort || DEFAULT_SORT_1;
        var primary = (sortKey === 'default') ? DEFAULT_SORT_1 : sortKey;
        var uSort = UNIQUES_SORT_MAP[primary];
        if (uSort) parts.push('sort=' + encodeURIComponent(uSort));

        return UNIQUES_API_BASE + '/api/v2/search?' + parts.concat(_unifiedFilterParts()).join('&');
    }

    // Filter params of the unified search, shared with /api/v2/search/facets
    // (see buildFacetsUrl) so both always describe the exact same card set.
    function _unifiedFilterParts() {
        var parts = [];
        (_factionDirty ? filters.faction : DEFAULT_FACTIONS).forEach(function(v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        expandTypes(_typeDirty ? filters.type : DEFAULT_TYPES).forEach(function(v) {
            parts.push('cardType[]=' + encodeURIComponent(v));
        });
        (_rarityDirty ? filters.rarity : DEFAULT_RARITIES).forEach(function(v) {
            parts.push('rarity[]=' + encodeURIComponent(v));
        });
        (_setsDirty ? filters.sets : DEFAULT_SETS).slice().reverse().forEach(function(v) {
            parts.push('set[]=' + encodeURIComponent(v));
        });
        filters.keywords.forEach(function(v) {
            parts.push('keywords[]=' + encodeURIComponent(KEYWORD_TO_UNIFIED[v] || v));
        });
        if (filters.keywords.length > 1 && filters.keywordMode === 'and') {
            parts.push('keywordMode=and');
        }
        _appendSubtypesParts(parts);
        filters.variations.forEach(function(v) {
            if (v !== 'kickstarter') parts.push('variation[]=' + encodeURIComponent(v));
        });

        NUM_FIELDS.forEach(function(f) {
            numUniquesParts(f.api, filters[f.key]).forEach(function(p) { parts.push(p); });
        });
        _appendCostRelationPart(parts);
        _statusFilterParts().forEach(function(p) { parts.push(p); });
        if (filters.hasNoEffect) parts.push('hasNoEffect=true');

        if (filters.q) parts.push('name=' + encodeURIComponent(filters.q));

        return parts;
    }

    function _appendSubtypesParts(parts) {
        filters.subtypes.forEach(function(v) { parts.push('subTypes[]=' + encodeURIComponent(v)); });
    }

    function _appendCostRelationPart(parts) {
        if (filters.costRelation === 'eq')             parts.push('costRelation=equal');
        else if (filters.costRelation === 'main_gt')   parts.push('costRelation=mainHigher');
        else if (filters.costRelation === 'recall_gt') parts.push('costRelation=recallHigher');
    }

    function _effectCovers(a, b) {
        var part = function(x, y) {
            return !x.length || (y.length > 0 && y.every(function(id) { return x.indexOf(id) >= 0; }));
        };
        return part(a.trigger, b.trigger) && part(a.condition, b.condition) && part(a.effect, b.effect);
    }

    function _uniquesEffectMatchCounts(effects) {
        return effects.map(function(e, i) {
            var count = 1;
            for (var j = 0; j < effects.length; j++) {
                if (j !== i && _effectCovers(e, effects[j])) count++;
            }
            return Math.min(count, 3);
        });
    }

    // Shared query parts for rust-cards-api, used by both /api/v2/cards (via
    // buildUniquesApiUrl) and /api/v2/effects/filtered (which reads the exact same
    // filter params, plus its own 'editing' param — see buildEffectsFilteredUrl).
    // effectMode is not sent: rows always combine with AND, the API's default when
    // effectMode is omitted. Each effect field is a comma-separated OR list — one
    // row is one slot, no cartesian expansion needed (see _cartesianEffectSlots()
    // for why the old Cards API needs that instead).
    function _uniquesFilterParts() {
        var parts = [];
        (_factionDirty ? filters.faction : DEFAULT_FACTIONS).forEach(function(v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        // Drop sets the uniques API doesn't know about (cfg.noUniqueSets, from
        // sets[X].uniques === false). Their quick-filter button is already
        // hidden on this tab, but the selection survives a switch from another
        // tab — and a single unknown set makes the API reject the whole query
        // with HTTP 400 "invalid set value", breaking the search entirely.
        var _noUniq = cfg.noUniqueSets || [];
        (_setsDirty ? filters.sets : DEFAULT_SETS)
            .filter(function(v) { return _noUniq.indexOf(v) < 0; })
            .forEach(function(v) { parts.push('set[]=' + encodeURIComponent(v)); });

        _appendSubtypesParts(parts);

        NUM_FIELDS.forEach(function(f) {
            numUniquesParts(f.api, filters[f.key]).forEach(function(p) { parts.push(p); });
        });
        _appendCostRelationPart(parts);
        if (filters.hasNoEffect) parts.push('hasNoEffect=true');

        _readEffectRows();
        var _efCounts = _uniquesEffectMatchCounts(filters.effects);
        filters.effects.forEach(function(ef, i) {
            if (ef.trigger.length)   parts.push('effect[' + i + '][t]=' + ef.trigger.map(encodeURIComponent).join(','));
            if (ef.condition.length) parts.push('effect[' + i + '][c]=' + ef.condition.map(encodeURIComponent).join(','));
            if (ef.effect.length)    parts.push('effect[' + i + '][o]=' + ef.effect.map(encodeURIComponent).join(','));
            if (_efCounts[i] > 1)    parts.push('effect[' + i + '][matchCount]=' + _efCounts[i]);
        });

        _readSupportRow();
        if (filters.support.trigger.length)   parts.push('support[t]=' + filters.support.trigger.map(encodeURIComponent).join(','));
        if (filters.support.condition.length) parts.push('support[c]=' + filters.support.condition.map(encodeURIComponent).join(','));
        if (filters.support.effect.length)    parts.push('support[o]=' + filters.support.effect.map(encodeURIComponent).join(','));

        if (filters.q) parts.push('name=' + encodeURIComponent(filters.q));
        if (filters.format) parts.push('format=' + encodeURIComponent(filters.format));
        return parts;
    }

    // build rust-cards-api (Uniques tab) URL — cursor-based, no page/random/keyword/
    // variation/status (unsupported by that API; the matching UI controls are hidden
    // on this tab, see includes/card-search.php).
    function buildUniquesApiUrl(cursor) {
        var parts = ['limit=' + PER_PAGE];
        if (cursor != null) parts.push('cursor=' + cursor);
        var uPrimary = filters.sort === 'default' ? DEFAULT_SORT_1 : filters.sort;
        var uSort = UNIQUES_SORT_MAP[uPrimary];
        if (uSort) parts.push('sort=' + encodeURIComponent(uSort));
        parts = parts.concat(_uniquesFilterParts());
        return UNIQUES_API_BASE + '/api/v2/cards?' + parts.join('&');
    }

    // Per-combobox autocomplete narrowing: given the current filter state and which
    // effect box is being edited, /api/v2/effects/filtered returns just the idGds
    // for that box that would still yield a matching card. slot is a row index
    // (matching effect[N]) or the literal 'support' (unused here — this site has no
    // support/echo effect UI).
    function buildEffectsFilteredUrl(part, slot) {
        var parts = _uniquesFilterParts();
        parts.push('editing=' + encodeURIComponent(part + ':' + slot));
        return UNIQUES_API_BASE + '/api/v2/effects/filtered?' + parts.join('&');
    }

    // Subtype facets: /api/v2/search/facets takes the same filters as the search and
    // returns how many matching cards each subtype keeps. It ignores subTypes[] itself
    // (its values are OR'd), so picking one subtype keeps the others on offer.
    // null when the active tab/scope doesn't go through uniques-search-api (old Cards
    // API, collection/favorites proxies, exact reference lookup): every subtype is
    // offered then.
    function buildFacetsUrl() {
        if (!UNIQUES_API_BASE) return null;
        if (filters.q && /^ALT_[A-Z0-9_]+$/i.test(filters.q)) return null;
        if (_tab === 'unique') {
            return UNIQUES_API_BASE + '/api/v2/search/facets?'
                + ['kind=unique'].concat(_uniquesFilterParts()).join('&');
        }
        if (_scopeFavoris || (_scopeCollection && scopeApiUrl())) return null;
        return UNIQUES_API_BASE + '/api/v2/search/facets?' + _unifiedFilterParts().join('&');
    }

    // Hide the subtypes that no longer lead to any card with the current filters.
    function refreshSubtypeFacets() {
        if (!tsInst.subtype || !_subtypeOptions) return;
        if (_facetsAbort) _facetsAbort.abort();
        _facetsAbort = null;
        var url = buildFacetsUrl();
        if (!url) { applySubtypeFacets(null); return; }
        var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        _facetsAbort = ctrl;
        if (DEBUG) console.log('[CardSearch] Facets API call:', url);
        fetch(url, ctrl ? { signal: ctrl.signal } : {})
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(data) {
                if (_facetsAbort === ctrl) _facetsAbort = null;
                applySubtypeFacets((data && data.subTypes) || {});
            })
            .catch(function(err) {
                if (err && err.name === 'AbortError') return;
                if (_facetsAbort === ctrl) _facetsAbort = null;
                if (DEBUG) console.warn('[CardSearch] Facets API failed:', err);
                // Never leave subtypes hidden because of a failed call.
                applySubtypeFacets(null);
            });
    }

    // counts: { SUBTYPE: n } from the API, or null to offer every subtype. Options
    // are disabled (and hidden by the subtype option renderer) rather than removed,
    // so they keep their original order. Selected subtypes always stay visible so
    // they can be unselected.
    function applySubtypeFacets(counts) {
        var ts = tsInst.subtype;
        if (!ts || !_subtypeOptions) return;
        var selected = ts.items || [];
        _subtypeOptions.forEach(function(o) {
            var off = !!counts && !(counts[o.value] > 0) && selected.indexOf(o.value) < 0;
            var cur = ts.options[o.value];
            if (!cur || !!cur.disabled === off) return;
            ts.updateOption(o.value, Object.assign({}, cur, { disabled: off }));
        });
        if (ts.isOpen) ts.refreshOptions(false);
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
        expandTypes(_typeDirty ? filters.type : []).forEach(function(v) { parts.push('cardType[]=' + encodeURIComponent(v)); });
        (_rarityDirty ? filters.rarity : []).forEach(function(v) { parts.push('rarity[]='   + encodeURIComponent(v)); });
        // Both ownership and collection proxies support multi-value cardSet[] arrays, so
        // send DEFAULT_SETS when sets haven't been touched to stay aligned with active UI chips.
        (_setsDirty ? filters.sets : DEFAULT_SETS).forEach(function(v) { parts.push('cardSet[]='  + encodeURIComponent(v)); });
        filters.subtypes.forEach(function(v)  { parts.push('subTypes[]='  + encodeURIComponent(v)); });
        // The collection API filters variation by exact match and can't express "any
        // variation", which would hide promos/alt-arts. Omit it entirely on the collection
        // scope so every owned printing (incl. promos) shows. The ownership API supports
        // variation IN, so it still gets the filter (driven by the promo toggle there).
        if (_scope === 'ownership') {
            filters.variations.forEach(function(v){ parts.push('variation[]=' + encodeURIComponent(v)); });
        }

        _statusFilterParts().forEach(function(p) { parts.push(p); });

        // Numeric filters: collection and ownership proxies both handle exact,
        // bracketed bounds ([gte]/[lte]/[gt]/[lt]), and discrete arrays for disjoint lists.
        NUM_FIELDS.forEach(function(f) {
            numProxyParts(f.api, filters[f.key]).forEach(function(p) { parts.push(p); });
        });

        if (filters.q) parts.push('name=' + encodeURIComponent(filters.q));

        return scopeApiUrl() + '?' + parts.join('&');
    }

    // build favorites proxy URL — no search engine, just paginated favorites +
    // optional Set/Faction/Rarity filters (only when the user explicitly picked them).
    function buildFavApiUrl(page) {
        var parts = [
            'locale='       + encodeURIComponent(LANG),
            'page='         + page,
            'itemsPerPage=' + PER_PAGE,
        ];
        if (_factionDirty) filters.faction.forEach(function(v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        if (_rarityDirty)  filters.rarity.forEach(function(v)  { parts.push('rarity[]='  + encodeURIComponent(v)); });
        if (_setsDirty)    filters.sets.forEach(function(v)    { parts.push('set[]='     + encodeURIComponent(v)); });
        return cfg.favApiUrl + '?' + parts.join('&');
    }

    // ── Favorites star button ─────────────────────────────────────────────────
    function _applyFavBtnState(btn, isFav) {
        btn.classList.toggle('is-fav', !!isFav);
        var icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-solid',   !!isFav);
            icon.classList.toggle('fa-regular', !isFav);
        }
    }
    function _makeFavButton(card) {
        if (!cfg.favoritesEnabled || !card) return null;
        var ref = card.reference || '';
        if (!ref) return null;
        var isFav = !!(cfg.favoritesData && cfg.favoritesData[ref]);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'card-fav-btn' + (isFav ? ' is-fav' : '');
        b.setAttribute('data-fav-toggle', '');
        b.dataset.ref = ref;
        // Real codes from the card (faction correct even for transfuges). The cards API returns
        // faction/rarity/set as nested objects; tolerate a plain string too.
        b.dataset.faction = (card.faction && card.faction.code) || card.factionCode || '';
        b.dataset.rarity  = (card.rarity && card.rarity.reference) || (typeof card.rarity === 'string' ? card.rarity : '') || '';
        b.dataset.set     = (card.set && card.set.reference) || ref.split('_')[1] || '';
        b.title = (cfg.txt && cfg.txt.favorite) || 'Favori';
        b.innerHTML = '<i class="' + (isFav ? 'fa-solid' : 'fa-regular') + ' fa-star"></i>';
        b.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); _toggleFav(b); });
        return b;
    }
    if (cfg.favoritesEnabled) window.acMakeFavButton = _makeFavButton;

    // Persist a favorite toggle to our DB, then sync the UI.
    function _toggleFav(btn) {
        if (!cfg.favoritesEnabled || !cfg.favToggleUrl) return;
        var ref = btn.dataset.ref;
        if (!ref || btn.disabled) return;
        btn.disabled = true;
        var body = new URLSearchParams();
        body.append('csrf_token', cfg.favoritesCsrf || '');
        body.append('card_ref',   ref);
        body.append('faction',    btn.dataset.faction || '');
        body.append('rarity',     btn.dataset.rarity  || '');
        body.append('card_set',   btn.dataset.set     || '');
        fetch(cfg.favToggleUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    body.toString(),
        })
        .then(function(r) {
            if (r.status === 401) {
                cfg.favoritesEnabled = false;
                if (window.acNotifyAuthExpired) window.acNotifyAuthExpired();
                return null;
            }
            return r.ok ? r.json() : null;
        })
        .then(function(data) {
            btn.disabled = false;
            if (!data || !data.ok) return;
            cfg.favoritesData = cfg.favoritesData || {};
            if (data.favorited) cfg.favoritesData[ref] = true;
            else                delete cfg.favoritesData[ref];
            qa('[data-fav-toggle][data-ref="' + ref + '"]').forEach(function(b) {
                _applyFavBtnState(b, data.favorited);
            });
            // In the Favorites tab, refresh so the removed card + count + pagination stay accurate.
            if (_scopeFavoris && !data.favorited) {
                var onPage     = elGrid ? elGrid.children.length : 0;
                var targetPage = (onPage <= 1 && currentPage > 1) ? currentPage - 1 : currentPage;
                search(targetPage);
            }
        })
        .catch(function() { btn.disabled = false; });
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
        if (filters.isBanned)          parts.push('isBanned=true');
        if (filters.isErrated)         parts.push('isErrated=true');
        if (filters.isSuspended)       parts.push('isSuspended=true');
        if (filters.bannedOrSuspended) parts.push('bannedOrSuspended=true');
        if (filters.hasNoEffect)       parts.push('hasNoEffect=true');
        if (filters.costRelation)      parts.push('costRelation=' + encodeURIComponent(filters.costRelation));
        if (filters.format)            parts.push('format='       + encodeURIComponent(filters.format));
        if (filters.keywordMode === 'and' && filters.keywords.length > 1) parts.push('kwMode=and');
        if (!_scopeCollection && !_scopeFavoris && filters.sort && filters.sort !== 'default' && filters.sort !== DEFAULT_SORT_1 && !((_tab === 'unique' || (_tab === 'all' && !!UNIQUES_API_BASE)) && filters.sort === 'random')) {
            parts.push('sort=' + encodeURIComponent(filters.sort));
        }
        if (page > 1) parts.push('page=' + page);
        return location.pathname + (parts.length ? '?' + parts.join('&') : '');
    }

    // read TomSelect values into filters (only overwrite when the matching <select> exists)
    function readTsValues() {
        function readSel(key, field) {
            var el = document.getElementById(P + '-filter-' + key);
            if (!el) return;
            filters[field] = Array.from(el.selectedOptions).map(function(o) { return o.value; });
        }
        readSel('set',       'sets');
        if (tsInst.faction) readSel('faction', 'faction');
        readSel('subtype',   'subtypes');
        readSel('keyword',   'keywords');
        readSel('variation', 'variations');
        // Numeric filters: read the raw text expression (null when empty) and mark invalid expressions.
        NUM_FIELDS.forEach(function(f) {
            var el = document.getElementById(P + '-filter-' + f.id);
            var raw = el ? el.value.trim() : '';
            filters[f.key] = raw !== '' ? raw : null;
            if (el) el.classList.toggle('is-invalid', raw !== '' && !numExprActive(raw));
        });
        // Card status is held by data-bool-filter buttons (set on click); nothing to read here.
        var hneEl = document.getElementById(P + '-filter-hasnoeffect');
        filters.hasNoEffect = hneEl ? hneEl.checked : false;
        filters.keywordMode = 'and';
        var _crEl = document.getElementById(P + '-filter-cost-relation');
        filters.costRelation = _crEl ? _crEl.value : '';
        _readEffectRows();
        _readSupportRow();
    }

    // "Toutes les cartes" has a plain Unique rarity toggle that quietly returns
    // basic results — the dedicated Uniques tab (format/effect/support-effect
    // search) is one click away but easy to miss. Nudge toward it whenever
    // Unique is selected while still on the "all" tab. On the Uniques tab
    // itself (deckbuilder only), swap to a warning instead when the deck's
    // format doesn't allow Uniques at all (cfg.getFormatLegality().maxUnique
    // === 0) — no data-tabs attribute on the banner on purpose, so this stays
    // the one place deciding its visibility (see card-search.php comment).
    function _syncUniqueNudge() {
        var el = document.getElementById(P + '-unique-banner');
        if (!el) return;
        var nudgeEl   = el.querySelector('.cs-unique-banner-nudge');
        var blockedEl = el.querySelector('.cs-unique-banner-blocked');
        var legality = cfg.getFormatLegality ? cfg.getFormatLegality() : null;
        var blocked = !!(legality && legality.maxUnique === 0);
        var show;
        if (_tab === 'unique')    show = blocked;
        else if (_tab === 'all')  show = _rarityDirty && filters.rarity.indexOf('UNIQUE') >= 0;
        else                      show = false;
        el.style.display = show ? '' : 'none';
        if (nudgeEl)   nudgeEl.style.display   = (show && !blocked) ? '' : 'none';
        if (blockedEl) blockedEl.style.display = (show && blocked)  ? '' : 'none';
    }

    // filter count badge
    function updateFilterCount() {
        readTsValues();
        _syncUniqueNudge();
        var isUniques = _tab === 'unique';
        var _noUniq = cfg.noUniqueSets || [];
        var setsCount = !_setsDirty ? 0 : (isUniques
            ? filters.sets.filter(function(v) { return _noUniq.indexOf(v) < 0; }).length
            : filters.sets.length);
        var n = (_factionDirty ? filters.faction.length : 0)
            + (!isUniques && _typeDirty   ? filters.type.length   : 0)
            + (!isUniques && _rarityDirty ? filters.rarity.length : 0)
            + NUM_FIELDS.reduce(function(acc, f) { return acc + (numExprActive(filters[f.key]) ? 1 : 0); }, 0)
            + setsCount + filters.subtypes.length + (isUniques ? 0 : filters.keywords.length)
            + (!isUniques && _variationDirty ? filters.variations.length : 0) + (!isUniques && _collDirty ? 1 : 0)
            + (!isUniques && filters.isBanned ? 1 : 0) + (!isUniques && filters.isErrated ? 1 : 0)
            + (!isUniques && filters.isSuspended ? 1 : 0) + (!isUniques && filters.bannedOrSuspended ? 1 : 0)
            + (filters.hasNoEffect ? 1 : 0)
            + (filters.costRelation ? 1 : 0)
            + (filters.format ? 1 : 0)
            + filters.effects.length
            + (filters.support.trigger.length || filters.support.condition.length || filters.support.effect.length ? 1 : 0);
        if (elFilterCount) {
            elFilterCount.textContent = n || '';
            elFilterCount.style.display = n > 0 ? '' : 'none';
        }
        // Advanced-accordion badge: count of filters living inside the accordion.
        var advN = filters.subtypes.length + (isUniques ? 0 : filters.keywords.length)
            + (!isUniques && filters.isBanned ? 1 : 0) + (!isUniques && filters.isErrated ? 1 : 0)
            + (!isUniques && filters.isSuspended ? 1 : 0) + (!isUniques && filters.bannedOrSuspended ? 1 : 0)
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
            sep.style.cssText = 'width:1px;background:var(--ac-color-border-dashed);align-self:stretch;margin:0 4px';
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
        fbEl.style.color = 'color-mix(in srgb, var(--ac-color-on-strong) 50%, transparent)';

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
                fbEl.style.color = 'var(--ac-cards-status-complete)';
                setTimeout(function() { fbEl.textContent = ''; }, 2000);
                onSuccess(newQty, newEid);
            } else {
                fbEl.textContent = '✗';
                fbEl.style.color = 'var(--ac-cards-status-missing)';
            }
        })
        .catch(function() {
            btn1.disabled = false;
            btn2.disabled = false;
            fbEl.textContent = '✗';
            fbEl.style.color = 'var(--ac-cards-status-missing)';
        });
    }

    // render card (cards mode)
    // Lazily mounts/unmounts the <altered-card> renderer for a unique-card wrap based on
    // viewport proximity. rootMargin gives a buffer so cards mount just before they scroll
    // into view and only unmount once well outside it (no pop-in on ordinary scrolling).
    function ensureCardVisObserver() {
        if (_cardVisObserver || typeof IntersectionObserver === 'undefined') return;
        _cardVisObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) mountUniqueCard(entry.target);
                else unmountUniqueCard(entry.target);
            });
        }, { rootMargin: '600px 0px 600px 0px' });
    }

    function mountUniqueCard(wrap) {
        if (wrap.querySelector('altered-card')) return;
        ensureRenderer();
        var ac = document.createElement('altered-card');
        ac.setAttribute('ref', wrap.dataset.ref);
        ac.setAttribute('locale', rendererLocale());
        wrap.insertBefore(ac, wrap.firstChild);
    }

    function unmountUniqueCard(wrap) {
        var ac = wrap.querySelector('altered-card');
        if (ac) wrap.removeChild(ac);
    }

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
            ensureCardVisObserver();
            if (_cardVisObserver) {
                _cardVisObserver.observe(wrap);
            } else {
                // No IntersectionObserver support: fall back to mounting eagerly.
                ensureRenderer();
                var ac = document.createElement('altered-card');
                ac.setAttribute('ref', ref);
                ac.setAttribute('locale', rendererLocale());
                wrap.appendChild(ac);
            }
        } else {
            var img = document.createElement('img');
            img.src = cdnUrl(ref);
            img.alt = name;
            img.loading = 'lazy';
            wrap.appendChild(img);
        }

        // Favorite star — top-right (visible on hover / when favorited)
        var favBtn = _makeFavButton(card);
        if (favBtn) wrap.appendChild(favBtn);

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

    // "Load more" footer for the Uniques tab (replaces numbered renderPagination()
    // for this tab — the API is cursor-based, no arbitrary page jump).
    function renderLoadMore(hasMore) {
        if (!elPagin) return;
        elPagin.innerHTML = '';
        if (!hasMore) { elPagin.style.setProperty('display', 'none', 'important'); return; }
        elPagin.style.removeProperty('display');
        var btn = document.createElement('button');
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.textContent = txt.load_more || (UI_LANG === 'fr' ? 'Charger plus' : 'Load more');
        btn.onclick = function() { searchUnique(true, true); };
        elPagin.appendChild(btn);
    }

    // Uniques tab search (rust-cards-api). append=false: fresh search, clears the
    // grid. append=true: "load more" click, appends to the grid using _uniqueCursor.
    function searchUnique(append, skipPushState) {
        if (_abortCtrl) { _abortCtrl.abort(); }
        _abortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;

        if (!append) {
            if (elInitial)   elInitial.style.display   = 'none';
            if (elEmpty)     elEmpty.style.display     = 'none';
            if (elError)     elError.style.display     = 'none';
            if (elAuthError) elAuthError.style.display = 'none';
            if (elGrid)      elGrid.style.display      = 'none';
            if (elPagin)   elPagin.style.setProperty('display', 'none', 'important');
            if (cfg.closeFiltersOnSearch) hideFilterModal();
        }
        if (elLoading) elLoading.style.display = 'block';
        if (cfg.onSearchStart) cfg.onSearchStart();

        if (!append && MODE === 'cards' && cfg.pushState && !skipPushState) {
            history.pushState({ page: 1 }, '', buildPageUrl(1));
        }

        var opts = _abortCtrl ? { signal: _abortCtrl.signal } : {};

        // Reference lookup: an exact ALT_... reference bypasses the name filter
        // (which only matches character names, not references) and every other
        // filter, same as buildApiUrl()'s old-API reference bypass above.
        var refMatch = !append && filters.q && /^ALT_[A-Z0-9_]+$/i.test(filters.q);
        var url, resp;
        if (refMatch) {
            url  = UNIQUES_API_BASE + '/api/v2/card/' + encodeURIComponent(filters.q.toUpperCase());
            resp = fetch(url, opts).then(function(r) {
                if (r.status === 404 || r.status === 400) return { iter: { total: 0 }, cards: [] };
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json().then(function(card) { return { iter: { total: 1 }, cards: [card] }; });
            });
        } else {
            url  = buildUniquesApiUrl(append ? _uniqueCursor : null);
            resp = fetch(url, opts).then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
        }

        if (DEBUG) console.log('[CardSearch] Uniques API call:', url);
        resp
            .then(function(data) {
                if (DEBUG) console.log('[CardSearch] Uniques API response:', data);
                if (elLoading) elLoading.style.display = 'none';
                _abortCtrl = null;

                var cards = data.cards || [];
                var total = (data.iter && data.iter.total) || 0;
                _uniqueCursor = data.iter && data.iter.cursor;

                if (!append && !cards.length) {
                    if (elEmpty) elEmpty.style.display = 'block';
                    if (elCount) elCount.textContent = '';
                    if (cfg.onEmpty) cfg.onEmpty();
                    renderLoadMore(false);
                    return;
                }

                if (elGrid) {
                    if (!append) {
                        if (_cardVisObserver) _cardVisObserver.disconnect();
                        elGrid.innerHTML = '';
                    }
                    cards.forEach(function(c) {
                        var norm = normalizeCard(c);
                        var el = (MODE === 'deck' && cfg.renderDeckCard)
                            ? cfg.renderDeckCard(norm)
                            : renderCard(norm);
                        if (el) elGrid.appendChild(el);
                    });
                    elGrid.style.display = '';
                }

                renderLoadMore(_uniqueCursor != null);

                if (elCount) {
                    elCount.textContent = cfg.formatCount
                        ? cfg.formatCount(total)
                        : (txt.showing ? String(txt.showing).replace('%d', total) : total);
                }

                if (cfg.onCardsRendered) cfg.onCardsRendered(cards);
            })
            .catch(function(err) {
                if (err && err.name === 'AbortError') return;
                if (elLoading) elLoading.style.display = 'none';
                if (err && err.isAuth && elAuthError) elAuthError.style.display = 'block';
                else if (elError) elError.style.display = 'block';
                if (cfg.onError) cfg.onError(err);
                _abortCtrl = null;
            });
    }

    function _firstInvalidNumInput() {
        if (_scopeFavoris) return null;
        for (var i = 0; i < NUM_FIELDS.length; i++) {
            var f = NUM_FIELDS[i];
            var raw = filters[f.key];
            if (raw != null && String(raw).trim() !== '' && !numExprActive(raw)) {
                return document.getElementById(P + '-filter-' + f.id) || true;
            }
        }
        return null;
    }

    // main search
    function search(page, skipPushState) {
        // The playset tab shows a dashboard, not the result grid — never query.
        if (_tab === 'playset') return;
        updateScopeUi();
        readTsValues();
        // Do not silently fire an unfiltered query when a typed mana/power expression is invalid.
        var badNum = _firstInvalidNumInput();
        if (badNum) {
            if (badNum !== true && typeof badNum.focus === 'function') badNum.focus();
            return;
        }
        currentPage = page || 1;
        refreshSubtypeFacets();

        // Uniques tab → rust-cards-api (cursor-based "load more"). Falls through to
        // the code below (old Cards API, numbered pagination) when UNIQUES_API_BASE
        // isn't configured (e.g. no local dev backend wired up yet).
        if (_tab === 'unique' && UNIQUES_API_BASE) {
            _uniqueCursor = null;
            searchUnique(false, skipPushState);
            return;
        }

        if (_abortCtrl) { _abortCtrl.abort(); }
        _abortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;

        if (elInitial)   elInitial.style.display    = 'none';
        if (elEmpty)     elEmpty.style.display      = 'none';
        if (elError)     elError.style.display      = 'none';
        if (elAuthError) elAuthError.style.display  = 'none';
        if (elGrid)      elGrid.style.display       = 'none';
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
                if (r.status === 401) {
                    if (window.acNotifyAuthExpired) window.acNotifyAuthExpired();
                    var authErr = new Error('HTTP 401');
                    authErr.isAuth = true;
                    throw authErr;
                }
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(data) {
                if (DEBUG) console.log('[CardSearch] API response:', data);
                if (elLoading) elLoading.style.display = 'none';
                _abortCtrl = null;

                var cards      = data.member     || data.cards || [];
                var totalItems = parseInt((data.totalItems != null ? data.totalItems : (data.iter && data.iter.total)) || 0, 10);
                var totalPages = totalItems > 0 ? Math.ceil(totalItems / PER_PAGE) : 1;

                if (!cards.length) {
                    if (elEmpty) elEmpty.style.display = 'block';
                    if (elCount) elCount.textContent = '';
                    if (cfg.onEmpty) cfg.onEmpty();
                    renderPagination(currentPage, totalPages);
                    return;
                }

                if (elGrid) {
                    if (_cardVisObserver) _cardVisObserver.disconnect();
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
                if (err && err.isAuth && elAuthError) elAuthError.style.display = 'block';
                else if (elError) elError.style.display = 'block';
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
        qa('.filter-toggle[data-filter="format"]').forEach(function(b) {
            b.classList.toggle('active', b.dataset.value === (filters.format || ''));
        });
        var _crSync = document.getElementById(P + '-filter-cost-relation');
        if (_crSync) _crSync.value = filters.costRelation || '';
        if (tsInst.set && !_setsDirty) tsInst.set.setValue(DEFAULT_SETS, true);
    }

    function setFormat(val) {
        var next = val ? String(val) : '';
        filters.format = next;
        qa('.filter-toggle[data-filter="format"]').forEach(function(b) {
            b.classList.toggle('active', b.dataset.value === next);
        });
        updateFilterCount();
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────
    function syncTabButtons() {
        qa('.cs-tab[data-tab]').forEach(function(b) {
            b.classList.toggle('active', b.dataset.tab === _tab);
        });
    }

    // Show/hide filter blocks based on the active tab. Each block opts in via
    // data-tabs="all unique collection ownership".
    // Use !important when hiding so Bootstrap utility classes (e.g. .d-flex on
    // the sort wrapper or hasNoEffect checkbox) cannot override display:none.
    function applyTabVisibility() {
        if (!_root) return;
        _root.querySelectorAll('[data-tabs]').forEach(function(el) {
            var tabs = el.getAttribute('data-tabs').split(/\s+/);
            if (tabs.indexOf(_tab) >= 0) {
                el.style.removeProperty('display');
            } else {
                el.style.setProperty('display', 'none', 'important');
            }
        });
        // Format only makes sense against rust-cards-api; hide it when falling back
        // to the old Cards API (no UNIQUES_API_BASE configured), even on the Uniques tab.
        var elFormatWrap = document.getElementById(P + '-format-wrap');
        if (elFormatWrap && !UNIQUES_API_BASE) elFormatWrap.style.display = 'none';
        // Hide the promo sub-panel when switching to a tab that does not offer showPromo.
        var elPromoPanel = document.getElementById(P + '-promo-panel');
        if (elPromoPanel) {
            if (_tab !== 'all' && _tab !== 'ownership') {
                elPromoPanel.style.setProperty('display', 'none', 'important');
            } else {
                elPromoPanel.style.removeProperty('display');
                elPromoPanel.style.display = filters.showPromo ? '' : 'none';
            }
        }
    }

    // Switch tab. Normally callers call resetFilters() first so filters from the old
    // tab don't carry over; pass keepFilters=true when restoring from the URL.
    function setTab(t, keepFilters) {
        _tab = (t === 'unique' || t === 'collection' || t === 'ownership' || t === 'favoris' || t === 'playset') ? t : 'all';
        setScope(_tab === 'collection' || _tab === 'ownership' || _tab === 'favoris' ? _tab : 'all');
        if (_tab === 'unique') {
            if (!keepFilters) {
                if (!_rarityDirty) { _rarityDirty = true; filters.rarity = (cfg.uniqueRarity || ['UNIQUE']).slice(); }
                if (!_typeDirty)   { _typeDirty   = true; filters.type   = (cfg.uniqueType   || ['CHARACTER']).slice(); }
            }
            // Also include extra Uniques-only sets (e.g. COREKS) on direct ?tab=unique loads
            // when no explicit set[] was supplied in the URL.
            var _uExtra = cfg.uniqueExtraSets || [];
            if (_uExtra.length && !_setsDirty) {
                _setsDirty = true;
                filters.sets = DEFAULT_SETS.slice();
                _uExtra.forEach(function(s) { if (filters.sets.indexOf(s) < 0) filters.sets.push(s); });
                if (tsInst.set) tsInst.set.setValue(filters.sets, true);
            }
        }
        if (_tab === 'ownership' && !keepFilters) {
            setShowPromo(true);
            var _promoT = document.getElementById(P + '-promo-toggle');
            if (_promoT) _promoT.checked = true;
        }
        syncTabButtons();
        applyTabVisibility();
        updateScopeUi();
        syncDefaultsToUi();
        updateFilterCount();
        // The playset dashboard replaces the result grid. applyTabVisibility has
        // already toggled the [data-tabs] blocks (search box, control bar,
        // dashboard); here we just clear any leftover search results and lazily
        // load the dashboard data.
        if (_tab === 'playset') {
            if (elGrid)  elGrid.style.display = 'none';
            if (elPagin) elPagin.style.setProperty('display', 'none', 'important');
            [elLoading, elInitial, elEmpty, elError, elAuthError].forEach(function(e) { if (e) e.style.display = 'none'; });
            // search() (which normally syncs the URL) is a no-op here, so reflect
            // the active tab ourselves — unless we're restoring from the URL.
            if (!keepFilters && cfg.pushState && MODE === 'cards') {
                history.pushState({ page: 1 }, '', buildPageUrl(1));
            }
            if (_playset) _playset.load();
        }
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
        filters.bannedOrSuspended = false;
        filters.hasNoEffect    = false;
        filters.effects        = [];
        filters.support         = { trigger: [], condition: [], effect: [] };
        filters.format          = '';
        filters.costRelation   = '';
        filters.showPromo      = false;
        filters.sort           = 'default';

        if (elSearch)     elSearch.value     = '';
        if (elSortSelect) elSortSelect.value = 'default';

        setScope('all');
        syncScopeButtons();

        qa('.filter-toggle[data-filter="faction"]').forEach(function(b) { b.classList.remove('active'); });
        qa('.filter-toggle[data-bool-filter]').forEach(function(b) { b.classList.remove('active'); });
        qa('.cs-switch[data-bool-filter] input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
        qa('.filter-toggle[data-filter="format"]').forEach(function(b) { b.classList.toggle('active', b.dataset.value === ''); });

        ['faction','subtype','keyword'].forEach(function(k) {
            if (tsInst[k]) tsInst[k].clear(true);
        });
        NUM_FIELDS.forEach(function(f) {
            var el = document.getElementById(P + '-filter-' + f.id);
            if (el) { el.value = ''; el.classList.remove('is-invalid'); }
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
        _variationDirty = p.has('variation[]');

        var _urlTab = p.get('tab');
        if (_urlTab === 'collection' && !cfg.collApiUrl)      _urlTab = null;
        if (_urlTab === 'ownership'  && !cfg.ownershipApiUrl) _urlTab = null;
        if (_urlTab === 'favoris'    && !cfg.favApiUrl)       _urlTab = null;
        if (_urlTab === 'playset'    && !cfg.playsetApiUrl)   _urlTab = null;
        var resolvedTab = (_urlTab && /^(unique|collection|ownership|favoris|playset)$/.test(_urlTab)) ? _urlTab : 'all';

        filters.q              = p.get('q') || '';
        filters.faction        = _factionDirty ? p.getAll('faction[]') : DEFAULT_FACTIONS.slice();
        filters.type           = _typeDirty   ? p.getAll('type[]')   : DEFAULT_TYPES.slice();
        filters.rarity         = _rarityDirty ? p.getAll('rarity[]') : (resolvedTab === 'ownership' ? [] : DEFAULT_RARITIES.slice());
        filters.mainCost   = p.get('mainCost')   || null;
        filters.recallCost = p.get('recallCost') || null;
        filters.forest     = p.get('forest')     || null;
        filters.mountain   = p.get('mountain')   || null;
        filters.ocean      = p.get('ocean')      || null;
        filters.sets           = _setsDirty ? p.getAll('set[]') : DEFAULT_SETS.slice();
        filters.subtypes       = p.getAll('subtype[]');
        filters.keywords       = p.getAll('keyword[]');
        filters.keywordMode    = p.get('kwMode') === 'or' ? 'or' : 'and';
        filters.variations     = _variationDirty ? p.getAll('variation[]') : DEFAULT_VARIATIONS.slice();
        filters.isBanned       = p.get('isBanned')          === 'true';
        filters.isErrated      = p.get('isErrated')         === 'true';
        filters.isSuspended    = p.get('isSuspended')       === 'true';
        filters.bannedOrSuspended = p.get('bannedOrSuspended') === 'true';
        filters.hasNoEffect    = p.get('hasNoEffect')       === 'true';
        filters.costRelation   = p.get('costRelation')      || '';
        filters.format         = p.get('format')            || '';
        filters.showPromo      = p.get('promo')             === 'true';
        filters.sort           = p.get('sort') || 'default';
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

        var _crRestore = document.getElementById(P + '-filter-cost-relation');
        if (_crRestore) _crRestore.value = filters.costRelation || '';
        var _hneRestore = document.getElementById(P + '-filter-hasnoeffect');
        if (_hneRestore) _hneRestore.checked = !!filters.hasNoEffect;
        var _promoRestore = document.getElementById(P + '-promo-toggle');
        if (_promoRestore) _promoRestore.checked = !!filters.showPromo;
        var _promoPanelR = document.getElementById(P + '-promo-panel');
        if (_promoPanelR) _promoPanelR.style.display = filters.showPromo ? '' : 'none';
        if (filters.showPromo) syncPromoDropdown();

        setTab(resolvedTab, true);

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
                    return '<div style="border-top:1px solid var(--ac-color-border);margin:4px 0;padding:0;height:0;overflow:hidden"></div>';
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

        _subtypeOptions = (opts.subtypeOptions || []).slice();
        tsInst.subtype   = makeTs('subtype',   {
            options: _subtypeOptions,
            items: opts.initialSubtypes || [],
            placeholder: txt.lbl_subtype || 'Subtype',
            // Subtypes with no matching card are disabled by applySubtypeFacets(): hide them.
            render: {
                option: function(d, e) {
                    return '<div' + (d.disabled ? ' style="display:none"' : '') + '>' + e(d.text) + '</div>';
                },
            },
        });
        if (tsInst.subtype) {
            // Filters may have changed in the panel since the last search: refresh on open.
            tsInst.subtype.on('dropdown_open', function() {
                readTsValues();
                refreshSubtypeFacets();
            });
        }
        tsInst.keyword   = makeTs('keyword',   { options: opts.keywordOptions || [], items: opts.initialKeywords || [], placeholder: txt.lbl_keyword || 'Keyword' });
        tsInst.variation = makeTs('variation', { options: opts.variationOptions || [], onChange: function() { _variationDirty = true; updateFilterCount(); } });
        var _initVars = (opts.initialVariations && opts.initialVariations.length) ? opts.initialVariations : DEFAULT_VARIATIONS.slice();
        if (tsInst.variation && _initVars.length) tsInst.variation.setValue(_initVars, true);

        // Promo editions dropdown — options come from the <select> markup. Manual
        // changes merge into the set selection; main-set toggles override it.
        tsInst.promoset = makeTs('promoset', { onChange: function() { applyPromoSelection(tsInst.promoset.getValue()); } });

        // In the physical-collection scope, subTypes is still scalar upstream while
        // faction[]/cardSet[]/rarity[]/variation[] accept arrays cleanly.
        if (tsInst.subtype) {
            tsInst.subtype.on('item_add', function(value) {
                if (_scope !== 'collection' || !scopeApiUrl()) return;
                var self = this;
                this.getValue().forEach(function(v) {
                    if (v !== value) self.removeItem(v, true);
                });
            });
        }
        // Numeric text inputs: set initial expression + live count update + Enter submit
        var _iniRange = cfg.initial || {};
        NUM_FIELDS.forEach(function(f) {
            var el = document.getElementById(P + '-filter-' + f.id);
            if (!el) return;
            var v = _iniRange[f.key];
            if (v !== null && v !== undefined && v !== '') el.value = String(v);
            el.addEventListener('input',  updateFilterCount);
            el.addEventListener('change', updateFilterCount);
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (elSearch) filters.q = elSearch.value.trim();
                    readTsValues();
                    search(1);
                }
            });
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
            // Favorites tab has no Apply button flow — load it immediately, even in deck mode.
            if (MODE === 'cards' || _tab === 'favoris') search(1);
        });

        // Unique-nudge CTA: reuse the real tab button's own click handling
        // (reset + setTab + scope-appropriate search) instead of duplicating it.
        _root.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-goto-tab]');
            if (!btn || !_root.contains(btn)) return;
            var tabBtn = qa('.cs-tab[data-tab="' + btn.dataset.gotoTab + '"]')[0];
            if (tabBtn) tabBtn.click();
        });

        _root.addEventListener('click', function(e) {
            var btn = e.target.closest('.filter-toggle[data-filter]');
            if (!btn || !_root.contains(btn)) return;
            var key = btn.dataset.filter;
            var val = btn.dataset.value;
            // Format is a single-value ("radio") filter, unlike the array filters below.
            if (key === 'format') {
                setFormat(val);
                if (MODE === 'cards' && _tab === 'unique' && !btn.closest('.modal')) search(1);
                return;
            }
            if (key === 'faction') { if (!_factionDirty) { _factionDirty = true; filters.faction = []; } }
            if (key === 'type')    { if (!_typeDirty)   { _typeDirty   = true; filters.type   = []; } }
            // Seed rarity from what's actually shown active on first interaction so the click
            // toggles in sync with the UI. The ownership tab shows no default rarity; the
            // other tabs show the defaults as active.
            if (key === 'rarity')  { if (!_rarityDirty) { _rarityDirty = true; filters.rarity = (_tab === 'ownership') ? [] : DEFAULT_RARITIES.slice(); } }
            if (key === 'sets')    { _setsDirty = true; }
            var arr = filters[key];
            if (!Array.isArray(arr)) { arr = []; filters[key] = arr; }
            var idx = arr.indexOf(val);
            if (idx >= 0) { arr.splice(idx, 1); btn.classList.remove('active'); }
            else          { arr.push(val);       btn.classList.add('active'); }
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
            // Favorites tab has no Apply button — filters apply live on toggle.
            if (_scopeFavoris) search(1);
        });

        _root.addEventListener('click', function(e) {
            var btn = e.target.closest('.filter-toggle[data-bool-filter]');
            if (!btn || !_root.contains(btn)) return;
            var key = btn.dataset.boolFilter;
            filters[key] = !filters[key];
            btn.classList.toggle('active', !!filters[key]);
            updateFilterCount();
        });

        // Same data-bool-filter convention, but for a cs-switch toggle
        // (checkbox) instead of a filter-toggle button.
        _root.addEventListener('change', function(e) {
            if (e.target.type !== 'checkbox') return;
            var label = e.target.closest('.cs-switch[data-bool-filter]');
            if (!label || !_root.contains(label)) return;
            filters[label.dataset.boolFilter] = e.target.checked;
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
            if (MODE === 'cards' || _tab === 'favoris') search(1);
        });
    }
    if (elSortSelect) {
        elSortSelect.addEventListener('change', function() {
            filters.sort = this.value;
            search(1);
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
            if (MODE === 'cards' || _tab === 'favoris') search(1);
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
            wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;padding:6px 10px;background:var(--ac-color-overlay-label);border-radius:var(--ac-radius-md)';

            var icon = document.createElement('i');
            icon.className = 'fa-solid fa-box-archive';
            icon.style.cssText = 'color:color-mix(in srgb, var(--ac-color-on-strong) 65%, transparent);font-size:.85rem';

            var label = document.createElement('span');
            label.style.cssText = 'color:color-mix(in srgb, var(--ac-color-on-strong) 65%, transparent);font-size:.82rem;flex:1';
            label.textContent = 'Collection';

            var btnStyle = 'border:1px solid color-mix(in srgb, var(--ac-color-on-strong) 30%, transparent);background:color-mix(in srgb, var(--ac-color-on-strong) 10%, transparent);color:var(--ac-color-on-strong);border-radius:var(--ac-radius-xs);min-width:2.25rem;min-height:2.25rem;display:flex;align-items:center;justify-content:center;font-size:1.15rem;font-weight:700;cursor:pointer;flex-shrink:0';

            var btnMinus = document.createElement('button');
            btnMinus.type = 'button';
            btnMinus.textContent = '−';
            btnMinus.style.cssText = btnStyle;

            var qtyEl = document.createElement('span');
            qtyEl.style.cssText = 'color:var(--ac-color-on-strong);font-weight:700;font-size:1rem;min-width:1.5em;text-align:center;flex-shrink:0';
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
                cardEl.setAttribute('locale', rendererLocale());
                cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;border-radius:var(--ac-radius-lg);overflow:hidden;box-shadow:var(--ac-shadow-dialog)';
            } else {
                cardEl = document.createElement('img');
                cardEl.src = cdnUrl(ref);
                cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:var(--ac-radius-lg);box-shadow:var(--ac-shadow-dialog)';
            }
            cardEl.addEventListener('click', closeModal);
            if (window.OWN_CARD_MODAL_ENHANCE) {
                _modalInner._ownEnhance = window.OWN_CARD_MODAL_ENHANCE.enhance(_modalInner, cardEl, ref, uniq, cfg.ownAltArt);
            } else {
                _modalInner.appendChild(cardEl);
            }

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
            if (_modalInner) {
                if (_modalInner._ownEnhance) { _modalInner._ownEnhance.destroy(); _modalInner._ownEnhance = null; }
                _modalInner.innerHTML = '';
            }
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
    if (_playset) _playset.init(); // before any tab restore that may trigger _playset.load()
    // Restore the active tab from the URL (cards mode) so a refresh keeps it.
    var _initTab = (MODE === 'cards') ? new URLSearchParams(location.search).get('tab') : null;
    if (_initTab === 'collection' && !cfg.collApiUrl)      _initTab = null;
    if (_initTab === 'ownership'  && !cfg.ownershipApiUrl) _initTab = null;
    if (_initTab === 'favoris'    && !cfg.favApiUrl)       _initTab = null;
    if (_initTab === 'playset'    && !cfg.playsetApiUrl)   _initTab = null;
    if (_initTab && /^(unique|collection|ownership|favoris|playset)$/.test(_initTab)) {
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
        setFormat:         setFormat,
        getTab:            function() { return _tab; },
        parseNumExpr:      parseNumExpr,
        numCardsParts:     numCardsParts,
        numUniquesParts:   numUniquesParts,
        numProxyParts:     numProxyParts,
        buildApiUrl:       buildApiUrl,
        buildUnifiedApiUrl:buildUnifiedApiUrl,
        buildUniquesApiUrl:buildUniquesApiUrl,
        buildCollApiUrl:   buildCollApiUrl,
        buildPageUrl:      buildPageUrl,
        restoreFromUrl:    restoreFromUrl,
        updateFilterCount: updateFilterCount,
        filters:           filters,
        tsInstances:       tsInst,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardSearch;
}
