<?php
// Central page router — handles both core pages and plugin pages.

// Error logging to logs/php_errors.log (catches fatal errors swallowed by ob_start).
// The directory must exist first: if it doesn't, both ini_set('error_log') and the
// shutdown handler's error_log() call silently no-op, so fatal errors (e.g. a blank
// page from a swallowed fatal) leave no trace anywhere. Create it up front.
$_logFile = dirname(__DIR__) . '/logs/php_errors.log';
if (!is_dir(dirname($_logFile))) {
    @mkdir(dirname($_logFile), 0775, true);
}
ini_set('log_errors', '1');
ini_set('error_log', $_logFile);
register_shutdown_function(function () use ($_logFile) {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) {
        $line = date('[Y-m-d H:i:s]') . ' FATAL ' . $e['type'] . ': ' . $e['message']
              . ' in ' . $e['file'] . ' on line ' . $e['line'] . PHP_EOL;
        error_log($line, 3, $_logFile);
        if (ob_get_level() > 0) ob_end_clean();
    }
});

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
