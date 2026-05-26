<?php
// core header — all logic lives here, themes only provide nav.php
require_once __DIR__ . '/functions.php';
initLang();
checkMaintenance();
trackPageView();
$lang        = getLang();
$currentPage = basename($_SERVER['PHP_SELF'], '.php');

require_once __DIR__ . '/core-pages.php';

// Pages marked public:false are always blocked, regardless of nav or DB visibility
if (isset($__corePages[$currentPage]) && !$__corePages[$currentPage]['public']) {
    http_response_code(404);
    include __DIR__ . '/../pages/404.php';
    exit;
}

// Block access to pages marked as hidden in the pages table (admin controls this via is_visible)
// Core pages are managed by core-pages.php, not the DB — skip this check for them
if ((empty($_SESSION['admin_logged_in']) || saIsPreviewingGroup()) && !($GLOBALS['_ac_is_plugin_page'] ?? false) && !isset($__corePages[$currentPage])) {
    try {
        $__pagesVisStmt = getDB()->prepare(q("SELECT is_visible FROM {pages} WHERE slug = :slug LIMIT 1"));
        $__pagesVisStmt->execute([':slug' => $currentPage]);
        $__pagesVisRow = $__pagesVisStmt->fetch(PDO::FETCH_ASSOC);
        if ($__pagesVisRow !== false && (int)$__pagesVisRow['is_visible'] === 0) {
            header('Location: ' . BASE_URL . '/');
            exit;
        }
    } catch (Exception $_hpv) { /* ignore if table doesn't exist yet */ }
}

// Block access to pages not in nav_items (unless public core page, plugin page, or visible admin-managed page)
if ((empty($_SESSION['admin_logged_in']) || saIsPreviewingGroup()) && !($GLOBALS['_ac_is_plugin_page'] ?? false) && !(isset($__corePages[$currentPage]) && $__corePages[$currentPage]['public'])) {
    try {
        // Pages managed via admin with is_visible=1 are accessible without a nav item
        $__pageAllowed = isset($__pagesVisRow) && $__pagesVisRow !== false && (int)$__pagesVisRow['is_visible'] === 1;

        if (!$__pageAllowed) {
            $__navAccessRows    = getDB()->query(q("SELECT id, url, is_visible, is_iframe FROM {nav_items}"))->fetchAll(PDO::FETCH_ASSOC);
            $__iframeNavIdEarly = ($currentPage === 'iframe') ? (int)($_GET['nav'] ?? 0) : 0;
            foreach ($__navAccessRows as $__nr) {
                if ((int)$__nr['is_visible'] !== 1) continue;
                if (!empty($__nr['is_iframe'])) {
                    if ($currentPage === 'iframe' && $__iframeNavIdEarly === (int)$__nr['id']) {
                        $__pageAllowed = true; break;
                    }
                } else {
                    if ($currentPage === basename(parse_url($__nr['url'], PHP_URL_PATH) ?: '', '.php')) {
                        $__pageAllowed = true; break;
                    }
                }
            }
        }

        if (!$__pageAllowed) {
            http_response_code(404);
            header('Location: ' . BASE_URL . '/pages/404');
            exit;
        }
    } catch (Exception $_hpe) { /* ignore */ }
}

// variables available to nav.php and footer.php
// Language switcher data
$_langFlags = ['en' => '<span class="fi fi-gb"></span>', 'fr' => '<span class="fi fi-fr"></span>', 'es' => '<span class="fi fi-es"></span>', 'it' => '<span class="fi fi-it"></span>', 'de' => '<span class="fi fi-de"></span>'];
$_langNames = ['en' => 'English', 'fr' => 'Français', 'es' => 'Español', 'it' => 'Italiano', 'de' => 'Deutsch'];
$_langUrls  = [];
foreach (['en', 'fr', 'es', 'it', 'de'] as $_l) {
    $_p = $_GET;
    $_p['lang'] = $_l;
    $_langUrls[$_l] = '?' . http_build_query($_p);
}

// UI translations for nav elements (user menu, theme toggle labels)
$_hTxt = [
    'en' => [
        'dark_mode'  => 'Dark mode',
        'light_mode' => 'Light mode',
        'my_account' => 'My account',
        'sign_out'   => 'Sign out',
        'sign_in'    => 'Sign in',
    ],
    'fr' => [
        'dark_mode'  => 'Mode sombre',
        'light_mode' => 'Mode clair',
        'my_account' => 'Mon compte',
        'sign_out'   => 'Déconnexion',
        'sign_in'    => 'Connexion',
    ],
][getUiLang()];

