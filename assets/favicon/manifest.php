<?php
// Web app manifest (PWA). Linked from includes/header.php with ?lang=<ui lang>.
// No session here: browsers fetch the manifest without cookies.
require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/includes/functions.php';

header('Content-Type: application/manifest+json');
header('Cache-Control: public, max-age=3600');

$lang = (isset($_GET['lang']) && $_GET['lang'] === 'fr') ? 'fr' : 'en';

$name        = getSiteName();
$description = getSetting('meta_description_' . $lang) ?: ($lang === 'fr' ? SITE_DESCRIPTION_FR : SITE_DESCRIPTION_EN);
// Light theme, from the design system: the title bar blends with the header background,
// the splash screen with the page background.
$themeColor  = dsToken('--ac-header-bg');
$iconDir     = BASE_URL . '/assets/favicon';

$shortcutLabels = [
    'en' => ['news' => 'News',       'account' => 'My account'],
    'fr' => ['news' => 'Actualités', 'account' => 'Mon compte'],
][$lang];

echo json_encode([
    'id'               => BASE_URL . '/',
    'name'             => $name,
    'short_name'       => $name,
    'description'      => $description,
    'lang'             => $lang,
    'dir'              => 'ltr',
    'start_url'        => BASE_URL . '/',
    'scope'            => BASE_URL . '/',
    'display'          => 'standalone',
    'theme_color'      => $themeColor,
    'background_color' => dsToken('--ac-color-bg-app'),
    'icons'            => [
        // Transparent round logo, shown as-is (browser UI, desktop launchers).
        ['src' => $iconDir . '/web-app-manifest-192x192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
        ['src' => $iconDir . '/web-app-manifest-512x512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
        // Opaque blue background (#006196) with the logo inside the 80% safe zone,
        // for launchers that crop icons (Android adaptive icons).
        ['src' => $iconDir . '/web-app-manifest-maskable-192x192.png', 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'maskable'],
        ['src' => $iconDir . '/web-app-manifest-maskable-512x512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
    ],
    'shortcuts'        => [
        [
            'name'  => $shortcutLabels['news'],
            'url'   => BASE_URL . '/pages/news',
            'icons' => [['src' => $iconDir . '/web-app-manifest-192x192.png', 'sizes' => '192x192', 'type' => 'image/png']],
        ],
        [
            'name'  => $shortcutLabels['account'],
            'url'   => BASE_URL . '/pages/account',
            'icons' => [['src' => $iconDir . '/web-app-manifest-192x192.png', 'sizes' => '192x192', 'type' => 'image/png']],
        ],
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
