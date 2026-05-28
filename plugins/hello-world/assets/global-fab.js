/* hello-world — global demo badge (example of global_js + HW_PAGES filtering) */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // Only show on pages listed in config.php (injected via global_php as HW_PAGES).
        if (typeof window.HW_PAGES !== 'undefined') {
            var m    = window.location.pathname.match(/\/pages\/([a-z0-9_-]+)/i);
            var slug = m ? m[1] : '';
            if (window.HW_PAGES.indexOf(slug) === -1) return;
        }

        var badge = document.createElement('div');
        badge.id        = 'hw-global-badge';
        badge.innerHTML = '<i class="fa-solid fa-earth-europe" aria-hidden="true"></i> Hello World';
        document.body.appendChild(badge);
    });
}());
