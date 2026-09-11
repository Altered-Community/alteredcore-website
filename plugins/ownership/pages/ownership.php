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
        'altArts'      => 'Alt Arts BGA',
        'altArts_d'    => 'Choose which illustration is used for each copy you play on Board Game Arena.',
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
        'altArts'      => 'Alt Arts BGA',
        'altArts_d'    => 'Choisissez l\'illustration utilisée pour chaque exemplaire joué sur Board Game Arena.',
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
<div class="container py-4">

    <div class="d-flex align-items-center justify-content-between mb-2">
        <div class="section-title mb-0"><span><?= h($pageTitle) ?></span></div>
    </div>
    <p class="text-muted mb-4"><?= h($txt['intro']) ?></p>

    <?php if (!$ownEnabled): ?>
    <div class="alert alert-warning"><?= h($txt['unavailable']) ?></div>
    <?php elseif (!$ownLoggedIn): ?>
    <div class="card-altered p-4">
        <p class="mb-2 text-muted"><?= h($txt['login_prompt']) ?></p>
        <a href="<?= h(BASE_URL) ?>/pages/login" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-right-to-bracket me-1"></i><?= h($txt['btn_login']) ?>
        </a>
    </div>
    <?php else: ?>

    <div class="row g-3">
        <div class="col-6 col-md-3">
            <a class="card-altered own-hub-tile d-block p-4 text-decoration-none h-100" href="<?= h(BASE_URL) ?>/pages/ownership-collection?tab=ownership">
                <i class="fa-solid fa-layer-group fa-2x mb-3"></i>
                <div class="fw-semibold mb-1"><?= h($txt['collection']) ?></div>
                <div class="small text-muted"><?= h($txt['collection_d']) ?></div>
            </a>
        </div>
        <div class="col-6 col-md-3">
            <a class="card-altered own-hub-tile d-block p-4 text-decoration-none h-100" href="<?= h(BASE_URL) ?>/pages/boosters">
                <i class="fa-solid fa-gift fa-2x mb-3"></i>
                <div class="fw-semibold mb-1"><?= h($txt['boosters']) ?></div>
                <div class="small text-muted"><?= h($txt['boosters_d']) ?></div>
                <?php if ($ownBoosterCount !== null): ?>
                <div class="own-hub-tile-count"><?= h(sprintf($txt['boosters_remaining'], $ownBoosterCount)) ?></div>
                <?php endif; ?>
            </a>
        </div>
        <div class="col-6 col-md-3">
            <a class="card-altered own-hub-tile d-block p-4 text-decoration-none h-100" href="<?= h(BASE_URL) ?>/pages/ownership-history">
                <i class="fa-solid fa-clock-rotate-left fa-2x mb-3"></i>
                <div class="fw-semibold mb-1"><?= h($txt['history']) ?></div>
                <div class="small text-muted"><?= h($txt['history_d']) ?></div>
            </a>
        </div>
        <div class="col-6 col-md-3">
            <a class="card-altered own-hub-tile d-block p-4 text-decoration-none h-100" href="<?= h(BASE_URL) ?>/pages/ownership-alt-arts">
                <i class="fa-solid fa-palette fa-2x mb-3"></i>
                <div class="fw-semibold mb-1"><?= h($txt['altArts']) ?></div>
                <div class="small text-muted"><?= h($txt['altArts_d']) ?></div>
            </a>
        </div>
        <?php if ($ownImportUrl): ?>
        <div class="col-6 col-md-3">
            <a class="card-altered own-hub-tile d-block p-4 text-decoration-none h-100" href="<?= h($ownImportUrl) ?>" target="_blank" rel="noopener">
                <i class="fa-solid fa-file-import fa-2x mb-3"></i>
                <div class="fw-semibold mb-1"><?= h($txt['import']) ?></div>
                <div class="small text-muted"><?= h($txt['import_d']) ?></div>
            </a>
        </div>
        <?php endif; ?>
    </div>

    <?php endif; ?>
</div>
