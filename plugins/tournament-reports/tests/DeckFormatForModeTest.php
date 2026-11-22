<?php
// The plugin's helpers must be self-sufficient: pages/tournament.php only loads
// inc/functions.php, so anything it calls from another plugin has to be required
// there. Loading nothing else here is the point of the test (regression: HTTP 500
// "Call to undefined function loadAlteredData()" on every tournament page).
require_once __DIR__ . '/../inc/functions.php';

assertSame(true, function_exists('loadAlteredData'), 'inc/functions.php makes loadAlteredData() available');

$cases = [
    'STANDARD'            => 'standard',
    'FRONTIER'            => 'frontier',
    'NO_UNIQUE'           => 'nuc',
    'SANDBOX'             => 'sandbox',
    ' standard '          => 'standard',
    'SEALED'              => 'sandbox',
    ''                    => 'sandbox',
];
foreach ($cases as $mode => $expected) {
    assertSame($expected, trDeckFormatForMode($mode), 'trDeckFormatForMode(' . var_export($mode, true) . ')');
}
assertSame('sandbox', trDeckFormatForMode(null), 'trDeckFormatForMode(null)');
