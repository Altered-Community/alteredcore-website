/* Deckbuilder — token-arts.js
 * Per-deck token illustration picker (ownership widget).
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    var elChooseTokensBtn = document.getElementById('db-choose-tokens-btn');
    if (elChooseTokensBtn) elChooseTokensBtn.addEventListener('click', openTokenArtsPicker);

    // PerDeck mode: "Choisir les arts des jetons" pop-in, filtered to token families —
    // reuses the same createFamilyRow() widget as the Alt Arts BGA page and the
    // card-detail modal (see plugins/ownership/js/alt-art-widget.js), since token
    // illustration preferences are always global (see AltArtPreferenceMode) even when
    // this deckbuilder is otherwise in PerDeck mode.
    var _tokenArtsOverlay = null;
    function openTokenArtsPicker() {
        if (!AlteredDB.altArtSearchUrl) return;
        if (!_tokenArtsOverlay) {
            _tokenArtsOverlay = document.createElement('div');
            _tokenArtsOverlay.className = 'own-aa-modal-overlay';
            _tokenArtsOverlay.hidden = true;
            _tokenArtsOverlay.innerHTML =
                '<div class="own-aa-modal card-altered p-3">' +
                    '<h5 class="mb-2"></h5>' +
                    '<p class="text-muted small mb-3"></p>' +
                    '<div class="db-token-arts-loading text-muted"></div>' +
                    '<div class="db-token-arts-empty text-muted" hidden></div>' +
                    '<div class="db-token-arts-rows"></div>' +
                    '<div class="text-end mt-2"><button type="button" class="btn btn-sm btn-primary-altered db-token-arts-close"></button></div>' +
                '</div>';
            _tokenArtsOverlay.querySelector('h5').textContent = AlteredDB.txt.token_arts_title;
            _tokenArtsOverlay.querySelector('p').textContent = AlteredDB.txt.token_arts_warning;
            _tokenArtsOverlay.querySelector('.db-token-arts-empty').textContent = AlteredDB.txt.token_arts_empty;
            _tokenArtsOverlay.querySelector('.db-token-arts-close').textContent = AlteredDB.txt.token_arts_close;
            _tokenArtsOverlay.querySelector('.db-token-arts-close').addEventListener('click', function () {
                _tokenArtsOverlay.hidden = true;
            });
            _tokenArtsOverlay.addEventListener('click', function (e) {
                if (e.target === _tokenArtsOverlay) _tokenArtsOverlay.hidden = true;
            });
            document.body.appendChild(_tokenArtsOverlay);
        }

        _tokenArtsOverlay.hidden = false;
        var loadingEl = _tokenArtsOverlay.querySelector('.db-token-arts-loading');
        var emptyEl = _tokenArtsOverlay.querySelector('.db-token-arts-empty');
        var rowsEl = _tokenArtsOverlay.querySelector('.db-token-arts-rows');
        loadingEl.textContent = AlteredDB.txt.loading;
        loadingEl.hidden = false;
        emptyEl.hidden = true;
        rowsEl.innerHTML = '';

        var widgetCfg = {
            cdnUrl: AlteredDB.altArtCdnUrl,
            lang: AlteredDB.lang,
            markerImg: AlteredDB.altArtMarkerImg,
            setPreferenceUrl: AlteredDB.altArtSetPreferenceUrl,
            csrfToken: AlteredDB.csrfToken,
            txt: { saveError: AlteredDB.txt.token_save_error },
        };

        var qs = ['type[]=TOKEN', 'type[]=TOKEN_LANDMARK_PERMANENT', 'type[]=TOKEN_MANA', 'hideNonChoices=false'].join('&');
        fetch(AlteredDB.altArtSearchUrl + '?' + qs, { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                loadingEl.hidden = true;
                var families = (data && data.families) || [];
                if (!families.length) { emptyEl.hidden = false; return; }
                families.forEach(function (family) {
                    var key = family.familyId + ':' + family.faction + ':' + family.rarity;
                    var optData = data.options && data.options[key];
                    if (!optData || !optData.options || !optData.options.length) return;
                    var widgetRow = window.OWN_ALT_ART_WIDGET.createFamilyRow(family, optData, widgetCfg);
                    rowsEl.appendChild(widgetRow.el);
                });
            })
            .catch(function () {
                loadingEl.hidden = true;
                emptyEl.hidden = false;
            });
    }
