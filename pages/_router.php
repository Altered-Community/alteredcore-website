<?php
// Central page router — handles both core pages and plugin pages.
require_once dirname(__DIR__) . '/includes/functions.php';

$_path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$_slug = preg_replace('/[^a-z0-9_-]/', '', basename(rtrim($_path ?? '', '/')));

if ($_slug === '') {
    include __DIR__ . '/404.php';
    exit;
}

// Spoof PHP_SELF so included pages behave as if served directly
$_SERVER['PHP_SELF'] = '/pages/' . $_slug . '.php';

// Core page
$_corePath = __DIR__ . '/' . $_slug . '.php';
if (file_exists($_corePath)) {
    include $_corePath;
    exit;
}

// Plugin page
initPlugins();
$_pluginPage = pluginFindPage($_slug);
if ($_pluginPage !== null) {
    // Respect visibility setting (set in Admin → Pages)
    $_hiddenPluginSlugs = json_decode(getSetting('plugin_pages_hidden', '[]'), true);
    if (is_array($_hiddenPluginSlugs) && in_array($_slug, $_hiddenPluginSlugs, true)) {
        include __DIR__ . '/404.php';
        exit;
    }
    $GLOBALS['_ac_plugin_css']            = $_pluginPage['plugin_css'];
    $GLOBALS['_ac_plugin_js']             = $_pluginPage['plugin_js'];
    $GLOBALS['_ac_current_plugin_prefix'] = $_pluginPage['_table_prefix'];
    $GLOBALS['_ac_is_plugin_page']        = true;

    // Inject boilerplate so plugin pages don't need to do it themselves.
    initLang();
    $db         = getDB();
    $isLoggedIn = kcIsLoggedIn();
    // Default title from manifest; plugin can override by setting $pageTitle.
    $_lang     = getUiLang();
    $pageTitle = $_pluginPage['title_' . $_lang] ?? $_pluginPage['title_en'] ?? '';

    // Buffer output so requireLogin() / redirect() still work inside the plugin
    // (ob_start only buffers output — headers are not affected).
    ob_start();
    include $_pluginPage['abs_file'];
    $_pluginOutput = ob_get_clean();

    require_once dirname(__DIR__) . '/includes/header.php';
    unset($GLOBALS['_ac_current_plugin_prefix'], $GLOBALS['_ac_is_plugin_page']);
    echo $_pluginOutput;
    require_once dirname(__DIR__) . '/includes/footer.php';
    exit;
}

// Not found
include __DIR__ . '/404.php';
