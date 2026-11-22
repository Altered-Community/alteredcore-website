<?php
// Design system stylesheets of the offline page (offline.php), precached by the service
// worker (sw.php) so the page keeps the site's look without a network. Paths under design-system/.
function offlineStylesheets(): array {
    return ['tokens/tokens.css', 'css/base.css', 'css/components/button.css', 'css/components/card.css'];
}
