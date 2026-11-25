/* Deckbuilder — search-bind.js
 * Wires CardSearch to the deckbuilder filters and format legality.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    var engine = CardSearch({
        apiBase:     'https://cards.alteredcore.org',
        uniquesApiBase: AlteredDB.uniquesApiBase,
        keywordCodes: AlteredDB.keywordCodes,
        debug:       AlteredDB.debug,
        lang:        AlteredDB.lang,
        uiLang:      AlteredDB.uiLang,
        prefix:      'db',
        mode:        'deck',
        cdnUrl:      AlteredDB.cdnUrl,
        rendererSrc: AlteredDB.rendererSrc,
        pushState:   false,
        autoSearch:  true,
        closeFiltersOnSearch: true,
        collectionMode:    AlteredDB.collectionMode,
        collectionData:    AlteredDB.collection,
        collectionEntries: AlteredDB.collectionEntries,
        collectionCsrf:    AlteredDB.collectionCsrf,
        collectionUrl:     AlteredDB.collectionUrl,
        collApiUrl:        AlteredDB.collApiUrl,
        ownershipApiUrl:   AlteredDB.ownershipApiUrl,
        favoritesEnabled:  AlteredDB.favoritesEnabled,
        favoritesData:     AlteredDB.favoritesData,
        favoritesCsrf:     AlteredDB.favoritesCsrf,
        favToggleUrl:      AlteredDB.favToggleUrl,
        favApiUrl:         AlteredDB.favApiUrl,
        setChildren:  AlteredDB.setChildren,
        subSets:      AlteredDB.subSets,
        noUniqueSets: AlteredDB.noUniqueSets,
        uniqueType:   ['CHARACTER'],
        uniqueRarity: ['UNIQUE'],
        uniqueExtraSets: AlteredDB.uniqueExtraSets,
        defaults: AlteredDB.searchDefaults,
        initial: AlteredDB.searchInitial,
        tsOptions: {
            setOptions:       AlteredDB.setOptionsJson,
            subtypeOptions:   AlteredDB.subtypeOptionsJson,
            keywordOptions:   AlteredDB.keywordOptionsJson,
            variationOptions: AlteredDB.variationOptionsJson,
            defaultCollection: AlteredDB.defaultCollection,
        },
        typesMerged: AlteredDB.typesMerged,
        renderDeckCard: window.renderBrowserCard,
        formatCount: function(n) { return n + ' ' + AlteredDB.txt.deck_cards; },
        txt: { prev: AlteredDB.txt.prev, next: AlteredDB.txt.next, favorite: AlteredDB.favoriteLabel, any_trigger: AlteredDB.txt.any_trigger, any_condition: AlteredDB.txt.any_condition, any_effect: AlteredDB.txt.any_effect },
        getFormatLegality: function() { return window.getDeckFormatLegality ? window.getDeckFormatLegality() : null; },
    });
    window.updateFilterCount = engine.updateFilterCount;
    window.loadCards         = engine.search;
    window.CardSearchInstances = window.CardSearchInstances || {};
    window.CardSearchInstances.db = engine;

    // "Réinitialiser" clears every filter, including faction and type — re-apply
    // the hero's faction and the deckbuilder's default types right after, so a
    // deck's card search doesn't lose its useful scope on reset. Also reused
    // below on tab switches, which resetFilters() blanks out the exact same way.
    //   - hero faction: restored on every tab (the faction buttons are shown on
    //     all of them, and every scope's API honors the filter). A single value,
    //     so it survives the physical-collection scope's single-value filters.
    //   - default types: skipped on the Uniques tab, whose own preset forces
    //     type=CHARACTER and has to win, and on the physical-collection tab,
    //     where types are single-value (each click clears the others), so
    //     replaying all four would leave just the last one arbitrarily active
    var DB_DEFAULT_TYPES = AlteredDB.defaultDeckTypes || [];
    function _restoreDeckDefaults(opts) {
        var root = document.getElementById('db-panel');
        if (root && !(opts && opts.skipTypes)) {
            DB_DEFAULT_TYPES.forEach(function(t) {
                var btn = root.querySelector('.filter-toggle[data-filter="type"][data-value="' + t + '"]');
                if (btn && !btn.classList.contains('active')) btn.click();
            });
        }
        var heroFaction = window.getDeckHeroFaction && window.getDeckHeroFaction();
        if (heroFaction) {
            window.updateHeroFactionFilter(heroFaction); // also runs the single search(1) below
        } else {
            engine.search(1);
        }
    }
    var _dbResetBtn = document.getElementById('db-reset-btn');
    if (_dbResetBtn) {
        _dbResetBtn.addEventListener('click', function() {
            // Before _restoreDeckDefaults, not after: that call ends in the single
            // search(1), and the preset has to be in filters by then to be part of
            // the query rather than only landing in the one after it.
            _syncUniqueTabToFormat(); // restores the Frontier preset if the deck is Frontier
            _restoreDeckDefaults();
        });
    }

    // card-search.js's tab-click handler calls resetFilters() on every switch,
    // wiping the hero-faction/default-type/format preselection above just like Reset
    // does, and in deck mode never re-searches on tab switch. Re-apply the deck
    // defaults and Frontier preset here, which also triggers the search so the grid
    // always matches the newly selected tab.
    var _dbLastTab = engine.getTab ? engine.getTab() : 'all';
    var _dbTabsPanel = document.getElementById('db-panel');
    if (_dbTabsPanel) {
        _dbTabsPanel.addEventListener('click', function(e) {
            var tabBtn = e.target.closest('.cs-tab[data-tab]');
            if (!tabBtn || tabBtn.disabled) return;
            var newTab = engine.getTab ? engine.getTab() : tabBtn.dataset.tab;
            if (newTab === _dbLastTab) return;
            _dbLastTab = newTab;
            _syncUniqueTabToFormat();
            _restoreDeckDefaults({ skipTypes: newTab === 'unique' || newTab === 'collection' || newTab === 'favoris' });
        });
    }

    // The format picks whether banned/suspended cards are hidden by default
    // (see getFormatLegality above). When it changes: re-run the search so the
    // grid reflects the new format immediately, and grey out the "Suspendus
    // et bannis" toggle when the new format allows both anyway (toggling
    // would have no effect since nothing is being hidden to include back).
    function _syncStatusButtonsToFormat() {
        var root = document.getElementById('db-panel');
        var legality = window.getDeckFormatLegality && window.getDeckFormatLegality();
        if (!root || !legality) return;
        var switchEl = root.querySelector('.cs-switch[data-bool-filter="bannedOrSuspended"]');
        if (switchEl) {
            var bothAllowed = legality.allowBanned && legality.allowSuspended;
            switchEl.classList.toggle('filter-toggle-soon', bothAllowed);
            switchEl.title = bothAllowed ? AlteredDB.txt.tt_banned_suspended_allowed : AlteredDB.txt.tt_show_banned_suspended;
            var cb = switchEl.querySelector('input[type="checkbox"]');
            if (cb) cb.disabled = bothAllowed;
        }
    }

    // Preselect the Uniques tab's Frontier preset when the deck itself is
    // Frontier, re-applied whenever the deck's format changes. The "this
    // format doesn't allow Uniques at all" warning is handled entirely by
    // _syncUniqueNudge() in card-search.js (driven by getFormatLegality
    // above) — updateFilterCount() re-triggers it even when the click below
    // is a no-op (deck format changes but Frontier-preset stays the same).
    function _syncUniqueTabToFormat() {
        var legality = window.getDeckFormatLegality && window.getDeckFormatLegality();
        if (!legality) return;
        var wantFormat = legality.key === 'frontier' ? (AlteredDB.uniquesFrontierFormat || 'frontier') : '';
        if (engine && engine.setFormat) engine.setFormat(wantFormat);
    }
    _syncStatusButtonsToFormat();
    _syncUniqueTabToFormat();
    var _dbFormatSelect = document.getElementById('db-deck-format');
    if (_dbFormatSelect) {
        _dbFormatSelect.addEventListener('change', function() {
            _syncStatusButtonsToFormat();
            _syncUniqueTabToFormat();
            engine.search(1);
        });
    }
