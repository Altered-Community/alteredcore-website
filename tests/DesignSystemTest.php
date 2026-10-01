<?php
// Design system checks (design-system/README.md): breakpoints, icons, hard-coded colours, docs.
if (!defined('BASE_URL')) define('BASE_URL', '');
require_once __DIR__ . '/../design-system/php/ui.php';

$root = dirname(__DIR__);
$ds   = $root . '/design-system';

// ---- Breakpoints: the SCSS and TS copies (and the Re:Builder copy) agree ----
$scss = (string)file_get_contents($ds . '/tokens/breakpoints.scss');
$ts   = (string)file_get_contents($ds . '/tokens/breakpoints.ts');
preg_match('/\$medium:\s*(\d+)px/', $scss, $sm);
preg_match('/\$expanded:\s*(\d+)px/', $scss, $se);
preg_match('/medium:\s*(\d+)/', $ts, $tm);
preg_match('/expanded:\s*(\d+)/', $ts, $te);
assertSame('768', $sm[1] ?? null, 'breakpoints.scss: medium is 768px');
assertSame('1200', $se[1] ?? null, 'breakpoints.scss: expanded is 1200px');
assertSame([$sm[1] ?? null, $se[1] ?? null], [$tm[1] ?? null, $te[1] ?? null], 'breakpoints.ts matches breakpoints.scss');
foreach (glob($root . '/plugins/*/app/src/app/core/breakpoints.ts') ?: [] as $copy) {
    $c = (string)file_get_contents($copy);
    if (strpos($c, "design-system/tokens/breakpoints'") !== false) { assertSame(true, true, substr($copy, strlen($root) + 1) . ' imports the design system breakpoints'); continue; }
    preg_match('/medium:\s*(\d+)/', $c, $cm);
    preg_match('/expanded:\s*(\d+)/', $c, $ce);
    assertSame([$tm[1] ?? null, $te[1] ?? null], [$cm[1] ?? null, $ce[1] ?? null], substr($copy, strlen($root) + 1) . ' matches the design system breakpoints');
}

// ---- Stylesheets loaded by the shell exist ----
foreach (array_unique(array_merge(dsDocumentStylesheets(), dsShadowStylesheets(), ['js/ac.js', 'icons/sprite.svg'])) as $rel) {
    assertSame(true, is_file($ds . '/' . $rel), "design-system/{$rel} exists");
}

// ---- Icons ----
$svg = ac_icon('house');
assertSame(true, strpos($svg, '<svg class="ac-icon"') === 0 && strpos($svg, 'aria-hidden="true"') !== false, 'ac_icon() renders a decorative inline SVG');
assertSame(true, strpos(ac_icon('trash-2', '', 'Delete'), 'aria-label="Delete"') !== false, 'ac_icon() with a label is announced');
$fromFa = ac_icon('fa-solid fa-house me-1');
assertSame(true, strpos($fromFa, 'class="ac-icon me-1"') !== false && strpos($fromFa, dsIcons()['house']) !== false, 'ac_icon() maps a Font Awesome class list and keeps the other classes');
assertSame(true, strpos(ac_icon('fa-solid fa-xmark'), dsIcons()['x']) !== false, 'ac_icon() maps renamed Font Awesome icons (xmark → x)');
assertSame(true, strpos(ac_icon('fa-solid fa-spinner fa-spin'), 'ac-icon--spin') !== false, 'ac_icon() maps fa-spin');
assertSame(true, strpos(ac_icon('brand-github'), 'fill="currentColor"') !== false, 'ac_icon() renders brand logos filled');
assertSame('', ac_icon('no-such-icon'), 'ac_icon() renders nothing for an unknown name');
assertSame('<i class="fak fa-collection" aria-hidden="true"></i>', ac_icon('fak fa-collection'), 'ac_icon() leaves Altered glyphs to the glyph font');
assertSame(true, strpos(ac_icon('"><script>'), '<script>') === false, 'ac_icon() never echoes its input');

foreach (dsFaMap() as $fa => $target) {
    if (!isset(dsIcons()[$target])) assertSame(true, false, "fa-map.json: {$fa} → {$target} is an icon");
}

// Every Font Awesome name used in the repo is drawn by fa-shim.css (else the icon disappears).
$shim = (string)file_get_contents($ds . '/icons/fa-shim.css');
$modifiers = '/^(solid|regular|brands|kit|spin|pulse|fw|xs|sm|lg|[0-9]+x|beat|fade|flip|shake|bounce|inverse|border|pull-left|pull-right|stack|stack-1x|stack-2x|ul|li)$/';
$missing = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($it as $file) {
    $path = str_replace('\\', '/', substr($file->getPathname(), strlen($root) + 1));
    if (preg_match('#(^|/)(node_modules|dist|\.angular|tinymce|uploads|vendor|\.git)(/|$)#', $path) || strpos($path, 'design-system/icons') === 0) continue;
    if (!preg_match('/\.(php|js|json|sql|html|ts)$/', $path)) continue;
    $text = (string)file_get_contents($file->getPathname());
    if (!preg_match_all('/\b(?:fa-solid|fa-regular|fa-brands|fas|far|fab)\b((?:\s+[\w-]+)+)|((?:[\w-]+\s+)+)(?:fa-solid|fa-regular)\b/', $text, $m, PREG_SET_ORDER)) continue;
    foreach ($m as $match) {
        $list = trim(($match[1] ?? '') !== '' ? $match[1] : ($match[2] ?? ''));
        foreach (preg_split('/\s+/', $list) as $cls) {
            if (strpos($cls, 'fa-') !== 0) continue;
            $name = substr($cls, 3);
            if ($name === '' || preg_match($modifiers, $name)) continue;
            if (strpos($shim, '.fa-' . $name . ':is(') === false) $missing[$name][] = $path;
        }
    }
}
$report = [];
foreach ($missing as $name => $paths) $report[] = $name . ' (' . implode(', ', array_unique($paths)) . ')';
assertSame([], $report, 'every Font Awesome name used in the repo is in icons/fa-shim.css (add it to fa-map.json and run icons/build.mjs)');

