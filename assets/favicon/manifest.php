<?php
require_once dirname(__DIR__, 2) . '/config.php';
require_once dirname(__DIR__, 2) . '/includes/functions.php';

header('Content-Type: application/manifest+json');
header('Cache-Control: public, max-age=86400');

$name       = getSiteName();
$themeColor = getSetting('theme_color') ?: '#C49A2A';

echo json_encode([
    'name'             => $name,
    'short_name'       => $name,
    'start_url'        => BASE_URL . '/',
    'scope'            => BASE_URL . '/',
    'display'          => 'standalone',
    'orientation'      => 'portrait-primary',
    'theme_color'      => $themeColor,
    'background_color' => '#FAF5E8',
    'icons'            => [
        [
            'src'     => BASE_URL . '/assets/favicon/web-app-manifest-192x192.png',
            'sizes'   => '192x192',
            'type'    => 'image/png',
            'purpose' => 'any maskable',
        ],
        [
            'src'     => BASE_URL . '/assets/favicon/web-app-manifest-512x512.png',
            'sizes'   => '512x512',
            'type'    => 'image/png',
            'purpose' => 'any maskable',
        ],
        [
            'src'     => BASE_URL . '/assets/favicon/apple-touch-icon.png',
            'sizes'   => '180x180',
            'type'    => 'image/png',
        ],
    ],
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
