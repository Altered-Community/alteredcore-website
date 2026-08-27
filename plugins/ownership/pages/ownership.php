<?php
require_once __DIR__ . '/../includes/functions.php';

$txt = [
    'en' => [
        'page_title'   => 'Digital Ownership',
        'intro'        => 'Manage the cards you own on the Altered digital ownership service.',
        'collection'   => 'Collection',
        'collection_d' => 'Browse the cards you digitally own, alongside the full catalog.',
        'boosters'     => 'Boosters',
        'boosters_d'   => 'Open the digital booster packs you\'ve received.',
        'history'      => 'History',
        'history_d'    => 'See every card and booster you\'ve received or given.',
        'import'       => 'Import',
        'import_d'     => 'Import your Altered personal data export (on the ownership service).',
        'login_prompt' => 'Log in to manage your digital ownership.',
        'btn_login'    => 'Log in',
        'unavailable'  => 'The digital ownership service is not configured on this site.',
    ],
    'fr' => [
        'page_title'   => 'Propriété numérique',
        'intro'        => 'Gérez les cartes que vous possédez sur le service de propriété numérique d\'Altered.',
        'collection'   => 'Collection',
        'collection_d' => 'Parcourez les cartes que vous possédez numériquement, au sein du catalogue complet.',
        'boosters'     => 'Boosters',
        'boosters_d'   => 'Ouvrez les boosters numériques que vous avez reçus.',
        'history'      => 'Historique',
        'history_d'    => 'Consultez chaque carte et booster reçu ou donné.',
        'import'       => 'Import',
        'import_d'     => 'Importez votre export de données personnelles Altered (sur le service de propriété).',
        'login_prompt' => 'Connectez-vous pour gérer votre propriété numérique.',
        'btn_login'    => 'Se connecter',
        'unavailable'  => 'Le service de propriété numérique n\'est pas configuré sur ce site.',
    ],
][getUiLang()];

$pageTitle    = $txt['page_title'];
$ownEnabled   = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn  = kcIsLoggedIn();
$ownImportUrl = (defined('OWNERSHIP_WEB_URL') && OWNERSHIP_WEB_URL) ? rtrim(OWNERSHIP_WEB_URL, '/') . '/import.html' : '';
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
            </a>
        </div>
        <div class="col-6 col-md-3">
            <a class="card-altered own-hub-tile d-block p-4 text-decoration-none h-100" href="<?= h(BASE_URL) ?>/pages/ownership-history">
                <i class="fa-solid fa-clock-rotate-left fa-2x mb-3"></i>
                <div class="fw-semibold mb-1"><?= h($txt['history']) ?></div>
                <div class="small text-muted"><?= h($txt['history_d']) ?></div>
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
