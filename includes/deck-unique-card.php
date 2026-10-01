<?php
// A unique card's face drawn with GD (744×1039), for the decklist image (includes/deck-image.php). Nobody publishes
// a rendered image per unique: the CDN only has the illustration shared by every unique of a printed card. This is
// the PHP version of Re:Builder's `ar-unique-card` (plugins/rebuilder/app/src/app/ui/metier/unique-card/), itself
// laid out like Altered-Card-Renderer: positions in % of the card, sizes in px of the 744 px wide card.
//
// Assets: frames and fonts of Re:Builder (plugins/rebuilder/app/public/assets/unique-card/), biome badges and set
// logos rasterised from its SVGs (assets/deck-image/). Italics are drawn upright: Haptic Pro has no italic face.
require_once __DIR__ . '/qr-code.php';

const DECK_UNIQUE_W = 744;
const DECK_UNIQUE_H = 1039;
/** Middle of the main text's first line per frame (% of the height). */
const DECK_UNIQUE_EFFECT_Y = ['T1' => 65.5, 'T2' => 58, 'T3' => 73, 'T4' => 65];
/** `alteredicons` glyphs and sizes (relative to the text), as in Altered-Card-Renderer `core.json`. */
const DECK_UNIQUE_ICONS = [
    'R' => ["\u{e024}", 1], 'J' => ["\u{e026}", 0.8], 'H' => ["\u{e023}", 1], 'T' => ["\u{e027}", 1], 'D' => ["\u{e029}", 1.2],
    'O' => ["\u{e02d}", 1], 'M' => ["\u{e025}", 1], 'V' => ["\u{e037}", 1], 'I' => ["\u{e02f}", 0.8],
];
const DECK_UNIQUE_CIRCLED = ["\u{24ea}", "\u{2776}", "\u{2777}", "\u{2778}", "\u{2779}", "\u{277a}", "\u{277b}", "\u{277c}", "\u{277d}", "\u{277e}"];

function deckUniqueFonts(): array {
    $rb = dirname(__DIR__) . '/plugins/rebuilder/app/public/assets/unique-card/fonts/';
    $site = dirname(__DIR__) . '/assets/font/';
    return ['regular' => $site . 'HapticPro-Regular.ttf', 'bold' => $site . 'HapticPro-Extrabold.ttf',
            'icons' => $rb . 'alteredicons.woff2', 'circled' => $rb . 'NotoSansSymbols-circled.woff2'];
}

/** True when the frames and fonts are there; without them the image falls back to the common card. */
function deckUniqueAvailable(): bool {
    $fonts = deckUniqueFonts();
    return is_file($fonts['icons']) && is_file($fonts['circled']) && is_file(deckUniqueFramePath('LY', 'T1'));
}

function deckUniqueFramePath(string $faction, string $frame): string {
    return dirname(__DIR__) . '/plugins/rebuilder/app/public/assets/unique-card/frames/' . $faction . '_' . $frame . '.webp';
}

/** POST /api/cards/batch on the cards API: [reference => card] (name, costs, powers, effects, type, artist…). */
function deckUniqueFetch(array $refs, string $lang): array {
    if (!$refs || !defined('CARDS_API_URL') || CARDS_API_URL === '') return [];
    $ch = curl_init(rtrim(CARDS_API_URL, '/') . '/api/cards/batch?' . http_build_query(['locale' => $lang]));
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['references' => array_values($refs)]),
    ]);
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $list = $code === 200 && is_string($body) ? json_decode($body, true) : null;
    if (isset($list['member'])) $list = $list['member'];
    $out = [];
    foreach (is_array($list) ? $list : [] as $card) {
        if (is_array($card) && isset($card['reference'])) $out[$card['reference']] = $card;
    }
    return $out;
}

/** A field that is a string or a locale map. */
function deckUniqueLocalized($value, string $lang): string {
    if (is_array($value)) return (string)($value[$lang] ?? $value['en'] ?? reset($value) ?: '');
    return (string)($value ?? '');
}

