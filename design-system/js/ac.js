/*
 * AlteredCore design system — helpers for the site's scripts (loaded by the shell, defer).
 *
 *   acIcon(name, extraClass?, label?)   SVG markup of an icon, for HTML built in JS:
 *                                       el.innerHTML = acIcon('trash-2') + ' Delete';
 *   [data-theme-toggle] buttons         switch light / dark (data-theme on <html>, saved in
 *                                       localStorage 'acTheme'); a child .theme-icon-moon /
 *                                       .theme-icon-sun is shown for the theme it switches to;
 *                                       optional data-label-dark / data-label-light titles.
 *   acSetTheme(dark)                    same switch from a script (theme buttons of a menu).
 *   --ac-header-height                  measured on <html> from the sticky .site-header, for
 *                                       sticky panels and full-height layouts.
 *   select.ac-select, select.form-select drawn as a listbox (docs/components/listbox.md), also
 *                                       when added later; acListbox(el) does it on demand.
 *   .ac-collapsible__head               toggles aria-expanded and `hidden` on its body.
 *   .ac-file-input input[type=file]     shows the chosen file name in .ac-file-input__name.
 *   acToast(message, options?)          short notice at the bottom of the screen; options:
 *                                       actionLabel + onAction (an "Undo" button), duration (ms,
 *                                       default 5000). Returns { hide }.
 *
 * Icons come from design-system/icons/sprite.svg (Lucide + brands, same names as ac_icon()).
 * PHP pages call ac_icon() instead: inline SVG, no request. SPA plugins use their framework's
 * icon component.
 */
