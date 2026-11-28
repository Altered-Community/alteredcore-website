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
    var KEYWORD_CODES = cfg.keywordCodes || null;
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
    // Active UI tab: 'all' | 'collection' | 'ownership' | 'favoris' | 'playset'.
    // Unique and non-unique cards share the unified 'all' tab (powered by /api/v2/search).
    var _tab               = 'all';
    var tsInst             = {};
    var _collEl            = null;
    var _defaultCollection = '';
    var _subtypeOptions    = null; // every subtype option, as given in cfg.tsOptions
    var _facetsAbort       = null; // in-flight /api/v2/search/facets call

    var _query = (typeof CardSearchQuery !== 'undefined' && CardSearchQuery)
        || (typeof require === 'function' ? require('./card-search-query.js') : null);
    var _cardV2 = (typeof AlteredCardV2 !== 'undefined' && AlteredCardV2)
        || (typeof require === 'function' ? require('./card-v2.js') : null);
    var _effectsMod = (typeof CardSearchEffects !== 'undefined' && CardSearchEffects)
        || (typeof require === 'function' ? require('./card-search-effects.js') : null);

    var NUM_FIELDS      = _query.NUM_FIELDS;
    var parseNumExpr    = _query.parseNumExpr;
    var numExprActive   = _query.numExprActive;
    var numCardsParts   = _query.numCardsParts;
    var numUniquesParts = _query.numUniquesParts;
    var numProxyParts   = _query.numProxyParts;

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
            var _noRandSort = _tab === 'all' && !!UNIQUES_API_BASE;
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
        } else if (active || _scopeFavoris || (_tab === 'all' && !!UNIQUES_API_BASE && filters.sort === 'random')) {
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

    // ── Effect controller + query context delegation ─────────────────────────
    var _effectsCtrl = _effectsMod ? _effectsMod({
        prefix:           P,
        apiBase:          API_BASE,
        uniquesApiBase:   UNIQUES_API_BASE,
        lang:             LANG,
        keywordCodes:     KEYWORD_CODES,
        txt:              txt,
        pickLocale:       pickLocale,
        cardV2:           _cardV2,
        onFilterChange:   updateFilterCount,
        readAllFilters:   readTsValues,
        buildFilteredUrl: buildEffectsFilteredUrl,
    }) : null;

    function _readEffectRows() {
        filters.effects = _effectsCtrl ? _effectsCtrl.readEffectRows() : [];
    }
    function _readSupportRow() {
        filters.support = _effectsCtrl ? _effectsCtrl.readSupportRow() : { trigger: [], condition: [], effect: [] };
    }
    function _resetEffectRows() {
        if (_effectsCtrl) _effectsCtrl.reset();
    }
    function initEffects() {
        if (_effectsCtrl) _effectsCtrl.init();
    }

    function _queryContext(readDomEffects) {
        if (readDomEffects) {
            _readEffectRows();
            _readSupportRow();
        }
        return {
            apiBase:           API_BASE,
            uniquesApiBase:    UNIQUES_API_BASE,
            lang:              LANG,
            mode:              MODE,
            perPage:           PER_PAGE,
            tab:               _tab,
            scope:             _scope,
            scopeCollection:   _scopeCollection,
            scopeFavoris:      _scopeFavoris,
            scopeApiUrl:       scopeApiUrl(),
            favApiUrl:         cfg.favApiUrl || '',
            typesMerged:       cfg.typesMerged,
            getFormatLegality: cfg.getFormatLegality,
            defaults: {
                factions:   DEFAULT_FACTIONS,
                types:      DEFAULT_TYPES,
                rarities:   DEFAULT_RARITIES,
                sets:       DEFAULT_SETS,
                variations: DEFAULT_VARIATIONS,
                sort1:      DEFAULT_SORT_1,
                sort2:      DEFAULT_SORT_2,
            },
            dirty: {
                faction:   _factionDirty,
                type:      _typeDirty,
                rarity:    _rarityDirty,
                sets:      _setsDirty,
                variation: _variationDirty,
            },
            filters: filters,
        };
    }

    function buildApiUrl(page) {
        return _query.buildApiUrl(_queryContext(true), page);
    }

    function buildUnifiedApiUrl(page) {
        return _query.buildUnifiedApiUrl(_queryContext(true), page);
    }

    function buildEffectsFilteredUrl(part, slot) {
        return _query.buildEffectsFilteredUrl(_queryContext(true), part, slot);
    }

    function buildFacetsUrl() {
        return _query.buildFacetsUrl(_queryContext(true));
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

    function buildCollApiUrl(page) {
        return _query.buildCollApiUrl(_queryContext(false), page);
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
        return _query.buildPageUrl(_queryContext(false), page, location.pathname);
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

    // Deckbuilder-only warning when the deck's current format forbids Unique cards
    // (cfg.getFormatLegality().maxUnique === 0) and the user activates UNIQUE rarity.
    function _syncUniqueNudge() {
        var el = document.getElementById(P + '-unique-banner');
        if (!el) return;
        var blockedEl = el.querySelector('.cs-unique-banner-blocked');
        var legality = cfg.getFormatLegality ? cfg.getFormatLegality() : null;
        var blocked = !!(legality && legality.maxUnique === 0);
        var uniqueSelected = _rarityDirty && filters.rarity.indexOf('UNIQUE') >= 0;
        var show = _tab === 'all' && blocked && uniqueSelected;
        el.style.display = show ? '' : 'none';
        if (blockedEl) blockedEl.style.display = show ? '' : 'none';
    }

    // filter count badge
    function updateFilterCount() {
        readTsValues();
        _syncUniqueNudge();
        var setsCount = _setsDirty ? filters.sets.length : 0;
        var n = (_factionDirty ? filters.faction.length : 0)
            + (_typeDirty   ? filters.type.length   : 0)
            + (_rarityDirty ? filters.rarity.length : 0)
            + NUM_FIELDS.reduce(function(acc, f) { return acc + (numExprActive(filters[f.key]) ? 1 : 0); }, 0)
            + setsCount + filters.subtypes.length + filters.keywords.length
            + (_variationDirty ? filters.variations.length : 0) + (_collDirty ? 1 : 0)
            + (filters.isBanned ? 1 : 0) + (filters.isErrated ? 1 : 0)
            + (filters.isSuspended ? 1 : 0) + (filters.bannedOrSuspended ? 1 : 0)
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
        var advN = filters.subtypes.length + filters.keywords.length
            + (filters.isBanned ? 1 : 0) + (filters.isErrated ? 1 : 0)
            + (filters.isSuspended ? 1 : 0) + (filters.bannedOrSuspended ? 1 : 0)
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
    // Legacy `tab=unique` URLs/bookmarks map onto the unified `all` tab with UNIQUE
    // rarity (and any uniqueExtraSets like COREKS) pre-selected when not explicitly set.
    function setTab(t, keepFilters) {
        var isLegacyUnique = (t === 'unique');
        _tab = (t === 'collection' || t === 'ownership' || t === 'favoris' || t === 'playset') ? t : 'all';
        setScope(_tab === 'collection' || _tab === 'ownership' || _tab === 'favoris' ? _tab : 'all');
        if (isLegacyUnique) {
            if (!_rarityDirty) {
                _rarityDirty = true;
                filters.rarity = (cfg.uniqueRarity || ['UNIQUE']).slice();
            }
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
        var parsed = _query.parseUrlState(qs, cfg, {
            factions:   DEFAULT_FACTIONS,
            types:      DEFAULT_TYPES,
            rarities:   DEFAULT_RARITIES,
            sets:       DEFAULT_SETS,
            variations: DEFAULT_VARIATIONS,
        });
        _factionDirty   = parsed.dirty.faction;
        _typeDirty      = parsed.dirty.type;
        _rarityDirty    = parsed.dirty.rarity;
        _setsDirty      = parsed.dirty.sets;
        _variationDirty = parsed.dirty.variation;
        var resolvedTab = parsed.resolvedTab;
        var pg          = parsed.page;
        Object.assign(filters, parsed.values);

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

        _root.addEventListener('click', function(e) {
            var btn = e.target.closest('.filter-toggle[data-filter]');
            if (!btn || !_root.contains(btn)) return;
            var key = btn.dataset.filter;
            var val = btn.dataset.value;
            // Format is a single-value ("radio") filter, unlike the array filters below.
            if (key === 'format') {
                setFormat(val);
                if (MODE === 'cards' && _tab === 'all' && !btn.closest('.modal')) search(1);
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
            // When the user enables UNIQUE rarity on the unified tab, include Kickstarter
            // Uniques (cfg.uniqueExtraSets, e.g. COREKS) if CORE is active and COREKS wasn't included.
            if (key === 'rarity' && val === 'UNIQUE' && idx < 0 && _tab === 'all') {
                var _uExtra = cfg.uniqueExtraSets || [];
                var _activeSets = _setsDirty ? filters.sets : DEFAULT_SETS;
                if (_uExtra.length && _activeSets.indexOf('CORE') >= 0) {
                    if (!_setsDirty) { _setsDirty = true; filters.sets = DEFAULT_SETS.slice(); }
                    _uExtra.forEach(function(s) {
                        if (filters.sets.indexOf(s) < 0) filters.sets.push(s);
                    });
                    syncSetButtons();
                    if (tsInst.set) tsInst.set.setValue(filters.sets, true);
                }
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
        updateScopeUi();
    }
    updateFilterCount();
    if (cfg.autoSearch) {
        var _initPage = parseInt(new URLSearchParams(location.search).get('page') || '1', 10);
        search(_initPage, true);
    }

    return {
        search:                  search,
        resetFilters:            resetFilters,
        setFormat:               setFormat,
        getTab:                  function() { return _tab; },
        parseNumExpr:            parseNumExpr,
        numCardsParts:           numCardsParts,
        numUniquesParts:         numUniquesParts,
        numProxyParts:           numProxyParts,
        buildApiUrl:             buildApiUrl,
        buildUnifiedApiUrl:      buildUnifiedApiUrl,
        buildEffectsFilteredUrl: buildEffectsFilteredUrl,
        buildFacetsUrl:          buildFacetsUrl,
        buildCollApiUrl:         buildCollApiUrl,
        buildPageUrl:            buildPageUrl,
        restoreFromUrl:          restoreFromUrl,
        updateFilterCount:       updateFilterCount,
        filters:                 filters,
        tsInstances:             tsInst,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardSearch;
}