function deckUniqueEcho(array $card, string $lang): string {
    $echo = $card['echoEffect'] ?? '';
    $list = is_array($echo) && array_keys($echo) === range(0, count($echo) - 1) ? $echo : [$echo];
    return implode('  ', array_filter(array_map(function ($v) use ($lang) { return deckUniqueLocalized($v, $lang); }, $list), 'strlen'));
}

/** T1/T2 carry a support box, T2/T4 leave room for 200+ characters of main text. */
function deckUniqueFrame(array $card, string $lang): string {
    $raw  = preg_replace('# {2,}#', ' ', str_replace('[]', '', preg_replace('#\{[A-Za-z0-9]\}#', 'X', deckUniqueLocalized($card['mainEffect'] ?? '', $lang))));
    $long = mb_strlen(trim($raw)) >= 200;
    if (deckUniqueEcho($card, $lang) !== '') return $long ? 'T2' : 'T1';
    return $long ? 'T4' : 'T3';
}

/** CDN illustrations of a unique, in the renderer's order: frameless cut for the frame, CORE copy, card asset. */
function deckUniqueArtUrls(string $ref, string $frame): array {
    if (!preg_match('#^(ALT_([A-Z0-9]+)_[A-Z]+_[A-Z]{2}_\d+)_U(?:_\d+)?$#', $ref, $m)) return [];
    $cdn = rtrim(CDN_URL, '/');
    $urls = [$cdn . '/illustrations/' . $m[2] . '/' . $m[1] . '_U_FRAMELESS_' . $frame . '.webp'];
    if ($m[2] === 'COREKS') $urls[] = $cdn . '/illustrations/CORE/' . str_replace('_COREKS_', '_CORE_', $m[1]) . '_U_FRAMELESS_' . $frame . '.webp';
    $urls[] = $cdn . '/cards/assets/' . $m[2] . '/' . $m[1] . '_U.webp';
    return $urls;
}

/**
 * Card text markup, as Re:Builder reads it (core/card-text.ts): `{J}` icons, `{2}` circled digits, `[keyword]`
 * bold, `[[link]]` bold underlined, `#text#` gold, `(reminder)` italic, `[]` a space, a double space between two
 * abilities. Returns lines of parts: ['text', string, style] | ['icon', glyph, scale] | ['number', glyph].
 */
function deckUniqueLines(string $text): array {
    if (trim($text) === '') return [];
    $lines = [];
    foreach (explode('  ', str_replace('—', '-', $text)) as $raw) {
        $parts = [];
        $italic = false;
        $push = function (string $t, array $style = []) use (&$parts, &$italic) {
            if ($t === '') return;
            if ($italic) $style['italic'] = true;
            $last = count($parts) - 1;
            if ($last >= 0 && $parts[$last][0] === 'text' && $parts[$last][2] == $style) $parts[$last][1] .= $t;
            else $parts[] = ['text', $t, $style];
        };
        preg_match_all('#\[\[(.*?)\]\]|\[\]|\[(.*?)\]|\#(.*?)\#|\{([A-Za-z0-9])\}|[()]#u', $raw, $all, PREG_SET_ORDER | PREG_OFFSET_CAPTURE);
        $at = 0;
        foreach ($all as $m) {
            $push(substr($raw, $at, $m[0][1] - $at));
            $at = $m[0][1] + strlen($m[0][0]);
            $tok = $m[0][0];
            if (isset($m[1]) && $m[1][1] >= 0 && strpos($tok, '[[') === 0) $push($m[1][0], ['bold' => true, 'underline' => true]);
            elseif ($tok === '[]') $push(' ');
            elseif (isset($m[2]) && $m[2][1] >= 0) $push($m[2][0], ['bold' => true]);
            elseif (isset($m[3]) && $m[3][1] >= 0) $push($m[3][0], ['gold' => true]);
            elseif (isset($m[4]) && $m[4][1] >= 0) {
                $code = strtoupper($m[4][0]);
                if (array_key_exists($code, DECK_UNIQUE_ICONS)) $parts[] = ['icon', DECK_UNIQUE_ICONS[$code][0], DECK_UNIQUE_ICONS[$code][1]];
                elseif (ctype_digit($code)) $parts[] = ['number', DECK_UNIQUE_CIRCLED[(int)$code]];
                else $push($m[4][0], ['bold' => true]);
            } elseif ($tok === '(') {
                $push('(');
                $italic = true;
            } else {
                $italic = false;
                $push(')');
            }
        }
        $push(substr($raw, $at));
        $hasContent = false;
        foreach ($parts as $p) if ($p[0] !== 'text' || trim($p[1]) !== '') $hasContent = true;
        if ($hasContent) $lines[] = $parts;
    }
    return $lines;
}

