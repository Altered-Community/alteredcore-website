/*
 * « Boosters to open » indicators, on every page of the site (manifest assets.global_js).
 * Settings come from includes/booster-alert-head.php (window.OWN_BOOSTER_ALERT), which is only
 * output for a signed-in user of an installation where the ownership plugin is active.
 *
 *   1. A green count on the account button's avatar.
 *   2. A « Boosters to open » link, with the count, at the top of the account menu.
 *
 * The count is cached 5 minutes in localStorage (per user) so that browsing does not call the API on
 * every page; js/boosters.js calls window.OWN_BOOSTER_ALERT.set(total) after each opening.
 */
(() => {
    const cfg = window.OWN_BOOSTER_ALERT;
    if (!cfg || !cfg.countUrl) return;

    const CACHE_KEY = 'acOwnBoosterCount';
    const CACHE_TTL = 5 * 60 * 1000;

    const readJson = (key) => {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
    };
    const writeJson = (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private window, blocked storage */ }
    };

    const fmt = (n) => (n > 99 ? '99+' : String(n));
    const icon = (name, cls) => (window.acIcon ? window.acIcon(name, cls) : '');

    let accountBtn = null;
    let accountLabel = '';
    let dotEl = null;
    let menuLink = null;
    let menuCount = null;

    const makeCount = (extraClass) => {
        const el = document.createElement('span');
        el.className = 'ac-count ac-count--success ' + extraClass;
        el.hidden = true;
        return el;
    };

    const mount = () => {
        accountBtn = document.getElementById('azAccountBtn');
        if (accountBtn) {
            accountLabel = accountBtn.getAttribute('aria-label') || '';
            dotEl = makeCount('own-booster-dot');
            dotEl.setAttribute('aria-hidden', 'true');
            accountBtn.appendChild(dotEl);
        }

        const links = document.querySelector('#azAccountMenu .az-am-links');
        if (links) {
            menuLink = document.createElement('a');
            menuLink.className = 'az-am-link';
            menuLink.href = cfg.boostersUrl;
            menuLink.hidden = true;
            menuLink.innerHTML = icon('gift') + '<span></span>' + icon('chevron-right', 'az-am-chevron');
            menuLink.querySelector('span').textContent = cfg.txt.menuLabel;
            menuCount = makeCount('own-booster-count');
            menuLink.insertBefore(menuCount, menuLink.querySelector('.az-am-chevron'));
            links.insertBefore(menuLink, links.firstChild);
        }
    };

    const render = (count) => {
        const show = count > 0;
        if (dotEl) { dotEl.hidden = !show; dotEl.textContent = fmt(count); }
        if (menuLink) { menuLink.hidden = !show; menuCount.hidden = !show; menuCount.textContent = fmt(count); }
        // The dot is hidden from assistive tech: say it on the button itself.
        if (accountBtn) {
            accountBtn.setAttribute('aria-label', show ? accountLabel + ' — ' + cfg.txt.menuLabel + ' : ' + count : accountLabel);
        }
    };

    const setCount = (count) => {
        writeJson(CACHE_KEY, { count, ts: Date.now(), user: cfg.userId });
        render(count);
    };

    // Called by js/boosters.js once a booster has been opened or the list loaded.
    window.OWN_BOOSTER_ALERT.set = setCount;

    const load = async () => {
        const cached = readJson(CACHE_KEY);
        const mine = cached && cached.user === cfg.userId;
        if (mine) render(cached.count); // shown straight away, even when stale
        if (mine && Date.now() - cached.ts < CACHE_TTL) return;
        try {
            const res = await fetch(cfg.countUrl, { credentials: 'same-origin' });
            if (!res.ok) return;
            const data = await res.json();
            setCount(Number(data.count) || 0);
        } catch { /* network error: keep what is shown, try again on the next page */ }
    };

    const start = () => { mount(); load(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
