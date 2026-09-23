/* Deckbuilder — hero.js
 * Set hero, faction filter, add/remove copies.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    // hero
    function setHero(heroData) {
        deck.hero = heroData;
        markDirty();
        var ref     = heroData.cardReference || '';
        var name    = typeof heroData.name === 'object'
            ? (heroData.name[AlteredDB.lang] || heroData.name.en || '')
            : (heroData.name || '');
        var faction = heroData.factionCode || factionFromRef(ref);
        deck.hero.factionCode = faction; // resolved once here so later reads (e.g. reset) don't need to recompute
        var fData   = AlteredDB.factions[faction] || {};
        var fColor  = fData.color || '#fff';

        elHeroBanner.innerHTML = '';
        elHeroBanner.style.cssText = '';

        if (ref) {
            var heroImg = AlteredDB.cdnUrl + '/cards/hero/' + ref + '_1.webp';
            var fImg    = faction ? AlteredDB.pluginAssetsUrl + '/faction/' + faction + '.png' : '';
            elHeroBanner.style.cssText =
                'background-image:linear-gradient(to right,' + fColor + 'b3 30%,' + fColor + '00 100%),url(' + heroImg + ');' +
                'background-size:cover;background-position:left top;';
        }

        if (faction) {
            var fImgEl = document.createElement('img');
            fImgEl.src = AlteredDB.pluginAssetsUrl + '/faction/' + faction + '.png';
            fImgEl.alt = faction;
            fImgEl.style.cssText = 'width:28px;height:28px;object-fit:contain;flex-shrink:0';
            elHeroBanner.appendChild(fImgEl);
        }
        var textEl = document.createElement('div');
        textEl.className = 'deck-card-text-white';
        textEl.innerHTML = '<div style="font-size:.85rem;font-weight:700">' + escHtml(name) + '</div>'
            + '<div style="font-size:.72rem;opacity:.7;margin-top:2px">' + AlteredDB.txt.change_hero + '</div>';
        elHeroBanner.appendChild(textEl);

        updateDeckDisplay();
        updateHeroFactionFilter(faction);
        if (AlteredDB.isGuest) saveGuestDeck();
    }

    // Sync the (advanced-search) faction filter to the hero's faction when the
    // hero changes mid-session. No-op at page load: the CardSearch engine
    // (window.CardSearchInstances.db) is created by a later <script> block and
    // doesn't exist yet while initFromExisting() runs.
    function updateHeroFactionFilter(faction) {
        var engine = window.CardSearchInstances && window.CardSearchInstances.db;
        if (!engine || !faction) return;
        var root = document.getElementById('db-panel');
        if (!root) return;
        root.querySelectorAll('.filter-toggle[data-filter="faction"]').forEach(function(btn) {
            var isTarget = btn.dataset.value === faction;
            var isActive = btn.classList.contains('active');
            if (isTarget !== isActive) btn.click(); // reuses card-search.js's own toggle logic
        });
        engine.search(1);
    }

    // deck card management
    function emitCardDelta(ref, name, qty, change) {
        document.dispatchEvent(new CustomEvent('db:card-delta', { detail: { ref: ref, name: name, qty: qty, change: change } }));
    }
    function addCard(card) {
        var _td = AlteredDB.types[card.cardTypeReference];
        if (_td && _td.allowedInDeckbuilder === false) return;
        markDirty();
        var ref = card.cardReference;
        if (!deck.cards[ref]) {
            deck.cards[ref] = {
                qty: 0, name: card.name, type: card.cardTypeReference, rarity: card.rarity,
                factionCode: card.factionCode || null,
                mainCost: card.mainCost || 0, recallCost: card.recallCost || 0,
                oceanPower: card.oceanPower || 0, mountainPower: card.mountainPower || 0, forestPower: card.forestPower || 0,
                isBanned:    !!card.isBanned,
                isSuspended: !!card.isSuspended,
            };
        }
        deck.cards[ref].qty++;
        updateDeckDisplay();
        updateBrowserCardBadge(ref);
        emitCardDelta(ref, deck.cards[ref].name, deck.cards[ref].qty, 1);
        if (AlteredDB.isGuest) saveGuestDeck();
        autoApplyAltArtPreferences();
    }
    function removeCard(ref) {
        markDirty();
        if (deck.cards[ref]) {
            var name = deck.cards[ref].name;
            deck.cards[ref].qty--;
            if (deck.cards[ref].qty <= 0) delete deck.cards[ref];
            updateDeckDisplay();
            updateBrowserCardBadge(ref);
            emitCardDelta(ref, name, deck.cards[ref] ? deck.cards[ref].qty : 0, -1);
            if (AlteredDB.isGuest) saveGuestDeck();
            autoApplyAltArtPreferences();
        }
    }
