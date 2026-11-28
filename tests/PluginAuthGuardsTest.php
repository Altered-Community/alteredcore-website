<?php
// Architectural guardrails for plugin auth:
// 1. Private API endpoints in core-altered-cards & ownership must declare `"auth": "user"`
//    and explicit `"methods"` in plugin.json so _plugin_router.php enforces session + auth
//    before endpoint code runs.
// 2. Plugin PHP code must use kcCurrentUserId() rather than reading $_SESSION['user_id']
//    directly (which silently evaluates to 0 if session_start() hasn't run yet).

$root = dirname(__DIR__);

// 1. Manifest auth & method guard checks
$expectedAuth = [
    'core-altered-cards' => [
        'collection-search' => ['auth' => 'user', 'methods' => ['GET']],
        'ownership-search'  => ['auth' => 'user', 'methods' => ['GET']],
        'playset'           => ['auth' => 'user', 'methods' => ['GET']],
        'playset-cards'     => ['auth' => 'user', 'methods' => ['GET']],
        'favorites-search'  => ['auth' => 'user', 'methods' => ['GET']],
        'favorites-toggle'  => ['auth' => 'user', 'methods' => ['POST']],
        'collection-qty'    => ['auth' => 'user', 'methods' => ['GET', 'POST']],
        'deck-add-card'     => ['auth' => 'user', 'methods' => ['POST']],
        'deck-alt-arts'     => ['auth' => 'user', 'methods' => ['GET']],
        'deck-image'        => ['auth' => null,   'methods' => ['GET', 'HEAD', 'POST']],
        'deck-oembed'       => ['auth' => null,   'methods' => ['GET', 'HEAD']],
        'frontier-format'   => ['auth' => null,   'methods' => ['GET', 'HEAD', 'OPTIONS']],
    ],
    'ownership' => [
        'boosters-list'          => ['auth' => 'user', 'methods' => ['GET']],
        'boosters-open'          => ['auth' => 'user', 'methods' => ['POST']],
        'history-list'           => ['auth' => 'user', 'methods' => ['GET']],
        'history-detail'         => ['auth' => 'user', 'methods' => ['GET']],
        'alt-art-search'         => ['auth' => 'user', 'methods' => ['GET']],
        'alt-art-set-preference' => ['auth' => 'user', 'methods' => ['POST']],
    ],
];

foreach ($expectedAuth as $pluginId => $endpoints) {
    $manifestPath = $root . "/plugins/{$pluginId}/plugin.json";
    $manifest = json_decode((string)file_get_contents($manifestPath), true);
    assertSame(true, is_array($manifest), "{$pluginId}/plugin.json is valid JSON");

    $byEndpoint = [];
    foreach ($manifest['api'] ?? [] as $entry) {
        $byEndpoint[$entry['endpoint']] = $entry;
    }

    foreach ($endpoints as $ep => $rule) {
        assertSame(true, isset($byEndpoint[$ep]), "{$pluginId}: endpoint {$ep} exists in manifest");
        assertSame($rule['auth'], $byEndpoint[$ep]['auth'] ?? null, "{$pluginId}/{$ep}: manifest auth matches");
        assertSame($rule['methods'], $byEndpoint[$ep]['methods'] ?? null, "{$pluginId}/{$ep}: manifest methods match");
    }
}

// 2. Static guardrail: no executable PHP under plugins/ may read $_SESSION['user_id'] directly.
$offenders = [];
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root . '/plugins', FilesystemIterator::SKIP_DOTS)
);
foreach ($it as $file) {
    if (!$file->isFile() || $file->getExtension() !== 'php') {
        continue;
    }
    $rel = str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1));
    if (str_contains($rel, '/tests/') || str_contains($rel, '/vendor/') || str_contains($rel, '/node_modules/')) {
        continue;
    }
    $tokens = token_get_all((string)file_get_contents($file->getPathname()));
    $n = count($tokens);
    for ($i = 0; $i < $n; $i++) {
        $tok = $tokens[$i];
        if (!is_array($tok) || $tok[0] !== T_VARIABLE || $tok[1] !== '$_SESSION') {
            continue;
        }
        // Look ahead past whitespace for ['user_id'] or ["user_id"]
        $j = $i + 1;
        while ($j < $n && is_array($tokens[$j]) && $tokens[$j][0] === T_WHITESPACE) {
            $j++;
        }
        if ($j >= $n || $tokens[$j] !== '[') {
            continue;
        }
        $k = $j + 1;
        while ($k < $n && is_array($tokens[$k]) && $tokens[$k][0] === T_WHITESPACE) {
            $k++;
        }
        if ($k < $n && is_array($tokens[$k]) && $tokens[$k][0] === T_CONSTANT_ENCAPSED_STRING) {
            $key = trim($tokens[$k][1], "'\"");
            if ($key === 'user_id') {
                $offenders[] = "{$rel}:{$tok[2]}";
            }
        }
    }
}

assertSame([], $offenders, 'no plugin PHP file reads $_SESSION["user_id"] directly (use kcCurrentUserId())');
