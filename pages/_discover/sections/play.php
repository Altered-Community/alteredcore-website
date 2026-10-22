<?php
// Discover, section 3: Ways to play (specifications/discover-03-ways-to-play.md). Included by pages/discover.php.
// Same shape for the two tracks: title, three steps, a note, then the button, which is pinned to the bottom of the
// card so the two buttons share a baseline. Nothing may follow the button.
$_tracks = [
    ['id' => 't1', 'href' => 'https://boardgamearena.com/gamepanel?game=altered', 'external' => true,  'primary' => true],
    ['id' => 't2', 'href' => BASE_URL . '/pages/events',                          'external' => false, 'primary' => false],
];
?>
<p class="discover-lead"><?= pageText($tx, 'play.lead') ?></p>

<div class="discover-tracks">
    <?php foreach ($_tracks as $t): ?>
        <article class="discover-track<?= $t['primary'] ? ' discover-track--primary' : '' ?>">
            <h3 class="discover-track__title"><?= pageText($tx, 'play.' . $t['id'] . '.title') ?></h3>
            <ol class="discover-track__steps">
                <?php for ($i = 1; $i <= 3; $i++): ?>
                    <li><span><?= pageRich($tx, 'play.' . $t['id'] . ".step$i") ?></span></li>
                <?php endfor; ?>
            </ol>
            <p class="discover-track__note"><?= pageText($tx, 'play.' . $t['id'] . '.note') ?></p>
            <a class="ac-button ac-button--lg<?= $t['primary'] ? '' : ' ac-button--secondary' ?> discover-track__cta"
               href="<?= h($t['href']) ?>"<?= $t['external'] ? ' target="_blank" rel="noopener"' : '' ?>>
                <?= pageText($tx, 'play.' . $t['id'] . '.cta') ?>
                <?php if ($t['external']): ?>
                    <?= ac_icon('external-link', 'ac-icon--16') ?><span class="ac-sr-only">(<?= pageText($tx, 'play.external') ?>)</span>
                <?php endif; ?>
            </a>
        </article>
    <?php endforeach; ?>
</div>
