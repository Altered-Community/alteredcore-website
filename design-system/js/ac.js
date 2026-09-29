/*
 * AlteredCore design system — helpers for the site's scripts (loaded by the shell, defer).
 *
 *   acIcon(name, extraClass?, label?)   SVG markup of an icon, for HTML built in JS:
 *                                       el.innerHTML = acIcon('trash-2') + ' Delete';
 *   [data-theme-toggle] buttons         switch light / dark (data-theme on <html>, saved in
 *                                       localStorage 'acTheme'); a child .theme-icon-moon /
 *                                       .theme-icon-sun is shown for the theme it switches to;
 *                                       optional data-label-dark / data-label-light titles.
 *   --ac-header-height                  measured on <html> from the sticky .site-header, for
 *                                       sticky panels and full-height layouts.
 *
 * Icons come from design-system/icons/sprite.svg (Lucide + brands, same names as ac_icon()).
 * PHP pages call ac_icon() instead: inline SVG, no request. SPA plugins use their framework's
 * icon component.
 */
(function () {
    'use strict';
    var script = document.currentScript;
    var sprite = script ? new URL('../icons/sprite.svg', script.src).pathname : '/design-system/icons/sprite.svg';

    function escapeAttr(s) {
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

    window.acIcon = function (name, extraClass, label) {
        var cls = 'ac-icon' + (extraClass ? ' ' + extraClass : '');
        var a11y = label ? ' role="img" aria-label="' + escapeAttr(label) + '"' : ' aria-hidden="true" focusable="false"';
        return '<svg class="' + escapeAttr(cls) + '"' + a11y + '><use href="' + sprite + '#' + escapeAttr(name) + '"></use></svg>';
    };

    var root = document.documentElement;

    function isDark() { return root.getAttribute('data-theme') === 'dark'; }

    function syncToggles() {
        var dark = isDark();
        document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
            var moon = btn.querySelector('.theme-icon-moon');
            var sun = btn.querySelector('.theme-icon-sun');
            if (moon) moon.toggleAttribute('hidden', dark);
            if (sun) sun.toggleAttribute('hidden', !dark);
            var title = dark ? btn.getAttribute('data-label-light') : btn.getAttribute('data-label-dark');
            if (title) btn.title = title;
            btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        });
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-theme-toggle]');
        if (!btn) return;
        var dark = !isDark();
        if (dark) root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
        try { localStorage.setItem('acTheme', dark ? 'dark' : 'light'); } catch (err) { /* private mode */ }
        syncToggles();
    });

    function measureHeader() {
        var header = document.querySelector('.site-header');
        if (!header) return;
        var set = function () { root.style.setProperty('--ac-header-height', Math.round(header.getBoundingClientRect().height) + 'px'); };
        set();
        if (typeof ResizeObserver !== 'undefined') new ResizeObserver(set).observe(header);
    }

    function init() { syncToggles(); measureHeader(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
