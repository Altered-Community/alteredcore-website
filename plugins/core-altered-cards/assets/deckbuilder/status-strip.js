/* Deckbuilder — status-strip.js
 * Sticky status strip, add toast with undo, Deck tab badge.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
(function() {
    var txt = AlteredDB.txt;

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html !== undefined) n.innerHTML = html;
        return n;
    }

    function restart(node, cls) {
        node.classList.remove(cls);
        void node.offsetWidth;
        node.classList.add(cls);
    }

    var toast, toastTimer;
    function showToast(d) {
        if (!toast) {
            toast = el('div', 'db-ss-toast');
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        var name = typeof d.name === 'object' ? (d.name[AlteredDB.lang] || d.name.en || '') : (d.name || '');
        var icon = d.change > 0 ? 'fa-plus' : 'fa-minus';
        toast.innerHTML = '<i class="fa-solid ' + icon + '"></i>'
            + '<span class="db-ss-toast-name">' + escHtml(name) + '</span>'
            + '<span class="db-ss-toast-qty">×' + d.qty + '</span>';
        if (d.change > 0) {
            var undo = el('button', 'db-ss-toast-undo', escHtml(txt.toast_undo));
            undo.type = 'button';
            undo.onclick = function() { removeCard(d.ref); hideToast(); };
            toast.appendChild(undo);
        }
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, 2600);
    }
    function hideToast() { if (toast) toast.classList.remove('show'); }

    function pulseTile(ref) {
        document.querySelectorAll('#db-grid .db-card-wrap').forEach(function(w) {
            if (w.dataset.ref === ref) restart(w, 'db-ss-bump');
        });
    }

    function renderTabBadge(s) {
        var tab = document.querySelector('.db-mobile-tab[data-tab="deck"]');
        if (!tab) return;
        var b = tab.querySelector('.db-ss-tab-badge');
        if (!b) { b = el('span', 'db-ss-tab-badge'); tab.appendChild(b); }
        b.textContent = s.total;
        b.classList.toggle('ok', s.valid);
    }

    var strip;
    var SAVE_LABELS = {
        idle:   ['fa-cloud', txt.strip_saved],
        dirty:  ['fa-pen', txt.strip_unsaved],
        saving: ['fa-spinner fa-spin', txt.saving || 'Saving…'],
        saved:  ['fa-check', txt.strip_saved],
        error:  ['fa-triangle-exclamation', txt.strip_save_failed],
    };
    function buildStrip() {
        strip = el('div', 'db-ss-strip');
        strip.innerHTML = '<div class="db-ss-strip-main">'
            + '<span class="db-ss-strip-hero"></span>'
            + '<span class="db-ss-strip-id"><span class="db-ss-strip-name"></span><span class="db-ss-strip-sub"></span></span>'
            + '<span class="db-ss-strip-progress"><span class="db-ss-strip-count"></span><span class="db-ss-progress"><span class="db-ss-progress-fill"></span></span></span>'
            + '<button type="button" class="db-ss-chip db-ss-strip-valid"></button>'
            + '<span class="db-ss-chip db-ss-strip-save" data-state="idle"></span>'
            + '<button type="button" class="btn btn-sm btn-primary-altered db-ss-strip-savebtn"><i class="fa-solid fa-floppy-disk"></i><span class="d-none d-md-inline ms-1">' + escHtml(txt.save_btn || 'Save') + '</span></button>'
            + '</div>'
            + '<div class="db-ss-strip-chips"></div>';
        var layout = document.querySelector('.db-layout');
        layout.parentNode.insertBefore(strip, layout);
        strip.querySelector('.db-ss-strip-valid').addEventListener('click', function() {
            var badge = elValidation.querySelector('.badge');
            if (badge) badge.click();
        });
        strip.querySelector('.db-ss-strip-savebtn').addEventListener('click', function() { elSaveBtn.click(); });
        renderSaveState('idle');
    }
    function renderStrip(s) {
        var hero = deck.hero;
        strip.querySelector('.db-ss-strip-hero').innerHTML = hero
            ? '<img src="' + escAttr(cdnUrl(hero.cardReference)) + '" alt="">' : '<i class="fa-solid fa-person-rays"></i>';
        strip.querySelector('.db-ss-strip-name').textContent = (elDeckName && elDeckName.value) || '—';
        strip.querySelector('.db-ss-strip-sub').textContent = hero ? (typeof hero.name === 'object' ? (hero.name[AlteredDB.lang] || hero.name.en) : hero.name) : '';
        strip.querySelector('.db-ss-strip-count').innerHTML = '<strong>' + s.total + '</strong>' + (s.min ? ' / ' + s.min : '');
        strip.querySelector('.db-ss-progress-fill').style.width = (s.min ? Math.min(100, s.total / s.min * 100) : 100) + '%';
        strip.classList.toggle('is-complete', !!s.min && s.total >= s.min);
        var v = strip.querySelector('.db-ss-strip-valid');
        v.className = 'db-ss-chip db-ss-strip-valid ' + (s.valid ? 'ok' : 'ko');
        v.innerHTML = s.valid ? '<i class="fa-solid fa-check"></i><span>' + escHtml(txt.validation_ok) + '</span>'
                              : '<i class="fa-solid fa-circle-exclamation"></i><span>' + escHtml(txt.deck_invalid) + '</span>';
        renderStats(s);
    }
    function renderStats(s) {
        var host = strip.querySelector('.db-ss-strip-chips');
        host.innerHTML = '';
        (s.rarities || []).forEach(function(r) {
            if (r.count === 0 && r.limit === null) return;
            var chip = el('span', 'db-ss-stat db-ss-stat-rarity');
            if (r.limit !== null && r.count > r.limit) chip.classList.add('over');
            else if (r.limit !== null && r.count === r.limit) chip.classList.add('at');
            var title = r.label;
            if (r.limit !== null) title += ' (' + fmtMsg(txt.strip_max, r.limit) + ')';
            chip.title = title;
            chip.innerHTML = '<img src="' + escAttr(AlteredDB.pluginAssetsUrl + '/gems/' + r.gem + '.png') + '" width="14" height="14" alt="">'
                + '<span>' + (r.limit !== null ? r.count + '/' + r.limit : r.count) + '</span>';
            host.appendChild(chip);
        });
    }
    var saveFadeTimer;
    function renderSaveState(state) {
        var chip = strip.querySelector('.db-ss-strip-save');
        var l = SAVE_LABELS[state];
        chip.dataset.state = state;
        chip.innerHTML = '<i class="fa-solid ' + l[0] + '"></i><span>' + escHtml(l[1]) + '</span>';
        clearTimeout(saveFadeTimer);
        if (state === 'saved') saveFadeTimer = setTimeout(function() { chip.dataset.state = 'idle'; }, 2500);
    }

    // The sticky sidebar sits below the theme's sticky header and the strip, and both change height
    // (breakpoints, wrapped rarity chips).
    function syncStickyOffsets() {
        var h = document.querySelector('.site-header');
        var px = h && getComputedStyle(h).position === 'sticky' ? h.offsetHeight : 0;
        document.documentElement.style.setProperty('--db-ss-header', px + 'px');
        if (strip) document.documentElement.style.setProperty('--db-ss-strip', strip.offsetHeight + 'px');
    }

    function refresh(e) {
        var s = (e && e.detail) || deck.summary;
        if (!s) return;
        renderStrip(s);
        renderTabBadge(s);
    }

    buildStrip();
    refresh();
    syncStickyOffsets();
    window.addEventListener('resize', syncStickyOffsets);
    if (window.ResizeObserver) new ResizeObserver(syncStickyOffsets).observe(strip);

    document.addEventListener('db:deck-updated', refresh);
    if (elDeckName) elDeckName.addEventListener('input', refresh);
    document.addEventListener('db:card-delta', function(e) {
        var d = e.detail;
        pulseTile(d.ref);
        showToast(d);
        restart(strip.querySelector('.db-ss-strip-progress'), 'db-ss-bump');
        var tab = document.querySelector('.db-mobile-tab[data-tab="deck"] .db-ss-tab-badge');
        if (tab) restart(tab, 'db-ss-bump');
    });
    document.addEventListener('db:save-state', function(e) { renderSaveState(e.detail.state); });
})();
