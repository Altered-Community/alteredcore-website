<?php
require_once __DIR__ . '/../includes/functions.php';

$txt = [
    'en' => [
        'page_title'   => 'History',
        'anon_login'   => 'Log in / Sign up',
        'login_prompt' => 'Log in to view your digital ownership history.',
        'authExpired'  => 'Your session has expired. Please sign in again.',
        'loginBtn'     => 'Sign in',
        'loginUrl'     => BASE_URL . '/pages/login',
        'loading'      => 'Loading…',
        'empty'        => 'No events yet.',
        'loadError'    => 'Could not load your history.',
        'networkError' => 'Network error.',
        'received'     => 'Cards received',
        'given'        => 'Cards given',
        'unavailable'  => 'The digital ownership service is not configured on this site.',
    ],
    'fr' => [
        'page_title'   => 'Historique',
        'anon_login'   => 'Se connecter / S\'inscrire',
        'login_prompt' => 'Connectez-vous pour consulter votre historique de propriété numérique.',
        'authExpired'  => 'Votre session a expiré. Veuillez vous reconnecter.',
        'loginBtn'     => 'Se connecter',
        'loginUrl'     => BASE_URL . '/pages/login',
        'loading'      => 'Chargement…',
        'empty'        => 'Aucun événement pour le moment.',
        'loadError'    => 'Impossible de charger votre historique.',
        'networkError' => 'Erreur réseau.',
        'received'     => 'Cartes reçues',
        'given'        => 'Cartes données',
        'unavailable'  => 'Le service de propriété numérique n\'est pas configuré sur ce site.',
    ],
][getUiLang()];

$pageTitle    = $txt['page_title'];
$ownEnabled   = defined('OWNERSHIP_API_URL') && OWNERSHIP_API_URL;
$ownLoggedIn  = kcIsLoggedIn();
$ownActiveTab = 'history';
?>
<div class="ac-page">

    <?php if (!$ownEnabled): ?>
    <div class="ac-notice ac-notice--warning" role="status"><?= ac_icon('triangle-alert') ?><div><?= h($txt['unavailable']) ?></div></div>
    <?php else: ?>

    <?php require __DIR__ . '/../includes/subnav.php'; ?>

    <?php if (!$ownLoggedIn): ?>
    <div class="ac-card">
        <p class="ac-card__meta"><?= h($txt['login_prompt']) ?></p>
        <div class="ac-card__footer">
            <a href="<?= h(BASE_URL) ?>/pages/login" class="ac-button ac-button--sm">
                <?= ac_icon('log-in') ?><?= h($txt['anon_login']) ?>
            </a>
        </div>
    </div>
    <?php else: ?>

    <div id="own-history-loading" class="text-muted"><?= h($txt['loading']) ?></div>
    <div id="own-history-empty" class="text-muted" hidden><?= h($txt['empty']) ?></div>
    <div id="own-history-error" class="alert alert-danger" hidden></div>
    <div id="own-history-list" class="list-group"></div>

    <div class="modal fade" id="own-event-modal" tabindex="-1" aria-hidden="true" aria-labelledby="own-event-modal-title">
        <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title h5" id="own-event-modal-title"></h2>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" id="own-event-modal-body"></div>
            </div>
        </div>
    </div>

    <div id="own-card-zoom-backdrop" class="own-opener-backdrop" hidden>
        <div class="own-opener-stage">
            <div id="own-card-zoom-content" class="own-opener-card own-tilt-card"></div>
        </div>
    </div>

    <script>
    window.OWN_I18N = { <?= h(getUiLang()) ?>: <?= json_encode($txt, JSON_UNESCAPED_UNICODE) ?> };
    window.OWN_ASSETS_URL = <?= json_encode(BASE_URL . '/plugins/ownership/assets') ?>;
    </script>

    <?php endif; ?>
    <?php endif; ?>
</div>
