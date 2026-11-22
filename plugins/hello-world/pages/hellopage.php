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
<?php /*
 * Page layout with the design system (design-system/README.md):
 *   ac-page / ac-page-header   page column and title
 *   ac-card, ac-stack          surfaces and vertical spacing
 *   ac-button                  buttons (--secondary, --ghost, --sm…)
 *   ac_icon('lucide-name')     inline SVG icons (https://lucide.dev/icons)
 * The plugin CSS (assets/style.css) only adds layout, with var(--ac-*) tokens.
 */ ?>
<div class="ac-page">

    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($pageTitle) ?></h1>
        </div>
    </header>

    <div class="ac-stack">

        <?php if (empty($messages)): ?>
        <div class="ac-card">
            <div class="ac-empty">
                <?= ac_icon('message-square') ?>
                <p class="ac-empty__title"><?= h($txt['no_messages']) ?></p>
            </div>
        </div>
        <?php else: ?>
        <div class="ac-card ac-card--flush">
            <ul class="ac-list">
                <?php foreach ($messages as $m): ?>
                <li><?= h($m['text']) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <!-- Assets demo: static image and JS-wired counter from the assets/ directory -->
        <section class="ac-card">
            <h2 class="ac-card__title"><?= h($txt['assets_title']) ?></h2>
            <p class="ac-card__meta"><?= $txt['assets_desc'] ?></p>
            <img src="<?= BASE_URL ?>/plugins/hello-world/assets/no_rules.png"
                 alt="no_rules" class="hw-demo-image">
            <div class="ac-card__footer">
                <button type="button" id="hw-counter-btn" class="ac-button ac-button--secondary ac-button--sm">
                    <?= h($txt['btn_counter']) ?>
                </button>
                <span class="hw-counter">
                    <?= h($txt['counter_label']) ?> <strong id="hw-counter-display">0</strong>
                </span>
            </div>
        </section>

        <!-- Global spinner demo -->
        <section class="ac-card">
            <h2 class="ac-card__title"><?= h($txt['spinner_title']) ?></h2>
            <p class="ac-card__meta"><?= $txt['spinner_desc'] ?></p>
            <div class="ac-card__footer">
                <button type="button" id="hw-spinner-btn" class="ac-button ac-button--secondary ac-button--sm">
                    <?= ac_icon('loader-circle') ?><?= h($txt['spinner_btn']) ?>
                </button>
            </div>
        </section>
        <script>
        document.getElementById('hw-spinner-btn').addEventListener('click', function () {
            window.acSpinner.show('Loading…');
            setTimeout(function () { window.acSpinner.hide(); }, 2000);
        });
        </script>

        <?php if ($isLoggedIn): ?>
        <div class="ac-notice ac-notice--success" role="status">
            <?= ac_icon('circle-check') ?>
            <div>
                <p class="ac-notice__title"><?= h($txt['logged_in_as']) ?> <?= h(kcUser()['username']) ?></p>
                <p><a href="<?= BASE_URL ?>/pages/hello-page-lock"><?= h($txt['link_about']) ?></a></p>
            </div>
        </div>
        <?php else: ?>
        <section class="ac-card">
            <p class="ac-card__meta"><?= h($txt['login_prompt']) ?></p>
            <div class="ac-card__footer">
                <a href="<?= BASE_URL ?>/pages/login" class="ac-button ac-button--sm">
                    <?= ac_icon('log-in') ?><?= h($txt['btn_login']) ?>
                </a>
            </div>
        </section>
        <?php endif; ?>

    </div>

</div>
