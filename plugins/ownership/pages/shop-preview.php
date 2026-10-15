<?php
// Static twin of pages/shop.php, for working on the page's look and feel without the ownership
// service.
//
// In production the grid is filled by GET /papi/ownership/shop-list, which reads the signed-in
// player's alt arts from the AlteredOwnership service. That service needs the player's own Keycloak
// token, so there is nothing to render locally without it — and with it, the catalogue is whatever
// that one account happens to own, which makes it useless for judging a layout.
//
// So this page points at the plugin's other list endpoint instead, /papi/ownership/shop-preview-list,
// which answers from pages/shop-preview.json. That endpoint runs the identical pipeline — same
// filtering, same pricing, same hiding of owned prints, same paging, same error mapping — and
// differs only in where the families come from. This file therefore contains no catalogue logic at
// all: it renders the same DOM as the live page and points js/shop.js at the other URL. A layout
// problem found here was therefore a layout problem in production, not a divergence between two
// implementations.
//
// Fixture: pages/shop-preview.json — a verbatim GET /api/alt-arts/search payload (families +
// options) plus a balance. Holding real card references means the CDN serves genuine artwork. Edit
// it to try other combinations: alt prints per family, owned counts of 0..3 (prints the player owns
// are hidden, which is the point) and null for an unreported count, which stays listed. The shipped
// fixture covers a rarity mix (C/R/U), all six factions, a few long names so the tile's two-line
// clamp is visible, and enough unowned prints that "load more" and the walk past empty pages both
// happen.
//
// Local-only by construction: both the route and the endpoint 404 or report themselves unavailable
// while the fixture is missing, so deleting shop-preview.json retires the page. To keep it out of
// production, do not commit the fixture.
require_once __DIR__ . '/../includes/shop-view.php';

if (!is_file(__DIR__ . '/shop-preview.json')) {
    redirect(BASE_URL . '/pages/404');
}

$pageTitle = 'Alt Art Shop (preview)';

// No ownership sub-nav here: this is a layout page, not a place in the hub, and the preview has no
// player to show a boosters badge for.

$factions = [];
$cacDir   = dirname(__DIR__, 2) . '/core-altered-cards';
if (is_file($cacDir . '/includes/functions.php')) {
    require_once $cacDir . '/includes/functions.php';
    $factions = loadAlteredData('factions');
}

ownShopHtml(ownShopText(), true, $factions, BASE_URL . '/papi/ownership/shop-preview-list');
