/* Deckbuilder — search-bind.js
 * Wires CardSearch to the deckbuilder filters and format legality.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    var engine = CardSearch({
        apiBase:     'https://cards.alteredcore.org',
        uniquesApiBase: AlteredDB.uniquesApiBase,
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

    // card-search.js's tab-click handler calls resetFilters() on every switch
    // (even back to a tab you were already on before, via a different tab) —
    // wiping the hero-faction/default-type preselection above just like Reset
    // does — and, in deck mode, never re-searches on tab switch (unlike the
    // Cards page), so the grid is left showing the *previous* tab's results
    // under the new tab's filters until "Rechercher" is clicked. Re-apply the
    // defaults on every switch, which also (re)searches so the grid always
    // matches whichever tab is now active. Registered after CardSearch's own
    // tab listener so setTab() has already run by the time this fires. Tracks
    // the last tab itself (mirroring the native handler's own no-op guard)
    // since _tab is private to card-search.js. The playset tab is a dashboard
    // with no result grid — search() no-ops there, so it needs no special case.
    var _dbLastTab = 'all';
    var _dbTabsPanel = document.getElementById('db-panel');
    if (_dbTabsPanel) {
        _dbTabsPanel.addEventListener('click', function(e) {
            var tabBtn = e.target.closest('.cs-tab[data-tab]');
            if (!tabBtn || tabBtn.disabled) return;
            var newTab = tabBtn.dataset.tab;
            if (newTab === _dbLastTab) return;
            _dbLastTab = newTab;
            // resetFilters() also cleared filters.format back to "all", so a Frontier
            // deck arrived on the Uniques tab with the Frontier preset unselected.
            // Re-apply it here for the same reason the defaults above are re-applied.
            _syncUniqueTabToFormat();
            // Favoris already (re)searched itself in the native handler; the
            // duplicate here is harmless (search() aborts the in-flight one).
            _restoreDeckDefaults({ skipTypes: newTab === 'unique' || newTab === 'collection' });
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
        var root = document.getElementById('db-panel');
        var legality = window.getDeckFormatLegality && window.getDeckFormatLegality();
        if (!root || !legality) return;
        var wantFrontier = legality.key === 'frontier';
        var targetBtn = root.querySelector(
            '.filter-toggle[data-filter="format"][data-value="' + (wantFrontier ? 'frontier' : '') + '"]'
        );
        if (targetBtn && !targetBtn.classList.contains('active')) targetBtn.click();
        if (window.updateFilterCount) window.updateFilterCount();
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
