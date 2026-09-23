/* Deckbuilder — cards.js
 * Card helpers, CDN URLs, browser-card renderer.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    // card helpers
    // Refs: ALT_{SET}_{SUB}_{FACTION}_{NUM}_{RARITY}[_{VAR}]
    // Unique example: ALT_EOLE_B_AX_106_U_530 — rarity is always parts[5][0]
    function isUnique(ref) { return (ref.split('_')[5] || '')[0] === 'U'; }
    function rarityCode(ref) { return (ref.split('_')[5] || '')[0] || '?'; }
    function setFromRef(ref) { return (ref || '').split('_')[1] || ''; }
    // Stable hero key: FACTION_NUMBER (e.g. "LY_105"), ignores set/subtype/rarity/variation
    function heroStableKey(ref) {
        var p = ref ? ref.split('_') : [];
        return (p[3] || '') + '_' + (p[4] || '');
    }
    // Canonical card name for grouping copies (handles string or {en,fr,...} objects)
    function canonicalName(card) {
        var n = card ? card.name : '';
        if (typeof n === 'object' && n !== null) return (n.en || n.fr || '').toLowerCase().trim();
        return String(n || '').toLowerCase().trim();
    }
    // Returns the effective unique card limit for the current hero and format rules
    function getHeroUniqueLimit(rules) {
        var limits = rules.heroUniqueLimits;
        if (limits && limits.length > 0 && deck.hero) {
            var stable = heroStableKey(deck.hero.cardReference);
            for (var i = 0; i < limits.length; i++) {
                if (limits[i].match && limits[i].match === stable) return limits[i].maxUniques;
            }
        }
        return (rules.maxUnique !== null && rules.maxUnique !== undefined) ? rules.maxUnique : null;
    }
    // Replaces %d in a message template with a number
    function fmtMsg(tpl, n) { return String(tpl).replace('%d', n); }
    function cdnUrl(ref) {
        var p = ref.split('_');
        return AlteredDB.cdnUrl + '/cards/' + AlteredDB.lang + '/' + (p[1] || '') + '/' + ref + '.webp';
    }
    // Locale-keyed names: old Cards API uses short codes (en, fr); the Uniques
    // search API (rust-cards-api) uses long codes (en_US, fr_FR) — fall back
    // across both so unique cards don't render with an empty name.
    var LOCALE_MAP_LONG = { en: 'en_US', fr: 'fr_FR' };
    function cardName(card) {
        var n = card.name;
        if (typeof n !== 'object' || n === null) return n || '';
        return n[AlteredDB.lang] || n[LOCALE_MAP_LONG[AlteredDB.lang]] || n.en || n.en_US || '';
    }
    function factionFromRef(ref) {
        var m = ref.match(/^ALT_[^_]+_[^_]+_([A-Z]{2})_/);
        return m ? m[1] : null;
    }
    function ensureRenderer() {
        if (rendererLoaded) return;
        rendererLoaded = true;
        var s = document.createElement('script');
        s.src = AlteredDB.rendererSrc;
        document.head.appendChild(s);
    }

    // render a card in the browser grid
    function renderBrowserCard(card) {
        var ref  = card.reference || '';
        var name = cardName(card);
        // The Uniques search API's CardV2 objects carry no cardType field at all
        // (rust-cards-api drops it) — every unique searchable here is a Character.
        var type = (card.cardType && card.cardType.reference) || card.cardTypeReference || (isUnique(ref) ? 'CHARACTER' : '');
        var fmtRules = AlteredDB.formats[elDeckFormat ? elDeckFormat.value : 'standard'] || {};
        var perRef   = fmtRules.maxCopiesPerRef;
        var lim      = (card.deckLimit !== undefined && card.deckLimit !== null && perRef !== undefined)
                       ? Math.min(card.deckLimit, perRef) : (perRef !== undefined ? perRef : card.deckLimit);
        if (isUnique(ref) && fmtRules.maxCopiesPerUnique !== null && fmtRules.maxCopiesPerUnique !== undefined) {
            lim = (lim !== undefined && lim !== null) ? Math.min(lim, fmtRules.maxCopiesPerUnique) : fmtRules.maxCopiesPerUnique;
        }
        var qty  = deck.cards[ref] ? deck.cards[ref].qty : 0;
        var isH  = type === 'HERO';
        var typeData   = AlteredDB.types[type];
        var notInDeck  = typeData && typeData.allowedInDeckbuilder === false;

        var item = document.createElement('div');
        item.style.minWidth = '0';

        var nameEl = document.createElement('div');
        nameEl.className = 'db-card-name';
        nameEl.title = name;
        nameEl.textContent = name;
        item.appendChild(nameEl);

        var wrap = document.createElement('div');
        wrap.className = 'db-card-wrap';
        wrap.dataset.ref = ref;

        if (isUnique(ref)) {
            ensureRenderer();
            var el = document.createElement('altered-card');
            el.setAttribute('ref', ref);
            el.setAttribute('locale', AlteredDB.uniqueLocale);
            wrap.appendChild(el);
        } else {
            var img = document.createElement('img');
            img.src = cdnUrl(ref);
            img.alt = name;
            img.className = 'db-card-img';
            img.loading = 'lazy';
            wrap.appendChild(img);
        }

        // "Suspendus et bannis" toggle: grey out + flag any banned/suspended
        // card actually showing (only reached when the deck's format doesn't
        // allow it and the user chose to include it anyway — see
        // _statusFilterParts in card-search.js).
        var _searchEngine = window.CardSearchInstances && window.CardSearchInstances.db;
        var _bannedOrSuspendedOn = !!(_searchEngine && _searchEngine.filters && _searchEngine.filters.bannedOrSuspended);
        if (_bannedOrSuspendedOn && (card.isBanned || card.isSuspended)) {
            wrap.classList.add('db-card-flagged');
            var statusOverlay = document.createElement('div');
            statusOverlay.className = 'db-card-status-overlay';
            statusOverlay.innerHTML = '<i class="fa-solid fa-' + (card.isBanned ? 'ban' : 'pause') + '"></i>';
            wrap.appendChild(statusOverlay);
        }

        // Favorite star — top-right (helper exposed by card-search.js)
        if (window.acMakeFavButton) {
            var favBtn = window.acMakeFavButton(card);
            if (favBtn) wrap.appendChild(favBtn);
        }

        if (notInDeck) {
            // no add/remove controls for token-type cards
        } else if (isH) {
            var overlay = document.createElement('div');
            overlay.className = 'db-card-add-overlay';
            overlay.innerHTML = '<span>' + AlteredDB.txt.change_hero + '</span>';
            wrap.appendChild(overlay);

            wrap.addEventListener('click', function () {
                setHero({ cardReference: ref, name: name, factionCode: factionFromRef(ref) });
                document.getElementById('db-hero-modal').style.display = 'none';
            });
        } else {
            var btnGroup = document.createElement('div');
            btnGroup.className = 'db-card-btn-group btn-group';

            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-danger';
            removeBtn.title = '−';
            removeBtn.textContent = '−';
            if (qty === 0) removeBtn.style.display = 'none';
            btnGroup.appendChild(removeBtn);

            var addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn-primary-altered';
            addBtn.title = '+';
            addBtn.textContent = '+';
            btnGroup.appendChild(addBtn);

            var bottomControls = document.createElement('div');
            bottomControls.className = 'db-card-bottom-controls';
            bottomControls.appendChild(btnGroup);
            wrap.appendChild(bottomControls);

            var addPayload = {
                cardReference: ref,
                name: name,
                cardTypeReference: type,
                rarity: rarityCode(ref),
                factionCode: (card.faction && card.faction.code) || null,
                mainCost: card.mainCost || 0,
                recallCost: card.recallCost || 0,
                oceanPower: card.oceanPower || 0,
                mountainPower: card.mountainPower || 0,
                forestPower: card.forestPower || 0,
                deckLimit: lim,
                isBanned:    !!card.isBanned,
                isSuspended: !!card.isSuspended,
            };

            addBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                addCard(addPayload);
            });

            removeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                removeCard(ref);
            });

            wrap.addEventListener('click', function () {
                openDbCardModal(ref, addPayload);
            });
        }

        if (qty > 0 && !isH) {
            var badge = document.createElement('span');
            badge.className = 'db-card-qty-badge';
            badge.textContent = '×' + qty;
            // Placed to the left of the +/- buttons, in the same bottom-right
            // group, rather than top-right where it used to collide with the
            // favorite star (window.acMakeFavButton, appended above).
            if (bottomControls) {
                bottomControls.insertBefore(badge, bottomControls.firstChild);
            } else {
                wrap.appendChild(badge);
            }
        }

        if (AlteredDB.collectionMode && !isH) {
            var cqty = AlteredDB.collection[ref] || 0;
            var cbadge = document.createElement('span');
            cbadge.className = 'db-card-coll-badge';
            cbadge.dataset.ref = ref;
            cbadge.innerHTML = '<i class="fa-solid fa-box-archive"></i> \xd7' + cqty;
            wrap.appendChild(cbadge);
        }

        item.appendChild(wrap);

        return item;
    }
