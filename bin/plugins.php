<?php
// Plugin tooling for developers and CI (not deployed).
//
//   php bin/plugins.php plan                 JSON test/build plan of every plugin (used by CI)
//   php bin/plugins.php run <stage> [id…]    run a stage for all plugins, or the listed ones
//        stages: php-tests · node-tests · install · lint · test · build
//   php bin/plugins.php activate <id…>       activate plugins (DB required: run inside the web container)
//
// A plugin declares its commands in plugin.json ("build", "tests"). Without a "tests" block,
// tests are found by convention: tests/run.php, **/*.test.mjs, e2e/*.spec.{ts,mjs,js}.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

define('AC_ROOT', dirname(__DIR__));

function cliFail(string $msg, int $code = 1): void {
    fwrite(STDERR, $msg . "\n");
    exit($code);
}

/** Manifests only — no config.php, no DB (CI runs `plan` and the test stages without them). */
function cliManifests(): array {
    $out = [];
    foreach (glob(AC_ROOT . '/plugins/*/plugin.json') ?: [] as $file) {
        $m = json_decode((string)file_get_contents($file), true);
        if (!is_array($m) || empty($m['id'])) cliFail("Invalid manifest: {$file}");
        if (basename(dirname($file)) !== $m['id']) cliFail("Plugin folder and id differ: {$file}");
        $m['_dir'] = dirname($file);
        $out[$m['id']] = $m;
    }
    ksort($out);
    return $out;
}

/** Files under $dir matching $suffix, skipping dependency and build folders. */
function cliFind(string $dir, string $suffix): array {
    $found = [];
    $skip  = ['node_modules', 'dist', 'vendor', '.angular', '.git'];
    $it = new RecursiveIteratorIterator(new RecursiveCallbackFilterIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        fn($f) => !($f->isDir() && in_array($f->getFilename(), $skip, true))
    ));
    foreach ($it as $f) {
        if ($f->isFile() && substr($f->getFilename(), -strlen($suffix)) === $suffix) {
            $found[] = substr($f->getPathname(), strlen($dir) + 1);
        }
    }
    sort($found);
    return $found;
}

function cliPlan(array $m): array {
    $dir   = $m['_dir'];
    $tests = $m['tests'] ?? null;
    $build = $m['build'] ?? null;
    // Front-end workdirs have their own test runner (npm test): keep node --test out of them.
    $nodeTests = $tests['node'] ?? array_values(array_filter(
        cliFind($dir, '.test.mjs'),
        fn($f) => !$build || strpos($f, trim($build['workdir'], '/') . '/') !== 0
    ));
    $e2e = $tests['e2e'] ?? (is_dir($dir . '/e2e') ? 'e2e' : null);
    return [
        'id'         => $m['id'],
        'dir'        => 'plugins/' . $m['id'],
        'php_tests'  => $tests['php'] ?? (is_file($dir . '/tests/run.php') ? ['tests/run.php'] : []),
        'node_tests' => $nodeTests,
        'e2e'        => $e2e,
        'build'      => $build ? [
            'workdir' => trim($build['workdir'], '/'),
            'install' => $build['install'] ?? 'npm ci',
            'lint'    => $build['lint'] ?? null,
            'test'    => $build['test'] ?? null,
            'build'   => $build['build'],
            'output'  => trim($build['output'] ?? 'dist', '/'),
            'nvmrc'   => is_file($dir . '/' . trim($build['workdir'], '/') . '/.nvmrc') ? trim($build['workdir'], '/') . '/.nvmrc' : null,
        ] : null,
        'spa_pages'  => array_values(array_map(fn($p) => $p['slug'], array_filter($m['pages'] ?? [], fn($p) => ($p['type'] ?? 'php') === 'spa'))),
    ];
}

function cliSh(string $cmd, string $cwd): bool {
    echo "\n\033[1m$ (cd {$cwd} && {$cmd})\033[0m\n";
    $proc = proc_open($cmd, [STDIN, STDOUT, STDERR], $pipes, $cwd);
    return is_resource($proc) && proc_close($proc) === 0;
}

$cmd  = $argv[1] ?? '';
$args = array_slice($argv, 2);

switch ($cmd) {
    case 'plan':
        echo json_encode(array_values(array_map('cliPlan', cliManifests())), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
        exit(0);

    case 'run':
        $stage = array_shift($args) ?? '';
        $all   = cliManifests();
        $ids   = $args ?: array_keys($all);
        $failed = [];
        foreach ($ids as $id) {
            if (!isset($all[$id])) cliFail("Unknown plugin: {$id}");
            $p   = cliPlan($all[$id]);
            $cwd = AC_ROOT . '/' . $p['dir'];
            $ok  = true;
            if ($stage === 'php-tests') {
                foreach ($p['php_tests'] as $f) $ok = cliSh(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($f), $cwd) && $ok;
            } elseif ($stage === 'node-tests') {
                // From the repo root: existing tests resolve their modules from process.cwd().
                $files = array_map(fn($f) => escapeshellarg($p['dir'] . '/' . $f), $p['node_tests']);
                if ($files) $ok = cliSh('node --test ' . implode(' ', $files), AC_ROOT);
            } elseif (in_array($stage, ['install', 'lint', 'test', 'build'], true)) {
                if ($p['build'] && $p['build'][$stage]) $ok = cliSh($p['build'][$stage], $cwd . '/' . $p['build']['workdir']);
            } else {
                cliFail("Unknown stage: {$stage}", 2);
            }
            if (!$ok) $failed[] = $id;
        }
        if ($failed) cliFail("\n{$stage} failed for: " . implode(', ', $failed));
        echo "\n{$stage}: ok\n";
        exit(0);

    case 'activate':
        if (!$args) cliFail('Usage: php bin/plugins.php activate <id…>', 2);
        require_once AC_ROOT . '/config.php';
        require_once AC_ROOT . '/includes/functions.php';
        $code = 0;
        foreach ($args as $id) {
            $errors = pluginActivate($id);
            if ($errors) { fwrite(STDERR, "{$id}: " . implode(' · ', $errors) . "\n"); $code = 1; }
            else echo "{$id}: active\n";
        }
        exit($code);

    default:
        fwrite(STDERR, "Usage: php bin/plugins.php plan | run <stage> [id…] | activate <id…>\n");
        exit(2);
}
