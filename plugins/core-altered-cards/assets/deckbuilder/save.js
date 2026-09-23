/* Deckbuilder — save.js
 * Manual save, guest localStorage, load existing, frontier check.
 * Token-arts picker is token-arts.js.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    // save deck
    var saveBtnHtml = '<i class="fa-solid fa-floppy-disk me-1"></i>' + escHtml(AlteredDB.txt.save_btn);
    var elSaveRetry = document.getElementById('db-save-retry');
    var elSaveErrMsg = document.getElementById('db-save-error-msg');
    if (elSaveRetry) elSaveRetry.textContent = AlteredDB.txt.save_retry;

    function showSaveError(html) {
        elSaveOk.style.display = 'none';
        if (elSaveErrMsg) elSaveErrMsg.innerHTML = html;
        else elSaveErr.innerHTML = html;
        elSaveErr.style.display = '';
    }

    function saveDeck(onDone) {
        elSaveErr.style.display = 'none';

        if (AlteredDB.isGuest) {
            saveGuestDeck();
            markClean();
            elSaveOk.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + escHtml(AlteredDB.txt.guest_saved_ok);
            elSaveOk.style.display = '';
            setTimeout(function() { elSaveOk.style.display = 'none'; }, 4000);
            if (onDone) onDone(true);
            return;
        }

        elSaveBtn.disabled = true;
        elSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>' + escHtml(AlteredDB.txt.saving);

        fetch(AlteredDB.baseUrl + '/pages/deckbuilder?ajax=1', { method: 'POST', body: _buildSaveFormData() })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (AlteredDB.debug) console.log('[deckbuilder] save deck API response:', data);
                elSaveBtn.innerHTML = saveBtnHtml;
                elSaveBtn.disabled = false;
                if (data.ok) {
                    markClean();
                    deck.id = data.id;
                    AlteredDB.deckId = data.id;
                    if (history.replaceState) history.replaceState(null, '', '?id=' + data.id);
                    elSaveErr.style.display = 'none';
                    elSaveOk.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + escHtml(AlteredDB.txt.saved_ok);
                    elSaveOk.style.display = '';
                    setTimeout(function() { elSaveOk.style.display = 'none'; }, 4000);
                    if (onDone) onDone(true);
                } else {
                    var parts = (data.error || 'Error').split('\n');
                    showSaveError(escHtml(parts[0]) + (parts[1] ? '<br><small style="opacity:.85">' + escHtml(parts[1]) + '</small>' : ''));
                    if (onDone) onDone(false);
                }
            })
            .catch(function() {
                elSaveBtn.innerHTML = saveBtnHtml;
                elSaveBtn.disabled = false;
                showSaveError(escHtml(AlteredDB.txt.err_connect || 'Connection error'));
                if (onDone) onDone(false);
            });
    }

    elSaveBtn.addEventListener('click', function() { saveDeck(null); });
    if (elSaveRetry) elSaveRetry.addEventListener('click', function() { saveDeck(null); });
    // unsaved changes guard
    // On tab/window close: sendBeacon for existing decks (fire-and-forget), browser
    // dialog for brand-new decks that have never been saved (no deck.id yet).
    window.addEventListener('beforeunload', function(e) {
        if (!dirty) return;
        if (deck.id && navigator.sendBeacon) {
            navigator.sendBeacon(AlteredDB.baseUrl + '/pages/deckbuilder?ajax=1', _buildSaveFormData());
            return;
        }
        e.preventDefault();
        e.returnValue = '';
    });

    // On same-site link click: autosave then navigate; show error in save area if it fails.
    document.addEventListener('click', function(e) {
        if (!dirty) return;
        var a = e.target.closest('a[href]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0 || href.indexOf('mailto:') === 0) return;
        try {
            var url = new URL(href, window.location.href);
            if (url.hostname !== window.location.hostname) return;
        } catch (ex) { return; }
        e.preventDefault();
        autoSave(function(ok) {
            if (ok) {
                window.location.href = href;
            } else {
                // Autosave failed — surface the error so the user can retry manually
                showSaveError(escHtml(AlteredDB.txt.err_connect || 'Connection error'));
            }
        });
    });

    // escape helpers
    function escHtml(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function escAttr(s) {
        return String(s).replace(/'/g,"\\'");
    }
    // Expose for inline onclick
    window.addCard    = addCard;
    window.removeCard = removeCard;

    // guest localStorage helpers
    function saveGuestDeck() {
        try {
            localStorage.setItem(GUEST_DECK_KEY, JSON.stringify({
                name:   elDeckName ? elDeckName.value.trim() : (deck.name || ''),
                format: elDeckFormat ? elDeckFormat.value : (deck.format || 'standard'),
                hero:   deck.hero,
                cards:  deck.cards,
            }));
        } catch (e) {}
    }

    function initFromGuest(data) {
        if (!data) return;
        if (elDeckName)   elDeckName.value   = data.name   || '';
        if (elDeckFormat) elDeckFormat.value = (data.format || 'standard').toLowerCase();
        if (data.hero) {
            deck.hero = data.hero;
            setHero(deck.hero);
        }
        if (data.cards && typeof data.cards === 'object') {
            Object.keys(data.cards).forEach(function(ref) {
                deck.cards[ref] = data.cards[ref];
            });
        }
        updateDeckDisplay();
    }

    // init from existing deck
    function initFromExisting() {
        var d = AlteredDB.existingDeck;
        if (!d) return;

        elDeckName.value   = d.name        || '';
        elDeckDesc.value   = d.description || '';
        elDeckFormat.value = (d.format || 'standard').toLowerCase();
        elDeckPublic.value = d.isPublic ? '1' : '0';

        // isDraft mode: if deck was saved as draft, pre-select draft mode
        if (d.isDraft) {
            deck.isDraftMode = 'draft';
            if (elDeckDraft) elDeckDraft.value = 'draft';
        }

        // API returns 'cards' in GET responses, 'deckCards' in POST — support both
        var cards = d.deckCards || d.cards || [];
        cards.forEach(function(c) {
            var ref  = c.cardReference || '';
            var type = c.cardTypeReference || '';
            if (type === 'HERO') {
                deck.hero = {
                    cardReference: ref,
                    name: c.name || ref,
                    factionCode: c.factionCode || factionFromRef(ref),
                };
            } else {
                deck.cards[ref] = {
                    qty:          c.quantity || 1,
                    name:         c.name || ref,
                    type:         type,
                    rarity:       rarityCode(ref),
                    factionCode:  c.factionCode || null,
                    mainCost:     c.mainCost || 0,
                    recallCost:   c.recallCost || 0,
                    oceanPower:   c.oceanPower || 0,
                    mountainPower: c.mountainPower || 0,
                    forestPower:  c.forestPower || 0,
                    isBanned:    !!c.isBanned,
                    isSuspended: !!c.isSuspended,
                };
            }
        });
        if (deck.hero) setHero(deck.hero);
        updateDeckDisplay();
    }

    // enrich deck cards with ban/suspend status from Cards API
    function enrichDeckCardStatus() {
        var refs = Object.keys(deck.cards);
        if (!refs.length) return;
        var params = refs.map(function(r) { return 'cards.reference[]=' + encodeURIComponent(r); });
        params.push('itemsPerPage=' + refs.length);
        fetch('https://cards.alteredcore.org/api/card_groups?' + params.join('&'))
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
                if (!data || !Array.isArray(data.member)) return;
                var statusMap = {};
                data.member.forEach(function(group) {
                    var banned    = !!group.isBanned;
                    var suspended = !!group.isSuspended;
                    if (Array.isArray(group.cards)) {
                        group.cards.forEach(function(c) {
                            if (c.reference) statusMap[c.reference] = { isBanned: banned, isSuspended: suspended };
                        });
                    }
                });
                var changed = false;
                refs.forEach(function(ref) {
                    if (statusMap[ref]) {
                        deck.cards[ref].isBanned    = statusMap[ref].isBanned;
                        deck.cards[ref].isSuspended = statusMap[ref].isSuspended;
                        changed = true;
                    }
                });
                if (changed) updateDeckDisplay();
            })
            .catch(function() {});
    }

    // Frontier allowlist check — mirrors the backend FrontierFormatValidator,
    // which calls the same uniques search API server-side on save. Runs here too
    // so the deckbuilder's validation badge doesn't show "valid" for a deck the
    // API will actually reject. Only re-checks refs not already resolved, so
    // repeated calls from updateDeckDisplay() are cheap no-ops once settled.
    var _frontierCheckInFlight = {};
    function checkFrontierLegality() {
        if (!AlteredDB.uniquesApiBase) return;
        var pending = [];
        Object.keys(deck.cards).forEach(function(ref) {
            if (!isUnique(ref)) return;
            if (deck.cards[ref].isFrontierIllegal !== undefined) return;
            if (_frontierCheckInFlight[ref]) return;
            pending.push(ref);
        });
        if (!pending.length) return;
        pending.forEach(function(ref) { _frontierCheckInFlight[ref] = true; });
        fetch(AlteredDB.uniquesApiBase + '/api/v2/cards?ref=' + pending.map(encodeURIComponent).join(',') + '&format=frontier')
            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function(data) {
                var legal = {};
                (data.cards || []).forEach(function(c) { if (c.reference) legal[c.reference] = true; });
                pending.forEach(function(ref) {
                    if (deck.cards[ref]) deck.cards[ref].isFrontierIllegal = !legal[ref];
                    delete _frontierCheckInFlight[ref];
                });
                updateDeckDisplay();
            })
            .catch(function() {
                // Fail closed, like the backend: an unreachable allowlist service
                // means the deck can't be confirmed legal.
                pending.forEach(function(ref) {
                    if (deck.cards[ref]) deck.cards[ref].isFrontierIllegal = true;
                    delete _frontierCheckInFlight[ref];
                });
                updateDeckDisplay();
            });
    }

    // isDraft select
    if (elDeckDraft) elDeckDraft.addEventListener('change', function() {
        deck.isDraftMode = this.value;
        markDirty();
    });
