<?php
// SPA plugin pages (plugin manifest v2) — loaded by functions.php.
//
// A page declared `"type": "spa"` ships a front-end that was built beforehand (CI or
// `npm run build`). The shell renders its own header/footer, publishes the host contract
// (window.AlteredCore, see js/altered-core-host.js) and mounts the bundle in a Shadow DOM
// so Bootstrap and css/style.css do not leak into it. Every URL under /pages/{slug}/… is
// served by the same page, so the plugin can use client-side routing with deep links.
//
// The page's `entry` points at a build manifest written by the plugin's build:
//   {
//     "version": 1,
//     "base": "browser/",            directory of the files below, relative to the manifest
//     "js": ["main-HASH.js"],        ES modules, loaded in order
//     "css": ["embed-HASH.css"],     loaded inside the shadow root
//     "documentCss": ["doc-HASH.css"] loaded in <head> (@font-face does not work in a shadow root)
//   }

const SPA_HOST_CONTRACT_VERSION = 1;

/** Joins a plugin-relative path and rejects anything that escapes the plugin directory. */
function spaSafeRelPath(string $path): ?string {
    $path = str_replace('\\', '/', $path);
    if ($path === '' || $path[0] === '/' || strpos($path, '..') !== false || strpos($path, "\0") !== false) return null;
    return $path;
}

/** Reads and validates a build manifest. Returns null (and sets $error) when unusable. */
function spaReadBuildManifest(string $pluginDir, string $entry, ?string &$error = null): ?array {
    $rel = spaSafeRelPath($entry);
    if ($rel === null) { $error = 'invalid entry path'; return null; }
    $file = $pluginDir . '/' . $rel;
    if (!is_file($file)) { $error = "build manifest not found ({$rel}) — build the plugin first"; return null; }
    $m = json_decode((string)file_get_contents($file), true);
    if (!is_array($m) || empty($m['js']) || !is_array($m['js'])) { $error = "invalid build manifest ({$rel})"; return null; }

    $base = trim(str_replace('\\', '/', (string)($m['base'] ?? '')), '/');
    $dir  = trim(dirname($rel), '/.');
    $baseRel = trim(($dir !== '' ? $dir . '/' : '') . ($base !== '' ? $base . '/' : ''), '/');
    if ($baseRel !== '' && spaSafeRelPath($baseRel) === null) { $error = 'invalid base path'; return null; }

    $files = [];
    foreach (['js', 'css', 'documentCss'] as $key) {
        $files[$key] = [];
        foreach ((array)($m[$key] ?? []) as $f) {
            $f = is_string($f) ? spaSafeRelPath($f) : null;
            if ($f === null) { $error = "invalid file in build manifest ({$key})"; return null; }
            $files[$key][] = $f;
        }
    }
    return ['base' => $baseRel, 'files' => $files];
}

/**
 * pluginFindPage() result for a `type: spa` page. Always returns an entry for a declared page:
 * a missing build shows an explanatory error in the shell instead of a 404.
 */
function spaResolvePage(array $plugin, array $page): array {
    $id    = $plugin['id'];
    $slug  = $page['slug'];
    $error = null;
    $build = !empty($page['entry']) ? spaReadBuildManifest($plugin['_dir'], (string)$page['entry'], $error) : null;
    if (empty($page['entry'])) $error = 'missing "entry" in plugin.json';

    $spa = ['mount' => ($page['mount'] ?? 'shadow') === 'light' ? 'light' : 'shadow', 'error' => $error,
            'assets_url' => '', 'js' => [], 'css' => [], 'document_css' => []];
    if ($build !== null) {
        $assets = BASE_URL . '/plugins/' . rawurlencode($id) . '/' . ($build['base'] !== '' ? $build['base'] . '/' : '');
        $spa['assets_url']   = $assets;
        $spa['js']           = array_map(fn($f) => $assets . $f, $build['files']['js']);
        $spa['css']          = array_map(fn($f) => $assets . $f, $build['files']['css']);
        $spa['document_css'] = array_map(fn($f) => $assets . $f, $build['files']['documentCss']);
    }

    return [
        'slug'          => $slug,
        'type'          => 'spa',
        'plugin_id'     => $id,
        'abs_file'      => null,
        'plugin_css'    => $spa['document_css'],
        'plugin_js'     => [],
        '_table_prefix' => $plugin['_table_prefix'] ?? '',
        'title_en'      => $page['title_en'] ?? '',
        'title_fr'      => $page['title_fr'] ?? '',
        'fullwidth'     => !array_key_exists('fullwidth', $page) || !empty($page['fullwidth']),
        'meta_file'     => spaMetaFile($plugin, $page),
        'placeholder_file' => spaPluginFile($plugin, $page['placeholder'] ?? null),
        // Base href of the client routes (pluginFindBetaPage(): /pages/, the routes being the slugs it takes over)
        'base_path'     => BASE_URL . '/pages/' . $slug . '/',
        'spa'           => $spa,
    ];
}

