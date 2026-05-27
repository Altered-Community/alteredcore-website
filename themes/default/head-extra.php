<?php
// Default theme — optional <head> hook (included by includes/header.php before </head>)
// Use this file to add theme-specific styles, scripts, or meta tags.
// Variables from includes/header.php are available here.

// Navbar width: overrides the default .site-header / .altered-navbar constraints
$_navbarWidth = getSetting('navbar_width');
if ($_navbarWidth === 'full'):
?>
<style>
.site-header{width:100vw;margin-left:calc(50% - 50vw);padding-left:1rem;padding-right:1rem;}
</style>
<?php elseif (is_numeric($_navbarWidth) && (int)$_navbarWidth > 0): ?>
<style>
.altered-navbar{max-width:<?= (int)$_navbarWidth ?>px;margin-left:auto;margin-right:auto;}
</style>
<?php endif; ?>
<?php
// When MOBILE_HEADER_MODE === 1, compact mobile nav is active (icon bar, no burger).
// The mobile-nav-compact body class enables the corresponding CSS in style.css.
if ($__mobileCompact) {
    $__extraBodyClasses   = isset($__extraBodyClasses) && is_array($__extraBodyClasses) ? $__extraBodyClasses : [];
    $__extraBodyClasses[] = 'mobile-nav-compact';
}
?>
