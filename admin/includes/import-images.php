<?php
/**
 * Copies the images of a rich-text field that live outside the site into
 * uploads/editor/ and points the <img> at the copy — applied to news content
 * before saving (admin/news-edit.php).
 *
 * Why: content pasted from Google Docs keeps its images on googleusercontent.com,
 * whose URLs expire; the news page and the newsletter e-mails generated from it
 * (includes/newsletter_email.php) would then lose them. data: images (pasted
 * inline) are saved as files too, Gmail blocks them in e-mails.
 *
 * Copies go through the same checks and WebP conversion as an editor upload
 * (admin/upload-image.php). Downloads only reach public addresses (no private
 * or reserved IP, every redirect checked), within UPLOAD_MAX_SIZE. An image that
 * cannot be copied keeps its original src and is counted in $failed.
 */

const IMPORT_IMAGES_MAX_REDIRECTS = 3;

function importExternalImages(string $html, int &$failed): string
{
    // One import per URL for the request: the EN and FR contents share images.
    static $done = [];

    return preg_replace_callback('/(<img\b[^>]*?(?<![-\w])src\s*=\s*)(["\'])(.*?)\2/is', function ($m) use (&$done, &$failed) {
        $src = html_entity_decode($m[3], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if (!importImageIsExternal($src)) {
            return $m[0];
        }
        if (!array_key_exists($src, $done)) {
            $done[$src] = importImageSave($src);
        }
        if ($done[$src] === null) {
            $failed++;
            return $m[0];
        }
        return $m[1] . $m[2] . h($done[$src]) . $m[2];
    }, $html) ?? $html;
}

/** True for a data: image or an http(s) URL on another host than the site. */
function importImageIsExternal(string $src): bool
{
    if (preg_match('#^data:image/#i', $src)) {
        return true;
    }
    if (!preg_match('#^(https?:)?//#i', $src)) {
        return false;
    }
    $host  = strtolower((string)parse_url(strpos($src, '//') === 0 ? 'https:' . $src : $src, PHP_URL_HOST));
    $own   = [strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''))];
    if (defined('NEWSLETTER_SITE_URL') && NEWSLETTER_SITE_URL !== '') {
        $own[] = strtolower((string)parse_url(NEWSLETTER_SITE_URL, PHP_URL_HOST));
    }
    return $host !== '' && !in_array($host, $own, true);
}

/** Saves the image at $src in uploads/editor/; its site URL, or null on failure. */
function importImageSave(string $src): ?string
{
    $maxSize = defined('UPLOAD_MAX_SIZE') ? UPLOAD_MAX_SIZE : 5 * 1024 * 1024;
    $tmp     = tempnam(sys_get_temp_dir(), 'img');
    if ($tmp === false) {
        return null;
    }
    try {
        if (preg_match('#^data:image/[a-z0-9.+-]+;base64,(.*)$#is', $src, $m)) {
            $data = base64_decode(preg_replace('/\s+/', '', $m[1]), true);
            if ($data === false || strlen($data) > $maxSize || file_put_contents($tmp, $data) === false) {
                return null;
            }
        } elseif (!importImageDownload(strpos($src, '//') === 0 ? 'https:' . $src : $src, $tmp, $maxSize)) {
            return null;
        }

        $allowed = defined('UPLOAD_ALLOWED_MIME') ? UPLOAD_ALLOWED_MIME : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $finfo   = finfo_open(FILEINFO_MIME_TYPE);
        $mime    = finfo_file($finfo, $tmp);
        finfo_close($finfo);
        if (!in_array($mime, $allowed, true) || !@getimagesize($tmp)) {
            return null;
        }

        $destDir = dirname(__DIR__, 2) . '/uploads/editor/';
        if (!is_dir($destDir)) mkdir($destDir, 0755, true);
        $basename = date('Ymd_His') . '_' . bin2hex(random_bytes(4));
        $filename = imageConvertToWebp($tmp, $destDir, $basename);
        if ($filename === false) {
            $filename = $basename . '.' . imageExtFromMime($tmp);
            if (!copy($tmp, $destDir . $filename)) {
                return null;
            }
        }
        return BASE_URL . '/uploads/editor/' . $filename;
    } finally {
        @unlink($tmp);
    }
}

/** GET $url into $dest, following redirects only to public addresses. */
function importImageDownload(string $url, string $dest, int $maxSize): bool
{
    for ($hop = 0; $hop <= IMPORT_IMAGES_MAX_REDIRECTS; $hop++) {
        $parts = parse_url($url);
        $host  = $parts['host'] ?? '';
        if (!in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true) || $host === '') {
            return false;
        }
        $port = (int)($parts['port'] ?? (strtolower($parts['scheme']) === 'https' ? 443 : 80));
        $ip   = importImagePublicIp($host);
        if ($ip === null) {
            return false;
        }

        $fh = fopen($dest, 'wb');
        if (!$fh) {
            return false;
        }
        $size = 0;
        $ch   = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RESOLVE        => [$host . ':' . $port . ':' . $ip],   // the checked IP, not a second lookup
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_USERAGENT      => 'AlteredCore image import',
            CURLOPT_HEADER         => false,
            CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) use ($fh, &$size, $maxSize) {
                $size += strlen($chunk);
                return $size > $maxSize ? 0 : fwrite($fh, $chunk);   // 0 aborts the transfer
            },
        ]);
        $ok       = curl_exec($ch);
        $code     = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $location = (string)curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        curl_close($ch);
        fclose($fh);

        if ($ok && $code >= 300 && $code < 400 && $location !== '') {
            $url = $location;
            continue;
        }
        if (!$ok || $code !== 200) {
            error_log("import-images: $url failed ($code)");
            return false;
        }
        return true;
    }
    return false;
}

/** First IPv4 of $host if it is a public address, else null. */
function importImagePublicIp(string $host): ?string
{
    $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : (gethostbynamel($host) ?: []);
    foreach ($ips as $ip) {
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return null;
        }
    }
    return $ips[0] ?? null;
}
