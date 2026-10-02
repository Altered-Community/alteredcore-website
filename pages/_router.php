<?php
// Central page router — handles both core pages and plugin pages.

// Load config first (it sets up the error_log destination — see ERROR_LOG_TARGET
// in config.local.php) before anything else runs, and register the shutdown
// handler right away, so fatals swallowed by ob_start() are still caught even if
// they happen while requiring functions.php below.
require_once dirname(__DIR__) . '/config.php';
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) {
        $line = date('[Y-m-d H:i:s]') . ' FATAL ' . $e['type'] . ': ' . $e['message']
              . ' in ' . $e['file'] . ' on line ' . $e['line'];
        error_log($line);
        if (ob_get_level() > 0) ob_end_clean();
    }
});

require_once dirname(__DIR__) . '/includes/functions.php';

// /pages/{slug} or, for SPA plugin pages only, /pages/{slug}/{sub/path} (client-side routes).
$_path    = (string)parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
$_slug    = '';
$_subPath = '';
if (preg_match('#/pages/([a-z0-9_-]+)(?:/(.*))?$#', $_path, $_m)) {
    $_slug    = $_m[1];
    $_subPath = trim($_m[2] ?? '', '/');
}

if ($_slug === '') {
    include __DIR__ . '/404.php';
    exit;
}

// Spoof PHP_SELF so included pages behave as if served directly
$_SERVER['PHP_SELF'] = '/pages/' . $_slug . '.php';

// Core page
$_corePath = __DIR__ . '/' . $_slug . '.php';
if ($_subPath === '' && file_exists($_corePath)) {
    include $_corePath;
    exit;
}

// Plugin page
initPlugins();
// Visibility setting (set in Admin → Pages)
$_hiddenPluginSlugs = json_decode(getSetting('plugin_pages_hidden', '[]'), true);
if (!is_array($_hiddenPluginSlugs)) $_hiddenPluginSlugs = [];
// Beta mode (« Beta Deckbuilder »): a plugin's SPA page takes over the slugs of its manifest `beta_slugs`, at the
// same URLs, unless it is hidden itself. The page it replaces keeps answering its own calls (?ajax=…, form posts).
$_pluginPage = null;
if ($_subPath === '' && betaModeOn() && in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true) && !isset($_GET['ajax'])) {
    $_pluginPage = pluginFindBetaPage($_slug);
    if ($_pluginPage !== null && in_array($_pluginPage['own_slug'], $_hiddenPluginSlugs, true)) $_pluginPage = null;
}
$_pluginPage = $_pluginPage ?? pluginFindPage($_slug);
if ($_pluginPage !== null && $_subPath !== '' && $_pluginPage['type'] !== 'spa') {
    $_pluginPage = null; // deep paths exist only for client-routed pages
}
if ($_pluginPage !== null) {
    if (in_array($_slug, $_hiddenPluginSlugs, true)) {
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
    if ($_pluginPage['type'] === 'spa') {
        $_pluginPage['sub_path'] = $_subPath;
        $pageFullwidth = $_pluginPage['fullwidth'];
        // Manifest `meta`: title and link preview of the client route ($slug, $subPath), set before the header
        // (variables of includes/header.php).
        if (!empty($_pluginPage['meta_file'])) {
            (function (string $slug, string $subPath) use (&$pageTitle, &$pageDescription, &$pageImage, &$pageOgTitle, &$pageThemeColor, &$pageOembedUrl, $_pluginPage) {
                include $_pluginPage['meta_file'];
            })($_slug, (string)$_subPath);
        }
        spaRenderPage($_pluginPage);
    } else {
        include $_pluginPage['abs_file'];
    }
    $_pluginOutput = ob_get_clean();

    require_once dirname(__DIR__) . '/includes/header.php';
    unset($GLOBALS['_ac_current_plugin_prefix'], $GLOBALS['_ac_is_plugin_page']);
    echo $_pluginOutput;
    require_once dirname(__DIR__) . '/includes/footer.php';
    exit;
}

// Not found
include __DIR__ . '/404.php';
