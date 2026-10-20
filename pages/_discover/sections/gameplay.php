<?php
// Discover, section 1: How a game plays (specifications/discover-01-gameplay.md). Included by pages/discover.php.
// The loop (assets/img/discover/day.mp4) starts at Afternoon: Morning and Noon are not shown, so they never light up.
// 'cues': the captions (gameplay.cue.N, timed in the video's data-cues) that belong to each phase.
$_phases = [
    ['key' => 'dawn',      'cues' => []],
    ['key' => 'noon',      'cues' => []],
    ['key' => 'afternoon', 'cues' => [1, 2, 3]],
    ['key' => 'dusk',      'cues' => [4]],
    ['key' => 'night',     'cues' => [5, 6]],
];
$_rulesAssets = BASE_URL . '/assets/img/discover/';
?>
<p class="discover-lead"><?= pageText($tx, 'gameplay.lead') ?></p>

<div class="discover-diff">
    <?php for ($i = 1; $i <= 6; $i++): ?>
        <div class="discover-diff__item">
            <h3 class="discover-diff__title"><?= pageText($tx, "gameplay.diff.$i.title") ?></h3>
            <p class="discover-diff__body"><?= pageText($tx, "gameplay.diff.$i.body") ?></p>
        </div>
    <?php endfor; ?>
</div>

<div class="discover-demo">
<ol class="discover-day" aria-label="<?= pageText($tx, 'gameplay.day.label') ?>">
    <?php foreach ($_phases as $p): ?>
        <li class="discover-day__item" data-phase="<?= h($p['key']) ?>">
            <img class="discover-day__icon" src="https://cdn.alteredcore.org/bga/icons/<?= h($p['key']) ?>.png" alt="" width="40" height="40" loading="lazy">
            <span class="discover-day__name"><?= pageText($tx, 'gameplay.day.' . $p['key'] . '.name') ?></span>
            <span class="discover-day__text"><?= pageText($tx, 'gameplay.day.' . $p['key'] . '.text') ?></span>
            <?php foreach ($p['cues'] as $c): ?>
                <?php /* Wide screens: the caption sits under its phase, beside the video. A copy for the eye only: the list under the video carries the text for screen readers. */ ?>
                <span class="discover-day__cue" data-cue="<?= $c ?>" aria-hidden="true"><?= pageText($tx, "gameplay.cue.$c") ?></span>
            <?php endforeach; ?>
        </li>
    <?php endforeach; ?>
</ol>

<figure class="discover-visual">
    <div class="discover-visual__stage">
        <video class="discover-visual__video" src="<?= h($_rulesAssets) ?>day.mp4" poster="<?= h($_rulesAssets) ?>day-poster.jpg"
           autoplay muted loop playsinline preload="metadata" disablepictureinpicture
           data-phases="afternoon:0,dusk:12,night:18"
           data-cues="0,2,10,12,18,21"
           data-rate="0.8" data-hold-start="1.5" data-hold-end="3"
           aria-label="<?= pageText($tx, 'gameplay.visual.alt') ?>"></video>
        <ol class="discover-visual__cues" aria-label="<?= pageText($tx, 'gameplay.cue.label') ?>">
            <?php for ($i = 1; $i <= 6; $i++): ?>
                <li class="discover-visual__cue"><?= pageText($tx, "gameplay.cue.$i") ?></li>
            <?php endfor; ?>
        </ol>
    </div>
    <figcaption class="discover-visual__caption"><?= pageText($tx, 'gameplay.visual.caption') ?></figcaption>
</figure>
</div>

<p class="discover-more">
    <a class="discover-more__link" href="<?= h(BASE_URL) ?>/pages/rules"><?= pageText($tx, 'gameplay.rules.link') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
</p>
