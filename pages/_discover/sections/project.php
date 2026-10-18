<?php
// Discover, section 5: Who runs Altered now (specifications/discover-05-who-runs-it.md). Included by pages/discover.php.
// The shipped list is the section's whole value: keep it current, and update the date below with it.
// Owner of this list: whoever owns the roadmap (review it whenever a roadmap update is published).
// Tone: never "alive", "still" or "dead" in any language; no set name and no date for unreleased content.
$_shippedUpdated = '2026-10-16';
$_shippedCount   = 6;
$_wipCount       = 4;
?>
<p class="discover-lead"><?= pageText($tx, 'project.lead.1') ?></p>
<p class="discover-lead"><?= pageText($tx, 'project.lead.2') ?></p>

<div class="discover-project">
    <div class="discover-project__col">
        <h3 class="discover-project__title"><?= pageText($tx, 'project.shipped.title') ?></h3>
        <ul class="discover-project__list discover-project__list--shipped">
            <?php for ($i = 1; $i <= $_shippedCount; $i++): ?>
                <li><?= ac_icon('check', 'ac-icon--18') ?><span><?= pageText($tx, "project.shipped.$i") ?></span></li>
            <?php endfor; ?>
        </ul>
        <p class="discover-project__updated">
            <?= str_replace('{date}', '<time datetime="' . h($_shippedUpdated) . '">' . h(formatDate($_shippedUpdated)) . '</time>', pageText($tx, 'project.updated')) ?>
        </p>
    </div>

    <div class="discover-project__col">
        <h3 class="discover-project__title"><?= pageText($tx, 'project.wip.title') ?></h3>
        <ul class="discover-project__list discover-project__list--wip">
            <?php for ($i = 1; $i <= $_wipCount; $i++): ?>
                <li><?= ac_icon('clock', 'ac-icon--18') ?><span><?= pageText($tx, "project.wip.$i") ?></span></li>
            <?php endfor; ?>
        </ul>
        <p class="discover-project__horizon"><?= pageText($tx, 'project.horizon') ?></p>
    </div>
</div>

<p class="discover-project__links">
    <a class="discover-world__link" href="<?= h(BASE_URL) ?>/pages/team-roles"><?= pageText($tx, 'project.team') ?> <?= ac_icon('arrow-right', 'ac-icon--14') ?></a>
    <a class="discover-world__link" href="https://discord.gg/pSA9HxB7Ky" target="_blank" rel="noopener"><?= pageText($tx, 'project.discord') ?> <?= ac_icon('external-link', 'ac-icon--14') ?><span class="ac-sr-only">(<?= pageText($tx, 'project.external') ?>)</span></a>
    <a class="discover-world__link" href="https://www.helloasso.com/associations/altered-re-union/formulaires/1" target="_blank" rel="noopener"><?= pageText($tx, 'project.donate') ?> <?= ac_icon('external-link', 'ac-icon--14') ?><span class="ac-sr-only">(<?= pageText($tx, 'project.external') ?>)</span></a>
</p>