/** Printed length: the renderer's measure for the text size. */
function deckUniqueLength(array $lines): int {
    $n = 0;
    foreach ($lines as $line) foreach ($line as $p) $n += $p[0] === 'text' ? mb_strlen($p[1]) : 1;
    return $n + max(0, count($lines) - 1);
}

function deckUniqueStep(int $length, int $base, array $steps): int {
    foreach ($steps as [$from, $px]) if ($length >= $from) $base = $px;
    return $base;
}

/** Advance width of $text in px (spaces included). */
function deckUniqueAdvance(string $font, float $px, string $text): float {
    static $cache = [];
    $key = $font . '|' . $px . '|' . $text;
    if (!isset($cache[$key])) {
        $with = imagettfbbox($px * 0.75, 0, $font, 'x' . $text . 'x');
        $base = imagettfbbox($px * 0.75, 0, $font, 'xx');
        $cache[$key] = ($with[2] - $with[0]) - ($base[2] - $base[0]);
    }
    return $cache[$key];
}

/**
 * Draws effect lines from the middle of the first line at $y, $width wide ($narrowFrom: from that visual line
 * on, $narrowWidth instead), $px text, 1.2 line height. Breaks at spaces.
 */
function deckUniqueDrawText($im, array $lines, float $x, float $y, float $width, float $px, ?int $narrowFrom = null, float $narrowWidth = 0): void {
    $f = deckUniqueFonts();
    $white = imagecolorallocate($im, 255, 255, 255);
    $gold  = imagecolorallocate($im, 0xc3, 0x74, 0x24);
    $lineH = $px * 1.2;
    $visual = 0;
    foreach ($lines as $parts) {
        // Atoms: words with their trailing spaces, icons, numbers.
        $atoms = [];
        foreach ($parts as $p) {
            if ($p[0] !== 'text') { $atoms[] = $p; continue; }
            preg_match_all('#[^ ]* *| +#u', $p[1], $words);
            foreach ($words[0] as $word) if ($word !== '') $atoms[] = ['text', $word, $p[2]];
        }
        $rows = [[]];
        $r = 0;
        $used = 0;
        foreach ($atoms as $atom) {
            $max = $narrowFrom !== null && $visual + $r >= $narrowFrom ? $narrowWidth : $width;
            $prev = $rows[$r] ? $rows[$r][count($rows[$r]) - 1] : null;
            $breakable = $prev !== null && $prev[0] === 'text' && substr($prev[1], -1) === ' ';
            if ($breakable && $used + deckUniqueAtomWidth($atom, $px, true) > $max) {
                $rows[++$r] = [];
                $used = 0;
            }
            $rows[$r][] = $atom;
            $used += deckUniqueAtomWidth($atom, $px);
        }
        foreach ($rows as $row) {
            $baseline = $y + $visual * $lineH + $px * 0.35;
            $cx = $x;
            foreach ($row as $atom) {
                if ($atom[0] === 'text') {
                    $style = $atom[2];
                    $font = !empty($style['bold']) ? $f['bold'] : $f['regular'];
                    $color = !empty($style['gold']) ? $gold : $white;
                    imagettftext($im, $px * 0.75, 0, (int)round($cx), (int)round($baseline), $color, $font, $atom[1]);
                    $w = deckUniqueAdvance($font, $px, $atom[1]);
                    if (!empty($style['underline'])) {
                        $uw = deckUniqueAdvance($font, $px, rtrim($atom[1]));
                        imagefilledrectangle($im, (int)$cx, (int)($baseline + $px * 0.12), (int)($cx + $uw), (int)($baseline + $px * 0.12 + 2), $color);
                    }
                } elseif ($atom[0] === 'icon') {
                    $size = $px * $atom[2];
                    imagettftext($im, $size * 0.75, 0, (int)round($cx), (int)round($baseline - 4 + ($size - $px) * 0.1), $white, $f['icons'], $atom[1]);
                    $w = deckUniqueAdvance($f['icons'], $size, $atom[1]);
                } else {
                    $size = $px * 1.3;
                    imagettftext($im, $size * 0.75, 0, (int)round($cx), (int)round($baseline + $px * 0.12), $white, $f['circled'], $atom[1]);
                    $w = deckUniqueAdvance($f['circled'], $size, $atom[1]);
                }
                $cx += $w;
            }
            $visual++;
        }
    }
}

