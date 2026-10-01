<?php
// Decklist image of a deck's link preview (og:image, 1200×630 JPEG), served by api/deck-image.php.
//
// Top, a banner on the faction's colour: the hero, the deck's name, hero · format · author, the copies per card
// type, the cost curve (hand and reserve costs), the characters' total power per biome (as Re:Builder) and a QR
// code of the deck's page. Below, on white,
// one section per card type: copies of one card stacked (whatever their rarity), each Unique alone. The cards
// shrink until every section fits.
//
// The layout is in 1200×630 units, drawn at DECK_IMAGE_SCALE (2400×1260) so that the cards' text stays
// readable when the image is opened.
//
// Card images come from the CDN. A Unique has none there (the site draws it in the browser with
// <altered-card>): includes/deck-unique-card.php draws its face from the cards API's data on its CDN
// illustration. Without that data, it shows its common version with a « Unique » pill.
require_once __DIR__ . '/deck-preview.php';
require_once __DIR__ . '/deck-unique-card.php';
require_once __DIR__ . '/qr-code.php';

const DECK_IMAGE_WIDTH   = 1200;         // layout units; the image is DECK_IMAGE_SCALE times larger
const DECK_IMAGE_HEIGHT  = 630;
const DECK_IMAGE_SCALE   = 2;
const DECK_IMAGE_BANNER  = 132;          // banner's height
const DECK_IMAGE_PAD     = 24;
const DECK_IMAGE_RATIO   = 1.395;        // card height / width
const DECK_IMAGE_VERSION = 8;            // bump to redraw every cached image after a layout change

/** Labels of the image, in English for languages without a translation. */
function deckImageLabels(string $lang): array {
    if ($lang === 'fr') {
        return ['curve' => 'Courbe de coût', 'hand' => 'Main', 'reserve' => 'Réserve', 'power' => 'Puissance totale', 'unique' => 'Unique',
                'biomes' => ['O' => 'Eau', 'M' => 'Montagne', 'F' => 'Forêt'],
                'types' => [['Personnage', 'Personnages'], ['Sort', 'Sorts'], ['Permanent', 'Permanents'], ['Autre', 'Autres']]];
    }
    return ['curve' => 'Cost curve', 'hand' => 'Hand', 'reserve' => 'Reserve', 'power' => 'Total power', 'unique' => 'Unique',
            'biomes' => ['O' => 'Ocean', 'M' => 'Mountain', 'F' => 'Forest'],
            'types' => [['Character', 'Characters'], ['Spell', 'Spells'], ['Permanent', 'Permanents'], ['Other', 'Others']]];
}

/** Display order of a card type: characters, spells, permanents (landmark, expedition…), others. */
function deckImageTypeGroup(string $type): int {
    if ($type === 'CHARACTER') return 0;
    if ($type === 'SPELL') return 1;
    return strpos($type, 'PERMANENT') !== false ? 2 : 3;
}

function deckImageIsUnique(string $ref): bool {
    return (bool)preg_match('#_U_\d+$#', $ref);
}

/** CDN image of a card; a Unique takes its common version's (see the file's header). */
function deckImageCardUrl(string $ref, string $lang): string {
    $ref   = preg_replace('#_U_\d+$#', '_C', $ref);
    $parts = explode('_', $ref);
    return rtrim(CDN_URL, '/') . '/cards/' . $lang . '/' . ($parts[1] ?? '') . '/' . $ref . '.webp';
}

/**
 * The deck's cards as stacks, hero left out: one stack per card name holding a reference per copy (common
 * first, so the rarest lies on top), one stack per Unique. Sorted by type, hand cost, then name.
 */
