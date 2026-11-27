/**
 * Shared CardV2 & [KEYWORD_CODE] adaptation module for classic PHP/JS pages
 * (card-search.js, core-altered-cards/pages/card.php, tournament-reports/pages/card.php).
 * Mirrors PHP `cacPrintKeywordCodes` / `cacToShortLocaleMap` / `cacAdaptV2Card`.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.AlteredCardV2 = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
    'use strict';

    var LOCALE_MAP_LONG = { en: 'en_US', fr: 'fr_FR', de: 'de_DE', it: 'it_IT', es: 'es_ES' };

    /**
     * Expand `[KEYWORD_CODE]` placeholders from uniques-search-api texts into their localized
     * printed label, with multi-segment prefix fallback (`DEFENDER_TKN_P` -> `DEFENDER`) and
     * numbered suffix support (`TOUGH_7` -> `Coriace 7`).
     *
     * @param {string} text
     * @param {string} shortLang
     * @param {Record<string, Record<string, string>>} keywordCodes
     * @param {{ brackets?: boolean }} [opts]  brackets=true (default) wraps labels in `[...]`.
     */
    function expandKeywordCodes(text, shortLang, keywordCodes, opts) {
        if (!text || String(text).indexOf('[') === -1 || !keywordCodes) return text;
        var loc = String(shortLang || 'en').slice(0, 2).toLowerCase();
        var wrap = !opts || opts.brackets !== false;
        var fmt = function (label) { return wrap ? '[' + label + ']' : label; };

        return String(text).replace(/\[([A-Z][A-Z0-9_]*)\]/g, function (all, code) {
            var entry = keywordCodes[code];
            if (entry) {
                var lbl = entry[loc] || entry.en;
                return lbl ? fmt(lbl) : all;
            }
            var m = /^(.+?)_(\d+)$/.exec(code);
            var base = m ? m[1] : code;
            var num = m ? m[2] : '';
            var parts = base.split('_');
            for (var i = parts.length; i > 0; i--) {
                var prefix = parts.slice(0, i).join('_');
                var pe = keywordCodes[prefix];
                var stripOne = false;
                if (!pe && keywordCodes[prefix + '_1']) {
                    pe = keywordCodes[prefix + '_1'];
                    stripOne = true;
                }
                if (pe) {
                    var pl = pe[loc] || pe.en;
                    if (pl) {
                        if (stripOne) pl = pl.replace(/[\s\u00a0]+1$/, '');
                        return fmt(num ? pl + ' ' + num : pl);
                    }
                }
            }
            return all;
        });
    }

    /** Convert a CardV2 locale map (`en_US`, `fr_FR`, ...) to short codes (`en`, `fr`, ...). */
    function toShortLocaleMap(map, expandKeywords, keywordCodes) {
        var out = {};
        Object.keys(LOCALE_MAP_LONG).forEach(function (short) {
            var long = LOCALE_MAP_LONG[short];
            if (map && (map[long] !== undefined || map[short] !== undefined)) {
                var val = map[long] !== undefined ? map[long] : map[short];
                out[short] = expandKeywords ? expandKeywordCodes(val, short, keywordCodes) : val;
            }
        });
        return out;
    }

    /**
     * Adapt a CardV2 object (`GET /api/v2/card/{ref}`) into the `{ group, card }` detail-page
     * shape shared by `core-altered-cards/pages/card.php` and `tournament-reports/pages/card.php`.
     */
    function adaptV2CardToDetail(c, keywordCodes) {
        var group = {
            name: toShortLocaleMap(c.name || {}, false, keywordCodes),
            faction: c.faction,
            rarity: c.rarity || { reference: 'UNIQUE' },
            cardType: c.cardType || { reference: 'CHARACTER' },
            isBanned: !!c.isBanned,
            isErrated: !!c.isErrated,
            isSuspended: !!c.isSuspended,
            mainEffect: toShortLocaleMap(c.mainEffect || {}, true, keywordCodes),
            echoEffect: toShortLocaleMap(c.echoEffect || {}, true, keywordCodes),
            cardRulings: null,
            loreEntries: null,
        };
        var card = {
            set: c.set,
            cardSubTypes: c.cardSubTypes,
            collectorNumberFormatedId: c.collectorNumber || '',
            mainCost: c.mainCost,
            recallCost: c.recallCost,
            forestPower: c.forestPower,
            mountainPower: c.mountainPower,
            oceanPower: c.oceanPower,
            permanent: c.permanent,
            reserve: c.reserve,
            legalFormats: c.legalFormats || [],
        };
        return { group: group, card: card };
    }

    return {
        expandKeywordCodes: expandKeywordCodes,
        toShortLocaleMap: toShortLocaleMap,
        adaptV2CardToDetail: adaptV2CardToDetail,
    };
}));
