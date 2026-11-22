<?php
// Azure theme — optional <head> hook (included by includes/header.php before </head>)
// Use this file to add theme-specific styles, scripts, or meta tags.
// Variables from includes/header.php are available here.

// When MOBILE_HEADER_MODE === 1, the navband is always visible (no burger button).
// The az-mobile-compact body class enables compact mobile CSS in style.css.
// $__mobileCompact is set by includes/header.php; $__extraBodyClasses is merged into <body class="">.
if ($__mobileCompact) {
    $__extraBodyClasses   = isset($__extraBodyClasses) && is_array($__extraBodyClasses) ? $__extraBodyClasses : [];
    $__extraBodyClasses[] = 'az-mobile-compact';
}
?>
