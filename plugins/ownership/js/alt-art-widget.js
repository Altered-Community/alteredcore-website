// Reusable single-family alt-art widget: one illustration per print of a card family, each under its
// keys (the 1st, 2nd and 3rd card, design system `ac-keys`), optimistic UI with server-authoritative
// rollback on a 409 shortfall.
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

    // Texts of the widget, in the page's language (the card modals that embed it pass only a save error).
    const TXT = {
        fr: {
            cards: ['1ère carte', '2ème carte', '3ème carte'], suffixes: ['ère', 'ème', 'ème'], card: 'carte',
            choose: 'Choisir', chosen: 'Choisie', illustration: 'Illustration %s', cardsOf: 'Cartes de %s',
            unlimited: 'Illimitée', notOwned: 'Non possédée', ownedOne: '1 possédée', ownedMany: '%s possédées', colon: ' : ', zoom: 'Agrandir %s',
        },
        en: {
            cards: ['1st card', '2nd card', '3rd card'], suffixes: ['st', 'nd', 'rd'], card: 'card',
            choose: 'Choose', chosen: 'Chosen', illustration: 'Illustration %s', cardsOf: 'Cards of %s',
            unlimited: 'Unlimited', notOwned: 'Not owned', ownedOne: '1 owned', ownedMany: '%s owned', colon: ': ', zoom: 'Enlarge %s',
        },
    };
    const texts = () => TXT[(document.documentElement.lang || 'en').slice(0, 2)] || TXT.en;

    // Builds one `.own-aa-row` for a single family: each illustration under its keys, the 1st, 2nd and 3rd card
    // (one key for a token). A key pressed is a card that takes the illustration; pressing another gives it that
    // card. cfg = {cdnUrl, lang, setPreferenceUrl, csrfToken, txt:{saveError}, onChange(references, labels)?, onZoom(reference)?}.
    // Returns {el, destroy()}.
    function createFamilyRow(family, optData, cfg) {
        const groupKey = family.familyId + ':' + family.faction + ':' + family.rarity;
        const txt = texts();

        // One slot a card (1 for a token), 1st first.
        const slots = optData.slots.slice().sort((a, b) => a.slotIndex - b.slotIndex)
            .map((s) => ({ slotIndex: s.slotIndex, reference: s.reference }));
        const single = slots.length === 1;

        // Last slot references the server confirmed -- what a failed save rolls back to.
        let savedRefs = slots.map((s) => s.reference);

        const row = document.createElement('div');
        row.className = 'own-aa-row';
        row.dataset.group = groupKey;

        const strip = document.createElement('div');
        strip.className = 'own-aa-strip';
        row.appendChild(strip);

        const err = document.createElement('div');
        err.className = 'own-aa-row-error';
        err.setAttribute('role', 'alert');
        err.hidden = true;
        row.appendChild(err);

        const showError = (message) => { err.textContent = message; err.hidden = false; };
        const clearError = () => { err.hidden = true; };

        // A card can take this illustration unless the copies owned of it are all on other cards.
        const canTake = (opt, index) => opt.ownedQuantity === null
            || slots.filter((s, i) => i !== index && s.reference === opt.reference).length < opt.ownedQuantity;

        const noteOf = (opt) => opt.ownedQuantity === null ? txt.unlimited
            : opt.ownedQuantity === 0 ? txt.notOwned
                : opt.ownedQuantity === 1 ? txt.ownedOne : txt.ownedMany.replace('%s', opt.ownedQuantity);

        const keyButton = (opt, index) => {
            const key = document.createElement('button');
            key.type = 'button';
            key.className = 'ac-key';
            key.dataset.ref = opt.reference;
            key.dataset.slot = String(index);
            if (single) {
                // Named by its text (« Choisir » / « Choisie ») within the group « Cartes de Illustration n ».
                key.innerHTML = '<span class="ac-key__label"></span>';
            } else {
                key.setAttribute('aria-label', txt.cards[index] || (index + 1) + txt.suffixes[2] + ' ' + txt.card);
                key.innerHTML = '<span class="ac-key__num">' + (index + 1) + '<sup>' + (txt.suffixes[index] || txt.suffixes[2]) +
                    '</sup></span><span class="ac-key__word">' + txt.card + '</span>';
            }
            return key;
        };

        optData.options.forEach((opt, i) => {
            const label = txt.illustration.replace('%s', i + 1);
            const print = document.createElement('div');
            print.className = 'own-aa-print';
            if (opt.ownedQuantity === 0) print.classList.add('own-aa-print--unowned');

            const keys = document.createElement('div');
            keys.className = 'ac-keys own-aa-keys';
            keys.style.setProperty('--ac-keys-count', String(slots.length));
            keys.setAttribute('role', 'group');
            keys.setAttribute('aria-label', txt.cardsOf.replace('%s', label));
            slots.forEach((s, index) => keys.appendChild(keyButton(opt, index)));
            print.appendChild(keys);

            const img = document.createElement('img');
            img.className = 'own-aa-print__art';
            img.src = cdnUrl(cfg, opt.reference);
            img.loading = 'lazy';
            img.alt = '';
            // With a zoom from the host page, the illustration opens large.
            if (cfg.onZoom) {
                const zoom = document.createElement('button');
                zoom.type = 'button';
                zoom.className = 'own-aa-print__zoom';
                zoom.setAttribute('aria-label', txt.zoom.replace('%s', label));
                zoom.addEventListener('click', () => cfg.onZoom(opt.reference));
                zoom.appendChild(img);
                print.appendChild(zoom);
            } else {
                print.appendChild(img);
            }

            const name = document.createElement('span');
            name.className = 'own-aa-print__label';
            name.textContent = label;
            print.appendChild(name);
            const note = document.createElement('span');
            note.className = 'own-aa-print__note';
            note.textContent = noteOf(opt);
            print.appendChild(note);

            strip.appendChild(print);
        });

        const options = new Map(optData.options.map((o) => [o.reference, o]));
        const illustrationOf = (ref) => txt.illustration.replace('%s', optData.options.findIndex((o) => o.reference === ref) + 1);

        // What each card takes, in words (« 1ère carte : Illustration 2 »), and how to name its zoom.
        const describe = () => slots.map((s, i) => {
            const text = single ? illustrationOf(s.reference) : (txt.cards[i] || '') + txt.colon + illustrationOf(s.reference);
            return { text, zoom: txt.zoom.replace('%s', text) };
        });

        // Each key pressed when its card takes the key's illustration, disabled when it cannot take it.
        const render = () => {
            strip.querySelectorAll('.ac-key').forEach((key) => {
                const index = parseInt(key.dataset.slot, 10);
                const opt = options.get(key.dataset.ref);
                const on = slots[index].reference === opt.reference;
                key.setAttribute('aria-pressed', on ? 'true' : 'false');
                key.disabled = !on && !canTake(opt, index);
                if (single) key.querySelector('.ac-key__label').textContent = on ? txt.chosen : txt.choose;
            });
            if (cfg.onChange) cfg.onChange(slots.map((s) => s.reference), describe());
        };
        render();

        const saveGroup = async (slotReferences) => {
            const res = await fetch(cfg.setPreferenceUrl, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    familyId: family.familyId,
                    faction: family.faction,
                    rarity: family.rarity,
                    slotReferences,
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

        // One save in flight at a time, always sending the latest key state: firing a request per click let two
        // quick clicks race server-side, so the stored slots could end up on the older click while the keys showed
        // the newer one. Clicks made while a save is in flight are coalesced into one follow-up save.
        let saving = false;
        let savePending = false;
        const requestSave = async () => {
            if (saving) { savePending = true; return; }
            saving = true;
            let lastError = null;
            do {
                savePending = false;
                const refs = slots.map((s) => s.reference);
                try {
                    await saveGroup(refs);
                    savedRefs = refs;
                    lastError = null;
                } catch (err) {
                    lastError = err; // a newer pending state may still be valid -- retry with it first
                }
            } while (savePending);
            saving = false;

            if (lastError) {
                slots.forEach((s, i) => { s.reference = savedRefs[i]; });
                render();
                showError(lastError.message);
                return;
            }
            // Lets the host page react to a committed preference change (e.g. the
            // deckbuilder re-applies alt-art preferences to the deck being edited).
            document.dispatchEvent(new CustomEvent('own:alt-art-preference-saved', {
                detail: { familyId: family.familyId, faction: family.faction, rarity: family.rarity,
                    slotReferences: savedRefs.slice() },
            }));
        };

        // A key: its card takes its illustration.
        const onClick = (e) => {
            const key = e.target.closest('.ac-key');
            if (!key) return;
            const slot = slots[parseInt(key.dataset.slot, 10)];
            if (!slot || slot.reference === key.dataset.ref) return;
            slot.reference = key.dataset.ref;
            render();
            clearError();
            requestSave();
        };
        row.addEventListener('click', onClick);

        const destroy = () => { row.removeEventListener('click', onClick); };

        return { el: row, destroy };
    }

    window.OWN_ALT_ART_WIDGET = { hasRealChoice, fetchSingleFamily, createFamilyRow, cdnUrl };
})();
