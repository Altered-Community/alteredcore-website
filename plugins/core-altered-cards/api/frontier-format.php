<?php
// GET /papi/core-altered-cards/frontier-format — the Frontier season the site uses now: the uniques search API
// format id of its list (`format=<id>` on services.uniques), the setting Admin > Uniques format
// (cacUniquesFrontierFormat()). Public and read-only, for the clients that are not altered.re's own pages
// (the Altered Arena app, its Android build): they follow the season when an admin switches it, as the site's
// pages do through AlteredCore.uniquesFrontierFormat.
//
//   { "frontierFormat": "frontier_s04" }
//
// CORS open to every origin: the data is public and the request carries no credentials.
require_once dirname(__DIR__) . '/includes/functions.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Max-Age: 86400');
header('Vary: Origin');

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=UTF-8');
// A switch reaches the clients within minutes
header('Cache-Control: public, max-age=300');
echo json_encode(['frontierFormat' => cacUniquesFrontierFormat()], JSON_UNESCAPED_SLASHES);
