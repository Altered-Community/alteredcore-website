/*
 * PWA support for the site shell (loaded on every front-end page by includes/pwa.php):
 *   1. registers the site's single service worker (sw.php);
 *   2. keeps <meta name="theme-color"> in sync with the light/dark header background;
 *   3. shows a small install toast in a browser tab:
 *        - Chromium: captures `beforeinstallprompt` and calls prompt() on "Install";
 *        - iOS Safari (no install API): short "Share → Add to Home Screen" instructions.
 *      Never shown when already running as an installed app; a dismissal is remembered
 *      for DISMISS_DAYS in localStorage.
 */
(function () {
    'use strict';

    var cfg = window.acPwaConfig;
    if (!cfg) return;

    var DISMISS_KEY  = 'acPwaInstallDismissedAt';
    var DISMISS_DAYS = 30;
    var SHOW_DELAY   = 3000; // ms — don't pop up while the page is still settling
    // Fixed bottom bars the toast must sit above (plugins can opt in with data-ac-bottom-nav).
    var BOTTOM_BARS  = '.decks-tabs, .db-mobile-tabs, [data-ac-bottom-nav]';

    function readStore(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    function writeStore(key, value) {
        try { window.localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
    }

    // The offline page (offline.php) reads this to pick its language.
    writeStore('acUiLang', cfg.lang);

    // ── Service worker ────────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register(cfg.swUrl, { scope: cfg.scope }).catch(function (err) {
                if (window.console) console.warn('[pwa] service worker registration failed:', err);
            });
        });
    }

    // ── theme-color follows the header background (light / dark theme) ────
    // The header's background token (design-system/tokens/tokens.css), light or dark.
    var themeMeta = document.querySelector('meta[name="theme-color"][data-ac-auto]');
    function syncThemeColor() {
        var bg = getComputedStyle(document.documentElement).getPropertyValue('--ac-header-bg').trim();
        if (bg) themeMeta.setAttribute('content', bg);
    }
    if (themeMeta) {
        syncThemeColor();
        if (window.MutationObserver) {
            new MutationObserver(syncThemeColor).observe(document.documentElement, {
                attributes: true, attributeFilter: ['data-theme']
            });
        }
    }

    // ── Install toast ─────────────────────────────────────────────────────
    var toast = document.getElementById('ac-pwa-toast');
    if (!toast) return;

    function isStandalone() {
        if (window.navigator.standalone === true) return true; // iOS home-screen app
        if (!window.matchMedia) return false;
        return ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(function (mode) {
            return window.matchMedia('(display-mode: ' + mode + ')').matches;
        });
    }

    function isIosSafari() {
        var ua = navigator.userAgent;
        var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
    }

    function recentlyDismissed() {
        var at = parseInt(readStore(DISMISS_KEY), 10);
        return at > 0 && (Date.now() - at) < DISMISS_DAYS * 86400000;
    }

    var deferredPrompt = null;
    var showTimer      = null;
    var installBtn     = toast.querySelector('[data-pwa-install]');

    function updateBottomOffset() {
        var offset = 0;
        document.querySelectorAll(BOTTOM_BARS).forEach(function (el) {
            if (getComputedStyle(el).position !== 'fixed') return;
            var rect = el.getBoundingClientRect();
            if (rect.height > 0 && rect.top < window.innerHeight) {
                offset = Math.max(offset, window.innerHeight - rect.top);
            }
        });
        toast.style.setProperty('--ac-pwa-bottom-offset', offset + 'px');
    }

    function hide() {
        clearTimeout(showTimer);
        toast.classList.remove('is-visible');
        toast.hidden = true;
        window.removeEventListener('resize', updateBottomOffset);
    }

    function dismiss() {
        writeStore(DISMISS_KEY, String(Date.now()));
        hide();
    }

    // mode: 'prompt' (Chromium install API) or 'ios' (manual instructions)
    function scheduleShow(mode) {
        if (isStandalone() || recentlyDismissed()) return;
        clearTimeout(showTimer);
        showTimer = setTimeout(function tryShow() {
            // Wait until no Bootstrap modal (e.g. the cookie notice) is open.
            if (document.querySelector('.modal.show')) {
                showTimer = setTimeout(tryShow, 1000);
                return;
            }
            toast.querySelectorAll('[data-pwa-mode]').forEach(function (el) {
                el.hidden = el.getAttribute('data-pwa-mode') !== mode;
            });
            updateBottomOffset();
            window.addEventListener('resize', updateBottomOffset);
            toast.hidden = false;
            void toast.offsetWidth; // force a reflow so the opacity/transform transition runs
            toast.classList.add('is-visible');
        }, SHOW_DELAY);
    }

    // Chromium: keep the event to trigger the native dialog from our button.
    // preventDefault() also stops Chrome's own mini-infobar on Android, so a
    // user who dismissed our toast is not prompted again by the browser.
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        scheduleShow('prompt');
    });

    window.addEventListener('appinstalled', function () {
        deferredPrompt = null;
        writeStore(DISMISS_KEY, String(Date.now()));
        hide();
    });

    installBtn.addEventListener('click', function () {
        if (!deferredPrompt) { hide(); return; }
        var evt = deferredPrompt;
        deferredPrompt = null; // prompt() can only be called once per event
        hide();
        evt.prompt();
        evt.userChoice.then(function (choice) {
            if (!choice || choice.outcome !== 'accepted') dismiss();
        }).catch(function () {});
    });

    toast.querySelectorAll('[data-pwa-dismiss]').forEach(function (btn) {
        btn.addEventListener('click', dismiss);
    });

    if (isIosSafari()) scheduleShow('ios');
}());
