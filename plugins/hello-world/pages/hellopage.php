<?php
require_once __DIR__ . '/../inc/functions.php';

// translations
$txt = [
    'en' => [
        'page_title'    => 'Hello World',
        'no_messages'   => 'No messages yet.',
        'logged_in_as'  => 'Logged in as',
        'link_about'    => 'View the About page (restricted access)',
        'login_prompt'  => 'Log in to access more content.',
        'btn_login'     => 'Log in',
        'assets_title'  => 'Plugin assets demo',
        'assets_desc'   => 'The image below is served from <code>assets/no_rules.png</code> inside this plugin\'s directory. The button is wired by <code>js/hello.js</code>, loaded automatically via <code>plugin.json</code>.',
        'btn_counter'   => 'Click me',
        'counter_label' => 'Click count:',
        'spinner_title' => 'Global spinner demo',
        'spinner_desc'  => 'The global <code>window.acSpinner</code> overlay is available on every page. Call <code>acSpinner.show(\'Message…\')</code> to display it and <code>acSpinner.hide()</code> to dismiss it.',
        'spinner_btn'   => 'Show spinner (2 s)',
    ],
    'fr' => [
        'page_title'    => 'Bonjour le monde',
        'no_messages'   => 'Aucun message pour le moment.',
        'logged_in_as'  => 'Connecté en tant que',
        'link_about'    => 'Voir la page À propos (accès restreint)',
        'login_prompt'  => 'Connectez-vous pour accéder à plus de contenu.',
        'btn_login'     => 'Se connecter',
        'assets_title'  => 'Démo des assets du plugin',
        'assets_desc'   => 'L\'image ci-dessous est servie depuis <code>assets/no_rules.png</code> dans le répertoire du plugin. Le bouton est câblé par <code>js/hello.js</code>, chargé automatiquement via <code>plugin.json</code>.',
        'btn_counter'   => 'Cliquez ici',
        'counter_label' => 'Nombre de clics :',
        'spinner_title' => 'Démo du spinner global',
        'spinner_desc'  => 'L\'overlay global <code>window.acSpinner</code> est disponible sur toutes les pages. Appelez <code>acSpinner.show(\'Message…\')</code> pour l\'afficher et <code>acSpinner.hide()</code> pour le masquer.',
        'spinner_btn'   => 'Afficher le spinner (2 s)',
    ],
][getUiLang()] ?? [];

$pageTitle = $txt['page_title'];
$messages  = hwGetMessages();
?>
<div class="container py-4">

    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($pageTitle) ?></span></div>
    </div>

    <?php if (empty($messages)): ?>
    <p class="text-muted"><?= h($txt['no_messages']) ?></p>
    <?php else: ?>
    <ul class="hello-world-list mb-4">
        <?php foreach ($messages as $m): ?>
        <li><?= h($m['text']) ?></li>
        <?php endforeach; ?>
    </ul>
    <?php endif; ?>

    <!-- Assets demo: static image and JS-wired counter from the assets/ directory -->
    <div class="card-altered p-4 mb-4">
        <h6 class="fw-semibold mb-2"><?= h($txt['assets_title']) ?></h6>
        <p class="text-muted small mb-3"><?= $txt['assets_desc'] ?></p>
        <img src="<?= BASE_URL ?>/plugins/hello-world/assets/no_rules.png"
             alt="no_rules" class="d-block mb-3 rounded" style="max-height:120px">
        <div class="d-flex align-items-center gap-3">
            <button id="hw-counter-btn" class="btn btn-sm btn-outline-secondary">
                <?= h($txt['btn_counter']) ?>
            </button>
            <span class="text-muted small">
                <?= h($txt['counter_label']) ?> <strong id="hw-counter-display">0</strong>
            </span>
        </div>
    </div>

    <!-- Global spinner demo -->
    <div class="card-altered p-4 mb-4">
        <h6 class="fw-semibold mb-2"><?= h($txt['spinner_title']) ?></h6>
        <p class="text-muted small mb-3"><?= $txt['spinner_desc'] ?></p>
        <button id="hw-spinner-btn" class="btn btn-sm btn-outline-secondary">
            <i class="fa-solid fa-spinner me-1"></i><?= h($txt['spinner_btn']) ?>
        </button>
    </div>
    <script>
    document.getElementById('hw-spinner-btn').addEventListener('click', function () {
        window.acSpinner.show('Loading…');
        setTimeout(function () { window.acSpinner.hide(); }, 2000);
    });
    </script>

    <?php if ($isLoggedIn): ?>
    <div class="card-altered p-4">
        <p class="mb-1">
            <i class="fa-solid fa-circle-check text-success me-1"></i>
            <?= h($txt['logged_in_as']) ?>
            <strong><?= h(kcUser()['username']) ?></strong>.
        </p>
        <p class="text-muted small mb-0">
            <a href="<?= BASE_URL ?>/pages/hello-page-lock"><?= h($txt['link_about']) ?></a>
        </p>
    </div>
    <?php else: ?>
    <div class="card-altered p-4">
        <p class="mb-2 text-muted"><?= h($txt['login_prompt']) ?></p>
        <a href="<?= BASE_URL ?>/pages/login" class="btn btn-sm btn-primary-altered">
            <i class="fa-solid fa-right-to-bracket me-1"></i>
            <?= h($txt['btn_login']) ?>
        </a>
    </div>
    <?php endif; ?>

</div>
