<?php
// ─────────────────────────────────────────────────────────────────────────────
// Tracked SQL migration runner for PLUGIN schemas.
//
// Companion to migrate.php, which only ever looks at sql/migration_*.sql — the
// core schema. Plugin schemas live in plugins/<id>/sql/update_<version>.sql and
// used to be applied in exactly one place: the ZIP-upload branch of
// admin/plugins.php. A git deploy ships plugin *code* without ever touching
// those files, so a plugin whose schema had moved went live against its old
// tables — every page naming a new column died on an uncaught PDOException
// (ERRMODE_EXCEPTION), i.e. a blank 200. This runner closes that gap.
//
// What is applied, per plugin, in version order:
//   installedVersion < fileVersion <= manifestVersion
// where installedVersion is {plugins}.version and manifestVersion is the
// version in plugin.json on disk — the same window admin/plugins.php uses, so
// both paths agree on what a pending migration is.
//
// Each applied file is recorded in {plugin_schema_migrations} so it never runs
// twice, and {plugins}.version is moved to the manifest version afterwards.
//
// Plugins with no {plugins} row, or with sql_installed_at IS NULL, are skipped:
// their tables don't exist on this instance. Installing them stays the admin's
// "Activate" action, which runs install.sql — that file already carries the
// current schema, so its update_*.sql files are recorded as baselined rather
// than replayed on top of it.
//
// Usage:
//   php sql/migrate_plugins.php              Apply pending plugin migrations.
//   php sql/migrate_plugins.php --baseline   Record every pending file as
//                                            applied WITHOUT running it (used
//                                            right after a fresh schema.sql
//                                            import, see bootstrap.php).
//
// NOTE: same splitting rules as migrate.php — `--` line comments are stripped
// and statements split on ';', so keep plugin migrations to plain DDL/DML. Write
// them idempotently where you can: a file that fails halfway is NOT recorded, so
// the next deploy retries it from the top. MySQL has no ADD COLUMN IF NOT EXISTS;
// the INFORMATION_SCHEMA + PREPARE/EXECUTE pattern documented in migrate.php
// works here too, but note that {table} expands backtick-quoted, so compare
// against REPLACE('{table}', '`', '') when matching INFORMATION_SCHEMA.TABLE_NAME.
// ─────────────────────────────────────────────────────────────────────────────

require_once dirname(__DIR__) . '/includes/db.php';
require_once dirname(__DIR__) . '/includes/plugins.php';

$baseline = in_array('--baseline', $argv, true);
$pdo      = getDB();

function pm_log(string $msg): void { fwrite(STDERR, "[migrate-plugins] $msg\n"); }

// Tracking table. Core-prefixed via q(), not qp(): it belongs to the site
// rather than to any one plugin, and has to outlive a plugin being removed.
$pdo->exec(q(
    "CREATE TABLE IF NOT EXISTS {plugin_schema_migrations} ("
    . " plugin_id VARCHAR(64) NOT NULL,"
    . " filename VARCHAR(255) NOT NULL,"
    . " applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"
    . " PRIMARY KEY (plugin_id, filename)"
    . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
));

// A DB old enough to predate the plugin registry has nothing to migrate.
try {
    $rows = $pdo->query(q("SELECT id, version, sql_installed_at FROM {plugins}"))
                ->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    pm_log('no {plugins} table — nothing to do.');
    exit(0);
}

$installed = [];
foreach ($rows as $row) {
    $installed[$row['id']] = $row;
}

$record = $pdo->prepare(q(
    "INSERT IGNORE INTO {plugin_schema_migrations} (plugin_id, filename) VALUES (:p, :f)"
));
$bumpVersion = $pdo->prepare(q("UPDATE {plugins} SET version = :v WHERE id = :id"));

$applied  = 0;
$recorded = 0;
$failed   = 0;

foreach (pluginsGetAll() as $pluginId => $manifest) {
    $row = $installed[$pluginId] ?? null;

    // Never installed here: no tables to alter. Activation runs install.sql.
    if ($row === null || $row['sql_installed_at'] === null) {
        continue;
    }

    $manifestVersion  = (string)($manifest['version'] ?? '0');
    $installedVersion = (string)($row['version'] ?? '');
    if ($installedVersion === '') {
        $installedVersion = '0';
    }

    $migrations = [];
    foreach (glob($manifest['_dir'] . '/sql/update_*.sql') ?: [] as $file) {
        if (!preg_match('/^update_(.+)\.sql$/', basename($file), $m)) continue;
        $migrations[$m[1]] = $file;
    }
    uksort($migrations, 'version_compare');

    $doneStmt = $pdo->prepare(q(
        "SELECT filename FROM {plugin_schema_migrations} WHERE plugin_id = :p"
    ));
    $doneStmt->execute([':p' => $pluginId]);
    $done = array_flip($doneStmt->fetchAll(PDO::FETCH_COLUMN));

    $pluginFailed = false;

    foreach ($migrations as $fileVersion => $file) {
        $name = basename($file);
        if (isset($done[$name])) {
            continue;
        }

        // Newer than the code actually deployed here. Not ours to run: the
        // matching plugin files aren't on disk yet.
        if (version_compare($fileVersion, $manifestVersion, '>')) {
            continue;
        }

        // Already part of what this instance installed — either install.sql on
        // a recent activation, or an earlier admin ZIP upload. Record it so it
        // never replays on top of a schema that already has it.
        if ($baseline || version_compare($fileVersion, $installedVersion, '<=')) {
            $record->execute([':p' => $pluginId, ':f' => $name]);
            $recorded++;
            pm_log("baselined $pluginId/$name");
            continue;
        }

        try {
            $GLOBALS['_ac_current_plugin_prefix'] = $manifest['_table_prefix'] ?? '';
            $sql   = qp(file_get_contents($file));
            $clean = preg_replace('/^\s*--.*$/m', '', $sql);
            foreach (array_filter(array_map('trim', explode(';', $clean))) as $statement) {
                $pdo->exec($statement);
            }
            unset($GLOBALS['_ac_current_plugin_prefix']);
        } catch (Exception $e) {
            unset($GLOBALS['_ac_current_plugin_prefix']);
            pm_log("ERROR   $pluginId/$name: " . $e->getMessage());
            $failed++;
            // Leave the version where it is so the next deploy retries from
            // this file instead of declaring the plugin up to date.
            $pluginFailed = true;
            break;
        }

        $record->execute([':p' => $pluginId, ':f' => $name]);
        $applied++;
        pm_log("applied   $pluginId/$name");
    }

    if ($pluginFailed) {
        continue;
    }

    // Also covers a release with no schema change at all, so the registry
    // still reflects the code on disk.
    if (version_compare($manifestVersion, $installedVersion, '>')) {
        $bumpVersion->execute([':v' => $manifestVersion, ':id' => $pluginId]);
        pm_log("version   $pluginId $installedVersion → $manifestVersion");
    }
}

pm_log("done ($applied applied, $recorded baselined, $failed failed).");
exit($failed > 0 ? 1 : 0);
