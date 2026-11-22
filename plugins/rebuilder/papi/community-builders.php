<?php
// GET /papi/rebuilder/community-builders?locale=en|fr
// The community deckbuilders of the site (includes/community-builders.php), for the banner of the decks list.
require_once dirname(__DIR__) . '/includes/community-builders.php';
header('Content-Type: application/json; charset=UTF-8');

$lang = in_array($_GET['locale'] ?? '', ['en', 'fr'], true) ? $_GET['locale'] : (function_exists('getUiLang') ? getUiLang() : 'en');
echo json_encode(rebuilderCommunityBuilders($lang), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
