<?php
// Gzip for JSON responses: the API relay (api/v1/services/proxy.php) and the plugin endpoints
// (includes/_plugin_router.php). Debian's mod_deflate configuration compresses text, HTML, CSS, JavaScript and XML,
// not JSON, which is 5 to 10 times smaller compressed (a deck: 15 kB → 3 kB, a long list far more). Done here
// rather than with AddOutputFilterByType in .htaccess, which would replace the server's list of types.

/** Compresses the response when it is JSON and the client accepts gzip. Call before any output. */
function jsonGzipStart(): void {
    if (headers_sent() || ini_get('zlib.output_compression') || !function_exists('gzencode')) return;
    if (!preg_match('/\bgzip\b/i', (string)($_SERVER['HTTP_ACCEPT_ENCODING'] ?? ''))) return;
    ob_start('jsonGzipHandler');
}

/** Output handler: the whole body at once, JSON, not encoded yet and large enough to gain from it. */
function jsonGzipHandler(string $buffer, int $phase): string {
    $whole = ($phase & PHP_OUTPUT_HANDLER_START) && ($phase & PHP_OUTPUT_HANDLER_FINAL);
    if (!$whole || strlen($buffer) < 1024 || headers_sent()) return $buffer;
    $json = false;
    foreach (headers_list() as $line) {
        if (stripos($line, 'Content-Encoding:') === 0) return $buffer;
        if (stripos($line, 'Content-Type:') === 0) $json = stripos($line, 'json') !== false;
    }
    if (!$json) return $buffer;
    $gz = gzencode($buffer, 6);
    if ($gz === false) return $buffer;
    header_remove('Content-Length');
    header('Content-Encoding: gzip');
    header('Vary: Accept-Encoding', false);
    return $gz;
}