function deckImageStacks(array $deck): array {
    $stacks = [];
    $byName = [];
    foreach ($deck['cards'] ?? [] as $card) {
        $ref  = (string)($card['cardReference'] ?? '');
        $qty  = max(0, (int)($card['quantity'] ?? 0));
        $type = (string)($card['cardTypeReference'] ?? '');
        if ($ref === '' || $qty === 0 || $type === 'HERO') continue;
        $name  = trim((string)($card['name'] ?? '')) ?: $ref;
        $entry = ['name' => $name, 'group' => deckImageTypeGroup($type), 'cost' => (int)($card['mainCost'] ?? 0)];
        if (deckImageIsUnique($ref)) {
            for ($i = 0; $i < $qty; $i++) $stacks[] = $entry + ['refs' => [$ref], 'unique' => true];
            continue;
        }
        $key = mb_strtolower($name);
        if (!isset($byName[$key])) {
            $byName[$key] = count($stacks);
            $stacks[]     = $entry + ['refs' => [], 'unique' => false];
        }
        for ($i = 0; $i < $qty; $i++) $stacks[$byName[$key]]['refs'][] = $ref;
    }
    foreach ($stacks as &$stack) {
        usort($stack['refs'], function ($a, $b) {
            return strcmp(explode('_', $a)[5] ?? '', explode('_', $b)[5] ?? '');
        });
    }
    unset($stack);
    usort($stacks, function ($a, $b) {
        return [$a['group'], $a['cost'], $a['name']] <=> [$b['group'], $b['cost'], $b['name']];
    });
    return $stacks;
}

/**
 * The left panel's figures: copies per type group, the cost curve (hand and reserve costs, 7 and more in one
 * bar, the 0 bar only when used) and the characters' total power per biome (null without characters).
 */
function deckImageStats(array $deck): array {
    $types = [0, 0, 0, 0];
    $hand  = array_fill(0, 8, 0);
    $resv  = array_fill(0, 8, 0);
    $power = ['O' => 0, 'M' => 0, 'F' => 0];
    $chars = 0;
    foreach ($deck['cards'] ?? [] as $card) {
        $qty  = max(0, (int)($card['quantity'] ?? 0));
        $type = (string)($card['cardTypeReference'] ?? '');
        if ($qty === 0 || $type === 'HERO') continue;
        $group = deckImageTypeGroup($type);
        $types[$group] += $qty;
        if (isset($card['mainCost']))   $hand[min(7, max(0, (int)$card['mainCost']))] += $qty;
        if (isset($card['recallCost'])) $resv[min(7, max(0, (int)$card['recallCost']))] += $qty;
        if ($type === 'CHARACTER') {
            $chars += $qty;
            $power['O'] += $qty * (int)($card['oceanPower'] ?? 0);
            $power['M'] += $qty * (int)($card['mountainPower'] ?? 0);
            $power['F'] += $qty * (int)($card['forestPower'] ?? 0);
        }
    }
    $curve = [];
    foreach (range($hand[0] + $resv[0] > 0 ? 0 : 1, 7) as $cost) {
        $curve[] = ['label' => $cost === 7 ? '7+' : (string)$cost, 'hand' => $hand[$cost], 'reserve' => $resv[$cost]];
    }
    return ['types' => $types, 'curve' => $curve, 'power' => $chars > 0 ? $power : null];
}

/** Downloads URLs in parallel: [url => image bytes], failed ones left out. */
function deckImageDownload(array $urls, int $timeout = 6): array {
    $multi   = curl_multi_init();
    $handles = [];
    foreach (array_unique($urls) as $url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_FOLLOWLOCATION => true]);
        curl_multi_add_handle($multi, $ch);
        $handles[$url] = $ch;
    }
    do {
        $status = curl_multi_exec($multi, $running);
        if ($running) curl_multi_select($multi, 0.5);
    } while ($running && $status === CURLM_OK);
    $out = [];
    foreach ($handles as $url => $ch) {
        $body = curl_multi_getcontent($ch);
        $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        if ((int)curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200 && is_string($body) && strpos($type, 'image/') === 0) $out[$url] = $body;
        curl_multi_remove_handle($multi, $ch);
        curl_close($ch);
    }
    curl_multi_close($multi);
    return $out;
}

/** A GD image from bytes (WebP included), null when undecodable. */
function deckImageDecode(?string $bytes) {
    if ($bytes === null || $bytes === '') return null;
    $im = @imagecreatefromstring($bytes);
    if ($im === false && function_exists('imagecreatefromwebp')) {
        $tmp = tempnam(sys_get_temp_dir(), 'acimg');
        file_put_contents($tmp, $bytes);
        $im = @imagecreatefromwebp($tmp);
        unlink($tmp);
    }
    return $im ?: null;
}

