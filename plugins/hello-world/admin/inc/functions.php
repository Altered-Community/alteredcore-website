<?php
/**
 * Admin-only helpers for the hello-world plugin.
 *
 * Usage — include at the top of any admin file:
 *   require_once __DIR__ . '/inc/functions.php';
 *
 * Put here functions that are only needed in admin pages and should
 * not be available to front-end pages or API endpoints.
 * Shared logic that is also used by pages/ or api/ belongs in inc/functions.php
 * at the plugin root instead.
 */

/**
 * Return the total number of messages (for the admin header count).
 */
function hwCountMessages(): int
{
    global $db;
    return (int)$db->query(qp("SELECT COUNT(*) FROM {messages}"))->fetchColumn();
}