// ---- No hard-coded colour outside the tokens ----
$colour = '/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/';
$cssFiles = array_merge(
    [$root . '/css/style.css'],
    glob($root . '/themes/*/style.css') ?: [],
    glob($ds . '/css/*.css') ?: [],
    glob($ds . '/css/components/*.css') ?: [],
    glob($ds . '/css/bridges/*.css') ?: []
);
$pluginStyles = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root . '/plugins', FilesystemIterator::SKIP_DOTS));
foreach ($pluginStyles as $file) {
    $path = str_replace('\\', '/', $file->getPathname());
    if (preg_match('#/(node_modules|dist|\.angular)/#', $path)) continue;
    if (preg_match('/\.(css|scss)$/', $path)) $cssFiles[] = $path;
}
$found = [];
foreach ($cssFiles as $f) {
    $lines = file($f) ?: [];
    foreach ($lines as $n => $line) {
        $code = preg_replace('#/\*.*?\*/#', '', $line);           // same-line comments
        $code = preg_replace('/url\((["\']?)data:[^)]*\)/', '', $code); // data URIs (SVG masks)
        if (preg_match($colour, $code)) $found[] = substr($f, strlen($root) + 1) . ':' . ($n + 1);
    }
}
assertSame([], $found, 'no hex / rgb() / hsl() colour in page, theme, plugin or component CSS (use --ac-* tokens)');

// ---- Font sizes come from the tokens (--ac-font-size-*, --ac-font-*) ----
// Checked in the design system and in Re:Builder. A size off the scale stays local to the screen
// that needs it and is listed here; anything else uses a token.
$fontSize = '/(?:font-size\s*:|\bfont\s*:[^;]*?)\s*[0-9.]+(?:px|rem)\b/';
$offScale = [
    'plugins/rebuilder/app/src/app/features/deck/deck-page/deck.page.scss' => ['24px'],
    'plugins/rebuilder/app/src/app/features/deck/hand-stats/hand-stats.scss' => ['32px', '24px'],
    'plugins/rebuilder/app/src/app/features/deck/test-hand/test-hand.scss' => ['22px'],
    'plugins/rebuilder/app/src/app/features/decks/decks-page/decks.page.scss' => ['30px'],
    'plugins/rebuilder/app/src/app/features/shared/alt-art-slots/alt-art-slots.scss' => ['10px'],
    'plugins/rebuilder/app/src/app/ui/metier/cost-chart/cost-chart.scss' => ['10px', '10px'],
    'plugins/rebuilder/app/src/app/ui/metier/deck-summary/deck-summary.scss' => ['19px'],
];
$sizeFiles = array_merge(glob($ds . '/css/*.css') ?: [], glob($ds . '/css/components/*.css') ?: [], glob($ds . '/css/bridges/*.css') ?: []);
$rebuilderSrc = $root . '/plugins/rebuilder/app/src';
if (is_dir($rebuilderSrc)) {
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($rebuilderSrc, FilesystemIterator::SKIP_DOTS)) as $file) {
        if (preg_match('/\.(css|scss)$/', $file->getFilename())) $sizeFiles[] = str_replace('\\', '/', $file->getPathname());
    }
}
$found = [];
foreach ($sizeFiles as $f) {
    $rel = substr($f, strlen($root) + 1);
    $allowed = $offScale[$rel] ?? [];
    foreach (file($f) ?: [] as $n => $line) {
        $code = preg_replace('#/\*.*?\*/#', '', $line);
        if (!preg_match($fontSize, $code, $m)) continue;
        preg_match('/[0-9.]+(?:px|rem)/', $m[0], $v);
        $i = array_search($v[0], $allowed, true);
        if ($i !== false) { unset($allowed[$i]); continue; }
        $found[] = $rel . ':' . ($n + 1) . ' ' . $v[0];
    }
}
assertSame([], $found, 'no raw font size in the design system or Re:Builder CSS (use --ac-font-size-* or --ac-font-*)');

// ---- Components are documented ----
foreach (dsComponentFiles() as $rel) {
    $doc = $ds . '/docs/components/' . basename($rel, '.css') . '.md';
    assertSame(true, is_file($doc), 'design-system/docs/components/' . basename($doc) . ' documents ' . $rel);
}

// ---- The look has no admin setting: nothing reads a colour, background, font or layout setting ----
$lookKeys = '/getSetting\(\s*[\'"](theme_color|bg_color|bg_image|bg_image_mode|footer_bg_image|footer_bg_mode|footer_deco_[a-z_]+|font_[a-z_]+|active_theme|navbar_width|sidebar_side|sidebar_btn_position)[\'"]/';
$reads = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($it as $file) {
    $path = str_replace('\\', '/', $file->getPathname());
    if (substr($path, -4) !== '.php' || preg_match('#/(node_modules|dist|\.angular|\.claude|tests)/#', $path)) continue;
    foreach (file($path) ?: [] as $n => $line) {
        if (preg_match($lookKeys, $line)) $reads[] = substr($path, strlen($root) + 1) . ':' . ($n + 1);
    }
}
assertSame([], $reads, 'no look setting is read (theme and look come from the design system only)');
assertSame('#1463d6', dsToken('--ac-color-primary'), "dsToken() reads tokens.css (:root)");
assertSame(true, dsToken('--ac-color-primary', 'dark') !== null && dsToken('--ac-color-primary', 'dark') !== dsToken('--ac-color-primary'), "dsToken() reads the dark theme block");
