<?php
// PWA: install toast markup + config for js/pwa.js (service worker registration,
// install prompt, theme-color sync). Included by includes/footer.php.
$_pwaLang = getUiLang();
$_pwaSite = getSiteName();
$_pwaTxt  = [
    'en' => [
        'title'   => 'Install the ' . $_pwaSite . ' app',
        'text'    => 'Add it to your home screen or desktop to open it like an app.',
        'ios'     => 'Tap ' . ac_icon('share') . ' <strong>Share</strong>, then <strong>Add to Home Screen</strong>.',
        'install' => 'Install',
        'later'   => 'Not now',
        'got_it'  => 'Got it',
        'close'   => 'Close',
    ],
    'fr' => [
        'title'   => 'Installer l’application ' . $_pwaSite,
        'text'    => 'Ajoutez-la à votre écran d’accueil ou à votre bureau pour l’ouvrir comme une application.',
        'ios'     => 'Touchez ' . ac_icon('share') . ' <strong>Partager</strong>, puis <strong>Sur l’écran d’accueil</strong>.',
        'install' => 'Installer',
        'later'   => 'Plus tard',
        'got_it'  => 'Compris',
        'close'   => 'Fermer',
    ],
][$_pwaLang];
?>
<div id="ac-pwa-toast" class="ac-pwa-toast" role="dialog" aria-labelledby="ac-pwa-title" aria-describedby="ac-pwa-text" hidden>
    <img class="ac-pwa-toast-icon" src="<?= BASE_URL ?>/assets/favicon/favicon-96x96.png" alt="" width="40" height="40">
    <div class="ac-pwa-toast-body">
        <div id="ac-pwa-title" class="ac-pwa-toast-title"><?= h($_pwaTxt['title']) ?></div>
        <div id="ac-pwa-text" class="ac-pwa-toast-text">
            <span data-pwa-mode="prompt"><?= h($_pwaTxt['text']) ?></span>
            <span data-pwa-mode="ios" hidden><?= $_pwaTxt['ios'] /* static markup above */ ?></span>
        </div>
        <div class="ac-pwa-toast-actions">
            <button type="button" class="ac-button ac-button--sm" data-pwa-mode="prompt" data-pwa-install><?= h($_pwaTxt['install']) ?></button>
            <button type="button" class="ac-button ac-button--sm ac-button--ghost" data-pwa-mode="prompt" data-pwa-dismiss><?= h($_pwaTxt['later']) ?></button>
            <button type="button" class="ac-button ac-button--sm" data-pwa-mode="ios" data-pwa-dismiss hidden><?= h($_pwaTxt['got_it']) ?></button>
        </div>
    </div>
    <button type="button" class="ac-icon-button ac-icon-button--ghost ac-icon-button--sm ac-pwa-close" data-pwa-dismiss aria-label="<?= h($_pwaTxt['close']) ?>"><?= ac_icon('x') ?></button>
</div>
<script>
window.acPwaConfig = <?= json_encode([
    'swUrl' => BASE_URL . '/sw.php',
    'scope' => BASE_URL . '/',
    'lang'  => $_pwaLang,
], JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="<?= BASE_URL ?>/js/pwa.js?v=<?= (int)@filemtime(dirname(__DIR__) . '/js/pwa.js') ?>"></script>
