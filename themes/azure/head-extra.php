<?php
// Azure theme — optional <head> hook (included by includes/header.php before </head>)
// Use this file to add theme-specific styles, scripts, or meta tags.
// Variables from includes/header.php are available here.

// Navbar width: --az-nav-max-width sets the header's content width (both header layouts)
$_navbarWidth = getSetting('navbar_width');
if ($_navbarWidth === 'full'):
?>
<style>
:root{--az-nav-max-width:100vw;}
</style>
<?php elseif (is_numeric($_navbarWidth) && (int)$_navbarWidth > 0): ?>
<style>
:root{--az-nav-max-width:<?= (int)$_navbarWidth ?>px;}
</style>
<?php endif; ?>
<?php
// When MOBILE_HEADER_MODE === 1, the navband is always visible (no burger button).
// The az-mobile-compact body class enables compact mobile CSS in style.css.
// $__mobileCompact is set by includes/header.php; $__extraBodyClasses is merged into <body class="">.
if ($__mobileCompact) {
    $__extraBodyClasses   = isset($__extraBodyClasses) && is_array($__extraBodyClasses) ? $__extraBodyClasses : [];
    $__extraBodyClasses[] = 'az-mobile-compact';
}
?>
