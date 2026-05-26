<?php
// Azure theme — optional <head> hook (included by includes/header.php before </head>)
// Use this file to add theme-specific styles, scripts, or meta tags.
// Variables from includes/header.php are available here.

// Navbar width: overrides the azure-specific .az-topbar-inner and .az-navband-inner widths
$_navbarWidth = getSetting('navbar_width');
if ($_navbarWidth === 'full'):
?>
<style>
.az-site-header{width:100vw;margin-left:calc(50% - 50vw);}
</style>
<?php elseif (is_numeric($_navbarWidth) && (int)$_navbarWidth > 0): ?>
<style>
.az-topbar-inner,.az-navband-inner{max-width:<?= (int)$_navbarWidth ?>px;margin-left:auto;margin-right:auto;}
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
