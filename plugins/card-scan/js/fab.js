(function () {
    'use strict';

    var labels = {
        fr: 'Scanner',
        es: 'Escanear',
        it: 'Scansiona',
        de: 'Scannen'
    };

    document.addEventListener('DOMContentLoaded', function () {
        // If CS_PAGES is defined (via global_php config), only show on listed slugs.
        if (typeof window.CS_PAGES !== 'undefined') {
            var m    = window.location.pathname.match(/\/pages\/([a-z0-9_-]+)/i);
            var slug = m ? m[1] : '';
            if (window.CS_PAGES.indexOf(slug) === -1) return;
        }

        var lang  = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
        var label = labels[lang] || 'Scan';

        var a = document.createElement('a');
        a.id        = 'cs-fab';
        a.href      = '/pages/qrscan';
        a.setAttribute('aria-label', label);
        a.innerHTML = '<i class="fa-solid fa-qrcode" aria-hidden="true"></i>'
                    + '<span>' + label + '</span>';

        document.body.appendChild(a);
    });
}());
