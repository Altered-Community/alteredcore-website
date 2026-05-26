<?php
// loginRequired(); // Protected page — redirect to login if not authenticated

// translations
$txt = [
    'en' => [
        'page_title'   => 'Example page',
    ],
    'fr' => [
        'page_title'   => 'Page d\'éxemple',
    ],
][getUiLang()] ?? [];

// yOUR PHP CODE HERE

?>

<div class="container py-4">

    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($txt['page_title']) ?></span></div>
    </div>

    <!-- YOUR HTML CODE HERE -->

</div>
