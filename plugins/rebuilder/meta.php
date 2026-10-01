<?php
// Manifest `meta` of the Re:Builder page, included by pages/_router.php before the header with $slug and $subPath in
// scope.
// The plugin's own page (/pages/rebuilder/…): its former links go to the site's URLs, which open Re:Builder or the
// site's page depending on « Beta Deckbuilder » (same mapping as app/src/app/embed/legacy-url.serializer.ts).
if ($slug === 'rebuilder') {
    $query = $_GET;
    $id    = (string)($query['id'] ?? '');
    unset($query['id']);
    if ($subPath === '' && $id !== '')        [$page, $params] = ['deckbuilder', ['id' => $id]];
    elseif ($subPath === 'deck' && $id !== '') [$page, $params] = ['deck', ['id' => $id]];
    elseif ($subPath === 'decks/new')          [$page, $params] = ['deckbuilder', []];
    elseif (preg_match('#^decks/([^/]+)(?:/(deck|description|main|cartes))?$#', $subPath, $m)) {
        [$page, $params] = ['deck', ['id' => $m[1]] + (isset($m[2]) && $m[2] !== 'cartes' ? ['tab' => $m[2]] : [])];
    } elseif (preg_match('#^decks/([^/]+)/edit(?:/(apercu|deck|main))?$#', $subPath, $m)) {
        [$page, $params] = ['deckbuilder', ['id' => $m[1]] + (isset($m[2]) ? ['view' => $m[2]] : [])];
    } else [$page, $params] = ['decks', []];
    $qs = http_build_query($params + $query);
    redirect(BASE_URL . '/pages/' . $page . ($qs !== '' ? '?' . $qs : ''));
}

// Title and link preview of a deck (`deck?id=`, `deckbuilder?id=`), the same as the site's deck page's
// (includes/deck-preview.php). A guest deck, an unknown deck or an unreachable API keep the page's default title.
require_once dirname(__DIR__, 2) . '/includes/deck-preview.php';
$id = in_array($slug, ['deck', 'deckbuilder'], true) ? (string)($_GET['id'] ?? '') : '';
if (!deckPreviewValidId($id)) return;

// The owner's private deck needs the session's token (the relay's, kc_get_access_token refreshes it).
$token = null;
if (kcIsLoggedIn() && defined('KC_URL') && KC_URL !== '' && function_exists('kc_get_access_token')) {
    $token = kc_get_access_token((int)($_SESSION['user_id'] ?? 0)) ?: null;
}
$deck = deckPreviewFetch($id, getLang(), $token);
if ($deck === null || trim((string)($deck['name'] ?? '')) === '') return;

$meta = deckPreviewMeta($deck, getLang());
$pageTitle = $meta['title'];
if ($meta['image'] !== null) {
    ['description' => $pageDescription, 'image' => $pageImage, 'themeColor' => $pageThemeColor, 'oembed' => $pageOembedUrl] = $meta;
    $pageOgTitle = $meta['title'];
}
