<?php
require_once __DIR__ . '/../includes/url.php';

foreach (['', '/altered'] as $base) {
    $fallback = $base . '/';
    $label = $base === '' ? "base ''" : "base '$base'";

    // Accepted: same-site paths
    foreach (["$base/", "$base/pages/decks", "$base/pages/decks?id=3&x=a%2Fb#top", "$base/admin/"] as $ok) {
        assertSame($ok, safeReturnUrl($ok, $base), "$label accepts " . var_export($ok, true));
    }

    // Rejected: fall back to base
    $bad = [
        null, '',
        '//evil.example/path',
        '/\\evil.example',
        '/\\/evil.example',
        "$base/\\evil.example",
        "$base/foo\\bar",
        'https://evil.example/',
        'http:/evil.example',
        'javascript:alert(1)',
        "/\t/evil.example",
        "$base/\n/evil.example",
        "$base/x\r\nSet-Cookie: a=b",
        "$base/x\0",
        'pages/decks',
        'evil.example',
    ];
    foreach ($bad as $b) {
        assertSame($fallback, safeReturnUrl($b, $base), "$label rejects " . var_export($b, true));
    }
}

// Non-empty base: paths outside the base are rejected
assertSame('/altered/', safeReturnUrl('/other/page', '/altered'), "base '/altered' rejects '/other/page'");
assertSame('/altered/', safeReturnUrl('/altered-evil/page', '/altered'), "base '/altered' rejects '/altered-evil/page'");
