<?php
// GET /papi/ownership/alt-art-search — combines GET /api/alt-arts/families and
// POST /api/alt-arts/options (both on OWNERSHIP_API_URL) into the single payload
// pages/alt-arts.php's JS needs for one screenful of results: the deduplicated list of
// multi-art families matching the filters, plus each one's printings/owned quantities/
// current slot choices in the same round trip.
require_once __DIR__ . '/../includes/functions.php';

header('Content-Type: application/json; charset=UTF-8');

if (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL) {
    http_response_code(503);
    echo json_encode(['error' => 'Ownership API not configured']);
    exit;
}

if (!kcIsLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int)($_SESSION['user_id'] ?? 0);

$parts = [];
if (isset($_GET['name']) && is_string($_GET['name']) && $_GET['name'] !== '') {
    $parts[] = 'name=' . rawurlencode($_GET['name']);
}
foreach ((array)($_GET['faction'] ?? []) as $f) {
    if (is_string($f) && $f !== '') $parts[] = 'faction[]=' . rawurlencode($f);
}
foreach ((array)($_GET['rarity'] ?? []) as $r) {
    if (is_string($r) && $r !== '') $parts[] = 'rarity[]=' . rawurlencode($r);
}
if (isset($_GET['mainCost']) && is_string($_GET['mainCost']) && $_GET['mainCost'] !== '') {
    $parts[] = 'mainCost=' . rawurlencode($_GET['mainCost']);
}

$path = '/api/alt-arts/families' . ($parts ? '?' . implode('&', $parts) : '');
[$famStatus, $famRaw] = ownApiRequestRaw('GET', $path, $userId);
if ($famRaw === null || $famStatus < 200 || $famStatus >= 300) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}

$families = json_decode($famRaw, true);
if (!is_array($families)) $families = [];

$options = [];
if ($families) {
    $groupKeys = array_map(function ($f) {
        return ['familyId' => $f['familyId'], 'faction' => $f['faction'], 'rarity' => $f['rarity']];
    }, $families);

    [$optStatus, $optRaw] = ownApiRequestRaw('POST', '/api/alt-arts/options', $userId, $groupKeys);
    if ($optRaw === null || $optStatus < 200 || $optStatus >= 300) {
        http_response_code(502);
        echo json_encode(['error' => 'Ownership API error']);
        exit;
    }

    $optionGroups = json_decode($optRaw, true);
    if (is_array($optionGroups)) {
        foreach ($optionGroups as $g) {
            $key = $g['familyId'] . ':' . $g['faction'] . ':' . $g['rarity'];
            $options[$key] = $g;
        }
    }
}

echo json_encode(['families' => $families, 'options' => $options]);
