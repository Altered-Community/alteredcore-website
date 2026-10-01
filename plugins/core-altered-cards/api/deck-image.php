<?php
// GET /papi/core-altered-cards/deck-image?id={deck}&lang={lang}&v={version} — decklist image of a public deck's
// link preview (og:image, includes/deck-preview/preview.php), drawn by includes/deck-preview/image.php. `v` changes with each edit of the deck
// so that Discord and browsers fetch the new image; the drawn image is cached per deck version, and a cached
// version is served without asking the decks API.
//
// Re:Builder's « Copier en image » also asks for the signed-in user's private decks: fetched with the session's token
// (as Re:Builder's meta.php), drawn for that request only, never cached.
require_once dirname(__DIR__) . '/includes/deck-preview/image.php';

function deckImageSend(string $file, string $cacheControl): void {
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: ' . $cacheControl);
    readfile($file);
}

function deckImageFail(int $code, string $message): void {
    http_response_code($code);
    header('Content-Type: text/plain; charset=UTF-8');
    if ($code === 503) header('Retry-After: 60');
    echo $message;
    exit;
}

$id      = (string)($_GET['id'] ?? '');
$lang    = deckPreviewLang($_GET['lang'] ?? '');
$version = preg_match('#^[0-9a-f]{10}$#', (string)($_GET['v'] ?? '')) ? (string)$_GET['v'] : null;
if (!deckPreviewValidId($id)) deckImageFail(404, 'Deck not found');

$siteUrl = deckImageSiteUrl();
$cached  = $version !== null ? deckImageCachePath($id, $lang, $version, $siteUrl) : null;
if ($cached !== null && is_file($cached)) {
    deckImageSend($cached, 'public, max-age=604800');
    exit;
}

$token = null;
if (kcIsLoggedIn() && defined('KC_URL') && KC_URL !== '' && function_exists('kc_get_access_token')) {
    $token = kc_get_access_token((int)($_SESSION['user_id'] ?? 0)) ?: null;
}
// Drawing takes seconds: the session's lock would hold the user's other requests.
if (session_status() === PHP_SESSION_ACTIVE) session_write_close();

$deck = deckPreviewFetch($id, $lang, $token, 4, $status);
if ($deck === null) {
    in_array($status, [401, 403, 404], true) ? deckImageFail(404, 'Deck not found') : deckImageFail(503, 'Deck API unavailable');
}
$public = !empty($deck['isPublic']);
if (!$public && $token === null) deckImageFail(404, 'Deck not found');

$image = function_exists('imagecreatetruecolor') ? deckImageFile($deck, $lang, $siteUrl, $public) : null;
if ($image === null) deckImageFail(500, 'Image unavailable');
deckImageSend($image['file'], !$public ? 'private, no-store' : ($version !== null && !$image['temporary'] ? 'public, max-age=604800' : 'public, max-age=300'));
if ($image['temporary']) @unlink($image['file']);
