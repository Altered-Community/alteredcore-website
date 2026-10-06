<?php
require_once __DIR__ . '/../plugins/core-altered-cards/includes/collection-query.php';

// Every value of a list filter reaches the collection API, in its array form.
assertSame(
    'faction[]=AX&rarity[]=COMMON&rarity[]=RARE&rarity[]=EXALTED&cardType[]=CHARACTER&cardType[]=SPELL&cardSet[]=CORE&cardSet[]=ALIZE&locale=fr',
    cacCollectionQuery([
        'faction' => ['AX'], 'rarity' => ['COMMON', 'RARE', 'EXALTED'], 'cardType' => ['CHARACTER', 'SPELL'],
        'cardSet' => ['CORE', 'ALIZE'], 'locale' => 'fr', 'page' => '2', 'itemsPerPage' => '36',
    ]),
    'list filters keep every value'
);
assertSame('faction[]=AX&name=Red%20Axiom', cacCollectionQuery(['faction' => 'AX', 'name' => 'Red Axiom', 'rarity' => ['']]), 'a single value, empty values dropped');
assertSame('mainCost[gte]=1&mainCost[lte]=3', cacCollectionQuery(['mainCost' => ['gte' => '1', 'lte' => '3', 'eq' => '2']]), 'cost range');
assertSame('', cacCollectionQuery([]), 'no filter');
