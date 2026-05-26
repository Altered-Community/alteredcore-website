<?php
// Included from pages/index.php below the news section.
$__html = (getUiLang() === 'fr')
    ? (getSetting('homepage_content_fr') ?: getSetting('homepage_content_en') ?: '')
    : (getSetting('homepage_content_en') ?: '');
if ($__html !== ''):
?>
<section class="container py-4">
    <?= renderShortcodes($__html) ?>
</section>
<?php endif; ?>
