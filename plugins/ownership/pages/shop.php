<?php
// "Alt Art Shop" — the tab this plugin adds to its own Digital Ownership sub-nav (see the
// `alt-art-shop` tab in ../includes/subnav.php). Lists the alt arts the player does not own yet,
// priced in Alterite.
//
// This page is a catalogue, not a checkout: it shows what each alt art costs and takes a
// confirmation, but the purchase itself is settled by external endpoints, so nothing here spends
// anything. There is no buy route to call — see api/shop-list.php.
//
// The markup is a shell — filters, the grid and "load more" run through /papi/ownership/shop-list so
// the catalogue can be walked server-side rather than shipped whole. See ../js/shop.js.
require_once __DIR__ . '/../includes/shop-view.php';

$txt = ownShopText();

$loggedIn = kcIsLoggedIn();

$ownActiveTab = 'alt-art-shop';
require __DIR__ . '/../includes/subnav.php';

// Faction codes and their localised names come from the cards data, the same source the
// Alt Arts BGA page reads. Optional: without it the shop still lists, it just offers no faction
// filter rather than a guessed list of codes.
$factions = [];
$cacDir   = dirname(__DIR__, 2) . '/core-altered-cards';
if (is_file($cacDir . '/includes/functions.php')) {
    require_once $cacDir . '/includes/functions.php';
    $factions = loadAlteredData('factions');
}

ownShopHtml($txt, $loggedIn, $factions, BASE_URL . '/papi/ownership/shop-list');
