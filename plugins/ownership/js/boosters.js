(() => {
    const gridEl = document.getElementById('own-boosters-grid');
    if (!gridEl) return; // this plugin's other pages (hub/history) load this same asset

    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    const t = (key, fallback) => {
        const dict = window.OWN_I18N || {};
        const lang = document.documentElement.lang || 'en';
        return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || fallback;
    };

    const locale = () => document.documentElement.lang || 'en';

    // The <altered-card> web component is already loaded lazily elsewhere on the site
    // (core-altered-cards/assets/card-search.js) for unique cards. Reuse the exact same
    // pinned source, guarded so a page that already loaded it (e.g. visited /pages/cards
    // earlier in the session) never registers it twice.
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

    const loadingEl = document.getElementById('own-boosters-loading');
    const emptyEl = document.getElementById('own-boosters-empty');
    const errorEl = document.getElementById('own-boosters-error');

    const coverHtml = (booster, sizeClass) => booster.imagePath
        ? '<img src="' + escapeHtml(booster.imagePath) + '" alt="" class="' + sizeClass + '">'
        : '<div class="own-opener-cover-fallback mx-auto"><i class="fa-solid fa-gift fa-3x"></i></div>';

    let boosterList = [];

    const updateNavBadge = () => {
        const badge = document.getElementById('own-nav-boosters-badge');
        if (!badge) return;
        const total = boosterList.reduce((sum, b) => sum + b.quantity, 0);
        badge.hidden = total <= 0;
        badge.textContent = total > 99 ? '99+' : String(total);
    };

    const renderGrid = (boosters) => {
        boosterList = boosters;
        gridEl.innerHTML = '';
        boosters.forEach((booster, index) => {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-3';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'own-booster-tile w-100';
            btn.innerHTML =
                coverHtml(booster, 'own-booster-cover-img') +
                '<div class="mt-2 fw-semibold">' + escapeHtml(booster.name) + '</div>' +
                '<div class="text-muted small">×' + booster.quantity + '</div>';
            btn.addEventListener('click', () => openerAt(index));
            col.appendChild(btn);
            gridEl.appendChild(col);
        });
        updateNavBadge();
    };

    const loadBoosters = async () => {
        loadingEl.hidden = false;
        emptyEl.hidden = true;
        errorEl.hidden = true;
        try {
            const res = await fetch('/papi/ownership/boosters-list', { credentials: 'same-origin' });
            loadingEl.hidden = true;

            if (!res.ok) {
                errorEl.hidden = false;
                errorEl.textContent = t('loadError', 'Could not load your boosters.');
                return;
            }

            const boosters = await res.json();
            if (!boosters.length) { emptyEl.hidden = false; gridEl.innerHTML = ''; return; }
            renderGrid(boosters);
        } catch {
            loadingEl.hidden = true;
            errorEl.hidden = false;
            errorEl.textContent = t('networkError', 'Network error.');
        }
    };

    // ---- Opening overlay ----
    const backdrop = document.getElementById('own-opener-backdrop');
    const coverEl = document.getElementById('own-opener-cover');
    const rotatorEl = document.getElementById('own-opener-rotator');
    const cardEl = document.getElementById('own-opener-card');
    const prevBtn = document.getElementById('own-opener-prev');
    const nextBtn = document.getElementById('own-opener-next');
    const infoEl = document.getElementById('own-opener-info');
    const nameEl = document.getElementById('own-opener-name');
    const qtyEl = document.getElementById('own-opener-qty');
    const openBtn = document.getElementById('own-opener-open-btn');
    const openerLoadingEl = document.getElementById('own-opener-loading');

    let currentIndex = -1;

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    const updateNav = () => {
        prevBtn.disabled = currentIndex <= 0;
        nextBtn.disabled = currentIndex >= boosterList.length - 1;
    };

    const closeOverlay = () => {
        backdrop.hidden = true;
        coverEl.classList.remove('own-opening');
        window.OWN_CARD_TILT?.detach(rotatorEl);
        window.OWN_CARD_TILT?.detach(cardEl);
        coverEl.onclick = null;
        openBtn.onclick = null;
        openerLoadingEl.hidden = true;
        rotatorEl.innerHTML = '';
        cardEl.innerHTML = '';
        currentIndex = -1;
        // Drop any booster type just emptied out by an open in this session — the server
        // deletes its inventory row at 0 rather than keeping a 0 (see BoosterInventory),
        // so a tile stuck at "×0" here would be stale until the next full page load.
        renderGrid(boosterList.filter((b) => b.quantity > 0));
    };
    backdrop?.addEventListener('click', (e) => {
        if (e.target === backdrop) closeOverlay();
    });

    const showSealed = (index) => {
        currentIndex = index;
        const booster = boosterList[index];
        rotatorEl.innerHTML = coverHtml(booster, '');
        coverEl.classList.remove('own-opening');
        window.OWN_CARD_TILT?.detach(cardEl);
        cardEl.innerHTML = '';
        infoEl.hidden = false;
        nameEl.textContent = booster.name;
        qtyEl.textContent = '×' + booster.quantity;
        window.OWN_CARD_TILT?.attach(rotatorEl);
        coverEl.onclick = () => revealBooster(booster);
        openBtn.onclick = () => revealBooster(booster);
        updateNav();
    };

    const openerAt = (index) => {
        if (!boosterList.length) return;
        showSealed(Math.max(0, Math.min(index, boosterList.length - 1)));
        backdrop.hidden = false;
    };
    prevBtn?.addEventListener('click', () => openerAt(currentIndex - 1));
    nextBtn?.addEventListener('click', () => openerAt(currentIndex + 1));

    document.addEventListener('keydown', (e) => {
        if (backdrop.hidden) return;
        if (e.key === 'Escape') closeOverlay();
        else if (e.key === 'ArrowLeft') openerAt(currentIndex - 1);
        else if (e.key === 'ArrowRight') openerAt(currentIndex + 1);
    });

    const revealBooster = async (booster) => {
        coverEl.onclick = null;
        openBtn.onclick = null;
        openerLoadingEl.hidden = false;

        let opened;
        try {
            const res = await fetch('/papi/ownership/boosters-open', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boosterTypeKey: booster.boosterTypeKey,
                    quantity: 1,
                    locale: locale(),
                    csrf_token: csrfToken,
                }),
            });
            if (!res.ok) {
                openerLoadingEl.hidden = true;
                errorEl.hidden = false;
                errorEl.textContent = (await res.text()) || t('openError', 'Could not open this booster.');
                coverEl.onclick = () => revealBooster(booster);
                openBtn.onclick = () => revealBooster(booster);
                return;
            }
            opened = await res.json();
        } catch {
            openerLoadingEl.hidden = true;
            errorEl.hidden = false;
            errorEl.textContent = t('networkError', 'Network error.');
            coverEl.onclick = () => revealBooster(booster);
            openBtn.onclick = () => revealBooster(booster);
            return;
        }

        const card = opened[0];
        if (card) await ensureCardRenderer();
        cardEl.innerHTML = card
            ? '<altered-card ref="' + escapeHtml(card.cardReference) + '" locale="' + escapeHtml(locale()) + '"></altered-card>'
            : '';
        const cardArtEl = cardEl.firstElementChild;
        if (card) await window.OWN_CARD_TILT.waitForReady(cardEl);
        openerLoadingEl.hidden = true;
        window.OWN_CARD_TILT?.detach(rotatorEl);
        cardArtEl?.classList.add('own-card-pending');
        coverEl.classList.add('own-opening');
        coverEl.addEventListener('transitionend', () => {
            if (!coverEl.classList.contains('own-opening')) return;
            rotatorEl.innerHTML = '';
            if (cardArtEl) {
                cardArtEl.classList.remove('own-card-pending');
                cardArtEl.classList.add('own-card-revealing');
                cardArtEl.addEventListener('animationend', () => {
                    cardArtEl.classList.remove('own-card-revealing');
                    window.OWN_CARD_TILT?.attach(cardEl, { holo: true });
                }, { once: true });
            }
        }, { once: true });
        infoEl.hidden = true;

        booster.quantity -= 1;
        renderGrid(boosterList);
        qtyEl.textContent = '×' + booster.quantity;
    };

    loadBoosters();
})();
