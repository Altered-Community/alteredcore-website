<?php
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/shortcodes.php';
initLang();

// translations
$txt = [
    'en' => [
        'privacy_title' => 'Privacy Policy',
        'privacy_empty' => 'Privacy policy content coming soon.',
    ],
    'fr' => [
        'privacy_title' => 'Politique de confidentialité',
        'privacy_empty' => 'Contenu de la politique de confidentialité à venir.',
    ],
][getUiLang()] ?? [];

$lang      = getLang();
$pageTitle = $txt['privacy_title'];
$content   = getSetting('privacy_content_' . $lang);

include dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4">

    <h1 class="section-title mb-4"><span><?= $txt['privacy_title'] ?></span></h1>

    <?php if ($content !== ''): ?>
        <div class="news-detail-content">
            <?= renderShortcodes($content) ?>
        </div>
    <?php else: ?>
        <p class="text-muted"><?= $txt['privacy_empty'] ?></p>
    <?php endif; ?>

</div>

<?php include dirname(__DIR__) . '/includes/footer.php'; ?>
