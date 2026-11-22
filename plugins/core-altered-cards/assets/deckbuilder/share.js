/* Deckbuilder — share.js
 * « Partager » and « Terminer »: the deck is saved first (a new deck too: its first save gives it an id, so a link),
 * then the share window (link, Copier, QR code, as on the deck page) or the deck page. A failed save stops the action:
 * the error shows under the page title, from every tab, and « Réessayer » carries the action on.
 * A guest deck lives in this browser only: « Connectez-vous pour partager », then the login brings the user back here
 * with ?share_guest=1 (ui.js loads the browser deck), the deck is saved to the account, removed from this browser and
 * shared.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
(function() {
    var txt = AlteredDB.txt;
    var icons = AlteredDB.icons || {};
    /** The action waiting for the save; its button shows the wait, every action button is disabled. */
    var pending = null;
    /** The action a failed save stopped (« Réessayer »). */
    var stopped = null;

    var elError     = document.getElementById('db-action-error');
    var elErrorMsg  = document.getElementById('db-action-error-msg');
    var elErrorThen = document.getElementById('db-action-error-then');
    var elRetry     = document.getElementById('db-action-retry');
    var elModal     = document.getElementById('dbShareModal');
    var elSaved     = document.getElementById('db-share-saved');
    var elPrivate   = document.getElementById('db-share-private');
    var elLink      = document.getElementById('db-share-link');
    var elUrl       = document.getElementById('db-share-url');
    var elCopy      = document.getElementById('db-share-copy');
    var elQr        = document.getElementById('db-share-qr');
    var elMakePub   = document.getElementById('db-share-make-public');
    var elPubError  = document.getElementById('db-share-private-error');

    function buttons() { return document.querySelectorAll('[data-db-action]'); }

    function setWaiting(action) {
        buttons().forEach(function(b) {
            if (b._dbHtml === undefined) b._dbHtml = b.innerHTML;
            b.disabled = !!action;
            var waiting = action && b.dataset.dbAction === action;
            if (waiting) b.setAttribute('aria-busy', 'true'); else b.removeAttribute('aria-busy');
            if (!waiting) { b.innerHTML = b._dbHtml; return; }
            // Icon-only button (status strip): the spinner alone; title buttons: spinner + « Sauvegarde… ».
            b.innerHTML = (icons.saving || '') + (b.querySelector('.db-action-label') ? '<span class="db-action-label">' + escHtml(txt.saving) + '</span>' : '');
        });
    }

    function hideError() {
        stopped = null;
        if (elError) elError.hidden = true;
    }

    function showError(action, html) {
        stopped = action;
        if (!elError) return;
        elErrorMsg.innerHTML = html || escHtml(txt.err_connect || 'Connection error');
        elErrorThen.textContent = action === 'done' ? txt.done_stopped : txt.share_stopped;
        elError.hidden = false;
    }

    /** Waits for a running autosave (two creations of a new deck would make two decks), then saves if needed. */
    function saveFirst(cb) {
        if (_autoSaving) { setTimeout(function() { saveFirst(cb); }, 100); return; }
        if (!dirty && deck.id) { cb(true); return; }
        // The pending autosave would fire during this save: for a deck without an id yet, a second creation.
        if (_autoSaveTimer) { clearTimeout(_autoSaveTimer); _autoSaveTimer = null; }
        saveDeck(cb);
    }

    function act(action) {
        if (pending) return;
        if (action === 'share' && AlteredDB.isGuest) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('dbSignInShareModal')).show();
            return;
        }
        hideError();
        pending = action;
        setWaiting(action);
        saveFirst(function(ok, errHtml) {
            pending = null;
            setWaiting(null);
            if (!ok) { showError(action, errHtml); return; }
            if (action === 'done') window.location.href = AlteredDB.baseUrl + '/pages/deck?id=' + encodeURIComponent(deck.id);
            else openShare(txt.share_saved);
        });
    }

    function isPublic() { return !!elDeckPublic && elDeckPublic.value === '1'; }

    function renderLink() {
        var url = AlteredDB.deckPageUrl + encodeURIComponent(deck.id);
        elUrl.value = url;
        if (elQr.dataset.url === url || typeof QRCode === 'undefined') return;
        elQr.innerHTML = '';
        elQr.dataset.url = url;
        var css = getComputedStyle(document.documentElement);
        new QRCode(elQr, {
            text: url, width: 200, height: 200,
            // QR codes stay dark on light in both themes (scanners expect it), as on the deck page.
            colorDark: css.getPropertyValue('--ac-card-ink').trim() || 'black',
            colorLight: css.getPropertyValue('--ac-card-paper').trim() || 'white',
            correctLevel: QRCode.CorrectLevel.M,
        });
    }

    /** The share window; a private deck asks first (« Rendre public & partager »), as on the deck page. */
    function openShare(savedText) {
        elSaved.querySelector('span').textContent = savedText;
        elPrivate.hidden = isPublic();
        elLink.hidden = !isPublic();
        if (elPubError) elPubError.hidden = true;
        if (isPublic()) renderLink();
        bootstrap.Modal.getOrCreateInstance(elModal).show();
    }

    if (elMakePub) elMakePub.addEventListener('click', function() {
        // The visibility field of the editor, then a save: the deck stays as the editor shows it.
        elDeckPublic.value = '1';
        elDeckPublic.dispatchEvent(new Event('change', { bubbles: true }));
        elMakePub.disabled = true;
        saveFirst(function(ok, errHtml) {
            elMakePub.disabled = false;
            if (!ok) {
                elPubError.innerHTML = errHtml || escHtml(txt.err_connect || 'Connection error');
                elPubError.hidden = false;
                return;
            }
            elPrivate.hidden = true;
            elLink.hidden = false;
            renderLink();
        });
    });

    if (elCopy) elCopy.addEventListener('click', function() {
        var done = function() {
            elCopy.innerHTML = (icons.check || '') + '<span>' + escHtml(txt.share_copied) + '</span>';
            setTimeout(function() { elCopy.innerHTML = (icons.copy || '') + '<span>' + escHtml(txt.share_copy) + '</span>'; }, 2000);
        };
        navigator.clipboard.writeText(elUrl.value).then(done).catch(function() { elUrl.select(); document.execCommand('copy'); });
    });

    // Title buttons and the status strip's (status-strip.js runs before this script).
    buttons().forEach(function(b) {
        b.addEventListener('click', function() { act(b.dataset.dbAction); });
    });
    if (elRetry) elRetry.addEventListener('click', function() { if (stopped) act(stopped); });
    /** The browser deck brought back from the login, until a save puts it on the account. */
    var guestToForget = !!window._dbShareGuest;
    // Saved meanwhile (autosave, « Sauvegarder »): nothing is stopped any more, and a browser deck is on the account.
    document.addEventListener('db:save-state', function(e) {
        if (e.detail.state !== 'saved') return;
        if (guestToForget) { guestToForget = false; forgetGuestDeck(); }
        if (!pending) hideError();
    });

    /** The browser's guest deck is on the account now: removed here, with Re:Builder's copy of it (no duplicate). */
    function forgetGuestDeck() {
        try {
            localStorage.removeItem(GUEST_DECK_KEY);
            var imported = JSON.parse(localStorage.getItem('arb.site-guest-deck') || 'null');
            if (imported && typeof imported.id === 'string') {
                var decks = JSON.parse(localStorage.getItem('arb.guest-decks') || '[]');
                if (Array.isArray(decks)) localStorage.setItem('arb.guest-decks', JSON.stringify(decks.filter(function(d) { return d && d.id !== imported.id; })));
            }
            localStorage.removeItem('arb.site-guest-deck');
        } catch (e) {}
    }

    // Back from the login (ui.js loaded the browser deck): save it to the account, then share it.
    if (window._dbShareGuest) {
        pending = 'share';
        setWaiting('share');
        saveFirst(function(ok, errHtml) {
            pending = null;
            setWaiting(null);
            if (!ok) { showError('share', errHtml); return; }
            openShare(txt.share_saved_account);
        });
    }
})();
