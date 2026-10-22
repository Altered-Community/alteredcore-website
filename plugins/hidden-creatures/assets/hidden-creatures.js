/*
 * Hidden creatures (README.md): releases this page's creatures (window.acHiddenCreatures, from global_head.php)
 * as <cotton-fall> elements. A click reports the find (papi/find.php: recorded for a signed-in user, the spot's
 * contest code) and shows the count: the account's finds when signed in, this browser's otherwise.
 */
(function () {
    'use strict';

    var config = window.acHiddenCreatures;
    if (!config || !config.spots || !config.spots.length) return;

    var STORAGE_KEY = 'acHiddenCreatures';

    function foundIds() {
        try {
            var ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(ids) ? ids : [];
        } catch (e) {
            return [];
        }
    }

    /** Records finds in this browser; true when `id` is new. */
    function markFound(id, others) {
        var ids = foundIds();
        var isNew = ids.indexOf(id) === -1;
        [id].concat(others || []).forEach(function (one) { if (ids.indexOf(one) === -1) ids.push(one); });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch (e) { /* private mode: not kept */ }
        return isNew;
    }

    function format(template, values) {
        return template.replace(/\{(\w+)\}/g, function (all, key) { return key in values ? values[key] : all; });
    }

    /** POST papi/find.php: its reply, or null (network, not seen…). */
    function report(spot) {
        if (!window.fetch) return Promise.resolve(null);
        return fetch(config.api, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': config.csrf },
            body: JSON.stringify({ spot: spot.id }),
        }).then(function (res) { return res.ok ? res.json() : null; }).catch(function () { return null; });
    }

    function announce(spot, reply) {
        var text = config.text;
        var account = reply && Array.isArray(reply.found);
        // Signed in: the account's finds, kept in this browser too. Otherwise: this browser's.
        var isNew = account ? reply.new : markFound(spot.id);
        if (account) markFound(spot.id, reply.found);
        var ids = account ? reply.found : foundIds();
        var count = ids.filter(function (id) { return config.all.indexOf(id) !== -1; }).length;
        var message = format(isNew ? text.found : text.again, { name: spot.name, count: count, total: config.all.length });
        var code = reply && reply.code;
        if (code) message += ' ' + format(text.code, { code: code });
        if (code && !config.signedIn) message += ' ' + text.login;
        window.acToast(message, code ? {
            duration: 12000,
            actionLabel: text.copy,
            onAction: function () { if (navigator.clipboard) navigator.clipboard.writeText(code).catch(function () {}); },
        } : { duration: 4000 });
    }

    /** A spot's creature: falling through the page in a loop, or (`once`) across the screen a single time. */
    function release(spot, once) {
        var el = document.createElement('cotton-fall');
        // No image (none picked in the admin yet): the component's cotton ball.
        if (spot.normal) el.setAttribute('img-normal', spot.normal);
        if (spot.click) el.setAttribute('img-click', spot.click);
        // One creature: a ball per 1000 screens, at least one. 200 px, less on a phone (30 % of the width).
        el.setAttribute('density', '1000');
        el.setAttribute('size', String(Math.round(Math.min(200, window.innerWidth * 0.3))));
        el.setAttribute('min-count', '1');
        if (once) {
            el.setAttribute('once', '');
            el.setAttribute('spawn', 'viewport');
        }
        var announced = false;
        // A click on the creature, retargeted from the component's shadow DOM.
        el.addEventListener('click', function () {
            if (announced || !window.acToast) return;
            announced = true;
            report(spot).then(function (reply) { announce(spot, reply); });
        });
        document.body.appendChild(el);
    }

    config.spots.forEach(function (spot) {
        if (spot.when === 'load') {
            release(spot, false);
        } else if (spot.when === 'scroll-end') {
            var onScroll = function () {
                var de = document.documentElement;
                if (window.scrollY + window.innerHeight < de.scrollHeight - 100) return;
                window.removeEventListener('scroll', onScroll);
                release(spot, true);
            };
            window.addEventListener('scroll', onScroll, { passive: true });
        } else if (spot.when.indexOf('event:') === 0) {
            var name = spot.when.slice(6);
            var onSpot = function (e) {
                if (e.detail !== name) return;
                window.removeEventListener('ac-hidden-spot', onSpot);
                release(spot, true);
            };
            window.addEventListener('ac-hidden-spot', onSpot);
        } else if (spot.when.indexOf('link:') === 0) {
            followLink(spot, spot.when.slice(5));
        }
    });

    /**
     * `link:<url>`: a click on a link to <url> leaves the site, so the creature waits (localStorage) for the visitor's
     * return: the next page, or this one back from the back-forward cache. A link to a new tab: here, right away.
     */
    function followLink(spot, url) {
        var key = STORAGE_KEY + ':waiting:' + spot.id;
        var waiting = function () { try { return !!localStorage.getItem(key); } catch (e) { return false; } };
        var setWaiting = function (on) {
            try { if (on) localStorage.setItem(key, '1'); else localStorage.removeItem(key); } catch (e) { /* not kept */ }
        };
        var released = false;
        var releaseOnce = function () {
            if (released) return;
            released = true;
            setWaiting(false);
            release(spot, true);
        };
        if (waiting()) releaseOnce();
        window.addEventListener('pageshow', function (e) { if (e.persisted && waiting()) releaseOnce(); });
        document.addEventListener('click', function (e) {
            var link = e.target.closest && e.target.closest('a[href]');
            if (!link || link.href.indexOf(url) !== 0) return;
            if (link.target === '_blank') releaseOnce();
            else if (!released) setWaiting(true);
        }, true);
    }
})();