/**
 * Absolute path of the page's `meta` file (manifest), or null when absent or outside the plugin. The router includes it
 * before the header, so a client route can set its title and link preview ($pageTitle, $pageDescription, $pageImage).
 */
function spaMetaFile(array $plugin, array $page): ?string {
    return spaPluginFile($plugin, $page['meta'] ?? null);
}

/** Absolute path of a file named by the manifest, relative to the plugin; null when absent or outside the plugin. */
function spaPluginFile(array $plugin, $path): ?string {
    $rel = is_string($path) ? spaSafeRelPath($path) : null;
    if ($rel === null) return null;
    $abs = $plugin['_dir'] . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    return is_file($abs) ? $abs : null;
}

/**
 * Browser-reachable URL of a public service: `{NAME}_PUBLIC_URL` when set (the server may use
 * an internal host, e.g. a container name), else `{NAME}_URL`. spaPublicServiceUrl('CARDS_API').
 */
function spaPublicServiceUrl(string $name): string {
    foreach ([$name . '_PUBLIC_URL', $name . '_URL'] as $const) {
        if (defined($const) && (string)constant($const) !== '') return rtrim((string)constant($const), '/');
    }
    return '';
}

/**
 * Services relayed by /api/v1/services/{name}/… (api/v1/services/proxy.php): the ones that need
 * the user's Keycloak token. Server-side URLs, never sent to the browser.
 */
function spaProxyServices(): array {
    $out = [];
    foreach (['decks' => 'DECKS_API_URL', 'collection' => 'COLLECTION_API_URL', 'ownership' => 'OWNERSHIP_API_URL'] as $name => $const) {
        if (defined($const) && (string)constant($const) !== '') $out[$name] = rtrim((string)constant($const), '/');
    }
    return $out;
}

/** The data half of window.AlteredCore (the methods live in js/altered-core-host.js). */
function spaHostConfig(array $page): array {
    $kcMode   = defined('KC_URL') && KC_URL !== '';
    $loggedIn = kcIsLoggedIn();
    $user     = null;
    if ($loggedIn) {
        $u    = kcUser();
        $user = [
            'id'       => (int)($_SESSION['user_id'] ?? 0),
            'username' => (string)($u['username'] ?? ''),
            'sub'      => ($u['sub'] ?? '') !== '' ? $u['sub'] : null,
        ];
    }
    $basePath = $page['base_path'];
    $services = [
        'cards'   => spaPublicServiceUrl('CARDS_API'),
        'cdn'     => spaPublicServiceUrl('CDN'),
        'uniques' => spaPublicServiceUrl('UNIQUES_API'),
    ];
    foreach (array_keys(spaProxyServices()) as $name) $services[$name] = BASE_URL . '/api/v1/services/' . $name;

    return [
        'version'  => SPA_HOST_CONTRACT_VERSION,
        'baseUrl'  => BASE_URL,
        'siteName' => getSiteName(),
        'lang'     => getUiLang(),
        'user'     => $user,
        'csrf'     => csrfToken(),
        'auth'     => [
            'provider' => $kcMode ? 'keycloak' : 'local',
            'loginUrl' => $kcMode ? BASE_URL . '/auth/keycloak-login' : BASE_URL . '/pages/login',
        ],
        // Public services are called directly; authenticated ones through the same-origin relay,
        // which adds the session's token server-side (the browser never sees it).
        'services' => $services,
        'page'     => [
            'plugin'    => $page['plugin_id'],
            'slug'      => $page['slug'],
            'basePath'  => $basePath,
            'subPath'   => $page['sub_path'] ?? '',
            'assetsUrl' => $page['spa']['assets_url'],
            // The plugin's own PHP endpoints (manifest "api"): {apiUrl}{endpoint}.
            'apiUrl'    => BASE_URL . '/papi/' . $page['plugin_id'] . '/',
            'mount'     => $page['spa']['mount'],
            'css'       => $page['spa']['css'],
        ],
        // Design system stylesheets the runtime injects into the plugin's shadow root, before the
        // plugin's own CSS: base rules and ac-* components (tokens inherit from <html>).
        'designSystem' => [
            'css' => array_map('dsUrl', dsShadowStylesheets()),
        ],
    ];
}

