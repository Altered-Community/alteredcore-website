(() => {
    const resultsEl = document.getElementById('own-aa-results');
    if (!resultsEl) return; // this plugin's other pages load this same asset

    const cfg = window.OWN_AA_CONFIG || {};

    const t = (key, fallback) => {
        const dict = window.OWN_I18N || {};
        const lang = document.documentElement.lang || 'en';
        return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || fallback;
    };

    // Shared config passed to every OWN_ALT_ART_WIDGET.createFamilyRow() call on this page.
    const widgetCfg = {
        cdnUrl: cfg.cdnUrl,
        lang: cfg.lang,
        markerImg: cfg.markerImg,
        setPreferenceUrl: cfg.setPreferenceUrl,
        csrfToken: cfg.csrfToken,
        txt: { saveError: t('saveError', 'Could not save your choice.') },
    };

    const loadingEl = document.getElementById('own-aa-loading');
    const emptyEl = document.getElementById('own-aa-empty');
    const errorEl = document.getElementById('own-aa-error');
    const loadMoreBtn = document.getElementById('own-aa-load-more');
    const searchInput = document.getElementById('own-aa-search');
    const searchBtn = document.getElementById('own-aa-search-btn');

    // ---- Filter state ----
    // hideNonChoices defaults on — the marker-assignment page is only useful for families
    // that actually offer a choice, and the button starts with the matching "active" class
    // server-side (see pages/alt-arts.php).
    const filters = { name: '', factions: new Set(), types: new Set(), rarities: new Set(), mainCost: null, hideNonChoices: true };

    const hideNonChoicesBtn = document.getElementById('own-aa-hide-non-choices');
    hideNonChoicesBtn?.addEventListener('click', () => {
        filters.hideNonChoices = !filters.hideNonChoices;
        hideNonChoicesBtn.classList.toggle('active', filters.hideNonChoices);
        runSearch();
    });

    document.querySelectorAll('.filter-toggle[data-filter="faction"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.value;
            if (filters.factions.has(v)) { filters.factions.delete(v); btn.classList.remove('active'); }
            else { filters.factions.add(v); btn.classList.add('active'); }
            runSearch();
        });
    });
    document.querySelectorAll('.filter-toggle[data-filter="type"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.value;
            if (filters.types.has(v)) { filters.types.delete(v); btn.classList.remove('active'); }
            else { filters.types.add(v); btn.classList.add('active'); }
            runSearch();
        });
    });
    document.querySelectorAll('.filter-toggle[data-filter="rarity"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.value;
            if (filters.rarities.has(v)) { filters.rarities.delete(v); btn.classList.remove('active'); }
            else { filters.rarities.add(v); btn.classList.add('active'); }
            runSearch();
        });
    });
    // Mana cost is a single exact value upstream (no multi-value support), so this
    // group is exclusive: picking one clears any other, re-picking the active one clears it.
    document.querySelectorAll('.filter-toggle[data-filter="mainCost"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.value;
            const wasActive = btn.classList.contains('active');
            document.querySelectorAll('.filter-toggle[data-filter="mainCost"]').forEach((b) => b.classList.remove('active'));
            filters.mainCost = null;
            if (!wasActive) { filters.mainCost = v; btn.classList.add('active'); }
            runSearch();
        });
    });
    searchBtn?.addEventListener('click', () => { filters.name = searchInput.value.trim(); runSearch(); });
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { filters.name = searchInput.value.trim(); runSearch(); }
    });

    // ---- Search ----
    // families/optionsByKey accumulate across "load more" pages; the server does the
    // filtering (including "hide non-choices", which needs ownership data this page
    // doesn't have) and the pagination, returning only the page actually rendered next —
    // never the whole matching catalog just to have most of it discarded here.
    let families = [];
    let optionsByKey = {};
    let hasMore = false;
    let searchToken = 0; // guards against a stale in-flight fetch rendering after a newer one

    const groupKeyOf = (familyId, faction, rarity) => familyId + ':' + faction + ':' + rarity;

    const buildQuery = (skip) => {
        const parts = [];
        if (filters.name) parts.push('name=' + encodeURIComponent(filters.name));
        filters.factions.forEach((f) => parts.push('faction[]=' + encodeURIComponent(f)));
        filters.types.forEach((ty) => parts.push('type[]=' + encodeURIComponent(ty)));
        filters.rarities.forEach((r) => parts.push('rarity[]=' + encodeURIComponent(r)));
        if (filters.mainCost !== null) parts.push('mainCost=' + encodeURIComponent(filters.mainCost));
        parts.push('hideNonChoices=' + (filters.hideNonChoices ? 'true' : 'false'));
        parts.push('skip=' + skip);
        return parts.join('&');
    };

    const fetchPage = async (skip) => {
        const res = await fetch(cfg.searchUrl + '?' + buildQuery(skip), { credentials: 'same-origin' });
        if (!res.ok) throw new Error('load failed');
        return res.json();
    };

    const runSearch = async () => {
        const myToken = ++searchToken;
        loadingEl.hidden = false;
        emptyEl.hidden = true;
        errorEl.hidden = true;
        resultsEl.innerHTML = '';
        loadMoreBtn.hidden = true;

        try {
            const data = await fetchPage(0);
            if (myToken !== searchToken) return;
            loadingEl.hidden = true;

            families = data.families || [];
            optionsByKey = data.options || {};
            hasMore = !!data.hasMore;

            if (!families.length) { emptyEl.hidden = false; return; }

            families.forEach((family) => resultsEl.appendChild(renderFamilyRow(family)));
            loadMoreBtn.hidden = !hasMore;
        } catch {
            if (myToken !== searchToken) return;
            loadingEl.hidden = true;
            errorEl.hidden = false;
            errorEl.textContent = t('networkError', 'Network error.');
        }
    };

    const renderMore = async () => {
        const myToken = searchToken;
        loadMoreBtn.disabled = true;
        try {
            const data = await fetchPage(families.length);
            if (myToken !== searchToken) return;

            const page = data.families || [];
            Object.assign(optionsByKey, data.options || {});
            families = families.concat(page);
            hasMore = !!data.hasMore;

            page.forEach((family) => resultsEl.appendChild(renderFamilyRow(family)));
            loadMoreBtn.hidden = !hasMore;
        } catch {
            if (myToken !== searchToken) return;
            errorEl.hidden = false;
            errorEl.textContent = t('networkError', 'Network error.');
        } finally {
            if (myToken === searchToken) loadMoreBtn.disabled = false;
        }
    };
    loadMoreBtn?.addEventListener('click', renderMore);

    // ---- Rendering ----
    const renderFamilyRow = (family) => {
        const key = groupKeyOf(family.familyId, family.faction, family.rarity);
        const optData = optionsByKey[key];

        const wrap = document.createElement('div');
        if (!optData || !optData.options || !optData.options.length) return wrap; // shouldn't happen

        const widgetRow = window.OWN_ALT_ART_WIDGET.createFamilyRow(family, optData, widgetCfg);
        wrap.appendChild(widgetRow.el);

        const sep = document.createElement('hr');
        sep.className = 'own-aa-sep';
        wrap.appendChild(sep);
        return wrap;
    };

    runSearch();
})();
