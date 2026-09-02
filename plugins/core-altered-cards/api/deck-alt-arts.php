<?php
// GET /papi/core-altered-cards/deck-alt-arts?ref[]=...&ref[]=...
// Resolves a set of card References (as stored verbatim in deck.cards) to their
// multi-art groups and illustration options, in one round trip, for the deckbuilder's
// "apply my alt-art preference" button and per-card illustration picker. Combines
// POST /api/alt-arts/resolve-references and POST /api/alt-arts/options (both on
// OWNERSHIP_API_URL) the same way plugins/ownership/api/alt-art-search.php combines
// GET families + POST options for the "Alt Arts BGA" page.
require_once dirname(__DIR__) . '/includes/functions.php';

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

$references = [];
foreach ((array)($_GET['ref'] ?? []) as $r) {
    if (is_string($r) && $r !== '') $references[] = $r;
}
$references = array_values(array_unique($references));

if (!$references) {
    echo json_encode(['groups' => [], 'options' => []]);
    exit;
}

$base = rtrim(OWNERSHIP_API_URL, '/');

$resolved = collApiRequest($base, 'POST', '/api/alt-arts/resolve-references', $userId, $references);
if ($resolved === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Ownership API error']);
    exit;
}
if (!is_array($resolved)) $resolved = [];

$groups = [];
$groupKeys = [];
$seenGroupKeys = [];
foreach ($resolved as $g) {
    if (!is_array($g) || !isset($g['reference'], $g['familyId'], $g['faction'], $g['rarity'])) continue;
    $groups[$g['reference']] = [
        'familyId' => $g['familyId'],
        'faction'  => $g['faction'],
        'rarity'   => $g['rarity'],
    ];
    $groupKey = $g['familyId'] . ':' . $g['faction'] . ':' . $g['rarity'];
    if (!isset($seenGroupKeys[$groupKey])) {
        $seenGroupKeys[$groupKey] = true;
        $groupKeys[] = ['familyId' => $g['familyId'], 'faction' => $g['faction'], 'rarity' => $g['rarity']];
    }
}

$options = [];
if ($groupKeys) {
    $optionGroups = collApiRequest($base, 'POST', '/api/alt-arts/options', $userId, $groupKeys);
    if ($optionGroups === false) {
        http_response_code(502);
        echo json_encode(['error' => 'Ownership API error']);
        exit;
    }
    if (is_array($optionGroups)) {
        foreach ($optionGroups as $g) {
            $key = $g['familyId'] . ':' . $g['faction'] . ':' . $g['rarity'];
            $options[$key] = $g;
        }
    }
}

echo json_encode(['groups' => $groups, 'options' => $options]);
