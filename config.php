<?php
// Shared constants tracked in git — no secrets here.
// Instance-specific settings and secrets live in config.local.php (gitignored).
// Copy config.local.php.example to config.local.php and fill in real values.
require_once __DIR__ . '/config.local.php';

// Fallback: reproduces the path every deployment already logged to before
// ERROR_LOG_TARGET existed, so a config.local.php that doesn't define it yet
// (i.e. every deployment right now) keeps behaving exactly as before. Set
// ERROR_LOG_TARGET explicitly (e.g. to 'php://stderr' for Docker) to opt in to
// something else — see config.local.php.example.
if (!defined('ERROR_LOG_TARGET')) define('ERROR_LOG_TARGET', __DIR__ . '/logs/php_errors.log');

if (ERROR_LOG_TARGET !== '') {
    // A plain file path (no stream wrapper like php:// or syslog) needs its
    // directory to exist first: if it doesn't, ini_set('error_log') and every
    // error_log() call silently no-op, so errors leave no trace anywhere.
    if (strpos(ERROR_LOG_TARGET, '://') === false) {
        $_errorLogDir = dirname(ERROR_LOG_TARGET);
        if (!is_dir($_errorLogDir)) {
            @mkdir($_errorLogDir, 0775, true);
        }
    }
    ini_set('log_errors', '1');
    ini_set('error_log', ERROR_LOG_TARGET);
}

// ─── Site ─────────────────────────────────────────────────────────────────────
define('DEFAULT_LANG',          'en'); // Default language when nothing else is detected
define('NEWS_PER_PAGE',         9);    // News articles per page on the news list
define('NEWS_PER_ROW',          3);    // News cards per row on the homepage (1–4)
define('CARDS_API_MAX_PER_PAGE',    100); // Max items per API call (used for "fetch all" loops)
define('CARDS_DISPLAY_PER_PAGE',     36); // Cards shown per page in search results
define('HOME_NEWS_COUNT',       3);    // News items displayed on the homepage (no pagination)
define('SESSION_LIFETIME_DAYS', 30);   // Session lifetime in days (cookie + PHP gc)
define('MOBILE_HEADER_MODE',    1);    // 0 = burger menu · 1 = compact icon bar (no title, no burger)

// ─── SEO / Open Graph defaults ────────────────────────────────────────────────
// Can be overridden via site_settings in the admin panel.
define('SITE_DESCRIPTION_EN', 'Unofficial community website');
define('SITE_DESCRIPTION_FR', 'Site communautaire non officiel');

// ─── Uploads ─────────────────────────────────────────────────────────────────
define('UPLOAD_MAX_SIZE',     5 * 1024 * 1024); // 5 MB — raster images
define('UPLOAD_MAX_SIZE_SVG', 2 * 1024 * 1024); // 2 MB — SVG files
define('UPLOAD_ALLOWED_MIME', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
