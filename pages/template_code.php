<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initLang();

// translations
$txt = [
    'en' => [
        'page_title' => '',
    ],
    'fr' => [
        'page_title' => '',
    ],
][getUiLang()] ?? [];

$lang = getLang();

$pageTitle       = $txt['page_title']; // Shown in the browser tab and section header
$pageDescription = '';                 // Used for OG/meta description (Discord, Twitter previews)
// $pageImage    = BASE_URL . '/assets/images/og-image.jpg'; // Optional OG image (1200x630)

// Page logic here

require_once dirname(__DIR__) . '/includes/header.php';
?>

<div class="container py-4">
    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($txt['page_title']) ?></span></div>
    </div>

    <!-- Page content here -->

</div>

<?php require_once dirname(__DIR__) . '/includes/footer.php'; ?>
