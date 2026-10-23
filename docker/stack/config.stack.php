<?php
// Site configuration of the local / CI stack (docker-compose.stack.yml), mounted over
// config.local.php. Dev-only values: the Keycloak realm and secrets are the ones imported from
// docker/stack/players-realm.json, never real ones.
define('DB_HOST', 'db');
define('DB_NAME', 'alteredcore');
define('DB_USER', 'alteredcore');
define('DB_PASS', 'alteredcore');
define('DB_PREFIX', 'dev_');

// Keycloak (container "keycloak", reachable as auth.altered.local.gd:18080 from the browser —
// *.local.gd resolves to 127.0.0.1 — and from the containers through a network alias).
define('KC_URL',           'http://auth.altered.local.gd:18080');
define('KC_REALM',         'players');
define('KC_CLIENT_ID',     'main-site');
define('KC_CLIENT_SECRET', 'dev-main-site-secret');
define('KC_SCOPES',        'openid profile email');
define('ENCRYPTION_KEY',   'stack-dev-encryption-key-not-secret');

define('SHOW_NEWSLETTER', true);   // as in production; without Listmonk it fills the local newsletter_sub table
define('COLLECTION_MODE', true);
define('API_RESPONSE_DEBUG', false);
define('STORE_KC_USER_DATA', true);
define('LOCAL_ALLOW_REGISTER', false);
define('TINYMCE_API_KEY', '');
define('GITHUB_APP_ID',              '');
define('GITHUB_APP_INSTALLATION_ID', '');
define('GITHUB_APP_PRIVATE_KEY', '');
define('GITHUB_REPO', 'owner/community-feedback');

// Cards, Uniques search and CDN stay on production (read-only). Decks run locally; SPA plugins
// reach them through the site's relay (/api/v1/services/decks), never directly.
define('CARDS_API_URL',        'https://cards.alteredcore.org');
define('UNIQUES_API_URL',      'https://search.altered.re');
define('DECKS_API_URL',        'http://decks-api:80');
define('CDN_URL',              'https://cdn.alteredcore.org');
// Mock of the digital-ownership service (docker/stack/ownership-mock): alt arts in the site and Re:Builder. It also
// answers the collection API's GET /api/collection (the real one only takes altered.re tokens). The real service
// (docker-compose.ownership.yml) defines it first.
if (!defined('OWNERSHIP_API_URL')) define('OWNERSHIP_API_URL', 'http://ownership:8080');
define('OWNERSHIP_WEB_URL',    '');
define('COLLECTION_API_URL',   'http://ownership:8080');
define('COLLECTION_USE_API',   false);

define('BASE_URL', '');
define('SITE_NAME', 'AlteredCore');