function deckImageColor($im, string $hex, int $alpha = 0): int {
    $hex = ltrim($hex, '#');
    return imagecolorallocatealpha($im, hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2)), $alpha);
}

/** Layout units → image pixels. */
function deckImageK(float $v): int {
    return (int)round($v * DECK_IMAGE_SCALE);
}

/** Width and cap height of $text, in layout units. Font sizes are CSS px; GD's are points at 96 dpi. */
function deckImageBox(string $font, float $px, string $text): array {
    $box = imagettfbbox($px * 0.75 * DECK_IMAGE_SCALE, 0, $font, $text);
    return ['w' => ($box[2] - $box[0]) / DECK_IMAGE_SCALE, 'ascent' => -$box[7] / DECK_IMAGE_SCALE];
}

/** Draws $text with its cap height starting at $top; returns the line's bottom. */
function deckImageText($im, string $font, float $px, float $x, float $top, int $color, string $text): float {
    $cap = deckImageBox($font, $px, 'H')['ascent'];
    imagettftext($im, $px * 0.75 * DECK_IMAGE_SCALE, 0, deckImageK($x), deckImageK($top + $cap), $color, $font, $text);
    return $top + $cap;
}

/** Filled rectangle from ($x1, $y1) to ($x2, $y2) included, in layout units. */
function deckImageRect($im, float $x1, float $y1, float $x2, float $y2, int $color): void {
    imagefilledrectangle($im, deckImageK($x1), deckImageK($y1), deckImageK($x2 + 1) - 1, deckImageK($y2 + 1) - 1, $color);
}

/** Copies a whole image (drawn at scale: deckImageThumb, deckImageShadow) at ($x, $y). */
function deckImageCopy($im, $src, float $x, float $y): void {
    imagecopy($im, $src, deckImageK($x), deckImageK($y), 0, 0, imagesx($src), imagesy($src));
}

/** $text cut with « … » to fit $maxW. */
function deckImageEllipsis(string $font, float $px, string $text, int $maxW): string {
    if (deckImageBox($font, $px, $text)['w'] <= $maxW) return $text;
    while (mb_strlen($text) > 1 && deckImageBox($font, $px, $text . '…')['w'] > $maxW) $text = rtrim(mb_substr($text, 0, -1));
    return $text . '…';
}

/** $text in lines of at most $maxW, the last one cut when there are more than $maxLines. */
function deckImageWrap(string $font, float $px, string $text, int $maxW, int $maxLines): array {
    $lines = [];
    $line  = '';
    foreach (preg_split('#\s+#u', trim($text)) as $word) {
        $try = $line === '' ? $word : $line . ' ' . $word;
        if ($line !== '' && deckImageBox($font, $px, $try)['w'] > $maxW) {
            $lines[] = $line;
            $line    = $word;
        } else {
            $line = $try;
        }
    }
    if ($line !== '') $lines[] = $line;
    if (count($lines) > $maxLines) {
        $lines = array_slice($lines, 0, $maxLines);
        $lines[$maxLines - 1] .= '…';
    }
    return array_map(function ($l) use ($font, $px, $maxW) { return deckImageEllipsis($font, $px, $l, $maxW); }, $lines);
}

/** Rounded rectangle, in layout units. */
function deckImageRoundedRect($im, float $x, float $y, float $w, float $h, float $r, int $color): void {
    [$x, $y, $w, $h, $r] = array_map('deckImageK', [$x, $y, $w, $h, $r]);
    $r = min($r, intdiv($w, 2), intdiv($h, 2));
    imagefilledrectangle($im, $x + $r, $y, $x + $w - $r - 1, $y + $h - 1, $color);
    imagefilledrectangle($im, $x, $y + $r, $x + $w - 1, $y + $h - $r - 1, $color);
    foreach ([[$x + $r, $y + $r], [$x + $w - $r - 1, $y + $r], [$x + $r, $y + $h - $r - 1], [$x + $w - $r - 1, $y + $h - $r - 1]] as [$cx, $cy]) {
        imagefilledellipse($im, $cx, $cy, $r * 2, $r * 2, $color);
    }
}

/**
 * $src resized to $w×$h layout units (cover), corners rounded with transparency. $region crops the source
 * first: [x, y, width, height] as fractions of its size.
 */
