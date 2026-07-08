<?php
// ─────────────────────────────────────────────────────────────────────────────
// First-run + per-deploy bootstrap for alteredcore-website.
//
// Run over SSH right after the files are uploaded (see .github/workflows/deploy.yml).
// Fully idempotent — safe to run on every deploy, does nothing on an already
// set-up server. Makes a brand-new server work WITHOUT any manual step beyond
// placing config.local.php (which holds the DB credentials and all secrets).
//
// Steps:
//   1. Ensure uploads/ exists (writable target for user uploads).
//   2. Seed data/tinymce_shortcodes.json from its .dist reference if missing
//      (the file is admin-editable afterwards and never overwritten by deploys).
//   3. CREATE DATABASE IF NOT EXISTS  (DB_USER must have the privilege).
//   4. Fresh DB (no {prefix} tables) → import schema.sql, then baseline migrations.
//      Existing DB                   → apply pending migrations.
//
// Usage:  php sql/bootstrap.php
// ─────────────────────────────────────────────────────────────────────────────

require_once dirname(__DIR__) . '/config.php'; // defines DB_HOST/NAME/USER/PASS/PREFIX

$root   = dirname(__DIR__);
$sqlDir = __DIR__;

function boot_log(string $msg): void { fwrite(STDERR, "[bootstrap] $msg\n"); }

// ── 1. uploads/ ──────────────────────────────────────────────────────────────
$uploads = $root . '/uploads';
if (!is_dir($uploads)) {
    mkdir($uploads, 0775, true);
    boot_log('created uploads/');
}

// ── 2. data/tinymce_shortcodes.json seed (from .dist) ────────────────────────
$dataFile = $root . '/data/tinymce_shortcodes.json';
$distFile = $dataFile . '.dist';
if (!file_exists($dataFile) && file_exists($distFile)) {
    if (!is_dir(dirname($dataFile))) {
        mkdir(dirname($dataFile), 0775, true);
    }
    copy($distFile, $dataFile);
    boot_log('seeded data/tinymce_shortcodes.json');
}

// ── 3. CREATE DATABASE IF NOT EXISTS ─────────────────────────────────────────
$dbName = str_replace('`', '', DB_NAME);
$pdo = new PDO(
    'mysql:host=' . DB_HOST . ';charset=utf8mb4',
    DB_USER,
    DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$pdo->exec("USE `$dbName`");
boot_log("ensured database `$dbName`");

// ── 4. Fresh install? (count tables matching this instance's prefix) ─────────
// '_' and '%' are LIKE wildcards — escape them so a prefix like 'dev_' is literal.
$like = addcslashes(DB_PREFIX, '%_\\') . '%';
$stmt = $pdo->prepare(
    "SELECT COUNT(*) FROM information_schema.tables "
    . "WHERE table_schema = ? AND table_name LIKE ? ESCAPE '\\\\'"
);
$stmt->execute([$dbName, $like]);
$tableCount = (int) $stmt->fetchColumn();

$baseline = false;
if ($tableCount === 0) {
    boot_log('fresh database → importing schema.sql');
    // Same substitution/splitting rules as migrate.php (no DELIMITER blocks in schema.sql).
    $sql   = str_replace('{prefix}', DB_PREFIX, file_get_contents($sqlDir . '/schema.sql'));
    $clean = preg_replace('/^\s*--.*$/m', '', $sql);
    foreach (array_filter(array_map('trim', explode(';', $clean))) as $stmt2) {
        $pdo->exec($stmt2);
    }
    boot_log('schema.sql imported');
    // schema.sql already reflects the current schema → record migrations as applied
    // (baseline) instead of replaying them.
    $baseline = true;
}

// ── 5. Migrations (delegate to the tracked runner) ───────────────────────────
$cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($sqlDir . '/migrate.php')
     . ($baseline ? ' --baseline' : '');
boot_log('running migrations: ' . ($baseline ? 'baseline' : 'apply pending'));
passthru($cmd, $rc);
exit($rc);
