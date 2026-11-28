// card-search-effects.js — effect-row & support-row controller for CardSearch.
// Mirrors card-search-playset.js: owns /api/v2/effects fetching & remapping,
// TomSelect dropdown creation, spell-only-last ordering, and live option narrowing.
(function (root, factory) {
    var mod = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = mod;
    }
    if (root) {
        root.CardSearchEffects = mod;
    }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
    'use strict';

    function CardSearchEffects(deps) {
        var P               = deps.prefix;
        var API_BASE        = deps.apiBase;
        var UNIQUES_API_BASE = deps.uniquesApiBase || '';
        var LANG            = deps.lang || 'en';
        var KEYWORD_CODES   = deps.keywordCodes || null;
        var txt             = deps.txt || {};
        var pickLocale      = deps.pickLocale;
        var cardV2          = deps.cardV2 || null;
        var onFilterChange  = deps.onFilterChange || function () {};
        var readAllFilters  = deps.readAllFilters || function () {};
        var buildFilteredUrl = deps.buildFilteredUrl;

        var _effectData    = null;
        var _effectLoading = false;
        var _effectQueue   = [];
        var _supportRowEl  = null;

        function _remapUniquesEffects(data) {
            function remapList(list) {
                return (Array.isArray(list) ? list : []).map(function (item) {
                    return {
                        alteredId:    item.idGd,
                        translations: item.text || {},
                        isMain:       !!item.isMain,
                        isEcho:       !!item.isEcho,
                        spellOnly:    !!item.spellOnly,
                    };
                });
            }
            return {
                triggers:   remapList(data.triggers),
                conditions: remapList(data.conditions),
                effects:    remapList(data.output),
            };
        }

        function _catalogForRegion(items, region) {
            return items.filter(function (item) { return region === 'echo' ? item.isEcho : item.isMain; });
        }

        function _loadEffectData(cb) {
            if (_effectData) { cb(_effectData); return; }
            _effectQueue.push(cb);
            if (_effectLoading) return;
            _effectLoading = true;

            if (UNIQUES_API_BASE) {
                fetch(UNIQUES_API_BASE + '/api/v2/effects')
                    .then(function (r) { return r.json(); })
                    .then(function (data) { return _remapUniquesEffects(data); })
                    .catch(function () { return { triggers: [], conditions: [], effects: [] }; })
                    .then(function (res) {
                        _effectData    = res;
                        _effectLoading = false;
                        _effectQueue.forEach(function (fn) { fn(_effectData); });
                        _effectQueue   = [];
                    });
                return;
            }

            var done = 0;
            var res  = { triggers: [], conditions: [], effects: [] };
            ['triggers', 'conditions', 'effects'].forEach(function (key) {
                fetch(API_BASE + '/api/' + key)
                    .then(function (r) { return r.json(); })
                    .then(function (data) { res[key] = Array.isArray(data) ? data : []; })
                    .catch(function () {})
                    .then(function () {
                        done++;
                        if (done < 3) return;
                        _effectData    = res;
                        _effectLoading = false;
                        _effectQueue.forEach(function (fn) { fn(_effectData); });
                        _effectQueue   = [];
                    });
            });
        }

        function _expandKeywordCodes(text) {
            if (!KEYWORD_CODES || !text || text.indexOf('[') < 0) return text;
            if (cardV2 && typeof cardV2.expandKeywordCodes === 'function') {
                return cardV2.expandKeywordCodes(text, LANG, KEYWORD_CODES, { brackets: false });
            }
            return text;
        }

        function _effectLabel(item) {
            var t = item.translations || {};
            return _expandKeywordCodes(pickLocale(t, LANG) || String(item.alteredId));
        }

        function _effectLabelPlain(item) {
            return _effectLabel(item).replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim() || String(item.alteredId);
        }

        function _alteredIconHtml(escaped) {
            return escaped.replace(/\{([^}]+)\}/g, function (_, code) {
                return '<i class="fak fa-altered-' + code.toLowerCase() + '" style="font-size:.9em;vertical-align:middle;margin:0 1px"></i>';
            });
        }

        function _asArr(v) { return Array.isArray(v) ? v.filter(Boolean) : (v ? [String(v)] : []); }
        function _selectedVals(sel) {
            return Array.from(sel.selectedOptions).map(function (o) { return o.value; }).filter(Boolean);
        }

        function _compareEffectItems(a, b) {
            var sa = a.spellOnly ? 1 : 0;
            var sb = b.spellOnly ? 1 : 0;
            if (sa !== sb) return sa - sb;
            return _effectLabelPlain(a).localeCompare(_effectLabelPlain(b));
        }

        function _buildEffectSel(items, currentVals) {
            var sorted = items.slice().sort(_compareEffectItems);
            var cur = _asArr(currentVals).map(String);
            var sel = document.createElement('select');
            sel.multiple = true;
            sorted.forEach(function (item) {
                var o = document.createElement('option');
                o.value = String(item.alteredId);
                o.textContent = _effectLabel(item);
                if (cur.indexOf(String(item.alteredId)) >= 0) o.selected = true;
                sel.appendChild(o);
            });
            return sel;
        }

        function _applyEffectNarrowing(ts, items, idGds) {
            var keep = {};
            idGds.forEach(function (id) { keep[String(id)] = true; });
            _asArr(ts.getValue()).forEach(function (v) { keep[v] = true; });
            var narrowed = items.filter(function (item) { return keep[String(item.alteredId)]; });
            narrowed.sort(_compareEffectItems);
            ts.clearOptions();
            narrowed.forEach(function (item) {
                ts.addOption({ value: String(item.alteredId), text: _effectLabel(item) });
            });
            ts.refreshOptions(false);
        }

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
                option: function (d, e) {
                    return '<div style="white-space:normal;line-height:1.3">' + _alteredIconHtml(e(d.text)) + '</div>';
                },
                item: function (d, e) {
                    return '<div>' + _alteredIconHtml(e(d.text)) + '</div>';
                }
            } : null;

            var partKeys  = ['triggers', 'conditions', 'effects'];
            var partNames = ['trigger', 'condition', 'output'];
            var tsInsts = [];
            sels.forEach(function (sel, idx) {
                var wrap = document.createElement('div');
                wrap.style.cssText = 'flex:1;min-width:160px';
                wrap.appendChild(sel);
                rowEl.appendChild(wrap);
                if (tsRender) {
                    var ts = new TomSelect(sel, {
                        create: false,
                        maxItems: null,
                        plugins: ['remove_button'],
                        placeholder: phs[idx],
                        hideSelected: true,
                        onChange: onFilterChange,
                        render: tsRender,
                        onDropdownOpen: !UNIQUES_API_BASE ? undefined : function () {
                            readAllFilters();
                            fetch(buildFilteredUrl(partNames[idx], n))
                                .then(function (r) { return r.ok ? r.json() : null; })
                                .then(function (res) {
                                    if (res && Array.isArray(res.idGds)) {
                                        _applyEffectNarrowing(ts, _catalogForRegion(data[partKeys[idx]], region), res.idGds);
                                    }
                                })
                                .catch(function () {});
                        },
                    });
                    tsInsts.push(ts);
                } else {
                    sel.addEventListener('change', onFilterChange);
                    tsInsts.push(null);
                }
            });
            rowEl._tsInsts = tsInsts;

            if (region === 'main') {
                var rmBtn = document.createElement('button');
                rmBtn.type = 'button';
                rmBtn.className = 'btn btn-sm btn-outline-secondary flex-shrink-0 effect-rm-btn align-self-start';
                rmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                rmBtn.addEventListener('click', function () { _removeEffectRow(rowEl); });
                rowEl.appendChild(rmBtn);
            }
            return rowEl;
        }

        function _syncEffectUi() {
            var rowsEl = document.getElementById(P + '-effect-rows');
            var addBtn = document.getElementById(P + '-effect-add');
            var count  = rowsEl ? rowsEl.querySelectorAll('.effect-row').length : 0;
            if (rowsEl) {
                rowsEl.querySelectorAll('.effect-row').forEach(function (r) {
                    var rm = r.querySelector('.effect-rm-btn');
                    if (rm) rm.style.display = count > 1 ? '' : 'none';
                });
            }
            if (addBtn) addBtn.style.display = count < 3 ? '' : 'none';
        }

        function _removeEffectRow(rowEl) {
            if (rowEl._tsInsts) rowEl._tsInsts.forEach(function (ts) { if (ts) ts.destroy(); });
            if (rowEl.parentNode) rowEl.parentNode.removeChild(rowEl);
            _syncEffectUi();
            onFilterChange();
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
                _loadEffectData(function (data) {
                    var real = _buildEffectRow(n, data, saved);
                    if (ph.parentNode) ph.parentNode.replaceChild(real, ph);
                    _syncEffectUi();
                });
            }
        }

        function readEffectRows() {
            var rowsEl = document.getElementById(P + '-effect-rows');
            var out = [];
            if (!rowsEl) return out;
            rowsEl.querySelectorAll('.effect-row').forEach(function (row) {
                var insts = row._tsInsts;
                var t = [], c = [], e = [];
                if (insts && insts.length >= 3) {
                    t = _asArr(insts[0] && insts[0].getValue());
                    c = _asArr(insts[1] && insts[1].getValue());
                    e = _asArr(insts[2] && insts[2].getValue());
                } else {
                    var sels = row.querySelectorAll('select');
                    if (sels.length >= 3) {
                        t = _selectedVals(sels[0]);
                        c = _selectedVals(sels[1]);
                        e = _selectedVals(sels[2]);
                    }
                }
                if (t.length || c.length || e.length) {
                    out.push({ trigger: t, condition: c, effect: e });
                }
            });
            return out;
        }

        function readSupportRow() {
            var out = { trigger: [], condition: [], effect: [] };
            var insts = _supportRowEl && _supportRowEl._tsInsts;
            if (insts && insts.length >= 3) {
                out.trigger   = _asArr(insts[0] && insts[0].getValue());
                out.condition = _asArr(insts[1] && insts[1].getValue());
                out.effect    = _asArr(insts[2] && insts[2].getValue());
            }
            return out;
        }

        function _destroyEffectRows() {
            var rowsEl = document.getElementById(P + '-effect-rows');
            if (!rowsEl) return;
            rowsEl.querySelectorAll('.effect-row').forEach(function (r) {
                if (r._tsInsts) r._tsInsts.forEach(function (ts) { if (ts) ts.destroy(); });
            });
            rowsEl.innerHTML = '';
        }

        function _buildSupportInto(wrap, data) {
            wrap.innerHTML = '';
            _supportRowEl = _buildEffectRow('support', data, null, 'echo');
            wrap.appendChild(_supportRowEl);
        }

        function _initSupport() {
            var wrap = document.getElementById(P + '-support-row');
            if (!wrap) return;
            if (_effectData) {
                _buildSupportInto(wrap, _effectData);
            } else {
                _loadEffectData(function (data) { _buildSupportInto(wrap, data); });
            }
        }

        function _resetSupportRow() {
            var wrap = document.getElementById(P + '-support-row');
            if (!wrap) return;
            if (_supportRowEl && _supportRowEl._tsInsts) {
                _supportRowEl._tsInsts.forEach(function (ts) { if (ts) ts.destroy(); });
            }
            _supportRowEl = null;
            _initSupport();
        }

        function reset() {
            _destroyEffectRows();
            _addEffectRow(null);
            _syncEffectUi();
            _resetSupportRow();
        }

        function init() {
            var addBtn = document.getElementById(P + '-effect-add');
            if (addBtn) {
                addBtn.addEventListener('click', function () { _addEffectRow(null); _syncEffectUi(); });
            }
            _addEffectRow(null);
            _syncEffectUi();
            _initSupport();
        }

        return {
            init:           init,
            reset:          reset,
            readEffectRows: readEffectRows,
            readSupportRow: readSupportRow,
        };
    }

    return CardSearchEffects;
});
