<?php
// card-scan — list of page slugs on which the floating scan button is displayed.
// Add or remove slugs to control where the button appears.
// Slugs match the URL segment after /pages/ (e.g. "cards" for /pages/cards).
return [
    'pages' => [
        //'cards',
    ],
    // Universal QR resolver on qr.alteredcore.org. Receives ?q=<raw QR content>,
    // applies all rules server-side (see api.php / config.php there) and returns {"ref":...}.
    // CORS-open, so the browser calls it directly. Change here if the endpoint moves.
    'api_url' => 'https://qr.altered.re/api.php',

    // Collect mode = continuous "scan a whole deck" flow used by other plugins
    // (e.g. core-altered-cards decks page). It adds a scanned-cards filmstrip and a
    // "Done/Validate" button on top of the scanner. The plain single-scan redirect
    // mode (the qrscan page) is always available regardless of this flag.
    // Set enabled=false to forbid collect mode site-wide (the "Scan a deck" button
    // then never appears).
    'collect' => [
        'enabled' => true,
    ],
];
