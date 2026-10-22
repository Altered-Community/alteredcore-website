<?php
// Local / CI stack only (docker/entrypoint.sh, AC_STACK_SEED=1), when the plugin is active: the creature and spots of
// hidden-creatures.spec.ts. Test spots of their own (news and privacy pages, a link to example.test), not the real
// ones, which are entered in the admin and kept out of this public repository. Idempotent.
if (PHP_SAPI !== 'cli') exit; // plugins/.htaccess blocks it over HTTP already
require_once dirname(__DIR__, 3) . '/includes/functions.php';
require_once dirname(__DIR__) . '/inc/functions.php';

initPlugins();
if (!isset($GLOBALS['_ac_active_plugins']['hidden-creatures'])) {
    echo "[hidden-creatures] not active: no e2e fixtures\n";
    exit(0);
}

// No images: the component's cotton ball.
hcSaveCreature('e2e', 'Créature E2E', 'E2E creature', '', '');
hcSaveSpot('e2e-load', 'e2e', ['news'], 'load', 'E2E-CODE');
hcSaveSpot('e2e-test-hand', 'e2e', ['rebuilder', 'deckbuilder', 'deck'], 'event:test-hand', '');
hcSaveSpot('e2e-event', 'e2e', ['privacy'], 'event:e2e', '');
hcSaveSpot('e2e-link', 'e2e', ['*'], 'link:https://example.test', '');
echo "[hidden-creatures] e2e fixtures ready\n";
