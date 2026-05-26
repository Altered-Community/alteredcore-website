<?php
// Plugin configuration for core-altered-cards.

// feature flags
// When false, non-logged-in users are redirected to the login page on /decks
// and /deckbuilder. When true, guests can browse and use the deckbuilder, but
// saving a deck still requires being logged in.
$guestModeEnabled = false;

// When true, cards in the deck sidebar whose quantity exceeds what the user
// owns in their collection are marked with an amber archive badge.
// Has no effect when COLLECTION_MODE is false.
$showStockWarn = false;

// deck buttons (/decks list and /deck detail)
// Edit button — only visible to the deck owner.
//   true  : links to the internal deckbuilder (/pages/deckbuilder?id={deck_id})
//   false : links to $editDeckUrl (with {deck_id} replaced); hidden if $editDeckUrl is empty
$showEditBtn = false;
$editDeckUrl = 'https://deckbuilder.alteredcore.org/decks/{deck_id}';

// Delete button — only visible to the deck owner. Shows a confirmation dialog.
$showDeleteBtn = true;

// deck list only (/decks)
// New Deck button.
//   true  : links to the internal deckbuilder (/pages/deckbuilder)
//   false : links to $newDeckUrl; hidden if $newDeckUrl is also empty
$enableNewDeck = false;
$newDeckUrl    = 'https://deckbuilder.alteredcore.org/';

// Import button — shown if $showImportBtn is true OR $importDeckUrl is non-empty.
$showImportBtn = false;
$importDeckUrl = '';

// Base URL for plugin assets (images, JS, CSS).
// Change this only if the plugin directory is moved or renamed.
$pluginAssetsUrl = BASE_URL . '/plugins/core-altered-cards/assets';
