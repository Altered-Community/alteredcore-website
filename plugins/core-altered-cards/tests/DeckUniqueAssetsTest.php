<?php

// The Uniques' frames and icon fonts must ship with this plugin: the deploy removes Re:Builder's sources
// (plugins/rebuilder/app) once built, and without them the image falls back to the common cards.

require_once __DIR__ . '/../includes/deck-preview/unique-card.php';

$plugin = realpath(DECK_PREVIEW_PLUGIN);
$inPlugin = function (string $path) use ($plugin): bool {
    $real = realpath($path);
    return $real !== false && strpos($real, $plugin . DIRECTORY_SEPARATOR) === 0;
};

assertTrue(deckUniqueAvailable(), 'unique card: frames and fonts available');
$fonts = deckUniqueFonts();
assertTrue($inPlugin($fonts['icons']) && $inPlugin($fonts['circled']), 'unique card: icon fonts in the plugin');
foreach (['AX', 'BR', 'LY', 'MU', 'OR', 'YZ'] as $faction) {
    foreach (['T1', 'T2', 'T3', 'T4'] as $frame) {
        assertTrue($inPlugin(deckUniqueFramePath($faction, $frame)), "unique card: frame {$faction}_{$frame} in the plugin");
    }
}
