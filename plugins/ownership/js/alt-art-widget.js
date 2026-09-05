// Reusable single-family alt-art marker widget: renders one interactive tile strip
// (one tile per illustration of a card family) with the player's copy markers,
// click-to-move, optimistic UI with server-authoritative rollback on a 409 shortfall.
// Extracted from pages/alt-arts.php's per-family rendering so the exact same logic can
// be embedded in card-detail modals (see card-modal-enhance.js), scoped to one family
// instead of a paginated multi-family search.
(() => {
    // "No real choice" = at most one option the player could ever pick (own >=1 copy
    // of, or that's infinite): every marker is stuck on the same art regardless of
    // which one currently holds it, so there's nothing to decide for this family.
    function hasRealChoice(optData) {
        if (!optData || !optData.options) return false;
        const selectable = optData.options.filter((o) => o.ownedQuantity === null || o.ownedQuantity > 0);
        return selectable.length >= 2;
    }

    // Resolves one card reference to its multi-art family/options via the
    // deck-alt-arts papi proxy (core-altered-cards), which already combines
    // /api/alt-arts/resolve-references + /api/alt-arts/options on OWNERSHIP_API_URL.
    // Returns {family:{familyId,faction,rarity}, optData:{options,slots}}, or null
    // when the ref isn't part of a multi-art family (or on any failure).
    async function fetchSingleFamily(altArtsUrl, ref) {
        if (!altArtsUrl || !ref) return null;
        try {
            const res = await fetch(altArtsUrl + '?ref[]=' + encodeURIComponent(ref), { credentials: 'same-origin' });
            if (!res.ok) return null;
            const data = await res.json();
            const group = data.groups && data.groups[ref];
            if (!group) return null;
            const key = group.familyId + ':' + group.faction + ':' + group.rarity;
            const optData = data.options && data.options[key];
            if (!optData) return null;
            return { family: group, optData };
        } catch (e) {
            return null;
        }
    }

    const cdnUrl = (cfg, ref) => {
        const p = ref.split('_');
        return cfg.cdnUrl + '/cards/' + cfg.lang + '/' + (p[1] || '') + '/' + ref + '.webp';
    };

    // Builds one `.own-aa-row` for a single family. cfg = {cdnUrl, lang, markerImg,
    // setPreferenceUrl, csrfToken, txt:{saveError}}. Returns {el, destroy()}.
    function createFamilyRow(family, optData, cfg) {
        const groupKey = family.familyId + ':' + family.faction + ':' + family.rarity;

        const state = {
            slots: optData.slots.slice().sort((a, b) => a.slotIndex - b.slotIndex)
                .map((s) => ({ slotIndex: s.slotIndex, reference: s.reference })),
            activeSlot: optData.slots[optData.slots.length - 1].slotIndex,
        };

        const renderTile = (opt) => {
            const tile = document.createElement('div');
            tile.className = 'own-aa-tile';
            tile.dataset.ref = opt.reference;
            tile.dataset.group = groupKey;
            const unowned = opt.ownedQuantity !== null && opt.ownedQuantity === 0;
            if (unowned) tile.classList.add('own-aa-tile--unowned');

            const img = document.createElement('img');
            img.src = cdnUrl(cfg, opt.reference);
            img.loading = 'lazy';
            img.alt = '';
            tile.appendChild(img);

            const markers = document.createElement('div');
            markers.className = 'own-aa-markers';
            tile.appendChild(markers);
            return tile;
        };

        const row = document.createElement('div');
        row.className = 'own-aa-row';
        row.dataset.group = groupKey;

        const strip = document.createElement('div');
        strip.className = 'own-aa-strip';
        strip.dataset.group = groupKey;
        optData.options.forEach((opt) => strip.appendChild(renderTile(opt)));
        row.appendChild(strip);

        const err = document.createElement('div');
        err.className = 'own-aa-row-error text-danger small';
        err.hidden = true;
        row.appendChild(err);

        const showError = (message) => { err.textContent = message; err.hidden = false; };
        const clearError = () => { err.hidden = true; };

        // Moves each slot's marker <img> into whichever tile currently holds its reference.
        const applyMarkers = () => {
            strip.querySelectorAll('.own-aa-markers').forEach((el) => { el.innerHTML = ''; });
            state.slots.forEach((slot) => {
                const tile = strip.querySelector('.own-aa-tile[data-ref="' + CSS.escape(slot.reference) + '"]');
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
        applyMarkers();

        const saveGroup = async () => {
            const res = await fetch(cfg.setPreferenceUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    familyId: family.familyId,
                    faction: family.faction,
                    rarity: family.rarity,
                    slotReferences: state.slots.map((s) => s.reference),
                    csrf_token: cfg.csrfToken,
                }),
            });

            if (res.status === 204) return;

            const saveErrorMsg = (cfg.txt && cfg.txt.saveError) || 'Could not save your choice.';
            if (res.status === 409) {
                const shortfalls = await res.json().catch(() => []);
                const msg = (shortfalls || []).map((s) =>
                    s.reference + ' (' + s.requested + '/' + s.owned + ')').join(', ');
                throw new Error(saveErrorMsg + (msg ? ' — ' + msg : ''));
            }
            throw new Error(saveErrorMsg);
        };

        // After a successful move, the active slot advances to the next one in sequence
        // (wrapping around) so consecutive clicks on different cards spread across all the
        // player's markers instead of always redirecting the same one. Explicitly clicking
        // a marker still overrides this and pins that slot as the next to move.
        const advanceActiveSlot = () => {
            const idx = state.slots.findIndex((s) => s.slotIndex === state.activeSlot);
            const next = state.slots[(idx + 1) % state.slots.length];
            state.activeSlot = next.slotIndex;
        };

        const moveActiveMarker = (newRef) => {
            const movedSlot = state.activeSlot;
            const slot = state.slots.find((s) => s.slotIndex === movedSlot);
            if (!slot || slot.reference === newRef) return;

            const previousRef = slot.reference;
            slot.reference = newRef;
            advanceActiveSlot();
            applyMarkers();
            clearError();

            saveGroup().catch((err) => {
                slot.reference = previousRef;
                state.activeSlot = movedSlot;
                applyMarkers();
                showError(err.message);
            });
        };

        const onClick = (e) => {
            const marker = e.target.closest('.own-aa-marker');
            if (marker) {
                state.activeSlot = parseInt(marker.dataset.slot, 10);
                applyMarkers();
                return;
            }
            const tile = e.target.closest('.own-aa-tile');
            if (!tile || tile.classList.contains('own-aa-tile--unowned')) return;
            moveActiveMarker(tile.dataset.ref);
        };
        row.addEventListener('click', onClick);

        const destroy = () => { row.removeEventListener('click', onClick); };

        return { el: row, destroy };
    }

    window.OWN_ALT_ART_WIDGET = { hasRealChoice, fetchSingleFamily, createFamilyRow };
})();
