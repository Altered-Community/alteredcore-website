<?php
/**
 * CLI entry point for the tournament sync.
 *
 * The site has no job runner, so by default the sync rides on visitor traffic
 * (trAutoSyncTournaments, called from the plugin's pages). Wire this to a cron
 * instead when you'd rather it not sit on anyone's page render:
 *
 *   0 * * * * php /var/www/html/plugins/tournament-reports/bin/sync.php
 *
 * The two are safe together — each run pushes the next one out — and this one
 * takes no per-run cap or time budget, since nobody is waiting on a response.
 *
 * Exits 0 on success, 1 on failure, so cron can report it.
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// The plugin lives at <root>/plugins/tournament-reports/bin/sync.php.
$root = dirname(__DIR__, 3);

require_once $root . '/includes/db.php';
require_once __DIR__ . '/../inc/functions.php';

// Both normally come from the page router, which isn't in play here: qp()
// resolves {tournaments} through this prefix, and the plugin's helpers read
// the connection off $db.
$GLOBALS['_ac_current_plugin_prefix'] = 'tr';
$db = getDB();

$result = trSyncTournaments(0, PHP_INT_MAX, 0.0);

fwrite(
    $result['ok'] ? STDOUT : STDERR,
    '[tournament-reports] ' . trSyncSummary($result) . PHP_EOL
);

exit($result['ok'] ? 0 : 1);
