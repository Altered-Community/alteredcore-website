<?php
// Minimal assertion harness (no phpunit). Tracks a global pass/fail tally.

$GLOBALS['__tr_pass'] = 0;
$GLOBALS['__tr_fail'] = 0;

function assertSame($expected, $actual, string $msg): void
{
    $ok = $expected === $actual;
    $GLOBALS[$ok ? '__tr_pass' : '__tr_fail']++;
    echo ($ok ? '  ok   - ' : '  FAIL - ') . $msg
        . ($ok ? '' : ' (expected ' . var_export($expected, true) . ', got ' . var_export($actual, true) . ')')
        . "\n";
}