// Nav items (loaded once here, available in nav.php via $__navItems)
$__navItems    = getNavItems();
$__mobileCompact = defined('MOBILE_HEADER_MODE') && MOBILE_HEADER_MODE === 1;
?>
<!DOCTYPE html>
<html lang="<?= h($lang) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5">
    <?php
    // SEO / OG — $pageTitle, $pageDescription, $pageImage, $pageRobots, $pageKeywords
    // may be set by the including page before requiring header.php
    $_metaLang    = getLang();
    $_metaTitle   = isset($pageTitle) ? $pageTitle . ' — ' . getSiteName() : getSiteName();
    $_descKey     = 'meta_description_' . $_metaLang;
    $_defaultDesc = $_metaLang === 'fr' ? SITE_DESCRIPTION_FR : SITE_DESCRIPTION_EN;
    $_metaDesc    = isset($pageDescription) && $pageDescription !== ''
                     ? $pageDescription
                     : (getSetting($_descKey) ?: $_defaultDesc);
    $_twHandle    = getSetting('twitter_handle') ?: '';
    $_metaAuthor  = getSetting('meta_author') ?: '';
    $_metaKw      = isset($pageKeywords) && $pageKeywords !== ''
                     ? $pageKeywords
                     : (getSetting('meta_keywords') ?: '');
    $_robots      = isset($pageRobots) && $pageRobots !== '' ? $pageRobots : 'index, follow';
    $_themeColor  = getSetting('theme_color') ?: '#C49A2A';

    // Canonical + hreflang: strip lang param from canonical, add per-language alternates
    $_scheme      = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
    $_host        = $_scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $_path        = strtok($_SERVER['REQUEST_URI'] ?? '/', '?');
    $_qp          = $_GET;
    unset($_qp['lang']);
    $_canonicalUrl = $_host . $_path . (empty($_qp) ? '' : '?' . http_build_query($_qp));
    $_sep          = empty($_qp) ? '?' : '&';
    $_ogUrl        = $_host . ($_SERVER['REQUEST_URI'] ?? '/');

    // OG image: pageImage → og_image setting → site icon fallback; always absolute
    // (Discord and other scrapers reject relative URLs)
    $_ogRaw   = isset($pageImage) && $pageImage !== ''
                 ? $pageImage
                 : (getSetting('og_image') ? BASE_URL . '/' . ltrim(getSetting('og_image'), '/') : '');
    $_ogImage = $_ogRaw !== ''
                 ? (strpos($_ogRaw, '//') !== false ? $_ogRaw : $_host . $_ogRaw)
                 : $_host . BASE_URL . '/assets/favicon/web-app-manifest-512x512.png';
    ?>
    <title><?= h($_metaTitle) ?></title>
    <meta name="description" content="<?= h($_metaDesc) ?>">
    <meta name="robots"      content="<?= h($_robots) ?>">
    <?php if ($_metaKw !== ''): ?>
    <meta name="keywords"    content="<?= h($_metaKw) ?>">
    <?php endif; ?>
    <?php if ($_metaAuthor !== ''): ?>
    <meta name="author"      content="<?= h($_metaAuthor) ?>">
    <?php endif; ?>

    <!-- Canonical + hreflang -->
    <link rel="canonical"  href="<?= h($_canonicalUrl) ?>">
    <link rel="alternate"  hreflang="x-default" href="<?= h($_canonicalUrl) ?>">
    <link rel="alternate"  hreflang="en"         href="<?= h($_canonicalUrl . $_sep . 'lang=en') ?>">
    <link rel="alternate"  hreflang="fr"         href="<?= h($_canonicalUrl . $_sep . 'lang=fr') ?>">

    <!-- Open Graph -->
    <meta property="og:type"        content="<?= isset($pageTitle) ? 'article' : 'website' ?>">
    <meta property="og:site_name"   content="<?= h(getSiteName()) ?>">
    <meta property="og:title"       content="<?= h($_metaTitle) ?>">
    <meta property="og:description" content="<?= h($_metaDesc) ?>">
    <meta property="og:url"         content="<?= h($_ogUrl) ?>">
    <meta property="og:locale"      content="<?= $_metaLang === 'fr' ? 'fr_FR' : 'en_US' ?>">
    <?php if ($_ogImage): ?>
    <meta property="og:image"       content="<?= h($_ogImage) ?>">
    <?php endif; ?>

    <!-- Twitter Card -->
    <meta name="twitter:card"        content="<?= $_ogImage ? 'summary_large_image' : 'summary' ?>">
    <meta name="twitter:title"       content="<?= h($_metaTitle) ?>">
    <meta name="twitter:description" content="<?= h($_metaDesc) ?>">
    <?php if ($_ogImage): ?>
    <meta name="twitter:image"       content="<?= h($_ogImage) ?>">
    <?php endif; ?>
    <?php if ($_twHandle): ?>
    <meta name="twitter:site"        content="<?= h($_twHandle) ?>">
    <?php endif; ?>

    <!-- Favicons — place files in /assets/favicon/ -->
    <link rel="apple-touch-icon" sizes="180x180" href="<?= BASE_URL ?>/assets/favicon/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="<?= BASE_URL ?>/assets/favicon/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="<?= BASE_URL ?>/assets/favicon/favicon-16x16.png">
    <link rel="manifest"      href="<?= BASE_URL ?>/assets/favicon/manifest.php">
    <link rel="shortcut icon" href="<?= BASE_URL ?>/assets/favicon/favicon.ico">
    <meta name="apple-mobile-web-app-title"            content="<?= h(getSiteName()) ?>">
    <meta name="apple-mobile-web-app-capable"          content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="mobile-web-app-capable"                content="yes">
    <meta name="application-name"                      content="<?= h(getSiteName()) ?>">
    <meta name="msapplication-TileColor"               content="<?= h($_themeColor) ?>">
    <meta name="theme-color"                           content="<?= h($_themeColor) ?>">

    <!-- Apply saved theme before CSS loads to prevent flash of wrong theme -->
    <?php if (isset($pageForceTheme) && $pageForceTheme === 'dark'): ?>
    <script>document.documentElement.setAttribute('data-theme','dark');</script>
    <?php elseif (isset($pageForceTheme) && $pageForceTheme === 'light'): ?>
    <script>document.documentElement.removeAttribute('data-theme');</script>
    <?php else: ?>
    <script>(function(){var p=new URLSearchParams(location.search),u=p.get('theme'),t=u||localStorage.getItem('acTheme');if(u){try{localStorage.setItem('acTheme',u);}catch(e){}p.delete('theme');var qs=p.toString();history.replaceState(null,'',location.pathname+(qs?'?'+qs:'')+location.hash);}if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}());</script>
    <?php endif; ?>

    <!-- Preconnect hints: start DNS+TCP+TLS handshakes before the browser hits the link elements -->
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
    <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
    <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
    <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">

    <!-- Core libraries (always loaded) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/css/flag-icons.min.css">
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/font/alteredicons.css">

    <!-- Global site CSS -->
    <link rel="stylesheet" href="<?= BASE_URL ?>/css/style.css?v=<?= filemtime(dirname(__DIR__) . '/css/style.css') ?>">

    <!-- Active theme stylesheet (theme-specific overrides only) -->
    <link rel="stylesheet" href="<?= themeUrl('style.css') ?>?v=<?= filemtime(themeFile('style.css')) ?>">

    <?php
    // Background color / image from admin settings
    $_bgColor = getSetting('bg_color');
    // Only allow CSS hex colors — reject anything else to prevent CSS injection
    if (!preg_match('/^#[0-9a-fA-F]{3,8}$/', $_bgColor)) $_bgColor = '';
    $_bgImage = getSetting('bg_image');
    $_hasBg   = ($_bgColor !== '' || $_bgImage !== '');
    if ($_hasBg):
        $_bgCss  = 'body{';
        if ($_bgColor !== '') $_bgCss .= 'background-color:' . $_bgColor . ';';
        if ($_bgImage !== '') {
            $_bgMode = getSetting('bg_image_mode') ?: 'cover';
            $_bgCss .= 'background-image:url("' . addslashes(BASE_URL . '/' . $_bgImage) . '");';
            if ($_bgMode === 'repeat') {
                $_bgCss .= 'background-size:auto;background-repeat:repeat;background-attachment:scroll;';
            } else {
                $_bgCss .= 'background-size:cover;background-position:center top;background-repeat:no-repeat;background-attachment:fixed;';
            }
        }
        $_bgCss .= '}';
        // Fixed attachment causes resize/jump on iOS/Android — disable on mobile
        if ($_bgImage !== '' && (getSetting('bg_image_mode') ?: 'cover') === 'cover') {
            $_bgCss .= '@media(max-width:767.98px){body{background-attachment:scroll;}}';
        }
        // body.has-bg prefix gives higher specificity than .site-header alone in style.css
        $_bgCss .= 'body.has-bg .site-header{background:transparent;}';
        $_bgCss .= 'body.has-bg .site-footer{background:rgba(250,245,232,0.80);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}';
    ?>
    <style><?= $_bgCss ?></style>
    <?php endif; ?>

    <?php
    // Custom fonts from admin settings.
    // Selectors use class names common to all themes (.site-header, .site-footer, etc.).
    // Themes may override per-element font targeting via head-extra.php.
    $_fontSlots = [
        'font_body'      => 'body',
        'font_titles'    => 'h1, h2, h3, h4, h5, h6, .section-title span',
        'font_nav'       => '.site-header',
        'font_user_menu' => '.site-header .dropdown-menu',
        'font_footer'    => '.site-footer',
    ];
    $_fontCss = '';
    foreach ($_fontSlots as $_fKey => $_fSel) {
        $_fFile = getSetting($_fKey);
        if (!$_fFile) continue;
        $_fFamily = 'SiteFont_' . $_fKey;
        $_fUrl    = BASE_URL . '/assets/font/' . $_fFile;
        $_fFmt    = fontCssFormat($_fFile);
        // addslashes() not h(): inside a CSS <style> block, HTML entities break url() syntax
        $_fontCss .= "@font-face{font-family:'{$_fFamily}';src:url('" . addslashes($_fUrl) . "')format('{$_fFmt}');font-display:swap;}";
        $_fontCss .= "{$_fSel}{font-family:'{$_fFamily}',sans-serif;}";
    }
    if ($_fontCss): ?>
    <style><?= $_fontCss ?></style>
    <?php endif; ?>

    <?php if (isset($pageBodyBg) && preg_match('/^#[0-9a-fA-F]{3,8}$/', $pageBodyBg)): ?>
    <style>body{background:<?= $pageBodyBg ?> !important;background-image:none !important;}</style>
    <?php endif; ?>

    <!-- Plugin CSS (injected by the router for active plugin pages) -->
    <?php foreach ($GLOBALS['_ac_plugin_css'] ?? [] as $_pcss): ?>
    <link rel="stylesheet" href="<?= h($_pcss) ?>">
    <?php endforeach; ?>

    <?php
    // Optional theme hook: themes/active-theme/head-extra.php
    // Use it to inject theme-specific <link>, <style> or <script> tags into <head>.
    // Typical uses: custom font selectors, navbar-width overrides, third-party libraries.
    $_headExtra = themeFile('head-extra.php');
    if (file_exists($_headExtra)) require $_headExtra;
    ?>
