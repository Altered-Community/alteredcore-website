<?php
// GET /papi/core-altered-cards/deck-oembed?id={deck}&lang={lang} — oEmbed of a public deck's page, linked from
// its <head> (includes/deck-preview/preview.php). Discord shows `author_name` above the embed's title and
// `provider_name` above it.
require_once dirname(__DIR__) . '/includes/deck-preview/preview.php';

header('Content-Type: application/json; charset=UTF-8');

$id   = (string)($_GET['id'] ?? '');
$lang = deckPreviewLang($_GET['lang'] ?? '');
$deck = deckPreviewFetch($id, $lang);
if ($deck === null || empty($deck['isPublic'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Deck not found']);
    exit;
}

$host = request_scheme() . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$out  = [
    'version'       => '1.0',
    'type'          => 'link',
    'title'         => trim((string)($deck['name'] ?? '')),
    'provider_name' => getSiteName(),
    'provider_url'  => $host . BASE_URL . '/',
];
$byLine = deckPreviewByLine($deck, $lang);
if ($byLine !== null) $out['author_name'] = $byLine;

header('Cache-Control: public, max-age=3600');
echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
