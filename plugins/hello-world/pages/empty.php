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

<div class="ac-page">

    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($txt['page_title']) ?></h1>
        </div>
    </header>

    <!-- YOUR HTML CODE HERE: ac-* components, ac_icon(), tokens in assets/style.css -->

</div>
