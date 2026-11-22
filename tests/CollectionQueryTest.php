<?php
require_once __DIR__ . '/../plugins/core-altered-cards/includes/collection-query.php';

// Every value of a list filter reaches the collection API, in its array form; several card types stay with the proxy.
assertSame(
    'faction[]=AX&rarity[]=COMMON&rarity[]=RARE&rarity[]=EXALTED&cardSet[]=CORE&cardSet[]=ALIZE&locale=fr',
    cacCollectionQuery([
        'faction' => ['AX'], 'rarity' => ['COMMON', 'RARE', 'EXALTED'], 'cardType' => ['CHARACTER', 'SPELL'],
        'cardSet' => ['CORE', 'ALIZE'], 'locale' => 'fr', 'page' => '2', 'itemsPerPage' => '36',
    ]),
    'list filters keep every value'
);
assertSame('faction[]=AX&name=Red%20Axiom', cacCollectionQuery(['faction' => 'AX', 'name' => 'Red Axiom', 'rarity' => ['']]), 'a single value, empty values dropped');
assertSame('mainCost[gte]=1&mainCost[lte]=3', cacCollectionQuery(['mainCost' => ['gte' => '1', 'lte' => '3', 'eq' => '2']]), 'cost range');
assertSame('', cacCollectionQuery([]), 'no filter');
assertSame('cardType[]=SPELL', cacCollectionQuery(['cardType' => ['SPELL', '']]), 'one card type goes to the API');
assertSame(null, cacCollectionLocalTypes(['cardType' => ['SPELL']]), 'one card type: the API filters');
assertSame(['CHARACTER', 'SPELL'], cacCollectionLocalTypes(['cardType' => ['CHARACTER', '', 'SPELL']]), 'several card types: the proxy filters');

// URL numeric expression validation
assertSame('1-3', cacValidateNumExpr(' 1 - 3 '), 'range with spaces');
assertSame('1-3', cacValidateNumExpr('1–3'), 'en-dash range');
assertSame('1-3,5', cacValidateNumExpr('1-3, 5'), 'mixed range + value');
assertSame('4+', cacValidateNumExpr('4+'), 'open bound');
assertSame(null, cacValidateNumExpr('1,,3'), 'empty segment rejected');
assertSame(null, cacValidateNumExpr('abc'), 'garbage rejected');

// Disjoint numeric lists narrow upstream to [min..max] and stay in local filters
assertSame('mainCost[gte]=1&mainCost[lte]=5', cacCollectionQuery(['mainCost' => ['1', '2', '3', '5']]), 'disjoint collection list sends min..max');
assertSame(['mainCost' => [1, 2, 3, 5]], cacCollectionLocalNumeric(['mainCost' => ['1', '2', '3', '5']]), 'disjoint collection list keeps exact local filter');
assertSame('mainCost[gte]=1&mainCost[lte]=3', cacCollectionQuery(['mainCost' => ['1', '2', '3']]), 'contiguous list sends min..max');
assertSame([], cacCollectionLocalNumeric(['mainCost' => ['1', '2', '3']]), 'contiguous list needs no local filter');

// Ownership mapping (forestPower => forest) + local filtering (null excluded)
$ownLocal = [];
$ownParts = cacNumericQueryParts(
    ['mainCost' => ['gte' => '1', 'lte' => '3'], 'forestPower' => ['1', '4']],
    ['mainCost' => 'mainCost', 'forestPower' => 'forest'],
    $ownLocal
);
assertSame(['mainCost[gte]=1', 'mainCost[lte]=3', 'forest[gte]=1', 'forest[lte]=4'], $ownParts, 'ownership forwards bounds and envelopes disjoint lists');
assertSame(['forest' => [1, 4]], $ownLocal, 'ownership records disjoint forest values');

$filtered = cacFilterItemsByNumeric([
    ['cardReference' => 'A', 'forest' => 1],
    ['cardReference' => 'B', 'forest' => 2],
    ['cardReference' => 'C', 'forest' => null],
    ['cardReference' => 'D', 'forest' => 4],
    ['cardReference' => 'E'],
], $ownLocal);
assertSame(
    [['cardReference' => 'A', 'forest' => 1], ['cardReference' => 'D', 'forest' => 4]],
    $filtered,
    'local numeric filter keeps exact matches and drops intermediate and null values'
);
