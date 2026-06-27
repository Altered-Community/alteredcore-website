<?php
// ─────────────────────────────────────────────────────────────────────────────
// Tracked SQL migration runner for alteredcore-website.
//
// Applies every sql/migration_*.sql file not yet recorded in the
// `{prefix}schema_migrations` table, in filename (sorted) order, substituting the
// literal {prefix} token with DB_PREFIX. Each applied file is then recorded so it
// never runs twice.
//
// Usage:
//   php sql/migrate.php              Apply pending migrations.
//   php sql/migrate.php --baseline   Record ALL current migrations as applied
//                                    WITHOUT running them. Use right after a fresh
//                                    schema.sql import — schema.sql already reflects
//                                    the current schema, so the migrations (which
//                                    upgrade OLDER DBs) must not be replayed.
//
// docker-compose / prod (existing DB):  docker compose exec web php sql/migrate.php
//
// NOTE: write migrations idempotently so they are safe against hand-patched DBs.
// `CREATE TABLE IF NOT EXISTS` works everywhere. For ADD COLUMN, MySQL does not support
// `IF NOT EXISTS` (MariaDB-only) — use the INFORMATION_SCHEMA + PREPARE/EXECUTE pattern:
//   SET @e=(SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE ...);
//   SET @s=IF(@e=0,'ALTER TABLE ... ADD COLUMN ...','SELECT 1');
//   PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;
// is a safe no-op. Statements are split on ';' after stripping `--` line comments,
// so keep migrations to plain DDL/DML (no stored-program bodies with inner ';').
// ─────────────────────────────────────────────────────────────────────────────

require_once dirname(__DIR__) . '/includes/db.php';

$baseline = in_array('--baseline', $argv, true);
$pdo      = getDB();
$sqlDir   = __DIR__;

// Tracking table — prefixed like every other table via q()'s {name} placeholder.
$pdo->exec(q(
    "CREATE TABLE IF NOT EXISTS {schema_migrations} ("
    . " filename VARCHAR(255) NOT NULL PRIMARY KEY,"
    . " applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
    . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
));

$done = array_flip(
    $pdo->query(q("SELECT filename FROM {schema_migrations}"))->fetchAll(PDO::FETCH_COLUMN)
);

$files = glob($sqlDir . '/migration_*.sql') ?: [];
sort($files, SORT_STRING);

$record = $pdo->prepare(q("INSERT INTO {schema_migrations} (filename) VALUES (:f)"));
$count  = 0;

foreach ($files as $file) {
    $name = basename($file);
    if (isset($done[$name])) {
        continue;
    }

    if (!$baseline) {
        // Substitute the {prefix} token (the SQL files use `{prefix}tablename`),
        // strip `--` line comments, then run each remaining statement.
        $sql   = str_replace('{prefix}', DB_PREFIX, file_get_contents($file));
        $clean = preg_replace('/^\s*--.*$/m', '', $sql);
        foreach (array_filter(array_map('trim', explode(';', $clean))) as $stmt) {
            $pdo->exec($stmt);
        }
        fwrite(STDERR, "[migrate] applied   $name\n");
    } else {
        fwrite(STDERR, "[migrate] baselined $name\n");
    }

    $record->execute([':f' => $name]);
    $count++;
}

fwrite(STDERR, $baseline
    ? "[migrate] baseline complete ($count recorded).\n"
    : "[migrate] done ($count applied).\n");
