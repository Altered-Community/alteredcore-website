<?php
require_once __DIR__ . '/../includes/functions.php';

$txt = [
    'en' => [
        'page_title'   => 'Digital Ownership',
        'intro'        => 'Manage the cards you own on the Altered digital ownership service.',
        'collection'   => 'Digital Ownership',
        'collection_d' => 'Browse the cards you digitally own.',
        'boosters'     => 'Boosters',
        'boosters_d'   => 'Open the digital booster packs you\'ve received.',
        'boosters_remaining' => '%d remaining',
        'history'      => 'History',
        'history_d'    => 'View every transaction that changed your digital ownership.',
        'altArts'      => 'Default alt arts',
        'altArts_d'    => 'Choose the illustration each copy of a card takes when you add it to a deck.',
        'import'       => 'Equinox Import',
        'import_d'     => 'Request and/or import your digital ownership from the Equinox site (a secure site).',
        'login_prompt' => 'Log in to manage your digital ownership.',
        'btn_login'    => 'Log in',
        'unavailable'  => 'The digital ownership service is not configured on this site.',
    ],
    'fr' => [
        'page_title'   => 'Propriété numérique',
        'intro'        => 'Gérez les cartes que vous possédez sur le service de propriété numérique d\'Altered.',
        'collection'   => 'Propriété numérique',
        'collection_d' => 'Parcourez les cartes que vous possédez numériquement.',
        'boosters'     => 'Boosters',
        'boosters_d'   => 'Ouvrez les boosters numériques que vous avez reçus.',
        'boosters_remaining' => '%d restant(s)',
        'history'      => 'Historique',
        'history_d'    => 'Consultez toutes les transactions qui ont modifié vos propriétés.',
        'altArts'      => 'Arts alternatifs par défaut',
        'altArts_d'    => 'Choisissez l\'illustration que prend chaque exemplaire d\'une carte quand vous l\'ajoutez à un deck.',
        'import'       => 'Import Equinox',
        'import_d'     => 'Demandez et/ou importez vos propriétés numériques du site d\'Equinox (sur un site sécurisé).',
        'login_prompt' => 'Connectez-vous pour gérer votre propriété numérique.',
        'btn_login'    => 'Se connecter',
        'unavailable'  => 'Le service de propriété numérique n\'est pas configuré sur ce site.',
    ],
][getUiLang()];

$pageTitle    = $txt['page_title'];
$ownEnabled   = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn  = kcIsLoggedIn();
$ownBoosterCount = $ownLoggedIn ? ownGetBoosterCount((int)($_SESSION['user_id'] ?? 0)) : null;
// AlteredOwnership's own site now only has the import form at its root (the
// collection/boosters/history pages it used to serve moved here).
$ownImportUrl = (defined('OWNERSHIP_WEB_URL') && OWNERSHIP_WEB_URL) ? rtrim(OWNERSHIP_WEB_URL, '/') . '/' : '';
?>
<div class="ac-page">

    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($pageTitle) ?></h1>
            <p class="ac-page-header__subtitle"><?= h($txt['intro']) ?></p>
        </div>
    </header>

    <?php if (!$ownEnabled): ?>
    <div class="ac-notice ac-notice--warning" role="status"><?= ac_icon('triangle-alert') ?><div><?= h($txt['unavailable']) ?></div></div>
    <?php elseif (!$ownLoggedIn): ?>
    <div class="ac-card">
        <p class="ac-card__meta"><?= h($txt['login_prompt']) ?></p>
        <div class="ac-card__footer">
            <a href="<?= h(BASE_URL) ?>/pages/login" class="ac-button ac-button--sm">
                <?= ac_icon('log-in') ?><?= h($txt['btn_login']) ?>
            </a>
        </div>
    </div>
    <?php else: ?>

    <div class="row g-3">
        <div class="col-6 col-md-3">
            <a class="ac-card ac-card--interactive own-hub-tile" href="<?= h(BASE_URL) ?>/pages/ownership-collection?tab=ownership">
                <?= ac_icon('layers', 'own-hub-tile-icon') ?>
                <div class="ac-card__title"><?= h($txt['collection']) ?></div>
                <div class="ac-card__meta"><?= h($txt['collection_d']) ?></div>
            </a>
        </div>
        <div class="col-6 col-md-3">
            <a class="ac-card ac-card--interactive own-hub-tile" href="<?= h(BASE_URL) ?>/pages/boosters">
                <?= ac_icon('gift', 'own-hub-tile-icon') ?>
                <div class="ac-card__title"><?= h($txt['boosters']) ?></div>
                <div class="ac-card__meta"><?= h($txt['boosters_d']) ?></div>
                <?php if ($ownBoosterCount !== null): ?>
                <span class="ac-badge ac-badge--blue own-hub-tile-count"><?= h(sprintf($txt['boosters_remaining'], $ownBoosterCount)) ?></span>
                <?php endif; ?>
            </a>
        </div>
        <div class="col-6 col-md-3">
            <a class="ac-card ac-card--interactive own-hub-tile" href="<?= h(BASE_URL) ?>/pages/ownership-history">
                <?= ac_icon('history', 'own-hub-tile-icon') ?>
                <div class="ac-card__title"><?= h($txt['history']) ?></div>
                <div class="ac-card__meta"><?= h($txt['history_d']) ?></div>
            </a>
        </div>
        <div class="col-6 col-md-3">
            <a class="ac-card ac-card--interactive own-hub-tile" href="<?= h(BASE_URL) ?>/pages/ownership-alt-arts">
                <?= ac_icon('palette', 'own-hub-tile-icon') ?>
                <div class="ac-card__title"><?= h($txt['altArts']) ?></div>
                <div class="ac-card__meta"><?= h($txt['altArts_d']) ?></div>
            </a>
        </div>
        <?php if ($ownImportUrl): ?>
        <div class="col-6 col-md-3">
            <a class="ac-card ac-card--interactive own-hub-tile" href="<?= h($ownImportUrl) ?>" target="_blank" rel="noopener">
                <?= ac_icon('file-input', 'own-hub-tile-icon') ?>
                <div class="ac-card__title"><?= h($txt['import']) ?></div>
                <div class="ac-card__meta"><?= h($txt['import_d']) ?></div>
            </a>
        </div>
        <?php endif; ?>
    </div>

    <?php endif; ?>
</div>
