<?php
// Discover, section 3: Ways to play (specifications/discover-03-ways-to-play.md). Included by pages/discover.php.
// Same shape for the two tracks: title, three steps, a note, then the button, which is pinned to the bottom of the
// card so the two buttons share a baseline. Nothing may follow the button.
$_tracks = [
    ['id' => 't1', 'href' => 'https://boardgamearena.com/gamepanel?game=altered', 'external' => true,  'primary' => true],
    ['id' => 't2', 'href' => BASE_URL . '/pages/events',                          'external' => false, 'primary' => false],
];
// Illustration of the table track: one of three Bravos frameless arts (Whispers from the Maze), another one per visit.
$_playArt = ['C', 'R', 'U'];
$_playArt = (defined('CDN_URL') ? CDN_URL : '') . '/illustrations/BISE/ALT_BISE_A_BR_58_' . $_playArt[array_rand($_playArt)] . '_FRAMELESS_T1.webp';
// Board Game Arena's ready-made "Play online" button (assets/img/bga/play_button_<lang>.png): fr and de have their own,
// every other language shows the English one.
$_bgaLang  = in_array(getLang(), ['fr', 'de'], true) ? getLang() : 'en';
$_bgaBadge = BASE_URL . '/assets/img/bga/play_button_' . $_bgaLang . '.png';
// The illustration sits beside the whole section (title included): pages/discover.php places $_aside.
ob_start();
?>
<figure class="discover-aside">
    <img src="<?= h($_playArt) ?>" alt="" width="744" height="1039" loading="lazy">
    <figcaption><?= h(str_replace('{artist}', 'Kevin Sidharta', $tx['world.credit'] ?? '')) ?></figcaption>
</figure>
<?php
$_aside = ob_get_clean();
?>
<p class="discover-lead"><?= pageText($tx, 'play.lead') ?></p>

<div class="discover-tracks">
    <?php foreach ($_tracks as $t): ?>
        <article class="discover-track<?= $t['primary'] ? ' discover-track--primary' : '' ?>">
            <div class="discover-track__main">
            <h3 class="discover-track__title"><?= pageText($tx, 'play.' . $t['id'] . '.title') ?></h3>
            <ol class="discover-track__steps">
                <?php for ($i = 1; $i <= 3; $i++): ?>
                    <li><span><?= pageRich($tx, 'play.' . $t['id'] . ".step$i") ?></span></li>
                <?php endfor; ?>
            </ol>
            <p class="discover-track__note"><?= pageText($tx, 'play.' . $t['id'] . '.note') ?></p>
            </div>
            <?php if ($t['id'] === 't1'): ?>
                <a class="discover-track__badge" href="<?= h($t['href']) ?>" target="_blank" rel="noopener">
                    <img src="<?= h($_bgaBadge) ?>" width="300" height="80" alt="<?= pageText($tx, 'play.t1.cta') ?>">
                    <span class="ac-sr-only">(<?= pageText($tx, 'play.external') ?>)</span>
                </a>
            <?php else: ?>
            <a class="ac-button ac-button--lg<?= $t['primary'] ? '' : ' ac-button--secondary' ?> discover-track__cta"
               href="<?= h($t['href']) ?>"<?= $t['external'] ? ' target="_blank" rel="noopener"' : '' ?>>
                <?= pageText($tx, 'play.' . $t['id'] . '.cta') ?>
                <?php if ($t['external']): ?>
                    <?= ac_icon('external-link', 'ac-icon--16') ?><span class="ac-sr-only">(<?= pageText($tx, 'play.external') ?>)</span>
                <?php endif; ?>
            </a>
            <?php endif; ?>
        </article>
    <?php endforeach; ?>
</div>
