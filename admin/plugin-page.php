<?php
require_once dirname(__DIR__) . '/includes/functions.php';
initPlugins();

$_pluginId    = preg_replace('/[^a-z0-9_-]/', '', $_GET['plugin']  ?? '');
$_sectionSlug = preg_replace('/[^a-z0-9_-]/', '', $_GET['section'] ?? '');

$_targetFile  = null;
$_sectionInfo = null;
foreach (pluginsGetAdminSections() as $_s) {
    if ($_s['plugin_id'] === $_pluginId && $_s['section'] === $_sectionSlug) {
        $_targetFile  = $_s['abs_file'];
        $_sectionInfo = $_s;
        break;
    }
}

$adminPageTitle = $_sectionInfo ? (($_sectionInfo['label_en'] ?? '') ?: $_pluginId) : 'Plugin';
$adminSection   = $_sectionSlug;
require_once __DIR__ . '/includes/header.php';

if (!$_targetFile) {
    echo '<div class="alert alert-danger">Plugin section not found or plugin is not active.</div>';
} else {
    $GLOBALS['_ac_current_plugin_prefix'] = $_sectionInfo['_table_prefix'] ?? '';
    $db = getDB();
    include $_targetFile;
    unset($GLOBALS['_ac_current_plugin_prefix']);
}

require_once __DIR__ . '/includes/footer.php';
