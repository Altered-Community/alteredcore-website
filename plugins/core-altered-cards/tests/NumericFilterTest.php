<?php
// Tests for includes/numeric-filter.php (whitespace grammar parity + single-pass planner).
require_once __DIR__ . '/../includes/numeric-filter.php';

assertSame('1,3', cacValidateNumExpr('1 3'), 'space-separated numbers normalize to comma list');
assertSame('1-3', cacValidateNumExpr('1 - 3'), 'spaces around range dash collapse');
assertSame('>=4', cacValidateNumExpr('>= 4'), 'space after comparison operator collapses');
assertSame('4+', cacValidateNumExpr('4 +'), 'space before trailing plus collapses');
assertSame('1,3-5,7+', cacValidateNumExpr('1, 3 - 5; 7 +'), 'mixed comma/semicolon/space list normalizes');
assertSame(null, cacValidateNumExpr('1,,3'), 'empty token between commas rejected');
assertSame(null, cacValidateNumExpr('   '), 'blank expression returns null');
assertSame(null, cacValidateNumExpr('abc'), 'non-numeric rejected');

$plan = cacPlanNumericFilter(
    [
        'mainCost'    => ['1', '4', '2'],
        'recallCost'  => ['gte' => '2', 'lte' => '4'],
        'forestPower' => ['3', '4', '5'],
        'oceanPower'  => '2',
    ],
    [
        'mainCost'    => 'mainCost',
        'recallCost'  => 'recallCost',
        'forestPower' => 'forest',
        'oceanPower'  => 'ocean',
    ]
);

assertSame(
    [
        'mainCost[gte]=1',
        'mainCost[lte]=4',
        'recallCost[gte]=2',
        'recallCost[lte]=4',
        'forest[gte]=3',
        'forest[lte]=5',
        'ocean=2',
    ],
    $plan['queryParts'],
    'cacPlanNumericFilter builds exact, range, and bounding-box upstream query parts in one pass'
);
assertSame(
    ['mainCost' => [1, 2, 4]],
    $plan['localFilters'],
    'cacPlanNumericFilter emits local filter only for disjoint integer sets'
);

$items = [
    ['ref' => 'A', 'mainCost' => 1],
    ['ref' => 'B', 'mainCost' => 3],
    ['ref' => 'C', 'mainCost' => 4],
];
$kept = cacFilterItemsByNumeric($items, $plan['localFilters']);
assertSame(['A', 'C'], array_column($kept, 'ref'), 'cacFilterItemsByNumeric drops gaps in disjoint set');
