/*
 * AlteredCore host runtime — the contract between the shell and front-end plugins
 * (plugin manifest v2, pages with "type": "spa"). Loaded by includes/spa.php before the
 * plugin's modules. Documented in plugins/README.html § "SPA plugins".
 *
 * window.AlteredCore (version 1)
 *   version, baseUrl, siteName, lang ('en' | 'fr'), theme ('light' | 'dark'),
 *   user ({ id, username, sub } | null), csrf, services ({ cards, cdn, uniques, decks, collection, ownership }),
 *   page ({ plugin, slug, basePath, subPath, assetsUrl, apiUrl, mount })
 *   Design system: getMount() injects the design system's base and ac-* component stylesheets
 *   into the plugin's shadow root before the plugin's CSS; the --ac-* tokens inherit from
 *   <html>, which carries data-theme and data-density (design-system/README.md).
 *   services.cards / .cdn / .uniques are public and called directly; services.decks / .collection / .ownership are
 *   the site's relay (/api/v1/services/…), which adds the session's Keycloak token server-side:
 *   the browser never holds a token. page.apiUrl is the plugin's own PHP endpoints
 *   (/papi/{plugin}/, manifest "api"). Writes to both send the header X-CSRF-Token: csrf.
 *   fetch(url, init)   window.fetch for same-origin calls: sends the session cookie, adds
 *                      X-CSRF-Token on writes and Accept: application/json by default
 *   login(returnTo?)   sends the user to the shell's login, then back to returnTo
 *   setTitle(title)    document title, suffixed with the site name
 *   setActiveNav(path) marks the menu entry of this client route as current, among the entries
 *                      that point inside the page's base (page.basePath); others keep their state
 *   getMount(pluginId) { host, root, container } — the element the plugin renders into
 *   on(type, fn)       'theme' | 'lang' | 'auth' events; returns an unsubscribe function
 */
