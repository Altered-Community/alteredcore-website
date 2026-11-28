// card-search-query.js — pure query/URL/numeric-expression codec for CardSearch.
// UMD module: global `CardSearchQuery` in browsers, `module.exports` in Node.
(function (root, factory) {
    var mod = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
    }
    if (root) {
        root.CardSearchQuery = mod;
    }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
    'use strict';

    var NUM_FIELDS = [
        { key: 'mainCost',   id: 'maincost',      api: 'mainCost' },
        { key: 'recallCost', id: 'recallcost',    api: 'recallCost' },
        { key: 'forest',     id: 'forestpower',   api: 'forestPower' },
        { key: 'mountain',   id: 'mountainpower', api: 'mountainPower' },
        { key: 'ocean',      id: 'oceanpower',    api: 'oceanPower' },
    ];

    var MAX_NUM_OPEN = 15;

    var KEYWORD_TO_UNIFIED = {
        'AGUERRI': 'SEASONED', 'ANCRE': 'ANCHORED', 'BOOSTE': 'BOOSTED', 'CORIACE': 'TOUGH',
        'DEFENSEUR': 'DEFENDER', 'DON': 'GIFT', 'ENDORMI': 'ASLEEP', 'ETERNEL': 'ETERNAL',
        'FONCER': 'RUSH', 'FUGACE': 'FLEETING', 'GIGANTESQUE': 'GIGANTIC',
        'RAFRAICHISSEMENT': 'COOLDOWN', 'RAVITAILLEZ': 'RESUPPLY', 'RAVITAILLEZ_EPUISE': 'RESUPPLY',
        'REPERAGE': 'SCOUT', 'SABOTEZ': 'SABOTAGE', 'ASCENDS': 'ASCEND',
    };

    var TIEBREAK_SORTS = {
        'name_asc': 1, 'name_desc': 1,
        'mana_asc': 1, 'mana_desc': 1,
        'reserve_asc': 1, 'reserve_desc': 1,
        'forest_asc': 1, 'forest_desc': 1,
        'mountain_asc': 1, 'mountain_desc': 1,
        'ocean_asc': 1, 'ocean_desc': 1,
    };

    function buildSortMap(lang) {
        var map = {
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
        map['name_asc']  = [['name.' + lang, 'asc']];
        map['name_desc'] = [['name.' + lang, 'desc']];
        return map;
    }

    function buildUniquesSortMap(lang) {
        return {
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
            'name_asc':       'name:' + lang + ':asc',
            'name_desc':      'name:' + lang + ':desc',
        };
    }

    function _parseNumToken(tok) {
        var m = tok.match(/^(<=|>=|<|>)(\d{1,2})$/);
        if (m) {
            var op = { '<': 'lt', '>': 'gt', '<=': 'lte', '>=': 'gte' }[m[1]];
            return { kind: 'bound', op: op, val: parseInt(m[2], 10) };
        }
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
        var s = String(raw)
            .trim()
            .replace(/[\u2013\u2014\u2212]/g, '-')
            .replace(/(\d)\s*-\s*(\d)/g, '$1-$2')
            .replace(/(\d)\s*([+-])(?=\s|$|[,;])/g, '$1$2')
            .replace(/(<=|>=|<|>)\s*(\d)/g, '$1$2');
        if (!s) return null;
        var tokens = s.replace(/\s*[,;]\s*/g, ',').replace(/\s+/g, ',').split(',');
        if (tokens.some(function (t) { return !t; })) return null;
        if (tokens.length === 1) return _parseNumToken(tokens[0]);

        var map = {};
        for (var i = 0; i < tokens.length; i++) {
            var parsed = _parseNumToken(tokens[i]);
            if (!parsed) return null;
            _expandNumToken(parsed, map);
        }
        var uniq = Object.keys(map).map(function (k) { return parseInt(k, 10); }).sort(function (a, b) { return a - b; });
        if (!uniq.length) return null;
        return uniq.length === 1 ? { kind: 'exact', val: uniq[0] } : { kind: 'list', vals: uniq };
    }

    function numExprActive(raw) {
        return parseNumExpr(raw) !== null;
    }

    function numCardsParts(api, raw) {
        var p = parseNumExpr(raw);
        if (!p) return [];
        if (p.kind === 'exact') return [api + '=' + p.val];
        if (p.kind === 'list')  return p.vals.map(function (v) { return api + '[]=' + v; });
        if (p.kind === 'range') return [api + '[gte]=' + p.min, api + '[lte]=' + p.max];
        return [api + '[' + p.op + ']=' + p.val];
    }

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
            var kept = p.vals.filter(function (v) { return v >= 0 && v <= 15; });
            return kept.length ? kept.map(function (v) { return api + '[]=' + v; }) : [api + '[gt]=15'];
        }
        if ((p.op === 'gt' || p.op === 'gte') && p.val > 15) return [api + '[gt]=15'];
        if ((p.op === 'lte' && p.val > 15) || (p.op === 'lt' && p.val >= 16)) return [api + '[lte]=15'];
        return numCardsParts(api, raw);
    }

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
        return p.vals.map(function (v) { return api + '[]=' + v; });
    }

    function expandTypes(types, typesMerged) {
        var expanded = [];
        types.forEach(function (v) {
            var mapped = typesMerged && typesMerged[v];
            (mapped || [v]).forEach(function (t) {
                if (expanded.indexOf(t) < 0) expanded.push(t);
            });
        });
        return expanded;
    }

    function cartesianEffectSlots(effects) {
        var out = [];
        effects.forEach(function (ef) {
            var T = ef.trigger.length ? ef.trigger : [''];
            var C = ef.condition.length ? ef.condition : [''];
            var E = ef.effect.length ? ef.effect : [''];
            T.forEach(function (tt) {
                C.forEach(function (cc) {
                    E.forEach(function (ee) {
                        if (tt || cc || ee) out.push({ trigger: tt, condition: cc, effect: ee });
                    });
                });
            });
        });
        return out;
    }

    function effectCovers(a, b) {
        var part = function (x, y) {
            return !x.length || (y.length > 0 && y.every(function (id) { return x.indexOf(id) >= 0; }));
        };
        return part(a.trigger, b.trigger) && part(a.condition, b.condition) && part(a.effect, b.effect);
    }

    function uniquesEffectMatchCounts(effects) {
        return effects.map(function (e, i) {
            var count = 1;
            for (var j = 0; j < effects.length; j++) {
                if (j !== i && effectCovers(e, effects[j])) count++;
            }
            return Math.min(count, 3);
        });
    }

    function statusFilterParts(filters, mode, getFormatLegality) {
        var parts = [];
        var legality = (mode === 'deck' && getFormatLegality) ? (getFormatLegality() || {}) : null;
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

    function appendCostRelationPart(parts, costRelation) {
        if (costRelation === 'eq')             parts.push('costRelation=equal');
        else if (costRelation === 'main_gt')   parts.push('costRelation=mainHigher');
        else if (costRelation === 'recall_gt') parts.push('costRelation=recallHigher');
    }

    function unifiedFilterParts(ctx) {
        var f = ctx.filters;
        var d = ctx.dirty;
        var def = ctx.defaults;
        var parts = [];

        (d.faction ? f.faction : def.factions).forEach(function (v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        expandTypes(d.type ? f.type : def.types, ctx.typesMerged).forEach(function (v) {
            parts.push('cardType[]=' + encodeURIComponent(v));
        });
        (d.rarity ? f.rarity : def.rarities).forEach(function (v) {
            parts.push('rarity[]=' + encodeURIComponent(v));
        });
        (d.sets ? f.sets : def.sets).slice().reverse().forEach(function (v) {
            parts.push('set[]=' + encodeURIComponent(v));
        });
        f.keywords.forEach(function (v) {
            parts.push('keywords[]=' + encodeURIComponent(KEYWORD_TO_UNIFIED[v] || v));
        });
        if (f.keywords.length > 1 && f.keywordMode === 'and') {
            parts.push('keywordMode=and');
        }
        f.subtypes.forEach(function (v) { parts.push('subTypes[]=' + encodeURIComponent(v)); });
        f.variations.forEach(function (v) {
            if (v !== 'kickstarter') parts.push('variation[]=' + encodeURIComponent(v));
        });

        NUM_FIELDS.forEach(function (nf) {
            numUniquesParts(nf.api, f[nf.key]).forEach(function (p) { parts.push(p); });
        });
        appendCostRelationPart(parts, f.costRelation);
        statusFilterParts(f, ctx.mode, ctx.getFormatLegality).forEach(function (p) { parts.push(p); });
        if (f.hasNoEffect) parts.push('hasNoEffect=true');

        var efCounts = uniquesEffectMatchCounts(f.effects);
        f.effects.forEach(function (ef, i) {
            if (ef.trigger.length)   parts.push('effect[' + i + '][t]=' + ef.trigger.map(encodeURIComponent).join(','));
            if (ef.condition.length) parts.push('effect[' + i + '][c]=' + ef.condition.map(encodeURIComponent).join(','));
            if (ef.effect.length)    parts.push('effect[' + i + '][o]=' + ef.effect.map(encodeURIComponent).join(','));
            if (efCounts[i] > 1)     parts.push('effect[' + i + '][matchCount]=' + efCounts[i]);
        });

        if (f.support.trigger.length)   parts.push('support[t]=' + f.support.trigger.map(encodeURIComponent).join(','));
        if (f.support.condition.length) parts.push('support[c]=' + f.support.condition.map(encodeURIComponent).join(','));
        if (f.support.effect.length)    parts.push('support[o]=' + f.support.effect.map(encodeURIComponent).join(','));

        if (f.format) parts.push('format=' + encodeURIComponent(f.format));
        if (f.q)      parts.push('q=' + encodeURIComponent(f.q));

        return parts;
    }

    function buildUnifiedApiUrl(ctx, page) {
        var parts = ['page=' + page, 'limit=' + ctx.perPage];
        var sortKey = ctx.filters.sort || ctx.defaults.sort1;
        var primary = (sortKey === 'default') ? ctx.defaults.sort1 : sortKey;
        var uSort = buildUniquesSortMap(ctx.lang)[primary];
        if (uSort) parts.push('sort=' + encodeURIComponent(uSort));
        return ctx.uniquesApiBase + '/api/v2/search?' + parts.concat(unifiedFilterParts(ctx)).join('&');
    }

    function buildLegacyCardsApiUrl(ctx, page) {
        var f = ctx.filters;
        var d = ctx.dirty;
        var def = ctx.defaults;
        var sortMap = buildSortMap(ctx.lang);
        var parts = ['page=' + page, 'itemsPerPage=' + ctx.perPage];

        var sortKey = f.sort || def.sort1;
        var primary = sortKey === 'default' ? def.sort1 : sortKey;

        if (primary === 'random') {
            parts.push('random=true');
        } else {
            var sf = sortMap[primary] || null;
            if (sf) sf.forEach(function (s) { parts.push('order[' + s[0] + ']=' + s[1]); });
            if (primary === def.sort1 || TIEBREAK_SORTS[primary]) {
                if (primary !== def.sort1 && def.sort1 && def.sort1 !== 'default') {
                    var sfTb = sortMap[def.sort1] || null;
                    if (sfTb) sfTb.forEach(function (s) { parts.push('order[' + s[0] + ']=' + s[1]); });
                }
                if (def.sort2 && def.sort2 !== primary && def.sort2 !== def.sort1) {
                    var sf2 = sortMap[def.sort2] || null;
                    if (sf2) sf2.forEach(function (s) { parts.push('order[' + s[0] + ']=' + s[1]); });
                }
            }
        }

        (d.faction ? f.faction : def.factions).forEach(function (v) { parts.push('faction.code[]=' + encodeURIComponent(v)); });
        expandTypes(d.type ? f.type : def.types, ctx.typesMerged).forEach(function (v) {
            parts.push('cardType[]=' + encodeURIComponent(v));
        });
        var statusActive = (ctx.mode === 'deck' && ctx.getFormatLegality)
            ? f.isErrated
            : (f.isBanned || f.isErrated || f.isSuspended);
        (d.rarity ? f.rarity : (statusActive ? [] : def.rarities)).forEach(function (v) { parts.push('rarity[]=' + encodeURIComponent(v)); });
        (d.sets ? f.sets : def.sets).slice().reverse().forEach(function (v) { parts.push('set.reference[]=' + encodeURIComponent(v)); });
        f.keywords.forEach(function (v) { parts.push('effectKeyword[]=' + encodeURIComponent(v)); });
        if (f.keywords.length > 1 && f.keywordMode === 'and') {
            parts.push('effectKeywordMode=and');
        }
        f.subtypes.forEach(function (v) { parts.push('subTypes[]=' + encodeURIComponent(v)); });
        f.variations.forEach(function (v) { parts.push('variation[]=' + encodeURIComponent(v)); });

        NUM_FIELDS.forEach(function (nf) {
            numCardsParts(nf.api, f[nf.key]).forEach(function (p) { parts.push(p); });
        });
        appendCostRelationPart(parts, f.costRelation);
        statusFilterParts(f, ctx.mode, ctx.getFormatLegality).forEach(function (p) { parts.push(p); });
        if (f.hasNoEffect) parts.push('hasNoEffect=true');

        var activeEffects = cartesianEffectSlots(f.effects);
        if (activeEffects.length > 24) activeEffects = activeEffects.slice(0, 24);
        if (activeEffects.length) {
            if (activeEffects.length > 1) parts.push('effectSlotMode=' + f.effectMode);
            activeEffects.forEach(function (ef, i) {
                if (ef.trigger)   parts.push('effectSlot[' + i + '][trigger]='   + encodeURIComponent(ef.trigger));
                if (ef.condition) parts.push('effectSlot[' + i + '][condition]=' + encodeURIComponent(ef.condition));
                if (ef.effect)    parts.push('effectSlot[' + i + '][effect]='    + encodeURIComponent(ef.effect));
            });
        }

        if (f.q) parts.push('name=' + encodeURIComponent(f.q));
        return ctx.apiBase + '/api/cards?' + parts.join('&');
    }

    function buildCollApiUrl(ctx, page) {
        var f = ctx.filters;
        var d = ctx.dirty;
        var def = ctx.defaults;
        var parts = [
            'locale='       + encodeURIComponent(ctx.lang),
            'page='         + page,
            'itemsPerPage=' + ctx.perPage,
        ];
        (d.faction ? f.faction : def.factions).forEach(function (v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        expandTypes(d.type ? f.type : [], ctx.typesMerged).forEach(function (v) { parts.push('cardType[]=' + encodeURIComponent(v)); });
        (d.rarity ? f.rarity : []).forEach(function (v) { parts.push('rarity[]=' + encodeURIComponent(v)); });
        (d.sets ? f.sets : def.sets).forEach(function (v) { parts.push('cardSet[]=' + encodeURIComponent(v)); });
        f.subtypes.forEach(function (v) { parts.push('subTypes[]=' + encodeURIComponent(v)); });
        if (ctx.scope === 'ownership') {
            f.variations.forEach(function (v) { parts.push('variation[]=' + encodeURIComponent(v)); });
        }
        statusFilterParts(f, ctx.mode, ctx.getFormatLegality).forEach(function (p) { parts.push(p); });
        NUM_FIELDS.forEach(function (nf) {
            numProxyParts(nf.api, f[nf.key]).forEach(function (p) { parts.push(p); });
        });
        if (f.q) parts.push('name=' + encodeURIComponent(f.q));
        return ctx.scopeApiUrl + '?' + parts.join('&');
    }

    function buildFavApiUrl(ctx, page) {
        var f = ctx.filters;
        var d = ctx.dirty;
        var parts = [
            'locale='       + encodeURIComponent(ctx.lang),
            'page='         + page,
            'itemsPerPage=' + ctx.perPage,
        ];
        if (d.faction) f.faction.forEach(function (v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        if (d.rarity)  f.rarity.forEach(function (v)  { parts.push('rarity[]='  + encodeURIComponent(v)); });
        if (d.sets)    f.sets.forEach(function (v)    { parts.push('set[]='     + encodeURIComponent(v)); });
        return ctx.favApiUrl + '?' + parts.join('&');
    }

    function buildApiUrl(ctx, page) {
        var f = ctx.filters;
        if (f.q && /^ALT_[A-Z0-9_]+$/i.test(f.q)) {
            if (ctx.uniquesApiBase) {
                return ctx.uniquesApiBase + '/api/v2/search?ref[]=' + encodeURIComponent(f.q.toUpperCase())
                    + '&page=' + page + '&limit=' + ctx.perPage;
            }
            return ctx.apiBase + '/api/cards?reference=' + encodeURIComponent(f.q.toUpperCase())
                + '&page=' + page + '&itemsPerPage=' + ctx.perPage;
        }
        if (ctx.scopeFavoris && ctx.favApiUrl) return buildFavApiUrl(ctx, page);
        if (ctx.scopeCollection && ctx.scopeApiUrl) return buildCollApiUrl(ctx, page);
        if (ctx.uniquesApiBase) return buildUnifiedApiUrl(ctx, page);
        return buildLegacyCardsApiUrl(ctx, page);
    }

    function buildEffectsFilteredUrl(ctx, part, slot) {
        var parts = unifiedFilterParts(ctx);
        parts.push('editing=' + encodeURIComponent(part + ':' + slot));
        return ctx.uniquesApiBase + '/api/v2/effects/filtered?' + parts.join('&');
    }

    function buildFacetsUrl(ctx) {
        if (!ctx.uniquesApiBase) return null;
        if (ctx.filters.q && /^ALT_[A-Z0-9_]+$/i.test(ctx.filters.q)) return null;
        if (ctx.scopeFavoris || (ctx.scopeCollection && ctx.scopeApiUrl)) return null;
        return ctx.uniquesApiBase + '/api/v2/search/facets?' + unifiedFilterParts(ctx).join('&');
    }

    function buildPageUrl(ctx, page, pathname) {
        var f = ctx.filters;
        var d = ctx.dirty;
        var parts = [];
        if (ctx.tab && ctx.tab !== 'all') parts.push('tab=' + ctx.tab);
        if (f.q) parts.push('q=' + encodeURIComponent(f.q));
        if (d.faction) f.faction.forEach(function (v) { parts.push('faction[]=' + encodeURIComponent(v)); });
        if (d.type)    f.type.forEach(function (v)    { parts.push('type[]='    + encodeURIComponent(v)); });
        if (d.rarity)  f.rarity.forEach(function (v)  { parts.push('rarity[]='  + encodeURIComponent(v)); });
        if (d.sets)    f.sets.forEach(function (v)    { parts.push('set[]='     + encodeURIComponent(v)); });
        f.keywords.forEach(function (v)   { parts.push('keyword[]='   + encodeURIComponent(v)); });
        f.subtypes.forEach(function (v)   { parts.push('subtype[]='   + encodeURIComponent(v)); });
        f.variations.forEach(function (v) { parts.push('variation[]=' + encodeURIComponent(v)); });
        if (f.mainCost)          parts.push('mainCost='   + encodeURIComponent(f.mainCost));
        if (f.recallCost)        parts.push('recallCost=' + encodeURIComponent(f.recallCost));
        if (f.forest)            parts.push('forest='     + encodeURIComponent(f.forest));
        if (f.mountain)          parts.push('mountain='   + encodeURIComponent(f.mountain));
        if (f.ocean)             parts.push('ocean='      + encodeURIComponent(f.ocean));
        if (f.showPromo)         parts.push('promo=true');
        if (f.isBanned)          parts.push('isBanned=true');
        if (f.isErrated)         parts.push('isErrated=true');
        if (f.isSuspended)       parts.push('isSuspended=true');
        if (f.bannedOrSuspended) parts.push('bannedOrSuspended=true');
        if (f.hasNoEffect)       parts.push('hasNoEffect=true');
        if (f.costRelation)      parts.push('costRelation=' + encodeURIComponent(f.costRelation));
        if (f.format)            parts.push('format='       + encodeURIComponent(f.format));
        if (f.keywordMode === 'and' && f.keywords.length > 1) parts.push('kwMode=and');
        if (!ctx.scopeCollection && !ctx.scopeFavoris && f.sort && f.sort !== 'default' && f.sort !== ctx.defaults.sort1 && !(ctx.tab === 'all' && !!ctx.uniquesApiBase && f.sort === 'random')) {
            parts.push('sort=' + encodeURIComponent(f.sort));
        }
        if (page > 1) parts.push('page=' + page);
        return (pathname || '') + (parts.length ? '?' + parts.join('&') : '');
    }

    function parseUrlState(qs, cfg, defaults) {
        var p = new URLSearchParams(qs);
        var dirty = {
            faction:   p.has('faction[]'),
            type:      p.has('type[]'),
            rarity:    p.has('rarity[]'),
            sets:      p.has('set[]'),
            variation: p.has('variation[]'),
        };

        var urlTab = p.get('tab');
        if (urlTab === 'collection' && !cfg.collApiUrl)      urlTab = null;
        if (urlTab === 'ownership'  && !cfg.ownershipApiUrl) urlTab = null;
        if (urlTab === 'favoris'    && !cfg.favApiUrl)       urlTab = null;
        if (urlTab === 'playset'    && !cfg.playsetApiUrl)   urlTab = null;
        var resolvedTab = (urlTab && /^(unique|collection|ownership|favoris|playset)$/.test(urlTab)) ? urlTab : 'all';

        return {
            dirty: dirty,
            resolvedTab: resolvedTab,
            page: parseInt(p.get('page') || '1', 10),
            values: {
                q:                 p.get('q') || '',
                faction:           dirty.faction   ? p.getAll('faction[]')   : defaults.factions.slice(),
                type:              dirty.type      ? p.getAll('type[]')      : defaults.types.slice(),
                rarity:            dirty.rarity    ? p.getAll('rarity[]')    : (resolvedTab === 'ownership' ? [] : defaults.rarities.slice()),
                mainCost:          p.get('mainCost')   || null,
                recallCost:        p.get('recallCost') || null,
                forest:            p.get('forest')     || null,
                mountain:          p.get('mountain')   || null,
                ocean:             p.get('ocean')      || null,
                sets:              dirty.sets      ? p.getAll('set[]')       : defaults.sets.slice(),
                subtypes:          p.getAll('subtype[]'),
                keywords:          p.getAll('keyword[]'),
                keywordMode:       p.get('kwMode') === 'or' ? 'or' : 'and',
                variations:        dirty.variation ? p.getAll('variation[]') : defaults.variations.slice(),
                isBanned:          p.get('isBanned')          === 'true',
                isErrated:         p.get('isErrated')         === 'true',
                isSuspended:       p.get('isSuspended')       === 'true',
                bannedOrSuspended: p.get('bannedOrSuspended') === 'true',
                hasNoEffect:       p.get('hasNoEffect')       === 'true',
                costRelation:      p.get('costRelation')      || '',
                format:            p.get('format')            || '',
                showPromo:         p.get('promo')             === 'true',
                sort:              p.get('sort') || 'default',
            },
        };
    }

    return {
        NUM_FIELDS:               NUM_FIELDS,
        KEYWORD_TO_UNIFIED:       KEYWORD_TO_UNIFIED,
        TIEBREAK_SORTS:           TIEBREAK_SORTS,
        buildSortMap:             buildSortMap,
        buildUniquesSortMap:      buildUniquesSortMap,
        parseNumExpr:             parseNumExpr,
        numExprActive:            numExprActive,
        numCardsParts:            numCardsParts,
        numUniquesParts:          numUniquesParts,
        numProxyParts:            numProxyParts,
        expandTypes:              expandTypes,
        cartesianEffectSlots:     cartesianEffectSlots,
        uniquesEffectMatchCounts: uniquesEffectMatchCounts,
        statusFilterParts:        statusFilterParts,
        unifiedFilterParts:       unifiedFilterParts,
        buildApiUrl:              buildApiUrl,
        buildUnifiedApiUrl:       buildUnifiedApiUrl,
        buildLegacyCardsApiUrl:   buildLegacyCardsApiUrl,
        buildCollApiUrl:          buildCollApiUrl,
        buildFavApiUrl:           buildFavApiUrl,
        buildEffectsFilteredUrl:  buildEffectsFilteredUrl,
        buildFacetsUrl:           buildFacetsUrl,
        buildPageUrl:             buildPageUrl,
        parseUrlState:            parseUrlState,
    };
});