/**
 * Manifest `placeholder`: what the page shows while its scripts load (a skeleton of the page), rendered by the server
 * inside the mount point with $slug (the requested page) and $subPath (client route) in scope, the query in $_GET. The
 * runtime keeps it until the plugin draws its first screen (js/altered-core-host.js). Without one, a generic skeleton.
 */
function spaRenderPlaceholder(array $page): void {
    $label = getUiLang() === 'fr' ? 'Chargement…' : 'Loading…';
    echo '<div class="ac-spa-placeholder" aria-busy="true"><span class="ac-sr-only" role="status">' . h($label) . '</span>';
    if (!empty($page['placeholder_file'])) {
        (function (string $slug, string $subPath) use ($page) {
            include $page['placeholder_file'];
        })($page['slug'], (string)($page['sub_path'] ?? ''));
    } else {
        echo '<div class="ac-stack" aria-hidden="true">'
            . '<span class="ac-skeleton ac-skeleton--title" style="--ac-skeleton-width: 30%"></span>'
            . '<span class="ac-skeleton ac-skeleton--text" style="--ac-skeleton-width: 60%"></span>'
            . '<span class="ac-skeleton ac-skeleton--panel" style="height: 50vh"></span>'
            . '</div>';
    }
    echo '</div>';
}

/** Body of an SPA page: mount point, host contract, runtime and plugin modules. */
function spaRenderPage(array $page): void {
    $spa   = $page['spa'];
    $lang  = getUiLang();
    $id    = $page['plugin_id'];
    if ($spa['error'] !== null) {
        $msg = $lang === 'fr' ? 'Cette page n’est pas disponible pour le moment.' : 'This page is not available right now.';
        echo '<div class="container py-5"><div class="alert alert-warning" role="alert">' . h($msg);
        if (!empty($_SESSION['admin_logged_in'])) echo '<br><small class="text-muted">' . h($id . ': ' . $spa['error']) . '</small>';
        echo '</div></div>';
        return;
    }
    $json = json_encode(spaHostConfig($page), JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $runtime = dirname(__DIR__) . '/js/altered-core-host.js';
    $noscript = $lang === 'fr' ? 'Cette page nécessite JavaScript.' : 'This page requires JavaScript.';
    ?>
<div class="ac-spa-page" data-ac-page="<?= h($page['slug']) ?>">
    <div class="ac-spa-host" id="ac-spa-<?= h($id) ?>" data-ac-plugin="<?= h($id) ?>" data-ac-mount="<?= h($spa['mount']) ?>"><?php spaRenderPlaceholder($page); ?></div>
    <noscript><div class="container py-5"><div class="alert alert-warning"><?= h($noscript) ?></div></div></noscript>
</div>
<script type="application/json" id="ac-host-config"><?= $json ?></script>
<script src="<?= h(BASE_URL) ?>/js/altered-core-host.js?v=<?= is_file($runtime) ? filemtime($runtime) : 0 ?>"></script>
<?php foreach ($spa['js'] as $src): ?>
<script type="module" src="<?= h($src) ?>" data-ac-plugin-module="<?= h($id) ?>"></script>
<?php endforeach;
}