function deckImageThumb($src, float $w, float $h, float $radius, array $region = [0, 0, 1, 1]) {
    [$w, $h, $radius] = array_map('deckImageK', [$w, $h, $radius]);
    $thumb = imagecreatetruecolor($w, $h);
    imagealphablending($thumb, false);
    imagesavealpha($thumb, true);
    $rx = (int)round(imagesx($src) * $region[0]);
    $ry = (int)round(imagesy($src) * $region[1]);
    $sw = (int)round(imagesx($src) * $region[2]);
    $sh = (int)round(imagesy($src) * $region[3]);
    $scale = max($w / $sw, $h / $sh);
    $cw  = (int)round($w / $scale);
    $chh = (int)round($h / $scale);
    imagecopyresampled($thumb, $src, 0, 0, $rx + intdiv($sw - $cw, 2), $ry, $w, $h, $cw, $chh);
    return deckImageRoundCorners($thumb, $radius);
}

/** Card shadow: a translucent black rounded rectangle (GD alpha: 0 opaque … 127 transparent). */
function deckImageShadow(float $w, float $h, float $radius, int $alpha = 70) {
    [$w, $h, $radius] = array_map('deckImageK', [$w, $h, $radius]);
    $shadow = imagecreatetruecolor($w, $h);
    imagealphablending($shadow, false);
    imagesavealpha($shadow, true);
    imagefilledrectangle($shadow, 0, 0, $w - 1, $h - 1, imagecolorallocatealpha($shadow, 0, 0, 0, $alpha));
    return deckImageRoundCorners($shadow, $radius);
}

/** Fades out the pixels outside the quarter circles of the corners (1 px of anti-aliasing), in pixels. */
function deckImageRoundCorners($thumb, int $radius) {
    $w = imagesx($thumb);
    $h = imagesy($thumb);
    for ($dy = 0; $dy < $radius; $dy++) {
        for ($dx = 0; $dx < $radius; $dx++) {
            $dist  = sqrt(($radius - $dx - 0.5) ** 2 + ($radius - $dy - 0.5) ** 2) - $radius;
            if ($dist <= -1) continue;
            $cover = max(0.0, min(1.0, -$dist));
            foreach ([[$dx, $dy], [$w - 1 - $dx, $dy], [$dx, $h - 1 - $dy], [$w - 1 - $dx, $h - 1 - $dy]] as [$px, $py]) {
                $rgba  = imagecolorat($thumb, $px, $py);
                $alpha = 127 - (int)round((127 - (($rgba >> 24) & 0x7F)) * $cover);
                imagesetpixel($thumb, $px, $py, ($alpha << 24) | ($rgba & 0xFFFFFF));
            }
        }
    }
    return $thumb;
}

/**
 * Layout of the sections (one per card type, side by side, each $rows rows high) in a $areaW×$areaH box: the
 * row count giving the largest cards. $sections: [['count' => stacks, 'minW' => label width], …].
 * Returns the card width/height, copy offset, gaps, rows, row height and each section's columns and width.
 */
function deckImageLayout(array $sections, int $maxCopies, int $areaW, int $areaH): array {
    $gap = 10;
    $rowGap = 12;
    $sep = 36;
    $best = null;
    for ($rows = 1; $rows <= 10; $rows++) {
        $cols  = array_map(function ($s) use ($rows) { return max(1, (int)ceil($s['count'] / $rows)); }, $sections);
        $total = array_sum($cols);
        $byW   = ($areaW - $sep * (count($sections) - 1) - $gap * ($total - count($sections))) / $total;
        $byH   = (($areaH - ($rows - 1) * $rowGap) / $rows) / (DECK_IMAGE_RATIO + ($maxCopies - 1) * 0.175);
        $w     = (int)floor(min($byW, $byH, 150));
        // A section is at least as wide as its label.
        do {
            $widths = [];
            foreach ($sections as $i => $s) $widths[] = max($cols[$i] * $w + ($cols[$i] - 1) * $gap, $s['minW']);
            if (array_sum($widths) + $sep * (count($sections) - 1) <= $areaW) break;
        } while (--$w > 20);
        if ($best === null || $w > $best['w']) {
            $h    = (int)round($w * DECK_IMAGE_RATIO);
            $off  = (int)round($w * 0.175);
            $best = ['w' => $w, 'h' => $h, 'off' => $off, 'gap' => $gap, 'rowGap' => $rowGap, 'sep' => $sep, 'rows' => $rows,
                     'rowH' => $h + ($maxCopies - 1) * $off, 'cols' => $cols, 'widths' => $widths];
        }
    }
    return $best;
}

