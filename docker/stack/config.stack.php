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
define('ENCRYPTION_KEY',   '4f3c2a1b0d9e8f70615243342536271809a1b2c3d4e5f60718293a4b5c6d7e8f');

define('SHOW_NEWSLETTER', false);
define('COLLECTION_MODE', true);
define('API_RESPONSE_DEBUG', false);
define('STORE_KC_USER_DATA', true);
define('LOCAL_ALLOW_REGISTER', false);
define('TINYMCE_API_KEY', '');
define('GITHUB_APP_ID',              '');
define('GITHUB_APP_INSTALLATION_ID', '');
define('GITHUB_APP_PRIVATE_KEY', '');
define('GITHUB_REPO', 'owner/community-feedback');

// Cards, CDN and collection stay on production (read-only). Decks run locally; SPA plugins
// reach them through the site's relay (/api/v1/services/decks), never directly.
define('CARDS_API_URL',        'https://cards.alteredcore.org');
define('UNIQUES_API_URL',      '');
define('DECKS_API_URL',        'http://decks-api:80');
define('CDN_URL',              'https://cdn.alteredcore.org');
define('OWNERSHIP_API_URL',    '');
define('OWNERSHIP_WEB_URL',    '');
define('COLLECTION_API_URL',   'https://collection.alteredcore.org');
define('COLLECTION_USE_API',   false);

define('BASE_URL', '');
define('SITE_NAME', 'AlteredCore');
