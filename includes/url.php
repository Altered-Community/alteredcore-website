<?php
/**
 * Returns $url if it is a same-site path under $baseUrl, otherwise $baseUrl . '/'.
 * Used for post-login redirects to prevent open redirects: rejects absolute and
 * protocol-relative URLs ("//host", "/\host"), backslashes and control characters
 * (browsers strip or normalise these, turning a path into a host).
 */
function safeReturnUrl(?string $url, string $baseUrl): string {
    $fallback = $baseUrl . '/';
    if ($url === null || $url === '') return $fallback;
    if (strpos($url, $baseUrl . '/') !== 0) return $fallback;
    if (strpos($url, '//') === 0 || strpos($url, '\\') !== false) return $fallback;
    if (preg_match('/[\x00-\x1F\x7F]/', $url)) return $fallback;
    $parts = parse_url($url);
    if ($parts === false || isset($parts['scheme']) || isset($parts['host'])) return $fallback;
    return $url;
}
