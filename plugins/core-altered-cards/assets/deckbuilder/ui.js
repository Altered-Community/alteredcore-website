/* Deckbuilder — ui.js
 * Tabs, dirty listeners, boot, window exports.
 * Loaded as a classic script (shared global scope with sibling modules).
 */

    // mark dirty on meta field changes
    [elDeckName, elDeckDesc].forEach(function(el) {
        if (el) el.addEventListener('input', markDirty);
    });
    [elDeckPublic].forEach(function(el) {
        if (el) el.addEventListener('change', markDirty);
    });
    if (elDeckFormat) elDeckFormat.addEventListener('change', function() {
        markDirty();
        updateDeckDisplay();
    });

    // mobile tabs
    document.querySelectorAll('.db-mobile-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.db-mobile-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var t = tab.dataset.tab;
            // 'view' shares the left panel with 'search'
            var paneId = 'db-tab-' + (t === 'view' || t === 'hand' ? 'search' : t);
            document.querySelectorAll('.db-tab-pane').forEach(function(p) { p.classList.remove('active'); });
            var pane = document.getElementById(paneId);
            if (pane) pane.classList.add('active');
            // Switch sub-pane between search form, deck view and starting hand
            if (t === 'search' || t === 'view' || t === 'hand') {
                document.getElementById('db-search-pane-search').style.display = t === 'search' ? '' : 'none';
                document.getElementById('db-search-pane-view').style.display   = t === 'view'   ? '' : 'none';
                document.getElementById('db-search-pane-hand').style.display   = t === 'hand'   ? '' : 'none';
                document.querySelectorAll('.db-search-tab').forEach(function(st) {
                    st.classList.toggle('active', st.dataset.pane === t);
                });
                if (t === 'view') renderGridPane();
                if (t === 'hand') { renderHandPane(); if (window.HandTester && !window.HandTester.isStarted()) window.HandTester.reset(); }
            }
        });
    });

    // deck panel tabs (Cards / Stats)
    document.querySelectorAll('.db-deck-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.db-deck-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var pane = tab.dataset.pane;
            document.getElementById('db-deck-pane-cards').style.display = pane === 'cards' ? '' : 'none';
            document.getElementById('db-deck-pane-stats').style.display = pane === 'stats' ? '' : 'none';
        });
    });

    // left panel tabs (Card Search / View Deck)
    document.querySelectorAll('.db-search-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.db-search-tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            var pane = tab.dataset.pane;
            document.getElementById('db-search-pane-search').style.display = pane === 'search' ? '' : 'none';
            document.getElementById('db-search-pane-view').style.display   = pane === 'view'   ? '' : 'none';
            document.getElementById('db-search-pane-hand').style.display   = pane === 'hand'   ? '' : 'none';
            if (pane === 'view') renderGridPane();
            if (pane === 'hand') { renderHandPane(); if (window.HandTester && !window.HandTester.isStarted()) window.HandTester.reset(); }
        });
    });

    // grid/list toggle for deck view pane
    var elToggleGrid = document.getElementById('db-grid-toggle-grid');
    var elToggleList = document.getElementById('db-grid-toggle-list');
    if (elToggleGrid && elToggleList) {
        elToggleGrid.addEventListener('click', function() {
            dbGridViewMode = 'grid';
            elToggleGrid.classList.add('active');
            elToggleList.classList.remove('active');
            renderGridPane();
        });
        elToggleList.addEventListener('click', function() {
            dbGridViewMode = 'list';
            elToggleList.classList.add('active');
            elToggleGrid.classList.remove('active');
            renderGridPane();
        });
    }

    if (AlteredDB.isGuest) {
        var _saved = localStorage.getItem(GUEST_DECK_KEY);
        if (_saved) { try { initFromGuest(JSON.parse(_saved)); } catch (e) {} }
        else { updateDeckDisplay(); }
    } else {
        initFromExisting();
        updateDeckDisplay();
        enrichDeckCardStatus();
        autoApplyAltArtPreferences();
    }

    // A brand-new deck opens on the creation dialog. Guard on deck.hero as well: a
    // guest deck restored from localStorage is an existing deck even without ?id=.
    if (AlteredDB.newDeckFlow && !deck.hero) dbNewOpen();

    window.renderBrowserCard = renderBrowserCard;
    // Exposed so the (separately-scoped) CardSearch engine setup can wire the
    // "Réinitialiser" button to restore the hero's faction instead of clearing it.
    window.updateHeroFactionFilter = updateHeroFactionFilter;
    window.getDeckHeroFaction = function() { return deck.hero ? deck.hero.factionCode : null; };
    // Banned/suspended-card visibility, and the Uniques tab's own adjustments,
    // depend on the deck's current format — exposed so the CardSearch engine
    // and the Uniques-tab sync below can read it live on every change.
    window.getDeckFormatLegality = function() {
        var fmtKey = elDeckFormat ? elDeckFormat.value : '';
        var fmt = (AlteredDB.formats && AlteredDB.formats[fmtKey]) || {};
        return {
            key:            fmtKey,
            allowBanned:    fmt.allowBanned    !== false,
            allowSuspended: fmt.allowSuspended !== false,
            maxUnique:      fmt.maxUnique,
        };
    };
