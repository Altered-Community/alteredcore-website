<?php
// Plain-PHP test runner for core helpers (no phpunit). Usage: php tests/run.php
require __DIR__ . '/assert.php';

foreach (glob(__DIR__ . '/*Test.php') ?: [] as $file) {
    echo basename($file) . "\n";
    require $file;
}

$pass = $GLOBALS['__core_pass'];
$fail = $GLOBALS['__core_fail'];
echo "\n{$pass} passed, {$fail} failed\n";
exit($fail > 0 ? 1 : 0);