</head>
<?php
// Detect full-width flag from active nav item or $pageFullwidth set by the page
$__isCurrent    = basename($_SERVER['PHP_SELF'], '.php');
$__iframeNavId  = ($__isCurrent === 'iframe') ? (int)($_GET['nav'] ?? 0) : 0;
$_pageFullwidth = isset($pageFullwidth) && $pageFullwidth;
if (!$_pageFullwidth) {
    foreach ($__navItems as $__fni) {
        $__match = !empty($__fni['is_iframe'])
            ? ($__iframeNavId === (int)$__fni['id'])
            : ($__isCurrent === basename(parse_url($__fni['url'], PHP_URL_PATH) ?: '', '.php'));
        if ($__match && !empty($__fni['is_fullwidth'])) { $_pageFullwidth = true; break; }
        foreach ($__fni['children'] as $__fnc) {
            $__match = !empty($__fnc['is_iframe'])
                ? ($__iframeNavId === (int)$__fnc['id'])
                : ($__isCurrent === basename(parse_url($__fnc['url'], PHP_URL_PATH) ?: '', '.php'));
            if ($__match && !empty($__fnc['is_fullwidth'])) { $_pageFullwidth = true; break 2; }
        }
    }
}
$__bodyClass = array_filter([
    'has-bg'         => $_hasBg,
    'page-fullwidth' => $_pageFullwidth,
]);
// Themes may add body classes via $__extraBodyClasses (set in head-extra.php)
if (!empty($__extraBodyClasses) && is_array($__extraBodyClasses)) {
    foreach ($__extraBodyClasses as $_bc) $__bodyClass[$_bc] = true;
}
?>
<body<?= $__bodyClass ? ' class="' . implode(' ', array_keys($__bodyClass)) . '"' : '' ?>>

<div class="site-wrapper">

<?php
// Theme navigation: the visible <header> and <main> opening tag.
// Available variables: $lang, $currentPage, $__navItems, $__iframeNavId,
// $_langFlags, $_langNames, $_langUrls, $_hTxt, $__mobileCompact, $_hasBg, $_pageFullwidth
require themeFile('nav.php');
$__flash = getFlash();
if ($__flash): ?>
<div class="container pt-3">
  <div class="alert alert-<?= $__flash['type'] === 'error' ? 'danger' : 'success' ?> alert-dismissible fade show" role="alert">
    <?= h($__flash['msg']) ?>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>
</div>
<?php endif;
