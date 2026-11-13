<?php
// Discover, section 6: Join the adventure. Included by pages/discover.php.
// "Rejoindre l'aventure": three cards, each with an illustration drawn at random from its list (CDN path under /illustrations/).
$_joinCards = [
    ['key' => 'discord', 'art' => [
        'BISE/ALT_BISE_B_BR_60_R_FRAMELESS_T1', 'BISE/ALT_BISE_B_BR_63_R_FRAMELESS_T3', 'BISE/ALT_BISE_B_LY_63_R_FRAMELESS_T1',
        'BISE/ALT_BISE_B_OR_63_R_FRAMELESS_T3', 'CORE/ALT_CORE_B_LY_29_C_FRAMELESS_T3',
    ], 'buttons' => [
        ['key' => 'discord', 'href' => 'https://discord.gg/pSA9HxB7Ky', 'secondary' => false, 'external' => true],
    ]],
    ['key' => 'roles', 'art' => [
        'EOLE/ALT_EOLE_B_BR_118_R_FRAMELESS_T1', 'DUSTER/ALT_DUSTER_B_OR_101_C_FRAMELESS_T3',
        'CORE/ALT_CORE_B_OR_12_R_FRAMELESS_T1', 'CORE/ALT_CORE_B_OR_24_R_FRAMELESS_T3',
    ], 'buttons' => [
        ['key' => 'team',  'href' => BASE_URL . '/pages/team-roles', 'secondary' => true, 'external' => false],
        ['key' => 'roles', 'href' => BASE_URL . '/pages/current-open-roles', 'secondary' => false, 'external' => false],
    ]],
    ['key' => 'support', 'art' => [
        'BISE/ALT_BISE_B_MU_53_R_FRAMELESS_T1', 'BISE/ALT_BISE_B_OR_60_R_FRAMELESS_T1', 'ALIZE/ALT_ALIZE_B_LY_36_R_FRAMELESS_T3',
        'CORE/ALT_CORE_B_BR_25_R_FRAMELESS_T1', 'CORE/ALT_CORE_B_YZ_06_U_FRAMELESS_T3',
    ], 'buttons' => [
        ['key' => 'support', 'href' => 'https://www.helloasso.com/associations/altered-re-union/formulaires/1', 'secondary' => false, 'external' => true],
    ]],
];
?>
<div class="discover-join">
    <?php foreach ($_joinCards as $_c): ?>
        <article class="ac-card ac-card--flush discover-join__card">
            <div class="discover-join__art">
                <img src="<?= h((defined('CDN_URL') ? CDN_URL : '') . '/illustrations/' . $_c['art'][array_rand($_c['art'])] . '.webp') ?>" alt="" width="744" height="1039" loading="lazy">
            </div>
            <div class="discover-join__body">
                <h4 class="discover-join__title"><?= pageText($tx, 'project.join.' . $_c['key'] . '.title') ?></h4>
                <p class="discover-join__text"><?= pageText($tx, 'project.join.' . $_c['key'] . '.text') ?></p>
                <div class="discover-join__actions">
                    <?php foreach ($_c['buttons'] as $_b): ?>
                        <a class="ac-button<?= $_b['secondary'] ? ' ac-button--secondary' : '' ?>" href="<?= h($_b['href']) ?>"<?= $_b['external'] ? ' target="_blank" rel="noopener"' : '' ?>>
                            <?= pageText($tx, 'project.join.' . $_b['key'] . '.button') ?>
                            <?= ac_icon($_b['external'] ? 'external-link' : 'arrow-right', 'ac-icon--14') ?>
                            <?php if ($_b['external']): ?><span class="ac-sr-only">(<?= pageText($tx, 'project.external') ?>)</span><?php endif; ?>
                        </a>
                    <?php endforeach; ?>
                </div>
            </div>
        </article>
    <?php endforeach; ?>
</div>
