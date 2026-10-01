<?php
// GET /papi/rebuilder/community-builders?locale=en|fr
// The community deckbuilders of the site (admin › Community builders, table {community_builders}), for the banner of
// the decks list, as on the site's decks page (core-altered-cards pages/decks.php).
header('Content-Type: application/json; charset=UTF-8');

$lang = in_array($_GET['locale'] ?? '', ['en', 'fr'], true) ? $_GET['locale'] : (function_exists('getUiLang') ? getUiLang() : 'en');
$rows = getDB()->query(q(
    "SELECT title, desc_en, desc_fr, image, url
     FROM {community_builders}
     WHERE is_visible = 1 ORDER BY sort_order ASC, created_at ASC"
))->fetchAll();

echo json_encode(array_map(fn($r) => [
    'title'       => (string)$r['title'],
    'description' => (string)(($lang === 'fr' ? $r['desc_fr'] : $r['desc_en']) ?: ($r['desc_en'] ?? '')),
    'image'       => !empty($r['image']) ? assetUrl($r['image']) : null,
    'url'         => (string)$r['url'],
], $rows), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
