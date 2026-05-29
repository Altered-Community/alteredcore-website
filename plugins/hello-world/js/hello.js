// hello-world plugin — demo script.
// Loaded automatically on the plugin's own pages (declared in
// plugin.json under assets.js). Use an IIFE to avoid polluting the global scope.
(function () {
    'use strict';

    // Wait for the DOM to be ready before touching elements.
    document.addEventListener('DOMContentLoaded', function () {
        var btn     = document.getElementById('hw-counter-btn');
        var display = document.getElementById('hw-counter-display');
        if (!btn || !display) return; // elements only exist on hellopage

        var count = 0;

        btn.addEventListener('click', function () {
            count += 1;
            display.textContent = count;
            btn.textContent = count === 1 ? 'Clicked 1 time' : 'Clicked ' + count + ' times';
        });
    });
})();