function deckUniqueAtomWidth(array $atom, float $px, bool $trimmed = false): float {
    $f = deckUniqueFonts();
    if ($atom[0] === 'icon') return deckUniqueAdvance($f['icons'], $px * $atom[2], $atom[1]);
    if ($atom[0] === 'number') return deckUniqueAdvance($f['circled'], $px * 1.3, $atom[1]);
    $text = $trimmed ? rtrim($atom[1]) : $atom[1];
    return deckUniqueAdvance(!empty($atom[2]['bold']) ? $f['bold'] : $f['regular'], $px, $text);
}

/** Text centred on ($cx, $cy) (middle of the cap height), with the print's soft dark shadow when $shadow. */
function deckUniqueCentered($im, string $font, float $px, float $cx, float $cy, int $color, string $text, bool $shadow = false, string $anchor = 'center'): void {
    $w = deckUniqueAdvance($font, $px, $text);
    $box = imagettfbbox($px * 0.75, 0, $font, 'H');
    $x = $anchor === 'center' ? $cx - $w / 2 : $cx;
    $baseline = $cy - $box[7] / 2;
    if ($shadow) {
        $dark = imagecolorallocatealpha($im, 0, 0, 0, 105);
        foreach ([[0, 3], [0, 5], [-2, 5], [2, 5], [0, 7], [-3, 6], [3, 6]] as [$dx, $dy]) {
            imagettftext($im, $px * 0.75, 0, (int)round($x + $dx), (int)round($baseline + $dy), $dark, $font, $text);
        }
    }
    imagettftext($im, $px * 0.75, 0, (int)round($x), (int)round($baseline), $color, $font, $text);
}

/** zero; best = the only highest of 2+ non-zero; small = the only lowest when none is zero; else normal. */
function deckUniqueBiomeVariants(array $values): array {
    $nonZero = array_values(array_filter($values, function ($v) { return $v > 0; }));
    $max = max($values);
    $min = $nonZero ? min($nonZero) : null;
    $counts = array_count_values($values);
    $allNonZero = count($nonZero) === count($values);
    return array_map(function ($v) use ($max, $min, $counts, $nonZero, $allNonZero) {
        if ($v === 0) return 'ZERO';
        if ($v === $max && $counts[$max] === 1 && count($nonZero) >= 2) return 'BIG';
        if ($v === $min && $counts[$min] === 1 && $allNonZero) return 'SMALL';
        return 'MID';
    }, $values);
}

/** Pastes a PNG/WebP file resized to $w (height kept in ratio), centred on ($cx, $cy); white when $white. */
function deckUniquePaste($im, string $file, float $cx, float $cy, float $w, ?float $maxH = null, bool $white = false): void {
    if (!is_file($file)) return;
    $src = substr($file, -5) === '.webp' ? @imagecreatefromwebp($file) : @imagecreatefrompng($file);
    if (!$src) return;
    $h = $w * imagesy($src) / imagesx($src);
    if ($maxH !== null && $h > $maxH) { $w = $w * $maxH / $h; $h = $maxH; }
    $dst = imagecreatetruecolor((int)round($w), (int)round($h));
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, imagesx($dst), imagesy($dst), imagesx($src), imagesy($src));
    if ($white) imagefilter($dst, IMG_FILTER_BRIGHTNESS, 255);
    imagealphablending($im, true);
    imagecopy($im, $dst, (int)round($cx - $w / 2), (int)round($cy - $h / 2), 0, 0, imagesx($dst), imagesy($dst));
    imagedestroy($src);
    imagedestroy($dst);
}

