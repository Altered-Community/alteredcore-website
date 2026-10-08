<?php
// SPA plugin pages: the build manifest's `preload` (includes/spa.php) and what a page requests up front.
if (!defined('BASE_URL')) define('BASE_URL', '');
if (!function_exists('getUiLang')) {
    function getUiLang(): string { return $GLOBALS['__test_ui_lang'] ?? 'fr'; }
}
require_once __DIR__ . '/../includes/spa.php';

$dir = sys_get_temp_dir() . '/ac-spa-preload-' . getmypid();
@mkdir($dir . '/dist', 0777, true);
$writeManifest = function (array $m) use ($dir) {
    file_put_contents($dir . '/dist/embed-manifest.json', json_encode($m));
};
$plugin = ['id' => 'demo', '_dir' => $dir];
$page = ['slug' => 'demo', 'type' => 'spa', 'entry' => 'dist/embed-manifest.json'];
$assets = '/plugins/demo/dist/browser/';

$writeManifest([
    'version' => 1, 'base' => 'browser/', 'js' => ['polyfills-A.js', 'main-B.js'], 'css' => ['embed.css?v=1'],
    'documentCss' => ['document.css?v=2'],
    'preload' => [
        '*' => ['chunk-boot.js', 'chunk-shared.js'],
        'deck' => ['chunk-shared.js', 'chunk-deck.js'],
        'decks' => ['chunk-decks.js'],
        'lang:en' => ['chunk-en.js'],
        'bad' => ['../escape.js', '/abs.js', 'style.css', 42],
    ],
]);

// A beta page keeps the slug it is served at (pluginFindBetaPage()).
$deck = ['slug' => 'deck'] + spaResolvePage($plugin, $page);
$GLOBALS['__test_ui_lang'] = 'fr';
assertSame([
    ['href' => $assets . 'polyfills-A.js', 'as' => 'module'],
    ['href' => $assets . 'main-B.js', 'as' => 'module'],
    ['href' => $assets . 'chunk-boot.js', 'as' => 'module'],
    ['href' => $assets . 'chunk-shared.js', 'as' => 'module'],
    ['href' => $assets . 'chunk-deck.js', 'as' => 'module'],
    ['href' => $assets . 'embed.css?v=1', 'as' => 'style'],
], spaPreloads($deck), 'deck page, French: entry modules, "*" and its slug\'s modules once each, then the shadow root CSS');

$GLOBALS['__test_ui_lang'] = 'en';
$hrefs = array_column(spaPreloads($deck), 'href');
assertSame(true, in_array($assets . 'chunk-en.js', $hrefs, true), 'English: the translations module');
assertSame(true, !in_array($assets . 'chunk-decks.js', $hrefs, true), 'another slug\'s modules are left out');

$bad = spaResolvePage($plugin, $page)['spa']['preload']['bad'] ?? [];
assertSame([], $bad, 'paths outside the build, absolute paths and non-modules are dropped');

assertSame('ac-spa-demo', spaMountId($deck), 'mount point id, named by the header\'s render-blocking <link rel="expect">');

// Light DOM: the plugin's CSS is not loaded by the runtime, no style preload.
$light = ['slug' => 'demo'] + spaResolvePage($plugin, ['mount' => 'light'] + $page);
assertSame([], array_values(array_filter(spaPreloads($light), fn($p) => $p['as'] === 'style')), 'light mount: no style preload');

// A manifest without `preload` (older builds) still renders: entry modules only.
$writeManifest(['version' => 1, 'js' => ['main.js'], 'css' => [], 'documentCss' => []]);
$plain = ['slug' => 'demo'] + spaResolvePage($plugin, $page);
assertSame([['href' => '/plugins/demo/dist/main.js', 'as' => 'module']], spaPreloads($plain), 'no preload key: entry modules only');

// A page that cannot render announces nothing.
@unlink($dir . '/dist/embed-manifest.json');
$broken = ['slug' => 'demo'] + spaResolvePage($plugin, $page);
assertSame([], spaPreloads($broken), 'missing build: no preload');
assertSame(null, spaMountId($broken), 'missing build: no mount point, nothing to wait for before the first paint');

@rmdir($dir . '/dist');
@rmdir($dir);
