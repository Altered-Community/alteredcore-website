<?php
// GET /papi/core-altered-cards/deck-alt-arts?ref[]=...&ref[]=...
// Resolves a set of card References (as stored verbatim in deck.cards) to their
// multi-art groups and illustration options, in one round trip, for the deckbuilder's
// "apply my alt-art preference" button and per-card illustration picker, and for the
// card-detail modal's alt-art widget (plugins/ownership/js/card-modal-enhance.js).
// Combines POST /api/alt-arts/resolve-references and POST /api/alt-arts/options (both
// on OWNERSHIP_API_URL) the same way plugins/ownership/api/alt-art-search.php combines
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
foreach ($resolved as $g) {
    if (!is_array($g) || !isset($g['reference'], $g['familyId'], $g['faction'], $g['rarity'])) continue;
    $groups[$g['reference']] = [
        'familyId' => $g['familyId'],
        'faction'  => $g['faction'],
        'rarity'   => $g['rarity'],
    ];
}

// A card reprinted under a different set keeps the same PRODUCT_FACTION_NUM_RARITY
// suffix of its reference (only the SET segment changes), but the ownership catalog's
// alt-art family may only be indexed under whichever printing it was originally
// catalogued from (e.g. a hero's original BISE printing, not its later CORE reprint) --
// resolve-references then returns nothing for the reprint ref directly, even though the
// same illustration/family genuinely applies to it. For any ref that didn't resolve,
// retry against every other known set sharing that suffix, in one extra batched call,
// and alias whichever variant does resolve back onto the originally-requested ref.
$unresolved = array_values(array_diff($references, array_keys($groups)));
if ($unresolved) {
    $setCodes = array_keys(loadAlteredData('sets'));
    $candidateToOriginal = []; // candidate ref => [original refs it could satisfy]
    foreach ($unresolved as $ref) {
        $parts = explode('_', $ref);
        // ALT_<SET>_<PRODUCT>_<FACTION>_<NUM>_<RARITY> -- skip anything not matching
        // this shape, including serialized Unique prints (7 parts), which have no
        // reprint-family concept to fall back to.
        if (count($parts) !== 6) continue;
        $origSet = $parts[1];
        foreach ($setCodes as $setCode) {
            if ($setCode === $origSet) continue;
            $candidateParts = $parts;
            $candidateParts[1] = $setCode;
            $candidate = implode('_', $candidateParts);
            if (in_array($candidate, $references, true)) continue; // already tried directly
            $candidateToOriginal[$candidate][] = $ref;
        }
    }

    if ($candidateToOriginal) {
        $candidateRefs = array_keys($candidateToOriginal);
        $altResolved = collApiRequest($base, 'POST', '/api/alt-arts/resolve-references', $userId, $candidateRefs);
        if (is_array($altResolved)) {
            foreach ($altResolved as $g) {
                if (!is_array($g) || !isset($g['reference'], $g['familyId'], $g['faction'], $g['rarity'])) continue;
                foreach ($candidateToOriginal[$g['reference']] ?? [] as $origRef) {
                    if (isset($groups[$origRef])) continue; // already resolved by an earlier candidate
                    $groups[$origRef] = [
                        'familyId' => $g['familyId'],
                        'faction'  => $g['faction'],
                        'rarity'   => $g['rarity'],
                    ];
                }
            }
        }
    }
}

$groupKeys = [];
$seenGroupKeys = [];
foreach ($groups as $g) {
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