(function () {
    'use strict';
    var script = document.currentScript;
    var sprite = script ? new URL('../icons/sprite.svg', script.src).pathname : '/design-system/icons/sprite.svg';

    function escapeAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    window.acIcon = function (name, extraClass, label) {
        var cls = 'ac-icon' + (extraClass ? ' ' + extraClass : '');
        var a11y = label ? ' role="img" aria-label="' + escapeAttr(label) + '"' : ' aria-hidden="true" focusable="false"';
        return '<svg class="' + escapeAttr(cls) + '"' + a11y + '><use href="' + sprite + '#' + escapeAttr(name) + '"></use></svg>';
    };

    var root = document.documentElement;

    function isDark() { return root.getAttribute('data-theme') === 'dark'; }

    function syncToggles() {
        var dark = isDark();
        document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
            var moon = btn.querySelector('.theme-icon-moon');
            var sun = btn.querySelector('.theme-icon-sun');
            if (moon) moon.toggleAttribute('hidden', dark);
            if (sun) sun.toggleAttribute('hidden', !dark);
            var title = dark ? btn.getAttribute('data-label-light') : btn.getAttribute('data-label-dark');
            if (title) btn.title = title;
            btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        });
    }

    window.acSetTheme = function (dark) {
        if (dark) root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
        try { localStorage.setItem('acTheme', dark ? 'dark' : 'light'); } catch (err) { /* private mode */ }
        syncToggles();
    };

    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
        if (btn) window.acSetTheme(!isDark());
    });

    // ---- Collapsible and file input (docs/components/card.md, field.md) ----
    document.addEventListener('click', function (e) {
        var head = e.target.closest && e.target.closest('.ac-collapsible__head');
        if (!head) return;
        var open = head.getAttribute('aria-expanded') !== 'true';
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        var body = document.getElementById(head.getAttribute('aria-controls') || '');
        if (body) body.hidden = !open;
    });

    document.addEventListener('change', function (e) {
        var input = e.target;
        if (!input.matches || !input.matches('.ac-file-input input[type="file"]')) return;
        var name = input.closest('.ac-file-input__control');
        name = name && name.querySelector('.ac-file-input__name');
        if (!name) return;
        if (!name.hasAttribute('data-placeholder')) name.setAttribute('data-placeholder', name.textContent);
        var file = input.files && input.files[0];
        name.textContent = file ? file.name : name.getAttribute('data-placeholder');
        name.classList.toggle('ac-file-input__name--empty', !file);
    });

    // ---- Toast (docs/components/feedback.md) ----
    var currentToast = null;
    window.acToast = function (message, options) {
        options = options || {};
        if (currentToast) currentToast.hide();
        var el = document.createElement('div');
        el.className = 'ac-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        var text = document.createElement('span');
        text.className = 'ac-toast__message';
        text.textContent = message;
        el.appendChild(text);
        var timer = null;
        var handle = {
            hide: function () {
                clearTimeout(timer);
                if (el.parentNode) el.parentNode.removeChild(el);
                if (currentToast === handle) currentToast = null;
            }
        };
        if (options.actionLabel) {
            var action = document.createElement('button');
            action.type = 'button';
            action.className = 'ac-toast__action';
            action.textContent = options.actionLabel;
            action.addEventListener('click', function () {
                handle.hide();
                if (typeof options.onAction === 'function') options.onAction();
            });
            el.appendChild(action);
        }
        document.body.appendChild(el);
        timer = setTimeout(handle.hide, options.duration || 5000);
        currentToast = handle;
        return handle;
    };

    function measureHeader() {
        var header = document.querySelector('.site-header');
        if (!header) return;
        var set = function () { root.style.setProperty('--ac-header-height', Math.round(header.getBoundingClientRect().height) + 'px'); };
        set();
        if (typeof ResizeObserver !== 'undefined') new ResizeObserver(set).observe(header);
    }

    // ---- Listbox: <select class="ac-select | form-select"> drawn by the design system ----
    // css/components/listbox.css, docs/components/listbox.md. The <select> stays in the page,
    // invisible, as the source of truth: its value is submitted with the form, picking an option
    // sets it and dispatches input + change, and changes made by other scripts (value,
    // selectedIndex, options rebuilt, disabled) are shown on the trigger.

    var LISTBOX_SELECTOR = 'select.ac-select, select.form-select';
    var SEARCH_FROM = 8;
    var hasPopover = typeof HTMLElement !== 'undefined' && HTMLElement.prototype.hasOwnProperty('popover');
    var nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    var nativeIndex = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
    var listboxUid = 0;

    function lbText(key, arg) {
        var fr = (root.getAttribute('lang') || '').slice(0, 2) === 'fr';
        if (key === 'search') return fr ? 'Rechercher…' : 'Search…';
        if (key === 'empty') return fr ? 'Aucun résultat pour « ' + arg + ' »' : 'No match for “' + arg + '”';
        return fr ? 'Aucune option' : 'No options';
    }
    function fold(s) {
        return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }
    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function highlight(label, q) {
        var i = q ? fold(label).indexOf(q) : -1;
        if (i < 0) return escapeHtml(label);
        return escapeHtml(label.slice(0, i)) + '<mark>' + escapeHtml(label.slice(i, i + q.length)) + '</mark>' + escapeHtml(label.slice(i + q.length));
    }
    /** Dot colour of an <option> or <optgroup>: data-color (any CSS colour) or data-faction. */
    function dotColor(el) {
        if (!el || !el.dataset) return '';
        if (el.dataset.color) return el.dataset.color;
        if (el.dataset.faction) return 'var(--ac-faction-' + el.dataset.faction.toLowerCase() + ')';
        return '';
    }
    function dotHtml(color) {
        return color ? '<span class="ac-listbox__dot" style="--ac-listbox-dot: ' + escapeAttr(color) + '" aria-hidden="true"></span>' : '';
    }

    function enhanceSelect(select) {
        if (select.acListbox || select.multiple || select.size > 1 || select.closest('[data-ac-native]')) return;
        var id = 'ac-lb' + (++listboxUid);
        var wrap = document.createElement('div');
        wrap.className = 'ac-listbox' + (/\b(form-select-sm|ac-select--sm)\b/.test(select.className) ? ' ac-listbox--sm' : '');
        if (select.getAttribute('style')) wrap.setAttribute('style', select.getAttribute('style'));
        select.parentNode.insertBefore(wrap, select);

        var trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ac-listbox__trigger';
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', id + '-list');
        wrap.appendChild(trigger);
        wrap.appendChild(select);
        select.classList.add('ac-listbox__native');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');

        var panel = null, list = null, search = null;
        var state = { open: false, query: '', active: -1, items: [], typed: '', typedAt: 0, invalid: false };

        function labelIds() {
            var ids = [];
            Array.prototype.forEach.call(select.labels || [], function (l, i) {
                if (!l.id) l.id = id + '-label' + i;
                ids.push(l.id);
            });
            return ids;
        }
        function current() { return select.options[nativeIndex.get.call(select)] || null; }

        function refresh() {
            var opt = current();
            var label = opt ? opt.textContent.trim() : '';
            var dot = dotColor(opt) || (opt && opt.parentNode.tagName === 'OPTGROUP' ? dotColor(opt.parentNode) : '');
            trigger.innerHTML = '<span class="ac-listbox__value' + (!opt || opt.value === '' ? ' ac-listbox__value--empty' : '') + '" id="' + id + '-value">'
                + dotHtml(dot) + '<span>' + escapeHtml(label || ' ') + '</span></span>' + window.acIcon('chevron-down');
            var ids = labelIds();
            if (ids.length) {
                trigger.setAttribute('aria-labelledby', ids.concat(id + '-value').join(' '));
                trigger.removeAttribute('aria-label');
            } else {
                trigger.removeAttribute('aria-labelledby');
                var name = select.getAttribute('aria-label') || select.title;
                if (name) trigger.setAttribute('aria-label', name + ', ' + label);
            }
            trigger.disabled = select.disabled;
            if (select.getAttribute('aria-invalid') === 'true' || state.invalid) trigger.setAttribute('aria-invalid', 'true');
            else trigger.removeAttribute('aria-invalid');
            if (state.open) renderList();
        }

        /** Options outside any <optgroup> first, then groups (an option between two groups is a group without a label). */
        function model() {
            var groups = [], loose = [];
            Array.prototype.forEach.call(select.children, function (el) {
                if (el.tagName === 'OPTGROUP') {
                    var opts = Array.prototype.filter.call(el.children, function (o) { return o.tagName === 'OPTION' && !o.hidden; });
                    if (opts.length) groups.push({ el: el, label: el.label, options: opts });
                } else if (el.tagName === 'OPTION' && !el.hidden) {
                    var last = groups[groups.length - 1];
                    if (!last) loose.push(el);
                    else if (last.el === null) last.options.push(el);
                    else groups.push({ el: null, label: '', options: [el] });
                }
            });
            return { loose: loose, groups: groups };
        }

        function renderList() {
            var m = model();
            var raw = state.query.trim();
            var q = fold(raw);
            var selected = current();
            state.items = [];
            function optionHtml(o, groupEl) {
                var i = state.items.length;
                state.items.push(o);
                var dis = o.disabled || (groupEl && groupEl.disabled);
                return '<div class="ac-listbox__option" role="option" id="' + id + '-o' + i + '" data-i="' + i + '"'
                    + ' aria-selected="' + (o === selected) + '"' + (dis ? ' aria-disabled="true"' : '') + '>'
                    + dotHtml(dotColor(o))
                    + '<span class="ac-listbox__label">' + highlight(o.textContent.trim(), q) + '</span>'
                    + window.acIcon('check') + '</div>';
            }
            function match(o, g) {
                return !q || fold(o.textContent).indexOf(q) >= 0 || !!(g && g.label && fold(g.label).indexOf(q) === 0);
            }
            var html = m.loose.filter(function (o) { return match(o, null); }).map(function (o) { return optionHtml(o, null); }).join('');
            var groupsHtml = '';
            m.groups.forEach(function (g, gi) {
                var opts = g.options.filter(function (o) { return match(o, g); });
                if (!opts.length) return;
                var body = opts.map(function (o) { return optionHtml(o, g.el); }).join('');
                if (!g.label) { groupsHtml += body; return; }
                groupsHtml += '<div class="ac-listbox__group" role="group" aria-labelledby="' + id + '-g' + gi + '">'
                    + '<div class="ac-listbox__group-label" id="' + id + '-g' + gi + '">' + dotHtml(dotColor(g.el))
                    + '<span>' + escapeHtml(g.label) + '</span><span class="ac-listbox__count">' + opts.length + '</span></div>'
                    + body + '</div>';
            });
            if (html && groupsHtml) html += '<div class="ac-listbox__divider" role="presentation"></div>';
            html += groupsHtml;
            if (!state.items.length) html = '<div class="ac-listbox__empty">' + escapeHtml(q ? lbText('empty', raw) : lbText('none')) + '</div>';
            list.innerHTML = html;
            if (state.active >= state.items.length) state.active = state.items.length - 1;
            paintActive(false);
        }

        function enabled(i) {
            var o = state.items[i];
            return !!o && !o.disabled && !(o.parentNode.tagName === 'OPTGROUP' && o.parentNode.disabled);
        }
        function paintActive(scroll) {
            var prev = list.querySelector('.is-active');
            if (prev) prev.classList.remove('is-active');
            var el = state.active >= 0 ? list.querySelector('[data-i="' + state.active + '"]') : null;
            if (el) el.classList.add('is-active');
            [trigger, search].forEach(function (owner) {
                if (!owner) return;
                if (el) owner.setAttribute('aria-activedescendant', el.id);
                else owner.removeAttribute('aria-activedescendant');
            });
            if (el && scroll !== false) el.scrollIntoView({ block: 'nearest' });
        }
        /** Next enabled option after `from` (default: the active one) in direction `step`, wrapping. */
        function move(step, from) {
            var n = state.items.length;
            var i = from === undefined ? state.active : from;
            for (var k = 0; k < n; k++) {
                i = (i + step + n) % n;
                if (enabled(i)) { state.active = i; break; }
            }
            paintActive();
        }

        function buildPanel() {
            panel = document.createElement('div');
            panel.className = 'ac-listbox__panel';
            if (hasPopover) panel.setAttribute('popover', 'manual');
            else { panel.style.position = 'fixed'; panel.hidden = true; }
            var withSearch = select.dataset.acSearch ? select.dataset.acSearch !== 'false' : select.options.length >= SEARCH_FROM;
            if (withSearch) {
                var ph = select.dataset.acSearchPlaceholder || lbText('search');
                var box = document.createElement('div');
                box.className = 'ac-listbox__search';
                box.innerHTML = window.acIcon('search') + '<input type="search" autocomplete="off" enterkeyhint="done"'
                    + ' aria-controls="' + id + '-list" aria-autocomplete="list"'
                    + ' placeholder="' + escapeAttr(ph) + '" aria-label="' + escapeAttr(ph) + '">';
                panel.appendChild(box);
                search = box.querySelector('input');
                search.addEventListener('input', function () {
                    state.query = search.value;
                    renderList();
                    move(1, -1);
                });
                search.addEventListener('keydown', onOpenKey);
            }
            list = document.createElement('div');
            list.className = 'ac-listbox__list';
            list.id = id + '-list';
            list.setAttribute('role', 'listbox');
            var ids = labelIds();
            if (ids.length) list.setAttribute('aria-labelledby', ids.join(' '));
            else if (select.getAttribute('aria-label')) list.setAttribute('aria-label', select.getAttribute('aria-label'));
            panel.appendChild(list);
            // Inside the wrapper, so that focus traps (Bootstrap modals) see the search field as
            // theirs; the popover top layer draws the panel above everything, unclipped.
            wrap.appendChild(panel);
            list.addEventListener('pointerdown', function (e) { e.preventDefault(); });
            list.addEventListener('pointermove', function (e) {
                var o = e.target.closest('.ac-listbox__option');
                if (o && +o.dataset.i !== state.active && enabled(+o.dataset.i)) { state.active = +o.dataset.i; paintActive(false); }
            });
            list.addEventListener('click', function (e) {
                var o = e.target.closest('.ac-listbox__option');
                if (o) pick(+o.dataset.i);
            });
        }

        /** Under the trigger, or above it when there is more room there; kept inside the viewport. */
        function place() {
            var r = trigger.getBoundingClientRect();
            var vw = document.documentElement.clientWidth, vh = window.innerHeight, gap = 6, edge = 8;
            panel.style.minWidth = Math.round(r.width) + 'px';
            var w = panel.offsetWidth;
            panel.style.left = Math.round(Math.max(edge, Math.min(r.left, vw - w - edge))) + 'px';
            var below = vh - r.bottom - gap - edge, above = r.top - gap - edge;
            if (below < 240 && above > below) {
                panel.style.top = 'auto';
                panel.style.bottom = Math.round(vh - r.top + gap) + 'px';
                panel.style.maxHeight = Math.round(Math.min(360, above)) + 'px';
            } else {
                panel.style.bottom = 'auto';
                panel.style.top = Math.round(r.bottom + gap) + 'px';
                panel.style.maxHeight = Math.round(Math.min(360, below)) + 'px';
            }
        }

        function open() {
            if (state.open || select.disabled) return;
            if (!panel) buildPanel();
            state.open = true;
            state.query = '';
            if (search) search.value = '';
            renderList();
            if (hasPopover) panel.showPopover(); else panel.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            place();
            var sel = state.items.indexOf(current());
            if (sel >= 0 && enabled(sel)) { state.active = sel; paintActive(); } else move(1, -1);
            // The search field is not focused: no touch keyboard until the user taps it or types.
            window.addEventListener('scroll', place, true);
            window.addEventListener('resize', place);
        }
        function close(refocus) {
            if (!state.open) return;
            state.open = false;
            if (hasPopover) panel.hidePopover(); else panel.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            trigger.removeAttribute('aria-activedescendant');
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
            if (refocus) trigger.focus();
        }
        function pick(i) {
            if (!enabled(i)) return;
            var o = state.items[i];
            var changed = o !== current();
            o.selected = true;
            state.invalid = false;
            refresh();
            close(true);
            if (changed) {
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        /** Keys shared by the trigger and the search field while the list is open. */
        function onOpenKey(e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); if (state.active >= 0) pick(state.active); }
            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
            else if (e.key === 'Tab') { close(false); return false; }
            else return false;
            return true;
        }
        function typeahead(ch) {
            var now = Date.now();
            state.typed = (now - state.typedAt > 700 ? '' : state.typed) + fold(ch);
            state.typedAt = now;
            var n = state.items.length;
            var start = state.typed.length === 1 ? state.active + 1 : Math.max(state.active, 0);
            for (var k = 0; k < n; k++) {
                var i = (start + k) % n;
                if (enabled(i) && fold(state.items[i].textContent.trim()).indexOf(state.typed) === 0) { state.active = i; paintActive(); return; }
            }
        }
        function printable(e) { return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey; }

        trigger.addEventListener('click', function () { if (state.open) close(false); else open(); });
        trigger.addEventListener('keydown', function (e) {
            if (!state.open) {
                if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) >= 0) { e.preventDefault(); open(); }
                else if (printable(e)) { open(); typeInto(e); }
                return;
            }
            if (onOpenKey(e)) return;
            if (e.key === 'Home') { e.preventDefault(); move(1, -1); }
            else if (e.key === 'End') { e.preventDefault(); move(-1, 0); }
            else if (e.key === ' ') { e.preventDefault(); if (state.active >= 0) pick(state.active); }
            else if (printable(e)) typeInto(e);
        });
        /** A letter on the trigger: into the search field when there is one, else jump to the next matching option. */
        function typeInto(e) {
            if (!search) { typeahead(e.key); return; }
            e.preventDefault();
            search.focus();
            search.value += e.key;
            search.dispatchEvent(new Event('input'));
        }
        wrap.addEventListener('focusout', function (e) {
            if (state.open && !wrap.contains(e.relatedTarget)) close(false);
        });
        document.addEventListener('pointerdown', function (e) {
            if (state.open && !wrap.contains(e.target)) close(false);
        }, true);

        // The <select> is the source of truth: follow what other scripts do to it.
        select.addEventListener('focus', function () { trigger.focus(); });
        select.addEventListener('change', refresh);
        select.addEventListener('invalid', function () { state.invalid = true; trigger.setAttribute('aria-invalid', 'true'); });
        ['value', 'selectedIndex'].forEach(function (prop) {
            var d = prop === 'value' ? nativeValue : nativeIndex;
            Object.defineProperty(select, prop, {
                configurable: true,
                get: function () { return d.get.call(this); },
                set: function (v) { d.set.call(this, v); refresh(); }
            });
        });
        new MutationObserver(refresh).observe(select, {
            childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ['disabled', 'selected', 'label', 'hidden', 'aria-invalid', 'data-color', 'data-faction']
        });
        if (select.form) select.form.addEventListener('reset', function () { setTimeout(refresh); });

        select.acListbox = { refresh: refresh, open: open, close: close, trigger: trigger };
        refresh();
    }

    function enhanceSelects(scope) {
        if (scope.matches && scope.matches(LISTBOX_SELECTOR)) enhanceSelect(scope);
        if (scope.querySelectorAll) Array.prototype.forEach.call(scope.querySelectorAll(LISTBOX_SELECTOR), enhanceSelect);
    }
    /** acListbox(select | container): done for the page on load and for nodes added later. */
    window.acListbox = enhanceSelects;

    function watchSelects() {
        enhanceSelects(document);
        new MutationObserver(function (records) {
            records.forEach(function (r) {
                Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) enhanceSelects(n); });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    function init() { syncToggles(); measureHeader(); watchSelects(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