/**
 * The unique's face: illustration ($art, any size, cover), biome badges, frame of its faction, name, type, costs,
 * powers, main and support text, QR code of its reference, set logo and footer. Returns a 744×1039 GD image.
 */
function deckUniqueRender(array $card, $art, string $lang) {
    $W = DECK_UNIQUE_W;
    $H = DECK_UNIQUE_H;
    $f = deckUniqueFonts();
    $assets = dirname(__DIR__) . '/assets/deck-image/';
    $ref = (string)$card['reference'];
    $faction = $card['faction']['code'] ?? explode('_', $ref)[3] ?? 'AX';
    if (!in_array($faction, ['AX', 'BR', 'LY', 'MU', 'OR', 'YZ'], true)) $faction = 'AX';
    $frame = deckUniqueFrame($card, $lang);
    $pct = function (float $p, int $of) { return $p * $of / 100; };

    $im = imagecreatetruecolor($W, $H);
    imagealphablending($im, true);
    imagefilledrectangle($im, 0, 0, $W - 1, $H - 1, imagecolorallocate($im, 20, 16, 25));
    if ($art) {
        $scale = max($W / imagesx($art), $H / imagesy($art));
        $sw = (int)round($W / $scale);
        $sh = (int)round($H / $scale);
        imagecopyresampled($im, $art, 0, 0, intdiv(imagesx($art) - $sw, 2), intdiv(imagesy($art) - $sh, 2), $W, $H, $sw, $sh);
    }

    $hasStats = isset($card['mainCost']);
    $powers = [
        'FOREST'   => [(int)($card['forestPower'] ?? $card['displayPowers']['forest'] ?? 0), 23.5, 24],
        'MOUNTAIN' => [(int)($card['mountainPower'] ?? $card['displayPowers']['mountain'] ?? 0), 30.25, 30.5],
        'OCEAN'    => [(int)($card['oceanPower'] ?? $card['displayPowers']['ocean'] ?? 0), 37, 37],
    ];
    if ($hasStats) {
        $variants = deckUniqueBiomeVariants(array_column($powers, 0));
        $i = 0;
        foreach ($powers as $biome => [$value, $badgeY]) {
            deckUniquePaste($im, $assets . 'biomes/ALT_COMPONENT_' . $biome . '_' . $variants[$i++] . '.png', $pct(14.75, $W), $pct($badgeY, $H), $pct(25.5, $W));
        }
    }
    deckUniquePaste($im, deckUniqueFramePath($faction, $frame), $W / 2, $H / 2, $W);

    $white = imagecolorallocate($im, 255, 255, 255);
    $ink   = imagecolorallocate($im, 0, 0, 0);
    $name  = deckUniqueLocalized($card['name'] ?? '', $lang) ?: $ref;
    deckUniqueCentered($im, $f['bold'], 34, $W / 2, $pct(8.25, $H), $white, $name);
    $type = deckUniqueLocalized($card['cardType']['name'] ?? '', $lang);
    $subs = implode(', ', array_filter(array_map(function ($s) use ($lang) { return deckUniqueLocalized($s['name'] ?? '', $lang); }, $card['cardSubTypes'] ?? []), 'strlen'));
    deckUniqueCentered($im, $f['regular'], 28, $W / 2, $pct(12.25, $H), $ink, $subs !== '' ? $type . ' - ' . $subs : $type);
    if ($hasStats) {
        deckUniqueCentered($im, $f['bold'], 58, $pct(10.3, $W), $pct(8.25, $H), $white, (string)$card['mainCost'], true);
        deckUniqueCentered($im, $f['bold'], 48, $pct(17.3, $W), $pct(12, $H), $white, (string)($card['recallCost'] ?? ''), true);
        foreach ($powers as [$value, , $textY]) {
            deckUniqueCentered($im, $f['regular'], 46, $pct(10.5, $W), $pct($textY, $H), $white, (string)$value, true, 'left');
        }
    }

    // Main text; T3/T4 have no support box: after two lines it narrows to clear the QR code.
    $main = deckUniqueLines(deckUniqueLocalized($card['mainEffect'] ?? '', $lang));
    $echo = deckUniqueLines(deckUniqueEcho($card, $lang));
    $narrow = $frame === 'T3' || $frame === 'T4';
    $mainPx = deckUniqueStep(deckUniqueLength($main), 31, [[180, 28], [250, 25], [330, 22], [420, 19]]);
    deckUniqueDrawText($im, $main, $pct(8, $W), $pct(DECK_UNIQUE_EFFECT_Y[$frame], $H), $pct(85, $W), $mainPx, $narrow ? 2 : null, $pct(85, $W) - $pct(21, $W));
    if (!$narrow && $echo) {
        $echoPx = deckUniqueStep(deckUniqueLength($echo), 25, [[120, 22], [180, 19], [250, 16]]);
        deckUniqueDrawText($im, $echo, $pct(8, $W), $pct(85.5, $H), $pct(65, $W), $echoPx);
    }

    // QR code of the reference, no quiet zone, the Altered swirl in the middle on a white pad.
    $qr = qrMatrix($ref);
    if ($qr) {
        $size = $pct(18.5, $W);
        $n = count($qr);
        $x0 = $pct(84.5, $W) - $size / 2;
        $y0 = $pct(86.75, $H) + 1 - $size / 2;
        imagefilledrectangle($im, (int)round($x0), (int)round($y0), (int)round($x0 + $size) - 1, (int)round($y0 + $size) - 1, $white);
        foreach ($qr as $r => $row) {
            foreach ($row as $c => $dark) {
                if (!$dark) continue;
                imagefilledrectangle($im, (int)round($x0 + $c * $size / $n), (int)round($y0 + $r * $size / $n),
                    (int)round($x0 + ($c + 1) * $size / $n) - 1, (int)round($y0 + ($r + 1) * $size / $n) - 1, $ink);
            }
        }
        $pad = $size * 0.22 * 1.24;
        $cx = $pct(84.5, $W);
        $cy = $pct(86.75, $H);
        imagefilledrectangle($im, (int)round($cx - $pad / 2), (int)round($cy - $pad / 2), (int)round($cx + $pad / 2), (int)round($cy + $pad / 2), $white);
        deckUniquePaste($im, $assets . 'logos/Altered-Swirl.png', $cx, $cy, $size * 0.22, $size * 0.22);
    }

    // Set logo and footer « number ·  ✎ artist · Altered Fan Content ».
    $set = explode('_', $ref)[1] ?? '';
    $bravos = $faction === 'BR';
    $logo = $assets . 'logos/' . (is_file($assets . 'logos/' . $set . '.png') ? $set : 'Altered-Swirl') . '.png';
    deckUniquePaste($im, $logo, $pct(7, $W), $pct($bravos ? 95.25 : 96, $H), $pct(6, $W), $pct(3.5, $H), true);
    $number = (string)($card['collectorNumberFormatedId'] ?? '');
    if ($number === '') {
        $parts = explode('_', $ref);
        $number = (isset($card['set']['code']) ? $card['set']['code'] . '-' : '') . (count($parts) >= 6 ? implode('-', array_slice($parts, 3)) : $ref);
    }
    $artist = (string)($card['artists'][0]['name'] ?? '');
    $before = $artist !== '' ? $number . ' ·  ' : $number . ' · ';
    $after  = $artist !== '' ? ' ' . $artist . ' · Altered Fan Content' : 'Altered Fan Content';
    $wb = deckUniqueAdvance($f['regular'], 20, $before);
    $wp = $artist !== '' ? deckUniqueAdvance($f['icons'], 20, "\u{e02e}") : 0;
    $wa = deckUniqueAdvance($f['regular'], 20, $after);
    $fx = $pct(52, $W) - ($wb + $wp + $wa) / 2;
    $fy = $pct($bravos ? 95.5 : 95.25, $H);
    deckUniqueCentered($im, $f['regular'], 20, $fx, $fy, $white, $before, false, 'left');
    if ($artist !== '') deckUniqueCentered($im, $f['icons'], 20, $fx + $wb, $fy, $white, "\u{e02e}", false, 'left');
    deckUniqueCentered($im, $f['regular'], 20, $fx + $wb + $wp, $fy, $white, $after, false, 'left');
    return $im;
}