/** QR code of $text on a white square ($size layout units, quiet zone included) at ($x, $y). */
function deckImageQr($im, string $text, float $x, float $y, float $size): bool {
    $qr = qrMatrix($text);
    if ($qr === null) return false;
    $n = count($qr);
    deckImageRoundedRect($im, $x, $y, $size, $size, 6, deckImageColor($im, '#ffffff'));
    $ink = deckImageColor($im, '#000000');
    $module = ($size - 2 * 5) / $n; // 5 units of quiet zone
    foreach ($qr as $r => $row) {
        foreach ($row as $c => $dark) {
            if (!$dark) continue;
            imagefilledrectangle($im, deckImageK($x + 5 + $c * $module), deckImageK($y + 5 + $r * $module),
                deckImageK($x + 5 + ($c + 1) * $module) - 1, deckImageK($y + 5 + ($r + 1) * $module) - 1, $ink);
        }
    }
    return true;
}

/**
 * Renders the image; returns a GD image. $deckUrl (absolute) is printed as a QR code in the banner. $complete is
 * false when a card image or a unique's data is missing.
 */
function deckImageRender(array $deck, string $lang, ?bool &$complete = null, string $deckUrl = '') {
    $txt    = deckImageLabels($lang);
    $fonts  = dirname(__DIR__) . '/assets/font/';
    $fTitle = $fonts . 'Tiller-Bold.ttf';
    $fBody  = $fonts . 'HapticPro-Regular.ttf';
    $fBold  = $fonts . 'HapticPro-Extrabold.ttf';
    $assets = dirname(__DIR__) . '/plugins/core-altered-cards/assets/';
    [, $panel] = deckPreviewColors($deck);
    $stacks = deckImageStacks($deck);
    $stats  = deckImageStats($deck);

    // Images: the hero and one per card reference, in the deck's language, else in English.
    $heroRef = (string)($deck['stats']['hero']['reference'] ?? '');
    $refs    = array_values(array_unique(array_merge($heroRef !== '' ? [$heroRef] : [], ...array_map(function ($s) { return $s['refs']; }, $stacks ?: [['refs' => []]]))));
    $urls    = [];
    foreach ($refs as $ref) $urls[$ref] = deckImageCardUrl($ref, $lang);
    $got = deckImageDownload(array_values($urls));
    if ($lang !== 'en') {
        $missing = array_values(array_filter($refs, function ($r) use ($urls, $got) { return !isset($got[$urls[$r]]); }));
        foreach ($missing as $ref) $urls[$ref] = deckImageCardUrl($ref, 'en');
        if ($missing) $got += deckImageDownload(array_map(function ($r) use ($urls) { return $urls[$r]; }, $missing));
    }
    // Uniques: their own face, drawn from their data on their illustration.
    $uniqueRefs = array_values(array_filter($refs, 'deckImageIsUnique'));
    $uniqueLang = in_array($lang, ['en', 'fr'], true) ? $lang : 'en';
    $faces   = [];
    $artUrls = [];
    $arts    = [];
    if ($uniqueRefs && deckUniqueAvailable()) {
        $faces = deckUniqueFetch($uniqueRefs, $uniqueLang);
        foreach ($faces as $ref => $card) $artUrls[$ref] = deckUniqueArtUrls($ref, deckUniqueFrame($card, $uniqueLang));
        $arts = $artUrls ? deckImageDownload(array_merge(...array_values($artUrls))) : [];
    }
    $complete = !deckUniqueAvailable() || count($faces) === count($uniqueRefs);

    // A card's full-size image (its face for a Unique), decoded only when drawn: a 60-card deck does not fit in
    // memory at full size. The caller destroys it.
    $load = function (string $ref) use (&$complete, $got, $urls, $faces, $artUrls, $arts, $uniqueLang) {
        if (isset($faces[$ref])) {
            $art = null;
            foreach ($artUrls[$ref] as $url) if (isset($arts[$url]) && ($art = deckImageDecode($arts[$url]))) break;
            if (!$art) $complete = false;
            $face = deckUniqueRender($faces[$ref], $art, $uniqueLang);
            if ($art) imagedestroy($art);
            return $face;
        }
        $image = deckImageDecode($got[$urls[$ref]] ?? null);
        if (!$image) $complete = false;
        return $image;
    };

    $im = imagecreatetruecolor(deckImageK(DECK_IMAGE_WIDTH), deckImageK(DECK_IMAGE_HEIGHT));
    imagealphablending($im, true);
    $white = deckImageColor($im, '#ffffff');
    $soft  = deckImageColor($im, '#ffffff', 34);
    $gold  = deckImageColor($im, '#e8b45a');
    $ink   = deckImageColor($im, '#3b3340');
    $line  = deckImageColor($im, '#e6dfe4');
    deckImageRect($im, 0, 0, DECK_IMAGE_WIDTH - 1, DECK_IMAGE_HEIGHT - 1, $white);
    deckImageRect($im, 0, 0, DECK_IMAGE_WIDTH - 1, DECK_IMAGE_BANNER - 1, deckImageColor($im, $panel));

    // ── Banner, right to left: total power, cost curve, then the deck's identity in what is left ──
    $pad = DECK_IMAGE_PAD;
    $right = DECK_IMAGE_WIDTH - $pad;
    if ($deckUrl !== '' && deckImageQr($im, $deckUrl, $right - 100, intdiv(DECK_IMAGE_BANNER - 100, 2), 100)) $right -= 100 + 32;
    $bx  = $right - 160;
    if ($stats['power'] !== null) {
        deckImageText($im, $fBold, 11, $bx, 20, $soft, mb_strtoupper($txt['power']));
        $by = 40;
        foreach ($stats['power'] as $biome => $total) {
            $iconFile = $assets . 'biome/' . $biome . '.webp';
            $icon = is_file($iconFile) && function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($iconFile) : null;
            if ($icon) {
                imagecopyresampled($im, $icon, deckImageK($bx), deckImageK($by), 0, 0, deckImageK(22), deckImageK(22), imagesx($icon), imagesy($icon));
                imagedestroy($icon);
            }
            deckImageText($im, $fBody, 14, $bx + 30, $by + 6, $white, $txt['biomes'][$biome]);
            $value = (string)$total;
            deckImageText($im, $fBold, 17, $bx + 160 - deckImageBox($fBold, 17, $value)['w'], $by + 4, $white, $value);
            $by += 28;
        }
        deckImageRect($im, $bx - 22, 22, $bx - 22, DECK_IMAGE_BANNER - 22, $soft);
    }

    // Cost curve: hand (white) and reserve (gold) side by side per cost.
    $cw = 250;
    $cx = $bx - 44 - $cw;
    deckImageText($im, $fBold, 11, $cx, 20, $soft, mb_strtoupper($txt['curve']));
    $lx = $cx + $cw;
    foreach ([[$txt['reserve'], $gold], [$txt['hand'], $white]] as [$label, $color]) {
        $lx -= deckImageBox($fBody, 12, $label)['w'];
        deckImageText($im, $fBody, 12, $lx, 20, $white, $label);
        $lx -= 14;
        deckImageRect($im, $lx, 19, $lx + 8, 27, $color);
        $lx -= 12;
    }
    $max    = max(1, ...array_map(function ($b) { return max($b['hand'], $b['reserve']); }, $stats['curve']));
    $groupW = $cw / count($stats['curve']);
    $barW   = (int)min(12, floor(($groupW - 8) / 2));
    $base   = 98;
    foreach ($stats['curve'] as $i => $bucket) {
        $gx = (int)round($cx + $i * $groupW + ($groupW - 2 * $barW - 2) / 2);
        foreach ([[$bucket['hand'], $white, 0], [$bucket['reserve'], $gold, $barW + 2]] as [$n, $color, $dx]) {
            if ($n === 0) continue;
            $bh = max(2, (int)round($n / $max * 46));
            deckImageRect($im, $gx + $dx, $base - $bh, $gx + $dx + $barW - 1, $base - 1, $color);
            $nw = deckImageBox($fBold, 10, (string)$n)['w'];
            deckImageText($im, $fBold, 10, (int)($gx + $dx + ($barW - $nw) / 2), $base - $bh - 11, $white, (string)$n);
        }
        $lw = deckImageBox($fBold, 12, $bucket['label'])['w'];
        deckImageText($im, $fBold, 12, (int)round($cx + $i * $groupW + ($groupW - $lw) / 2), $base + 6, $soft, $bucket['label']);
    }

    // Identity: hero portrait, name, hero · format · author, copies per type.
    $heroImg = $heroRef !== '' ? $load($heroRef) : null;
    $tx = $pad;
    if ($heroImg) {
        $portrait = deckImageThumb($heroImg, 88, 88, 44, [0.15, 0.17, 0.7, 0.4]);
        deckImageCopy($im, $portrait, $pad, intdiv(DECK_IMAGE_BANNER - 88, 2));
        imagedestroy($portrait);
        imagedestroy($heroImg);
        $tx += 88 + 20;
    }
    $tw   = $cx - 32 - $tx;
    $name = mb_strtoupper(trim((string)($deck['name'] ?? '')));
    for ($size = 42; $size > 28 && deckImageBox($fTitle, $size, $name)['w'] > $tw; $size -= 2);
    $y   = deckImageText($im, $fTitle, $size, $tx, 26 + intdiv(42 - $size, 3), $white, deckImageEllipsis($fTitle, $size, $name, $tw));
    $sub = implode(' · ', array_filter([trim((string)($deck['stats']['hero']['name'] ?? '')), DECK_PREVIEW_FORMATS[$deck['format'] ?? ''] ?? '', deckPreviewByLine($deck, $lang) ?? ''], 'strlen'));
    if ($sub !== '') $y = deckImageText($im, $fBody, 17, $tx, $y + 13, $soft, deckImageEllipsis($fBody, 17, $sub, $tw));
    $types = [];
    foreach ($stats['types'] as $group => $n) if ($n > 0) $types[] = $n . ' ' . $txt['types'][$group][$n > 1 ? 1 : 0];
    if ($types) deckImageText($im, $fBold, 16, $tx, $y + 13, $white, deckImageEllipsis($fBold, 16, implode(' · ', $types), $tw));

    // ── Sections: one per card type, side by side ──
    $groups = [];
    foreach ($stacks as $stack) $groups[$stack['group']][] = $stack;
    ksort($groups);
    $sections = [];
    foreach ($groups as $group => $list) {
        $n     = $stats['types'][$group];
        $label = mb_strtoupper($txt['types'][$group][$n > 1 ? 1 : 0]) . ' · ' . $n;
        $sections[] = ['label' => $label, 'stacks' => $list, 'count' => count($list), 'minW' => deckImageBox($fBold, 13, $label)['w']];
    }
    if (!$sections) return $im;
    $maxCopies = max(1, ...array_map(function ($s) { return count($s['refs']); }, $stacks));
    $areaW  = DECK_IMAGE_WIDTH - 2 * $pad;
    $labelH = 26;
    $top    = DECK_IMAGE_BANNER + 18;
    $areaH  = DECK_IMAGE_HEIGHT - $top - 16 - $labelH;
    $grid   = deckImageLayout($sections, $maxCopies, $areaW, $areaH);
    $gridH  = $grid['rows'] * $grid['rowH'] + ($grid['rows'] - 1) * $grid['rowGap'];
    $top   += intdiv(max(0, $areaH - $gridH), 2); // vertically centred below the banner
    $radius = max(4, (int)round($grid['w'] * 0.05));
    $drop   = deckImageShadow($grid['w'], $grid['h'], $radius, 92);
    $pill   = deckImageColor($im, '#c37424');
    $empty  = deckImageColor($im, '#ece6ea');
    $thumbs = [];
    $usedW  = array_sum($grid['widths']) + $grid['sep'] * (count($sections) - 1);
    $sx0    = $pad + ($areaW - $usedW) / 2;
    $gridTop = $top + $labelH;
    foreach ($sections as $i => $section) {
        if ($i > 0) {
            $lineX = $sx0 - intdiv($grid['sep'], 2);
            deckImageRect($im, $lineX, $top, $lineX, min(DECK_IMAGE_HEIGHT - 16, $gridTop + $gridH), $line);
        }
        deckImageText($im, $fBold, 13, $sx0, $top + 2, $ink, $section['label']);
        foreach ($section['stacks'] as $j => $stack) {
            $sx = $sx0 + ($j % $grid['cols'][$i]) * ($grid['w'] + $grid['gap']);
            $sy = $gridTop + intdiv($j, $grid['cols'][$i]) * ($grid['rowH'] + $grid['rowGap']);
            foreach ($stack['refs'] as $c => $ref) {
                $cy = $sy + $c * $grid['off'];
                deckImageCopy($im, $drop, $sx + 1, $cy + 2);
                if (!isset($thumbs[$ref])) {
                    $source = $load($ref);
                    $thumbs[$ref] = $source ? deckImageThumb($source, $grid['w'], $grid['h'], $radius) : false;
                    if ($source) imagedestroy($source);
                }
                if ($thumbs[$ref]) {
                    deckImageCopy($im, $thumbs[$ref], $sx, $cy);
                } else {
                    deckImageRoundedRect($im, $sx, $cy, $grid['w'], $grid['h'], $radius, $empty);
                    $ty = $cy + 10;
                    foreach (deckImageWrap($fBold, 11, $stack['name'], $grid['w'] - 12, 3) as $l) $ty = deckImageText($im, $fBold, 11, $sx + 6, $ty, $ink, $l) + 5;
                }
            }
            if ($stack['unique'] && !isset($faces[$stack['refs'][0]])) {
                $label = mb_strtoupper($txt['unique']);
                $pw    = deckImageBox($fBold, 11, $label)['w'] + 16;
                $px    = $sx + ($grid['w'] - $pw) / 2;
                $py    = $sy + $grid['h'] - 9;
                deckImageRoundedRect($im, $px, $py, $pw, 18, 9, $pill);
                deckImageText($im, $fBold, 11, $px + 8, $py + 5, $white, $label);
            }
        }
        $sx0 += $grid['widths'][$i] + $grid['sep'];
    }
    foreach (array_merge([$drop], array_filter($thumbs)) as $gd) imagedestroy($gd);
    return $im;
}

