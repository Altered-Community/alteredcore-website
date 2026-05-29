<?php
/**
 * Plugin shared helpers.
 *
 * Usage — include at the top of any page / admin / api file:
 *   require_once __DIR__ . '/../inc/functions.php';   // from pages/ or admin/
 *   require_once __DIR__ . '/../../inc/functions.php'; // from papi/
 *
 * All functions here rely on the variables injected by the router:
 *   $db          — PDO instance
 *   qp($sql)     — table-prefix resolver (wraps {table} → real table name)
 */

// settings helpers

/**
 * Return a plugin setting value, or $default if the key does not exist.
 */
function hwGetSetting(string $key, string $default = ''): string
{
    global $db;
    $row = $db->prepare(qp("SELECT value FROM {settings} WHERE `key` = :k"));
    $row->execute([':k' => $key]);
    $val = $row->fetchColumn();
    return $val !== false ? (string)$val : $default;
}

/**
 * Upsert a plugin setting (insert or update on duplicate key).
 */
function hwSaveSetting(string $key, string $value): void
{
    global $db;
    $db->prepare(qp(
        "INSERT INTO {settings} (`key`, value) VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE value = :v2"
    ))->execute([':k' => $key, ':v' => $value, ':v2' => $value]);
}

// message helpers

/**
 * Return all messages, newest first.
 *
 * @return array<int, array<string, mixed>>
 */
function hwGetMessages(): array
{
    global $db;
    return $db->query(qp("SELECT * FROM {messages} ORDER BY id DESC"))->fetchAll();
}

/**
 * Insert a new message. Returns the new row ID.
 */
function hwAddMessage(string $text): int
{
    global $db;
    $stmt = $db->prepare(qp("INSERT INTO {messages} (text) VALUES (:t)"));
    $stmt->execute([':t' => $text]);
    return (int)$db->lastInsertId();
}

/**
 * Delete a message by ID. Returns true if a row was deleted.
 */
function hwDeleteMessage(int $id): bool
{
    global $db;
    $stmt = $db->prepare(qp("DELETE FROM {messages} WHERE id = :id"));
    $stmt->execute([':id' => $id]);
    return $stmt->rowCount() > 0;
}
