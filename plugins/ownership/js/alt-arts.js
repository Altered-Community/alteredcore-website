(() => {
    const resultsEl = document.getElementById('own-aa-results');
    if (!resultsEl) return; // this plugin's other pages load this same asset

    const cfg = window.OWN_AA_CONFIG || {};

    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    const t = (key, fallback) => {
        const dict = window.OWN_I18N || {};
        const lang = document.documentElement.lang || 'en';
        return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || fallback;
    };

    const cdnUrl = (ref) => {
        const p = ref.split('_');
        return cfg.cdnUrl + '/cards/' + cfg.lang + '/' + (p[1] || '') + '/' + ref + '.webp';
    };

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    const loadingEl = document.getElementById('own-aa-loading');
    const emptyEl = document.getElementById('own-aa-empty');
    const errorEl = document.getElementById('own-aa-error');
    const loadMoreBtn = document.getElementById('own-aa-load-more');
    const searchInput = document.getElementById('own-aa-search');
    const searchBtn = document.getElementById('own-aa-search-btn');

    const PAGE_SIZE = 25;

    // ---- Filter state ----
    const filters = { name: '', factions: new Set(), rarities: new Set(), mainCost: null };

    document.querySelectorAll('.filter-toggle[data-filter="faction"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.value;
            if (filters.factions.has(v)) { filters.factions.delete(v); btn.classList.remove('active'); }
            else { filters.factions.add(v); btn.classList.add('active'); }
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
    let families = [];
    let optionsByKey = {};
    const groupStateByKey = new Map(); // key -> { maxSlots, options:[...], slots:[{slotIndex,reference}], activeSlot }
    let visibleCount = 0;
    let searchToken = 0; // guards against a stale in-flight fetch rendering after a newer one

    const groupKeyOf = (familyId, faction, rarity) => familyId + ':' + faction + ':' + rarity;

    const buildQuery = () => {
        const parts = [];
        if (filters.name) parts.push('name=' + encodeURIComponent(filters.name));
        filters.factions.forEach((f) => parts.push('faction[]=' + encodeURIComponent(f)));
        filters.rarities.forEach((r) => parts.push('rarity[]=' + encodeURIComponent(r)));
        if (filters.mainCost !== null) parts.push('mainCost=' + encodeURIComponent(filters.mainCost));
        return parts.join('&');
    };

    const runSearch = async () => {
        const myToken = ++searchToken;
        loadingEl.hidden = false;
        emptyEl.hidden = true;
        errorEl.hidden = true;
        resultsEl.innerHTML = '';
        loadMoreBtn.hidden = true;
        groupStateByKey.clear();

        try {
            const res = await fetch(cfg.searchUrl + '?' + buildQuery(), { credentials: 'same-origin' });
            if (myToken !== searchToken) return;
            loadingEl.hidden = true;

            if (!res.ok) {
                errorEl.hidden = false;
                errorEl.textContent = t('loadError', 'Could not load alt arts.');
                return;
            }

            const data = await res.json();
            families = (data.families || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            optionsByKey = data.options || {};

            if (!families.length) { emptyEl.hidden = false; return; }

            visibleCount = 0;
            renderMore();
        } catch {
            if (myToken !== searchToken) return;
            loadingEl.hidden = true;
            errorEl.hidden = false;
            errorEl.textContent = t('networkError', 'Network error.');
        }
    };

    const renderMore = () => {
        const slice = families.slice(visibleCount, visibleCount + PAGE_SIZE);
        slice.forEach((family) => resultsEl.appendChild(renderFamilyRow(family)));
        visibleCount += slice.length;
        loadMoreBtn.hidden = visibleCount >= families.length;
    };
    loadMoreBtn?.addEventListener('click', renderMore);

    // ---- Rendering ----
    const renderFamilyRow = (family) => {
        const key = groupKeyOf(family.familyId, family.faction, family.rarity);
        const optData = optionsByKey[key];

        const wrap = document.createElement('div');
        if (!optData || !optData.options || !optData.options.length) return wrap; // shouldn't happen

        const maxSlots = optData.slots.length;
        const state = {
            maxSlots,
            options: optData.options,
            slots: optData.slots.slice().sort((a, b) => a.slotIndex - b.slotIndex)
                .map((s) => ({ slotIndex: s.slotIndex, reference: s.reference })),
            activeSlot: optData.slots[optData.slots.length - 1].slotIndex,
        };
        groupStateByKey.set(key, state);

        const row = document.createElement('div');
        row.className = 'own-aa-row';
        row.dataset.group = key;

        const header = document.createElement('div');
        header.className = 'own-aa-header';
        header.innerHTML =
            '<img class="own-aa-faction-icon" src="' + escapeHtml(cfg.baseUrl + '/plugins/core-altered-cards/assets/faction/' + family.faction + '.png') + '" alt="' + escapeHtml(family.faction) + '">' +
            '<span class="own-aa-name">' + escapeHtml(family.name || family.reference) + '</span>' +
            (family.mainCost !== null && family.mainCost !== undefined
                ? '<span class="own-aa-cost">' + escapeHtml(String(family.mainCost)) + '</span>' : '');
        row.appendChild(header);

        const strip = document.createElement('div');
        strip.className = 'own-aa-strip';
        strip.dataset.group = key;
        state.options.forEach((opt) => strip.appendChild(renderTile(key, opt)));
        row.appendChild(strip);

        // Kept directly on the state (rather than re-queried by data-group later) so
        // applyMarkers works immediately, before `row` is even attached to the document.
        state.stripEl = strip;
        applyMarkers(key);

        const err = document.createElement('div');
        err.className = 'own-aa-row-error text-danger small';
        err.hidden = true;
        row.appendChild(err);

        wrap.appendChild(row);
        const sep = document.createElement('hr');
        sep.className = 'own-aa-sep';
        wrap.appendChild(sep);
        return wrap;
    };

    const renderTile = (groupKey, opt) => {
        const tile = document.createElement('div');
        tile.className = 'own-aa-tile';
        tile.dataset.ref = opt.reference;
        tile.dataset.group = groupKey;
        const unowned = opt.ownedQuantity !== null && opt.ownedQuantity === 0;
        if (unowned) tile.classList.add('own-aa-tile--unowned');

        const img = document.createElement('img');
        img.src = cdnUrl(opt.reference);
        img.loading = 'lazy';
        img.alt = '';
        tile.appendChild(img);

        const markers = document.createElement('div');
        markers.className = 'own-aa-markers';
        tile.appendChild(markers);

        return tile;
    };

    // Moves each slot's marker <img> into whichever tile currently holds its reference.
    const applyMarkers = (groupKey) => {
        const state = groupStateByKey.get(groupKey);
        const stripEl = state?.stripEl;
        if (!state || !stripEl) return;

        stripEl.querySelectorAll('.own-aa-markers').forEach((el) => { el.innerHTML = ''; });

        state.slots.forEach((slot) => {
            const tile = stripEl.querySelector('.own-aa-tile[data-ref="' + CSS.escape(slot.reference) + '"]');
            if (!tile) return;
            const marker = document.createElement('img');
            marker.className = 'own-aa-marker' + (slot.slotIndex === state.activeSlot ? ' own-aa-marker--active' : '');
            marker.src = cfg.markerImg;
            marker.dataset.slot = String(slot.slotIndex);
            marker.dataset.group = groupKey;
            marker.alt = '';
            tile.querySelector('.own-aa-markers').appendChild(marker);
        });
    };

    const showRowError = (groupKey, message) => {
        const row = resultsEl.querySelector('.own-aa-row[data-group="' + CSS.escape(groupKey) + '"]');
        const err = row?.querySelector('.own-aa-row-error');
        if (!err) return;
        err.textContent = message;
        err.hidden = false;
    };
    const clearRowError = (groupKey) => {
        const row = resultsEl.querySelector('.own-aa-row[data-group="' + CSS.escape(groupKey) + '"]');
        const err = row?.querySelector('.own-aa-row-error');
        if (err) err.hidden = true;
    };

    const saveGroup = async (groupKey, family) => {
        const state = groupStateByKey.get(groupKey);
        const res = await fetch(cfg.setPreferenceUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                familyId: family.familyId,
                faction: family.faction,
                rarity: family.rarity,
                slotReferences: state.slots.map((s) => s.reference),
                csrf_token: csrfToken,
            }),
        });

        if (res.status === 204) return;

        if (res.status === 409) {
            const shortfalls = await res.json().catch(() => []);
            const msg = (shortfalls || []).map((s) =>
                s.reference + ' (' + s.requested + '/' + s.owned + ')').join(', ');
            throw new Error(t('saveError', 'Could not save your choice.') + (msg ? ' — ' + msg : ''));
        }

        throw new Error(t('saveError', 'Could not save your choice.'));
    };

    const moveActiveMarker = (groupKey, family, newRef) => {
        const state = groupStateByKey.get(groupKey);
        if (!state) return;
        const slot = state.slots.find((s) => s.slotIndex === state.activeSlot);
        if (!slot || slot.reference === newRef) return;

        const previousRef = slot.reference;
        slot.reference = newRef;
        applyMarkers(groupKey);
        clearRowError(groupKey);

        saveGroup(groupKey, family).catch((err) => {
            slot.reference = previousRef;
            applyMarkers(groupKey);
            showRowError(groupKey, err.message || t('saveError', 'Could not save your choice.'));
        });
    };

    // Event delegation: content is (re)rendered wholesale on every search/load-more.
    resultsEl.addEventListener('click', (e) => {
        const marker = e.target.closest('.own-aa-marker');
        if (marker) {
            const groupKey = marker.dataset.group;
            const state = groupStateByKey.get(groupKey);
            if (state) {
                state.activeSlot = parseInt(marker.dataset.slot, 10);
                applyMarkers(groupKey);
            }
            return;
        }

        const tile = e.target.closest('.own-aa-tile');
        if (!tile || tile.classList.contains('own-aa-tile--unowned')) return;
        const groupKey = tile.dataset.group;
        const family = families.find((f) => groupKeyOf(f.familyId, f.faction, f.rarity) === groupKey);
        if (!family) return;
        moveActiveMarker(groupKey, family, tile.dataset.ref);
    });

    runSearch();
})();