/** Cache file of a deck version's image; null without a writable cache directory. */
function deckImageCachePath(string $id, string $lang, string $version): ?string {
    $dir = sys_get_temp_dir() . '/alteredcore-deck-image';
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) return null;
    return $dir . '/' . strtolower($id) . '-' . $lang . '-' . $version . '-' . DECK_IMAGE_VERSION . '.jpg';
}

/**
 * The deck's image as a JPEG file: ['file' => path, 'temporary' => bool]. Drawn once per deck version (one request
 * draws, the others wait for it) and cached, the previous versions of the deck in that language removed. An image
 * drawn with missing cards (CDN or cards API down) is not cached: 'temporary', the caller deletes it once sent.
 */
function deckImageFile(array $deck, string $lang, string $deckUrl = ''): ?array {
    $id   = (string)($deck['id'] ?? '');
    $file = deckImageCachePath($id, $lang, deckPreviewVersion($deck));
    if ($file === null) return null;
    if (is_file($file)) return ['file' => $file, 'temporary' => false];
    $lock = fopen($file . '.lock', 'c');
    if ($lock) flock($lock, LOCK_EX);
    try {
        if (is_file($file)) return ['file' => $file, 'temporary' => false];
        $im  = deckImageRender($deck, $lang, $complete, $deckUrl);
        $tmp = $file . '.' . getmypid() . '.tmp';
        $ok  = imagejpeg($im, $tmp, 85);
        imagedestroy($im);
        if (!$ok) return null;
        if (!$complete) return ['file' => $tmp, 'temporary' => true];
        if (!rename($tmp, $file)) return null;
        foreach (glob(dirname($file) . '/' . strtolower($id) . '-' . $lang . '-*.jpg') ?: [] as $old) {
            if ($old !== $file) @unlink($old);
        }
        return ['file' => $file, 'temporary' => false];
    } finally {
        if ($lock) {
            flock($lock, LOCK_UN);
            fclose($lock);
            @unlink($file . '.lock');
        }
    }
}
