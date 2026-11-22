<?php
// Plain-PHP test runner (no phpunit). Usage: php tests/run.php
// Picked up by the plugins CI (bin/plugins.php, stage php-tests).
require __DIR__ . '/assert.php';

foreach (glob(__DIR__ . '/*Test.php') ?: [] as $file) {
    echo basename($file) . "\n";
    require $file;
}

$pass = $GLOBALS['__tr_pass'];
$fail = $GLOBALS['__tr_fail'];
echo "\n{$pass} passed, {$fail} failed\n";
exit($fail > 0 ? 1 : 0);
