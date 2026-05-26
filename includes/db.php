<?php
require_once dirname(__DIR__) . '/config.php';

// Fallback: allow existing config.php files without DB_PREFIX to work unchanged.
if (!defined('DB_PREFIX')) define('DB_PREFIX', '');

/**
 * Wrap a SQL string: replaces every {tablename} placeholder with
 * `prefix_tablename` (backtick-quoted). When DB_PREFIX is '' the backticks
 * are still added so table names are always safely quoted.
 *
 * Usage:  $db->prepare(q("SELECT * FROM {users} WHERE id = :id"))
 */
function q(string $sql): string {
    return preg_replace_callback('/\{([a-z_]+)\}/', function (array $m): string {
        return '`' . DB_PREFIX . $m[1] . '`';
    }, $sql);
}

// Plugin table helper: {table} → `prefix_plugin_{plugin_prefix}_table`
// The plugin prefix is set automatically by the router/admin dispatcher.
function qp(string $sql): string {
    $pluginPrefix = $GLOBALS['_ac_current_plugin_prefix'] ?? '';
    $seg = 'plugin_' . ($pluginPrefix !== '' ? $pluginPrefix . '_' : '');
    return preg_replace_callback('/\{([a-z_]+)\}/', function (array $m) use ($seg): string {
        return '`' . DB_PREFIX . $seg . $m[1] . '`';
    }, $sql);
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
        } catch (PDOException $e) {
            error_log('AlteredCore DB connection failed: ' . $e->getMessage());
            die('<div style="padding:2rem;font-family:sans-serif;color:#c00">Database connection error. Please try again later.</div>');
        }
    }
    return $pdo;
}
