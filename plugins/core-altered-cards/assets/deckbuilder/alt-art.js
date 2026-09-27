/* Deckbuilder — alt-art.js
 * Ownership alt-art fetch, cache, auto-apply.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    function fetchAltArtData(references) {
        if (!AlteredDB.altArtsUrl || !references.length) return Promise.resolve(null);
        var qs = references.map(function (r) { return 'ref[]=' + encodeURIComponent(r); }).join('&');
        return fetch(AlteredDB.altArtsUrl + '?' + qs)
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; });
    }

    // PerDeck mode only (Global mode already blocks picking an unowned illustration
    // in its own preference widget, so the deck can't end up in this state there):
    // caches, per reference currently in the deck (cards and hero alike), how many
    // copies of that specific illustration are owned -- null means "not part of a
    // multi-art family", absent means "not fetched yet". Keyed by the deck's own ref
    // set so an unchanged deck never re-fetches; updateDeckDisplay() re-renders once
    // fresh data lands.
    var altArtOwnCache = {};
    var _altArtOwnCacheKey = null;
    var _altArtOwnToken = 0;
    function refreshAltArtOwnership() {
        if (!AlteredDB.altArtsUrl || AlteredDB.altArtGlobalMode) return;
        var refs = Object.keys(deck.cards);
        if (deck.hero && deck.hero.cardReference) refs.push(deck.hero.cardReference);
        if (!refs.length) return;
        var key = refs.slice().sort().join(',');
        if (key === _altArtOwnCacheKey) return;
        _altArtOwnCacheKey = key;
        var myToken = ++_altArtOwnToken;
        fetchAltArtData(refs).then(function (data) {
            if (myToken !== _altArtOwnToken || !data) return;
            refs.forEach(function (ref) {
                var group = data.groups[ref];
                var opt = group && data.options[group.familyId + ':' + group.faction + ':' + group.rarity];
                var match = opt && opt.options && opt.options.filter(function (o) { return o.reference === ref; })[0];
                altArtOwnCache[ref] = match ? match.ownedQuantity : null;
            });
            updateDeckDisplay();
        });
    }

    // Spreads `qty` copies across a group's ordered slots (1 for HERO/TOKEN, else up to
    // 3) the same way the deck's own copies would map onto "exemplaire" slots -- copy i
    // (0-based) takes slots[i], and any copy beyond the slot count repeats the last slot.
    // Returns { reference: count }.
    function distributeAcrossSlots(slots, qty) {
        var counts = {};
        for (var i = 0; i < qty; i++) {
            var ref = slots[Math.min(i, slots.length - 1)].reference;
            counts[ref] = (counts[ref] || 0) + 1;
        }
        return counts;
    }

    // Global mode: rewrites every multi-art card currently in the deck (hero included)
    // to the player's globally-configured alt-art preference (Alt Arts BGA page),
    // including families with no explicit choice -> their default/base art. A family can
    // already span more than one deck line (e.g. 2 copies of one art + 1 of another) --
    // those are aggregated by group before being redistributed, so the total copy count
    // is preserved exactly. Called automatically (never via a button, which only exists
    // in PerDeck mode -- see "Choisir les arts des jetons") whenever the deck's card list
    // might have changed: after loading an existing deck for edit, and after every
    // addCard()/removeCard(). A monotonic token guards against a slower, earlier call's
    // response clobbering a newer one after several quick successive quantity changes.
    var _autoApplyAltArtToken = 0;
    function autoApplyAltArtPreferences() {
        if (!AlteredDB.altArtGlobalMode) return;

        var refs = Object.keys(deck.cards);
        if (deck.hero && deck.hero.cardReference) refs.push(deck.hero.cardReference);
        if (!refs.length) return;

        var myToken = ++_autoApplyAltArtToken;
        fetchAltArtData(refs).then(function (data) {
            if (myToken !== _autoApplyAltArtToken) return;
            if (!data) return;
            var changed = false;

            var byGroup = {};
            Object.keys(deck.cards).forEach(function (ref) {
                var group = data.groups[ref];
                if (!group) return; // not part of a multi-art family
                var key = group.familyId + ':' + group.faction + ':' + group.rarity;
                var opt = data.options[key];
                if (!opt || !opt.slots || !opt.slots.length) return;
                if (!byGroup[key]) {
                    byGroup[key] = {
                        slots: opt.slots.slice().sort(function (a, b) { return a.slotIndex - b.slotIndex; }),
                        totalQty: 0, refs: [],
                    };
                }
                byGroup[key].totalQty += deck.cards[ref].qty;
                byGroup[key].refs.push(ref);
            });

            Object.keys(byGroup).forEach(function (key) {
                var g = byGroup[key];
                var counts = distributeAcrossSlots(g.slots, g.totalQty);
                var newRefs = Object.keys(counts);
                if (g.refs.length === 1 && newRefs.length === 1 && newRefs[0] === g.refs[0]) return; // no-op

                changed = true;
                var template = deck.cards[g.refs[0]];
                g.refs.forEach(function (r) { delete deck.cards[r]; });
                newRefs.forEach(function (newRef) {
                    if (deck.cards[newRef]) {
                        deck.cards[newRef].qty += counts[newRef];
                    } else {
                        deck.cards[newRef] = Object.assign({}, template, { qty: counts[newRef] });
                    }
                });
            });

            // Hero is always a single slot -- wholesale replacement, no splitting.
            if (deck.hero && deck.hero.cardReference) {
                var heroGroup = data.groups[deck.hero.cardReference];
                if (heroGroup) {
                    var heroKey = heroGroup.familyId + ':' + heroGroup.faction + ':' + heroGroup.rarity;
                    var heroOpt = data.options[heroKey];
                    var heroSlot = heroOpt && heroOpt.slots && heroOpt.slots[0];
                    if (heroSlot && heroSlot.reference !== deck.hero.cardReference) {
                        changed = true;
                        setHero(Object.assign({}, deck.hero, { cardReference: heroSlot.reference }));
                    }
                }
            }

            if (!changed) return;
            markDirty();
            updateDeckDisplay();
        });
    }

    function updateBrowserCardBadge(ref) {
        var wrap = elCards.querySelector('[data-ref="' + ref.replace(/"/g, '\\"') + '"]');
        if (!wrap) return;
        var controls  = wrap.querySelector('.db-card-bottom-controls');
        var badge     = wrap.querySelector('.db-card-qty-badge');
        var removeBtn = wrap.querySelector('.db-card-btn-group .btn-danger');
        var qty = deck.cards[ref] ? deck.cards[ref].qty : 0;
        if (qty > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'db-card-qty-badge';
                // Left of the +/- buttons, same as the initial render (see
                // the badge/bottomControls handling in the card-render loop).
                if (controls) {
                    controls.insertBefore(badge, controls.firstChild);
                } else {
                    wrap.appendChild(badge);
                }
            }
            badge.textContent = '×' + qty;
            if (removeBtn) removeBtn.style.display = '';
        } else {
            if (badge) badge.remove();
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }

    // deck display (right panel)
    var TYPE_ORDER = Object.keys(AlteredDB.types).filter(function(t) {
        return t !== 'HERO' && t.indexOf('TOKEN') !== 0;
    });
    TYPE_ORDER.push('OTHER'); // catch-all for cards with unrecognized types
