<?php
// Plugin configuration for core-altered-cards.

// feature flags
// When false, non-logged-in users are redirected to the login page on /decks
// and /deckbuilder. When true, guests can browse and use the deckbuilder, but
// saving a deck still requires being logged in.
$guestModeEnabled = true;

// When true, cards in the deck sidebar whose quantity exceeds what the user
// owns in their collection are marked with an amber archive badge.
// Has no effect when COLLECTION_MODE is false.
$showStockWarn = false;

// deck buttons (/decks list and /deck detail)
// Edit button — only visible to the deck owner.
//   true  : links to the internal deckbuilder ($deckbuilderUrl?id={deck_id})
//   false : links to $editDeckUrl (with {deck_id} replaced); hidden if $editDeckUrl is empty
$showEditBtn = true;
$editDeckUrl = 'https://deckbuilder.alteredcore.org/decks/{deck_id}';

// Delete button — only visible to the deck owner. Shows a confirmation dialog.
$showDeleteBtn = true;

// deck list only (/decks)
// New Deck button.
//   true  : links to the internal deckbuilder ($deckbuilderUrl)
//   false : links to $newDeckUrl; hidden if $newDeckUrl is also empty
$enableNewDeck = true;
$newDeckUrl    = 'https://deckbuilder.alteredcore.org/';

// Import button — shown if $showImportBtn is true OR $importDeckUrl is non-empty.
$showImportBtn = false;
$importDeckUrl = '';

// Deck builder page. The `deckbuilder` slug belongs to the ReBuilder SPA plugin when it is
// active; this plugin's own builder stays reachable as `deckbuilder-legacy` (its AJAX save
// endpoint is always the legacy page).
$deckbuilderUrl       = BASE_URL . '/pages/' . (pluginFindPage('deckbuilder') !== null ? 'deckbuilder' : 'deckbuilder-legacy');
$legacyDeckbuilderUrl = BASE_URL . '/pages/deckbuilder-legacy';

// Base URL for plugin assets (images, JS, CSS).
// Change this only if the plugin directory is moved or renamed.
$pluginAssetsUrl = BASE_URL . '/plugins/core-altered-cards/assets';
