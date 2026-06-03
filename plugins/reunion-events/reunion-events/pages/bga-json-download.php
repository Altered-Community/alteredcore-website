<?php
/**
 * Admin download for bga-tournaments.json — GET /pages/re-bga-json-download
 * Included by pages/_router.php before site header (safe for attachment headers).
 */

require_once __DIR__ . '/../inc/functions.php';

requireAdmin();

if (!adminHasSection('events-settings')) {
    flash('Access denied — you do not have permission to access this section.', 'error');
    header('Location: ' . BASE_URL . '/admin/');
    exit;
}

if (!csrfValid($_GET['csrf_token'] ?? '')) {
    flash('Invalid token.', 'error');
    header('Location: ' . BASE_URL . '/admin/plugin-page?plugin=reunion-events&section=events-settings');
    exit;
}

reSendBgaTournamentsJsonDownload();
