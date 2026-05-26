<?php
// Example plugin API endpoint — reached via GET /api/hello-world/data
// Full framework context is available: getDB(), qp(), session, etc.
// The router has already set _ac_current_plugin_prefix so qp() uses the
// correct table prefix (hw_*) for this plugin.
header('Content-Type: application/json; charset=UTF-8');

$db = getDB();

$greeting = $db->query(qp("SELECT value FROM {settings} WHERE `key` = 'greeting'"))->fetchColumn();
$count    = (int)$db->query(qp("SELECT COUNT(*) FROM {messages}"))->fetchColumn();

echo json_encode([
    'greeting'      => $greeting ?: 'Hello!',
    'message_count' => $count,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