(function () {
    'use strict';
    if (window.AlteredCore && window.AlteredCore.version) return;

    var configEl = document.getElementById('ac-host-config');
    var config = {};
    try { config = JSON.parse(configEl ? configEl.textContent : '{}') || {}; } catch (e) { config = {}; }

    var root = document.documentElement;
    var listeners = { theme: [], lang: [], auth: [] };
    var mounts = {};

    function currentTheme() {
        return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function emit(type, detail) {
        (listeners[type] || []).slice().forEach(function (fn) {
            try { fn(detail); } catch (e) { console.error('[AlteredCore] ' + type + ' listener failed', e); }
        });
        window.dispatchEvent(new CustomEvent('alteredcore:' + type, { detail: detail }));
    }

    var host = {
        version: 1,
        baseUrl: config.baseUrl || '',
        siteName: config.siteName || '',
        lang: config.lang === 'fr' ? 'fr' : 'en',
        theme: currentTheme(),
        user: config.user || null,
        csrf: config.csrf || '',
        services: config.services || {},
        page: config.page || {},

        login: function (returnTo) {
            var target = returnTo || (location.pathname + location.search + location.hash);
            var auth = config.auth || {};
            var url = auth.loginUrl || (host.baseUrl + '/pages/login');
            if (auth.provider === 'keycloak') url += '?return=' + encodeURIComponent(target);
            location.assign(url);
        },

        fetch: function (url, init) {
            init = Object.assign({ credentials: 'same-origin' }, init || {});
            var headers = new Headers(init.headers || {});
            var method = String(init.method || 'GET').toUpperCase();
            var sameOrigin = new URL(url, location.href).origin === location.origin;
            if (!headers.has('Accept')) headers.set('Accept', 'application/json');
            if (sameOrigin && ['GET', 'HEAD', 'OPTIONS'].indexOf(method) < 0) headers.set('X-CSRF-Token', host.csrf);
            init.headers = headers;
            return window.fetch(url, init);
        },

        setTitle: function (title) {
            document.title = title ? title + ' — ' + host.siteName : host.siteName;
        },

        setActiveNav: function (path) {
            var base = host.page.basePath;
            var target = path ? new URL(path, location.origin).pathname.replace(/\/+$/, '') : null;
            document.querySelectorAll('.site-header a.nav-link[href], .site-header a.dropdown-item[href]').forEach(function (a) {
                if (a.getAttribute('href').charAt(0) === '#') return; // dropdown toggles: the server's state
                var p = new URL(a.getAttribute('href'), location.origin).pathname.replace(/\/+$/, '');
                if ((p + '/').indexOf(base) !== 0) return;
                a.classList.toggle('active', p === target);
                if (p === target) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
            });
        },

        getMount: function (pluginId) {
            if (mounts[pluginId]) return mounts[pluginId];
            var el = document.querySelector('[data-ac-plugin="' + pluginId + '"]');
            if (!el) throw new Error('[AlteredCore] no mount point for plugin ' + pluginId);
            var shadow = el.getAttribute('data-ac-mount') !== 'light';
            var mountRoot = shadow ? (el.shadowRoot || el.attachShadow({ mode: 'open' })) : el;
            if (shadow) {
                // Design system first (base + ac-* components), then the plugin's own styles.
                var ds = (config.designSystem && config.designSystem.css) || [];
                ds.concat((host.page.plugin === pluginId && host.page.css) || []).forEach(function (href) {
                    var link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = href;
                    mountRoot.appendChild(link);
                });
            }
            var container = document.createElement('div');
            container.className = 'ac-plugin-root';
            container.setAttribute('data-theme', host.theme);
            container.setAttribute('lang', host.lang);
            mountRoot.appendChild(container);
            // The server's placeholder (skeleton of the page) stays in view, through a slot in a shadow root, until
            // the plugin draws its first screen: until the container, without its min-height meanwhile, takes some height.
            // After the container, so that the first screen sits at its place (layouts measure it) the frame both show.
            var placeholder = el.querySelector('.ac-spa-placeholder');
            if (placeholder) {
                var slot = shadow ? mountRoot.appendChild(document.createElement('slot')) : null;
                if (!shadow) el.appendChild(placeholder);
                container.style.minHeight = '0';
                var drawn = new ResizeObserver(function (entries) {
                    if (entries[0].contentRect.height < 1) return;
                    drawn.disconnect();
                    container.style.minHeight = '';
                    placeholder.remove();
                    if (slot) slot.remove();
                });
                drawn.observe(container);
            }
            mounts[pluginId] = { host: el, root: mountRoot, container: container };
            return mounts[pluginId];
        },

        on: function (type, fn) {
            if (!listeners[type]) throw new Error('[AlteredCore] unknown event ' + type);
            listeners[type].push(fn);
            return function () {
                listeners[type] = listeners[type].filter(function (f) { return f !== fn; });
            };
        },
    };

    // Theme: the shell toggles data-theme on <html> (footer script); mirror it to plugins.
    new MutationObserver(function () {
        var next = currentTheme();
        if (next === host.theme) return;
        host.theme = next;
        Object.keys(mounts).forEach(function (id) { mounts[id].container.setAttribute('data-theme', next); });
        emit('theme', { theme: next });
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    // A plugin module that fails to load (network, missing build): its page would show the server's placeholder
    // (skeleton) for ever. Script errors do not bubble: listened to in the capture phase, before the modules' tags
    // (includes/spa.php marks them with their plugin).
    document.addEventListener('error', function (event) {
        var plugin = event.target && event.target.tagName === 'SCRIPT' && event.target.getAttribute('data-ac-plugin-module');
        if (!plugin) return;
        document.querySelectorAll('[data-ac-plugin="' + plugin + '"] > .ac-spa-placeholder').forEach(function (placeholder) {
            var alert = document.createElement('div');
            alert.className = 'ac-notice ac-notice--warning';
            alert.setAttribute('role', 'alert');
            alert.textContent = host.lang === 'fr' ? 'Cette page n’est pas disponible pour le moment.' : 'This page is not available right now.';
            placeholder.replaceWith(alert);
        });
    }, true);

    // Sticky offset for plugin layouts: the site header is sticky at the top of the page.
    var header = document.querySelector('.site-header');
    function syncHeaderHeight() {
        var h = header ? header.getBoundingClientRect().height : 0;
        root.style.setProperty('--ac-header-height', Math.round(h) + 'px');
    }
    syncHeaderHeight();
    if (header && typeof ResizeObserver !== 'undefined') new ResizeObserver(syncHeaderHeight).observe(header);

    // The language is a server-side preference: changing it reloads the page, so 'lang' only
    // fires if another script updates it in place (kept in the contract for future shells).
    window.AlteredCore = host;
}());
