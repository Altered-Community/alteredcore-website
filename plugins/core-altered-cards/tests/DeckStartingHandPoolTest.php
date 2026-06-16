<?php

// getDeckStartingHandPool() builds the draw pool for the starting-hand tester.
// It must: exclude HERO cards, resolve localized names like the decklist
// (lang -> en -> ref), keep plain-string names, and coerce qty/mainCost to int.

assertTrue(function_exists('getDeckStartingHandPool'), 'getDeckStartingHandPool: function is defined');

$sample = [
    ['cardReference' => 'ALT_CORE_B_AX_01_C', 'cardTypeReference' => 'HERO',      'name' => ['en' => 'Hero EN', 'fr' => 'Héros FR'], 'quantity' => 1, 'mainCost' => 0],
    ['cardReference' => 'ALT_CORE_B_AX_02_C', 'cardTypeReference' => 'CHARACTER', 'name' => ['en' => 'Char EN', 'fr' => 'Perso FR'], 'quantity' => 3, 'mainCost' => 2, 'recallCost' => 1],
    ['cardReference' => 'ALT_CORE_B_AX_03_C', 'cardTypeReference' => 'SPELL',     'name' => 'Plain Name', 'quantity' => 1, 'mainCost' => 1],
    ['cardReference' => 'ALT_CORE_B_AX_04_C', 'cardTypeReference' => 'PERMANENT'],
];

$result = getDeckStartingHandPool($sample, 'fr');

assertSame(3, count($result), 'getDeckStartingHandPool: HERO excluded, 3 non-hero cards kept');
assertSame('ALT_CORE_B_AX_02_C', $result[0]['ref'], 'getDeckStartingHandPool: first non-hero ref preserved');
assertSame('Perso FR', $result[0]['name'], 'getDeckStartingHandPool: localized name resolved for requested lang');
assertSame(3, $result[0]['qty'], 'getDeckStartingHandPool: quantity coerced to int');
assertSame('CHARACTER', $result[0]['type'], 'getDeckStartingHandPool: type preserved');
assertSame(2, $result[0]['mainCost'], 'getDeckStartingHandPool: mainCost coerced to int');
assertSame(1, $result[0]['recallCost'], 'getDeckStartingHandPool: recallCost coerced to int');
assertSame('Plain Name', $result[1]['name'], 'getDeckStartingHandPool: plain-string name kept as-is');

// Missing fields default sensibly.
assertSame('ALT_CORE_B_AX_04_C', $result[2]['name'], 'getDeckStartingHandPool: name falls back to ref when absent');
assertSame(1, $result[2]['qty'], 'getDeckStartingHandPool: qty defaults to 1');
assertSame(0, $result[2]['mainCost'], 'getDeckStartingHandPool: mainCost defaults to 0');
assertSame(0, $result[2]['recallCost'], 'getDeckStartingHandPool: recallCost defaults to 0');

// Name falls back to en when requested lang missing.
$enFallback = getDeckStartingHandPool(
    [['cardReference' => 'R1', 'cardTypeReference' => 'SPELL', 'name' => ['en' => 'Only EN']]],
    'fr'
);
assertSame('Only EN', $enFallback[0]['name'], 'getDeckStartingHandPool: name falls back to en when lang missing');

// Requested lang is picked directly when present (en path).
$enDirect = getDeckStartingHandPool(
    [['cardReference' => 'R2', 'cardTypeReference' => 'SPELL', 'name' => ['en' => 'EN name', 'fr' => 'FR name']]],
    'en'
);
assertSame('EN name', $enDirect[0]['name'], 'getDeckStartingHandPool: requested lang resolved directly (en)');
