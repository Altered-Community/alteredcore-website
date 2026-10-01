<?php
// Minimal QR code encoder: byte mode, error correction M, versions 1–6 (up to 103 bytes). Same choices as
// QRCode.js on the Altered site (version from the text's length + 3, mask with the fewest penalty points), so a
// unique card drawn by includes/deck-unique-card.php carries the same code as on the site.

/** [total codewords, EC codewords per block, blocks] of versions 1–6 at level M. */
const QR_M_BLOCKS = [1 => [26, 10, 1], [44, 16, 1], [70, 26, 1], [100, 18, 2], [134, 24, 2], [172, 16, 4]];
const QR_M_BYTES  = [1 => 14, 26, 42, 62, 84, 106];
const QR_ALIGN    = [1 => [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

/** Modules of $text's QR code, [row][col] => bool (dark), without quiet zone; null when it is too long. */
function qrMatrix(string $text): ?array {
    $version = null;
    foreach (QR_M_BYTES as $v => $max) {
        if (strlen($text) + 3 <= $max) { $version = $v; break; }
    }
    if ($version === null) return null;
    $data = qrCodewords($text, $version);
    $best = null;
    $bestScore = PHP_INT_MAX;
    for ($mask = 0; $mask < 8; $mask++) {
        $m = qrBuild($version, $data, $mask);
        $score = qrPenalty($m);
        if ($score < $bestScore) { $best = $m; $bestScore = $score; }
    }
    return $best;
}

/** Data and error-correction codewords, interleaved. */
function qrCodewords(string $text, int $version): array {
    [$total, $ecLen, $blocks] = QR_M_BLOCKS[$version];
    $dataLen = $total - $ecLen * $blocks;
    $bits = '0100' . sprintf('%08b', strlen($text));
    foreach (str_split($text) as $ch) $bits .= sprintf('%08b', ord($ch));
    $bits .= str_repeat('0', min(4, $dataLen * 8 - strlen($bits)));
    $bits .= str_repeat('0', (8 - strlen($bits) % 8) % 8);
    $bytes = array_map('bindec', str_split($bits, 8));
    for ($i = 0; count($bytes) < $dataLen; $i++) $bytes[] = $i % 2 ? 0x11 : 0xEC;

    $per = intdiv($dataLen, $blocks);
    $dataBlocks = array_chunk($bytes, $per);
    $ecBlocks = array_map(function ($block) use ($ecLen) { return qrReedSolomon($block, $ecLen); }, $dataBlocks);
    $out = [];
    for ($i = 0; $i < $per; $i++) foreach ($dataBlocks as $b) $out[] = $b[$i];
    for ($i = 0; $i < $ecLen; $i++) foreach ($ecBlocks as $b) $out[] = $b[$i];
    return $out;
}

function qrReedSolomon(array $data, int $ecLen): array {
    static $exp = null, $log = null;
    if ($exp === null) {
        $exp = array_fill(0, 512, 0);
        $log = array_fill(0, 256, 0);
        for ($i = 0, $x = 1; $i < 255; $i++) {
            $exp[$i] = $x;
            $log[$x] = $i;
            $x <<= 1;
            if ($x & 0x100) $x ^= 0x11D;
        }
        for ($i = 255; $i < 512; $i++) $exp[$i] = $exp[$i - 255];
    }
    $mul = function (int $a, int $b) use ($exp, $log) { return $a && $b ? $exp[$log[$a] + $log[$b]] : 0; };
    // Generator (x - α^0)…(x - α^(n-1)), highest degree first.
    $gen = [1];
    for ($i = 0; $i < $ecLen; $i++) {
        $next = array_fill(0, count($gen) + 1, 0);
        foreach ($gen as $j => $c) {
            $next[$j] ^= $c;
            $next[$j + 1] ^= $mul($c, $exp[$i]);
        }
        $gen = $next;
    }
    $ec = array_fill(0, $ecLen, 0);
    foreach ($data as $byte) {
        $factor = $byte ^ $ec[0];
        array_shift($ec);
        $ec[] = 0;
        for ($i = 0; $i < $ecLen; $i++) $ec[$i] ^= $mul($gen[$i + 1], $factor);
    }
    return $ec;
}

function qrBuild(int $version, array $data, int $mask): array {
    $n = 17 + 4 * $version;
    $m = array_fill(0, $n, array_fill(0, $n, null));
    foreach ([[0, 0], [$n - 7, 0], [0, $n - 7]] as [$row, $col]) {
        for ($r = -1; $r <= 7; $r++) {
            for ($c = -1; $c <= 7; $c++) {
                if ($row + $r < 0 || $row + $r >= $n || $col + $c < 0 || $col + $c >= $n) continue;
                $m[$row + $r][$col + $c] = ($r >= 0 && $r <= 6 && ($c === 0 || $c === 6))
                    || ($c >= 0 && $c <= 6 && ($r === 0 || $r === 6))
                    || ($r >= 2 && $r <= 4 && $c >= 2 && $c <= 4);
            }
        }
    }
    foreach (QR_ALIGN[$version] as $row) {
        foreach (QR_ALIGN[$version] as $col) {
            if ($m[$row][$col] !== null) continue;
            for ($r = -2; $r <= 2; $r++) {
                for ($c = -2; $c <= 2; $c++) $m[$row + $r][$col + $c] = abs($r) === 2 || abs($c) === 2 || ($r === 0 && $c === 0);
            }
        }
    }
    for ($i = 8; $i < $n - 8; $i++) {
        if ($m[$i][6] === null) $m[$i][6] = $i % 2 === 0;
        if ($m[6][$i] === null) $m[6][$i] = $i % 2 === 0;
    }
    // Format information (level M = 00), BCH(15, 5).
    $format = $mask;
    $d = $format << 10;
    for ($i = 14; $i >= 10; $i--) if ($d & (1 << $i)) $d ^= 0x537 << ($i - 10);
    $bits = (($format << 10) | $d) ^ 0x5412;
    for ($i = 0; $i < 15; $i++) {
        $dark = (($bits >> $i) & 1) === 1;
        if ($i < 6) $m[$i][8] = $dark;
        elseif ($i < 8) $m[$i + 1][8] = $dark;
        else $m[$n - 15 + $i][8] = $dark;
        if ($i < 8) $m[8][$n - $i - 1] = $dark;
        elseif ($i < 9) $m[8][15 - $i] = $dark;
        else $m[8][14 - $i] = $dark;
    }
    $m[$n - 8][8] = true;

    $inc = -1;
    $row = $n - 1;
    $bit = 7;
    $byte = 0;
    for ($col = $n - 1; $col > 0; $col -= 2) {
        if ($col === 6) $col--;
        while (true) {
            for ($c = 0; $c < 2; $c++) {
                if ($m[$row][$col - $c] !== null) continue;
                $dark = $byte < count($data) && (($data[$byte] >> $bit) & 1) === 1;
                if (qrMask($mask, $row, $col - $c)) $dark = !$dark;
                $m[$row][$col - $c] = $dark;
                if (--$bit === -1) { $byte++; $bit = 7; }
            }
            $row += $inc;
            if ($row < 0 || $row >= $n) { $row -= $inc; $inc = -$inc; break; }
        }
    }
    return $m;
}

function qrMask(int $mask, int $i, int $j): bool {
    switch ($mask) {
        case 0: return ($i + $j) % 2 === 0;
        case 1: return $i % 2 === 0;
        case 2: return $j % 3 === 0;
        case 3: return ($i + $j) % 3 === 0;
        case 4: return (intdiv($i, 2) + intdiv($j, 3)) % 2 === 0;
        case 5: return ($i * $j) % 2 + ($i * $j) % 3 === 0;
        case 6: return (($i * $j) % 2 + ($i * $j) % 3) % 2 === 0;
        default: return (($i * $j) % 3 + ($i + $j) % 2) % 2 === 0;
    }
}

/** QRCode.js's penalty (getLostPoint). */
function qrPenalty(array $m): float {
    $n = count($m);
    $points = 0;
    $dark = 0;
    for ($r = 0; $r < $n; $r++) {
        for ($c = 0; $c < $n; $c++) {
            $same = 0;
            for ($dr = -1; $dr <= 1; $dr++) {
                for ($dc = -1; $dc <= 1; $dc++) {
                    if (($dr || $dc) && isset($m[$r + $dr][$c + $dc]) && $m[$r + $dr][$c + $dc] === $m[$r][$c]) $same++;
                }
            }
            if ($same > 5) $points += 3 + $same - 5;
            if ($m[$r][$c]) $dark++;
        }
    }
    for ($r = 0; $r < $n - 1; $r++) {
        for ($c = 0; $c < $n - 1; $c++) {
            $count = (int)$m[$r][$c] + (int)$m[$r + 1][$c] + (int)$m[$r][$c + 1] + (int)$m[$r + 1][$c + 1];
            if ($count === 0 || $count === 4) $points += 3;
        }
    }
    $pattern = [true, false, true, true, true, false, true];
    for ($r = 0; $r < $n; $r++) {
        for ($c = 0; $c < $n - 6; $c++) {
            $row = $col = true;
            for ($k = 0; $k < 7; $k++) {
                if ($m[$r][$c + $k] !== $pattern[$k]) $row = false;
                if ($m[$c + $k][$r] !== $pattern[$k]) $col = false;
            }
            if ($row) $points += 40;
            if ($col) $points += 40;
        }
    }
    return $points + abs(100 * $dark / $n / $n - 50) / 5 * 10;
}
