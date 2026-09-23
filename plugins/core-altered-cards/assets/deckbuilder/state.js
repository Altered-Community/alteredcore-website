/* Deckbuilder — state.js
 * Deck object, dirty flag, autosave timer, DOM refs.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    // state
    var deck = {
        id:           AlteredDB.deckId || null,
        name:         '',
        desc:         '',
        format:       'standard',
        isPublic:     false,
        isDraftMode:  'auto', // 'auto'|'draft'|'final'
        hero:         null,   // {cardReference, name, factionCode}
        cards:        {},     // {cardReference: {qty, name, type, rarity, mainCost, recallCost, oceanPower, mountainPower, forestPower}}
    };

    var dirty = false;
    var _autoSaveTimer  = null;
    var _autoSaving     = false;
    var _autoSaveFadeT  = null;
    var elAutoSaveStatus = document.getElementById('db-autosave-status');

    function markDirty() { dirty = true; scheduleAutoSave(); }
    function markClean() {
        dirty = false;
        if (_autoSaveTimer) { clearTimeout(_autoSaveTimer); _autoSaveTimer = null; }
    }

    function scheduleAutoSave() {
        // While the creation wizard is open the deck must not exist yet: picking a
        // hero marks the deck dirty, and the timer would otherwise create it under
        // the "unnamed" fallback before the user has validated step 2.
        if (_wizardOpen) return;
        if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
        _autoSaveTimer = setTimeout(function() {
            _autoSaveTimer = null;
            if (dirty) autoSave(null);
        }, 5000);
    }

    function _setAutoStatus(text, fade) {
        if (!elAutoSaveStatus) return;
        clearTimeout(_autoSaveFadeT);
        elAutoSaveStatus.style.transition = '';
        elAutoSaveStatus.style.opacity    = '1';
        elAutoSaveStatus.textContent      = text;
        if (fade) {
            _autoSaveFadeT = setTimeout(function() {
                elAutoSaveStatus.style.transition = 'opacity 1s';
                elAutoSaveStatus.style.opacity    = '0';
            }, 3000);
        }
    }

    function _buildSaveFormData() {
        var deckCards = Object.keys(deck.cards).map(function(ref) {
            return { cardReference: ref, quantity: deck.cards[ref].qty };
        });
        if (deck.hero) deckCards.unshift({ cardReference: deck.hero.cardReference, quantity: 1 });
        var draftMode = elDeckDraft ? elDeckDraft.value : 'auto';
        var isDraft = (draftMode === 'draft') ? true
                    : (draftMode === 'final') ? false
                    : !deck._valid;
        var payload = {
            name:        elDeckName.value.trim() || AlteredDB.txt.unnamed,
            description: elDeckDesc.value.trim(),
            format:      elDeckFormat.value,
            isPublic:    elDeckPublic.value === '1',
            isDraft:     isDraft,
            deckCards:   deckCards,
        };
        var body = new FormData();
        body.append('csrf_token', AlteredDB.csrfToken);
        body.append('deck_id',    deck.id || '');
        body.append('payload',    JSON.stringify(payload));
        return body;
    }

    function autoSave(onDone) {
        if (_autoSaving) { if (onDone) onDone(false); return; }
        if (!dirty)      { if (onDone) onDone(true);  return; }

        if (AlteredDB.isGuest) {
            saveGuestDeck(); markClean();
            _setAutoStatus('✓ ' + AlteredDB.txt.autosaved, true);
            if (onDone) onDone(true);
            return;
        }

        _autoSaving = true;
        _setAutoStatus(AlteredDB.txt.saving, false);

        fetch(AlteredDB.baseUrl + '/pages/deckbuilder?ajax=1', { method: 'POST', body: _buildSaveFormData() })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                _autoSaving = false;
                if (data.ok) {
                    markClean();
                    deck.id = data.id; AlteredDB.deckId = data.id;
                    if (history.replaceState) history.replaceState(null, '', '?id=' + data.id);
                    _setAutoStatus('✓ ' + AlteredDB.txt.autosaved, true);
                    if (onDone) onDone(true);
                } else {
                    _setAutoStatus('', false);
                    if (onDone) onDone(false, data.error || '');
                }
            })
            .catch(function() {
                _autoSaving = false;
                _setAutoStatus('', false);
                if (onDone) onDone(false, AlteredDB.txt.err_api);
            });
    }

    var GUEST_DECK_KEY = 'alteredcore_guest_deck';

    // Shared with the new-deck wizard / hero picker (loaded later).
    var _wizardOpen = false;
    var _heroPick = null;
    var _heroPrints = null;

    var rendererLoaded  = false;
    var heroCurrPage    = 1;
    var heroCurrFaction = '';

    // dOM refs
    var elCards    = document.getElementById('db-grid');
    var elCardList = document.getElementById('db-card-list');
    var elCardCount  = document.getElementById('db-card-count');
    var elValidation = document.getElementById('db-validation');
    var elHeroBanner = document.getElementById('db-hero-banner');
    var elHeroLabel  = document.getElementById('db-hero-label');
    var elSaveBtn    = document.getElementById('db-save-btn');
    var elSaveOk     = document.getElementById('db-save-ok');
    var elSaveErr    = document.getElementById('db-save-error');
    var elDeckName   = document.getElementById('db-deck-name');
    var elDeckDesc   = document.getElementById('db-deck-desc');
    var elDeckFormat = document.getElementById('db-deck-format');
    var elDeckPublic = document.getElementById('db-deck-public');
    var elDeckDraft  = document.getElementById('db-deck-draft');

    // BGA tester formats: hidden <option>s become selectable only when the tester
    // flag has been enabled via the secret /pages/bgatester opt-in page.
    if (elDeckFormat) {
        var _bgaTester = false;
        try { _bgaTester = localStorage.getItem('bgatester') === 'true'; } catch (e) {}
        if (_bgaTester) {
            elDeckFormat.querySelectorAll('option[data-hidden]').forEach(function(opt) {
                opt.hidden = false;
                opt.removeAttribute('hidden');
            });
        }
    }
