<?php
// Minimal assertion harness (no phpunit). Tracks a global pass/fail tally.

$GLOBALS['__cac_pass'] = 0;
$GLOBALS['__cac_fail'] = 0;

function cac_check(bool $cond, string $msg): void
{
    if ($cond) {
        $GLOBALS['__cac_pass']++;
        echo "  ok   - {$msg}\n";
    } else {
        $GLOBALS['__cac_fail']++;
        echo "  FAIL - {$msg}\n";
    }
}

function assertSame($expected, $actual, string $msg): void
{
    cac_check(
        $expected === $actual,
        $msg . ($expected === $actual ? '' : ' (expected ' . var_export($expected, true) . ', got ' . var_export($actual, true) . ')')
    );
}

function assertTrue($value, string $msg): void
{
    cac_check($value === true, $msg);
}
