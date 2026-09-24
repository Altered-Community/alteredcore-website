<?php
/**
 * Deck Builder page — bootstrap, markup, then JS modules.
 * Logic lives in includes/deckbuilder/ and assets/deckbuilder/.
 */
require_once __DIR__ . '/../includes/deckbuilder/bootstrap.php';
require_once __DIR__ . '/../includes/deckbuilder/markup.php';
require_once __DIR__ . '/../includes/deckbuilder/config-js.php';
?>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/state.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/cards.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/hero.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/alt-art.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/validation.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/panes.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/hero-picker.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/wizard.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/save.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/token-arts.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/lightbox.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/ui.js"></script>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/css/tom-select.bootstrap5.min.css">
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.4.3/dist/js/tom-select.complete.min.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/card-search.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/search-bind.js"></script>

<?php if ($_ownMode): ?>
<link rel="stylesheet" href="<?= h(BASE_URL) ?>/plugins/ownership/assets/style.css">
<script src="<?= h(BASE_URL) ?>/plugins/ownership/js/alt-art-widget.js"></script>
<?php endif; ?>
<?php if ($_ownAltArtActive): ?>
<script src="<?= h(BASE_URL) ?>/plugins/ownership/js/card-tilt.js"></script>
<script src="<?= h(BASE_URL) ?>/plugins/ownership/js/card-modal-enhance.js"></script>
<?php endif; ?>

<?php include __DIR__ . '/_card-list-modal.php'; ?>
<?php include __DIR__ . '/_card-zoom-modal.php'; ?>

<script src="<?= h($pluginAssetsUrl) ?>/deckbuilder/hand-i18n.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/hand-odds-math.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/hand-odds.js"></script>
<script src="<?= h($pluginAssetsUrl) ?>/hand-tester.js"></script>
