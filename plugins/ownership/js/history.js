(() => {
    const listEl = document.getElementById('own-history-list');
    if (!listEl) return; // this plugin's other pages (hub/boosters) load this same asset

    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    const t = (key, fallback) => {
        const dict = window.OWN_I18N || {};
        const lang = document.documentElement.lang || 'en';
        return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || fallback;
    };

    const locale = () => document.documentElement.lang || 'en';

    let rendererLoading = null;
    const ensureCardRenderer = () => {
        if (customElements.get('altered-card')) return Promise.resolve();
        if (rendererLoading) return rendererLoading;
        rendererLoading = new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js';
            s.onload = () => resolve();
            s.onerror = () => resolve();
            document.head.appendChild(s);
        });
        return rendererLoading;
    };

    const loadingEl = document.getElementById('own-history-loading');
    const emptyEl = document.getElementById('own-history-empty');
    const errorEl = document.getElementById('own-history-error');

    const formatDate = (iso) => {
        try { return new Date(iso).toLocaleString(locale()); }
        catch { return iso; }
    };

    const cardLabel = (item) => (item.name || item.reference) + ' ×' + item.quantity;

    const cardThumb = (item, sizePx) => item.isUnique
        ? '<span data-lazy-card="' + escapeHtml(item.reference) + '" data-size="' + sizePx + '"></span>'
        : (item.imagePath
            ? '<img src="' + escapeHtml(item.imagePath) + '" alt="" style="width:' + sizePx + 'px;height:auto;">'
            : '');

    // Unique thumbnails are inserted as placeholders (data-lazy-card) then hydrated once
    // the card renderer script is loaded, so the initial list render never has to await
    // a network fetch for a script that's usually already cached from another page.
    const hydrateLazyCards = async (root) => {
        const placeholders = root.querySelectorAll('[data-lazy-card]');
        if (!placeholders.length) return;
        await ensureCardRenderer();
        placeholders.forEach((el) => {
            const ref = el.dataset.lazyCard;
            const size = el.dataset.size;
            el.outerHTML = '<altered-card ref="' + escapeHtml(ref) + '" locale="' + escapeHtml(locale()) + '" style="width:' + size + 'px;"></altered-card>';
        });
    };

    const renderPreview = (preview, opts = {}) => preview
        .filter((item) => !(opts.hideBoosterImage && item.isBooster))
        .map((item) =>
            '<span class="d-inline-flex align-items-center gap-1 small border rounded px-2 py-1">' +
                cardThumb(item, 40) +
                (opts.hideCardName ? '' : '<span>' + escapeHtml(cardLabel(item)) + '</span>') +
            '</span>').join(' ');

    const assetsUrl = window.OWN_ASSETS_URL || '';

    const renderDelta = (evt) => {
        const badge = (count, sign, iconFile, colorClass) => count > 0
            ? '<span class="own-delta d-inline-flex align-items-center gap-1">' +
                '<img src="' + assetsUrl + '/' + iconFile + '" alt="" class="own-delta-icon">' +
                '<span class="' + colorClass + ' fw-semibold">' + sign + count + '</span>' +
            '</span>'
            : '';
        return [
            badge(evt.cardsReceived, '+', 'card-back.webp', 'text-success'),
            badge(evt.boostersReceived, '+', 'booster-icon.webp', 'text-success'),
            badge(evt.cardsGiven, '-', 'card-back.webp', 'text-danger'),
            badge(evt.boostersGiven, '-', 'booster-icon.webp', 'text-danger'),
        ].filter(Boolean).join(' ');
    };

    const renderEventRow = (evt) => {
        const isBoosterOpened = evt.kind === 'BoosterOpened';
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML =
            '<div class="d-flex justify-content-between align-items-start gap-3">' +
                '<div>' +
                    '<div class="fw-semibold">' + escapeHtml(evt.name) + '</div>' +
                    '<div class="text-muted small mb-2">' + escapeHtml(formatDate(evt.createdAt)) + '</div>' +
                    '<div class="d-flex flex-wrap gap-2">' +
                        renderPreview(evt.preview, isBoosterOpened ? { hideBoosterImage: true, hideCardName: true } : {}) +
                    '</div>' +
                '</div>' +
                '<div class="text-nowrap">' + renderDelta(evt) + '</div>' +
            '</div>';
        item.addEventListener('click', () => (evt.cardCount === 1 ? openSingleCardZoom(evt.id) : openDetail(evt.id)));
        hydrateLazyCards(item);
        return item;
    };

    // Modal
    const modalEl = document.getElementById('own-event-modal');
    const modal = window.bootstrap ? new window.bootstrap.Modal(modalEl) : null;
    const modalTitle = document.getElementById('own-event-modal-title');
    const modalBody = document.getElementById('own-event-modal-body');

    const zoomBackdrop = document.getElementById('own-card-zoom-backdrop');
    const zoomContent = document.getElementById('own-card-zoom-content');

    const closeZoom = () => {
        if (!zoomBackdrop) return;
        zoomBackdrop.hidden = true;
        window.OWN_CARD_TILT?.detach(zoomContent);
        zoomContent.innerHTML = '';
    };
    zoomBackdrop?.addEventListener('click', (e) => {
        if (e.target === zoomBackdrop) closeZoom();
    });

    const openZoom = async (ref, isUnique, name, imagePath) => {
        if (!zoomBackdrop) return;
        if (isUnique) await ensureCardRenderer();
        zoomContent.innerHTML = isUnique
            ? '<altered-card ref="' + escapeHtml(ref) + '" locale="' + escapeHtml(locale()) + '"></altered-card>'
            : (imagePath
                ? '<img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(name) + '" style="max-width:100%;max-height:100%;">'
                : '<div class="own-opener-cover-fallback"><i class="fa-solid fa-image fa-3x"></i></div>');
        window.OWN_CARD_TILT?.attach(zoomContent, { holo: isUnique });
        zoomBackdrop.hidden = false;
    };

    const openSingleCardZoom = async (id) => {
        try {
            const res = await fetch('/papi/ownership/history-detail?id=' + encodeURIComponent(id), { credentials: 'same-origin' });
            if (!res.ok) { openDetail(id); return; }
            const detail = await res.json();
            const line = detail.received.find((l) => !l.isBooster) || detail.given.find((l) => !l.isBooster);
            if (!line) { openDetail(id); return; }
            openZoom(line.reference, line.isUnique, line.name, line.imagePath);
        } catch {
            openDetail(id);
        }
    };

    const clickableThumb = (item, sizePx) =>
        '<button type="button" class="own-card-thumb-btn" data-ref="' + escapeHtml(item.reference) + '" ' +
            'data-unique="' + (item.isUnique ? '1' : '') + '" data-name="' + escapeHtml(item.name || item.reference) + '" ' +
            'data-image="' + escapeHtml(item.imagePath || '') + '">' +
            cardThumb(item, sizePx) +
        '</button>';

    modalBody?.addEventListener('click', (e) => {
        const btn = e.target.closest('.own-card-thumb-btn');
        if (!btn) return;
        openZoom(btn.dataset.ref, btn.dataset.unique === '1', btn.dataset.name, btn.dataset.image);
    });

    const renderLineGroup = (title, lines, sign) => {
        if (!lines.length) return '';
        return '<h3 class="h6 mt-3">' + escapeHtml(title) + '</h3>' +
            '<ul class="list-unstyled d-flex flex-column gap-2">' +
            lines.map((l) =>
                '<li class="d-flex align-items-center gap-2">' +
                    clickableThumb(l, 72) +
                    '<span>' + escapeHtml(l.name || l.reference) + '</span>' +
                    '<span class="ms-auto ' + (sign === '+' ? 'text-success' : 'text-danger') + ' fw-semibold">' +
                        sign + l.quantity +
                    '</span>' +
                '</li>').join('') +
            '</ul>';
    };

    const openDetail = async (id) => {
        modalTitle.textContent = '…';
        modalBody.innerHTML = '<div class="text-muted">' + escapeHtml(t('loading', 'Loading…')) + '</div>';
        modal?.show();
        try {
            const res = await fetch('/papi/ownership/history-detail?id=' + encodeURIComponent(id), { credentials: 'same-origin' });
            if (!res.ok) {
                modalBody.innerHTML = '<div class="text-danger">' + escapeHtml(t('loadError', 'Could not load this event.')) + '</div>';
                return;
            }
            const detail = await res.json();
            modalTitle.textContent = detail.name;
            const receivedHtml = renderLineGroup(t('received', 'Cards received'), detail.received, '+');
            const givenHtml = renderLineGroup(t('given', 'Cards given'), detail.given, '-');
            modalBody.innerHTML = receivedHtml + givenHtml
                || '<div class="text-muted">' + escapeHtml(t('empty', 'No events yet.')) + '</div>';
            hydrateLazyCards(modalBody);
        } catch {
            modalBody.innerHTML = '<div class="text-danger">' + escapeHtml(t('networkError', 'Network error.')) + '</div>';
        }
    };

    (async () => {
        try {
            const res = await fetch('/papi/ownership/history-list?locale=' + encodeURIComponent(locale()), { credentials: 'same-origin' });
            loadingEl.hidden = true;

            if (!res.ok) {
                errorEl.hidden = false;
                errorEl.textContent = t('loadError', 'Could not load your history.');
                return;
            }

            const events = await res.json();
            if (!events.length) { emptyEl.hidden = false; return; }

            events.forEach((evt) => listEl.appendChild(renderEventRow(evt)));
        } catch {
            loadingEl.hidden = true;
            errorEl.hidden = false;
            errorEl.textContent = t('networkError', 'Network error.');
        }
    })();
})();
