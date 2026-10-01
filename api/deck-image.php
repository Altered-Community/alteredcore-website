<?php
// GET /api/deck-image?id={deck}&lang={lang}&v={version} — decklist image of a public deck's link preview
// (og:image, includes/deck-preview.php), drawn by includes/deck-image.php. `v` changes with each edit of the deck
// so that Discord and browsers fetch the new image; the drawn image is cached per deck version, and a cached
// version is served without asking the decks API.
require_once dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/includes/functions.php';
require_once dirname(__DIR__) . '/includes/deck-image.php';

function deckImageSend(string $file, bool $versioned): void {
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($file));
    header('Cache-Control: public, max-age=' . ($versioned ? 604800 : 300));
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
    deckImageSend($cached, true);
    exit;
}

$deck = deckPreviewFetch($id, $lang, null, 4, $status);
if ($deck === null) {
    in_array($status, [401, 403, 404], true) ? deckImageFail(404, 'Deck not found') : deckImageFail(503, 'Deck API unavailable');
}
if (empty($deck['isPublic'])) deckImageFail(404, 'Deck not found');

$image = function_exists('imagecreatetruecolor') ? deckImageFile($deck, $lang, $siteUrl) : null;
if ($image === null) deckImageFail(500, 'Image unavailable');
deckImageSend($image['file'], $version !== null && !$image['temporary']);
if ($image['temporary']) @unlink($image['file']);
