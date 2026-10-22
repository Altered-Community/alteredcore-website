<?php
// Discover page: why play Altered, then hand off to Board Game Arena (specifications/discover-*.md).
// Reachable by direct URL only for now (not linked from the menu or the homepage).
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/page-lang.php';
initLang();

$tx = pageTexts(__DIR__ . '/_discover/lang');

$pageTitle       = $tx['meta.title'] ?? '';
$pageDescription = $tx['meta.description'] ?? '';
// og:image: a frame from the loop of section 1, once it exists.

// Section order is the page order; the ids are the anchors the homepage tiles point to.
$sections = [
    ['id' => 'gameplay', 'dark' => false],
    ['id' => 'world',    'dark' => false],
    ['id' => 'play',     'dark' => false],
    ['id' => 'decks',    'dark' => false],
    ['id' => 'project',  'dark' => false],
];

include dirname(__DIR__) . '/includes/header.php';
$_discoverAsset = function (string $rel): string {
    $f = dirname(__DIR__) . '/' . $rel;
    return BASE_URL . '/' . $rel . (is_file($f) ? '?v=' . filemtime($f) : '');
};
?>
<link rel="stylesheet" href="<?= h($_discoverAsset('css/discover.css')) ?>">

<div class="discover">

    <header class="discover-header">
        <h1 class="discover-header__title"><?= pageText($tx, 'header.title') ?></h1>
    </header>

    <div class="discover-body">

        <nav class="discover-toc" id="discover-toc" aria-label="<?= pageText($tx, 'toc.label') ?>">
            <button type="button" class="discover-toc__toggle" aria-expanded="false" aria-controls="discover-toc-panel">
                <?= pageText($tx, 'toc.toggle') ?>
                <?= ac_icon('chevron-down', 'ac-icon--14') ?>
            </button>
            <div class="discover-toc__panel ac-toc" id="discover-toc-panel">
                <p class="ac-toc__title"><?= pageText($tx, 'toc.label') ?></p>
                <ul class="ac-toc__list">
                    <?php foreach ($sections as $s): ?>
                        <li><a href="#<?= h($s['id']) ?>"><?= pageText($tx, 'nav.' . $s['id']) ?></a></li>
                    <?php endforeach; ?>
                </ul>
                <hr class="ac-divider">
<ul class="discover-toc__outs">
                    <li><a class="discover-toc__out" href="<?= h(BASE_URL) ?>/pages/rules">
                        <?= pageText($tx, 'toc.rules') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?>
                    </a></li>
                    <li><a class="discover-toc__out" href="<?= h(BASE_URL) ?>/pages/faq">
                        <?= pageText($tx, 'toc.faq') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?>
                    </a></li>
                    <li><a class="discover-toc__out" href="https://boardgamearena.com/gamepanel?game=altered" target="_blank" rel="noopener">
                        <?= pageText($tx, 'toc.bga') ?> <?= ac_icon('external-link', 'ac-icon--14') ?><span class="ac-sr-only">(<?= pageText($tx, 'toc.external') ?>)</span>
                    </a></li>
                </ul>
            </div>
        </nav>

        <div class="discover-content">
            <?php foreach ($sections as $s): ?>
                <section class="discover-section<?= $s['dark'] ? ' discover-section--dark' : '' ?>"
                         id="<?= h($s['id']) ?>" aria-labelledby="<?= h($s['id']) ?>-title">
                    <h2 class="discover-section__title" id="<?= h($s['id']) ?>-title">
                        <span><?= pageText($tx, 'nav.' . $s['id']) ?></span>
                    </h2>
                    <div class="discover-section__body"><?php
                        $_partial = __DIR__ . '/_discover/sections/' . $s['id'] . '.php';
                        if (is_file($_partial)) include $_partial;
                    ?></div>
                </section>
            <?php endforeach; ?>
        </div>

    </div>

</div>

<script src="<?= h($_discoverAsset('js/discover.js')) ?>" defer></script>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
