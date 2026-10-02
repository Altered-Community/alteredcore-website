<?php
require_once __DIR__ . '/../includes/functions.php';

$txt = [
    'en' => [
        'page_title'    => 'Boosters',
        'anon_login'    => 'Log in / Sign up',
        'loading'       => 'Loading…',
        'empty'         => 'No boosters to open.',
        'loadError'     => 'Could not load your boosters.',
        'networkError'  => 'Network error.',
        'openError'     => 'Could not open this booster.',
        'open'          => 'Open',
        'previousBooster' => 'Previous booster',
        'nextBooster'     => 'Next booster',
        'unavailable'   => 'The digital ownership service is not configured on this site.',
    ],
    'fr' => [
        'page_title'    => 'Boosters',
        'anon_login'    => 'Se connecter / S\'inscrire',
        'loading'       => 'Chargement…',
        'empty'         => 'Aucun booster à ouvrir.',
        'loadError'     => 'Impossible de charger vos boosters.',
        'networkError'  => 'Erreur réseau.',
        'openError'     => 'Impossible d\'ouvrir ce booster.',
        'open'          => 'Ouvrir',
        'previousBooster' => 'Booster précédent',
        'nextBooster'     => 'Booster suivant',
        'unavailable'   => 'Le service de propriété numérique n\'est pas configuré sur ce site.',
    ],
][getUiLang()];

$pageTitle    = $txt['page_title'];
$ownEnabled   = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn  = kcIsLoggedIn();
$ownActiveTab = 'boosters';
?>
<div class="ac-page">

    <?php if (!$ownEnabled): ?>
    <div class="ac-notice ac-notice--warning" role="status"><?= ac_icon('triangle-alert') ?><div><?= h($txt['unavailable']) ?></div></div>
    <?php else: ?>

    <?php require __DIR__ . '/../includes/subnav.php'; ?>

    <?php if (!$ownLoggedIn): ?>
    <div class="ac-card">
        <a href="<?= h(BASE_URL) ?>/pages/login" class="ac-button ac-button--sm">
            <?= ac_icon('log-in') ?><?= h($txt['anon_login']) ?>
        </a>
    </div>
    <?php else: ?>

    <div id="own-boosters-loading" class="text-muted"><?= h($txt['loading']) ?></div>
    <div id="own-boosters-empty" class="text-muted" hidden><?= h($txt['empty']) ?></div>
    <div id="own-boosters-error" class="alert alert-danger" hidden></div>
    <div id="own-boosters-grid" class="row g-3"></div>

    <div id="own-opener-backdrop" class="own-opener-backdrop" hidden>
        <div class="own-opener-stage">
            <div id="own-opener-card" class="own-opener-card own-tilt-card"></div>
            <div id="own-opener-cover" class="own-opener-cover">
                <div id="own-opener-rotator" class="own-opener-cover-art"></div>
            </div>
            <div id="own-opener-loading" class="own-opener-loading" hidden>
                <span class="ac-spinner" role="status" aria-label="<?= h($txt['loading']) ?>"></span>
            </div>
            <button type="button" id="own-opener-prev" class="own-opener-nav own-opener-nav--prev" aria-label="<?= h($txt['previousBooster']) ?>"><?= ac_icon('chevron-left') ?></button>
            <button type="button" id="own-opener-next" class="own-opener-nav own-opener-nav--next" aria-label="<?= h($txt['nextBooster']) ?>"><?= ac_icon('chevron-right') ?></button>
        </div>
        <div id="own-opener-info" class="own-opener-info">
            <div>
                <div id="own-opener-name" class="own-opener-name"></div>
                <div id="own-opener-qty" class="own-opener-qty"></div>
            </div>
            <button type="button" id="own-opener-open-btn" class="ac-button"><?= h($txt['open']) ?></button>
        </div>
    </div>

    <meta name="csrf-token" content="<?= h(csrfToken()) ?>">
    <script>window.OWN_I18N = { <?= h(getUiLang()) ?>: <?= json_encode($txt, JSON_UNESCAPED_UNICODE) ?> };</script>

    <?php endif; ?>
    <?php endif; ?>
</div>
