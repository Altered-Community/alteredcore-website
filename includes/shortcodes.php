<?php
// Renders shortcodes embedded in TinyMCE content.

function renderShortcodes(string $html): string {
    $html = _sc_render_btn($html);
    $html = _sc_render_card($html);
    $html = _sc_render_section_title($html);
    $html = _sc_render_altered_card($html);
    $html = _sc_render_altered_card_unique($html);
    return $html;
}

// [btn url="..." text="..." style="primary_sm" icon="fa-solid fa-eye" iconpos="after" newtab="1"]
function _sc_render_btn(string $html): string {
    static $styleMap = [
        'primary_sm'   => 'btn btn-primary-altered btn-sm',
        'primary'      => 'btn btn-primary-altered',
        'secondary_sm' => 'btn btn-outline-secondary btn-sm',
        'secondary'    => 'btn btn-outline-secondary',
        'danger_sm'    => 'btn btn-outline-danger btn-sm',
        'none'         => '',
    ];
    return preg_replace_callback('/\[btn\s([^\]]+)\]/i', function ($m) use ($styleMap) {
        $attrs   = _sc_attrs($m[1]);
        $url     = $attrs['url'] ?? '';
        if ($url === '') return $m[0];
        $text    = html_entity_decode($attrs['text'] ?? $url, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $style   = $attrs['style'] ?? 'primary_sm';
        $iconCls = trim($attrs['icon'] ?? '');
        $iconpos = $attrs['iconpos'] ?? 'after';
        $newtab  = isset($attrs['newtab']) && $attrs['newtab'] !== '0';

        $cls     = $styleMap[$style] ?? 'btn btn-primary-altered btn-sm';
        $clsAttr = $cls !== '' ? ' class="' . h($cls) . '"' : '';
        $tgtAttr = $newtab ? ' target="_blank" rel="noopener noreferrer"' : '';
        $iconHtml = $iconCls
            ? '<i class="' . h($iconCls) . ($iconpos === 'after' ? ' ms-1' : ' me-1') . '"></i>'
            : '';
        $content = $iconpos === 'before' ? $iconHtml . h($text) : h($text) . $iconHtml;
        return '<a href="' . h($url) . '"' . $clsAttr . $tgtAttr . '>' . $content . '</a>';
    }, $html);
}

// [section-title text="Latest news"]
function _sc_render_section_title(string $html): string {
    return preg_replace_callback('/\[section-title\s([^\]]+)\]/i', function ($m) {
        $attrs = _sc_attrs($m[1]);
        $text  = html_entity_decode(trim($attrs['text'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if ($text === '') return $m[0];
        return '<div class="section-title mb-0"><span>' . h($text) . '</span></div>';
    }, $html);
}

// [card ref="ALT_CORE_B_AX_01_C" lang="en"]
function _sc_render_card(string $html): string {
    return preg_replace_callback('/\[card\s([^\]]+)\]/i', function ($m) {
        $attrs = _sc_attrs($m[1]);
        $ref   = trim($attrs['ref'] ?? '');
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $ref)) return $m[0];
        $lang  = in_array($attrs['lang'] ?? '', ['en', 'fr', 'de', 'it', 'es'], true)
            ? $attrs['lang']
            : 'en';

        $parts  = explode('_', $ref);
        $set    = $parts[1] ?? '';
        $unique = isset($parts[5][0]) && $parts[5][0] === 'U' ? '1' : '0';
        $imgUrl = CDN_URL . '/cards/' . $lang . '/' . $set . '/' . $ref . '.webp';
        $detUrl = BASE_URL . '/pages/card?ref=' . rawurlencode($ref) . '&card_lang=' . $lang;

        return '<span class="altered-card-embed"'
             . ' data-ref="'    . h($ref)    . '"'
             . ' data-unique="' . $unique    . '"'
             . ' data-lang="'   . h($lang)   . '"'
             . ' data-url="'    . h($detUrl) . '"'
             . ' style="display:inline-block;max-width:180px;cursor:pointer;vertical-align:bottom">'
             . '<img src="' . h($imgUrl) . '" alt="' . h($ref) . '"'
             . ' style="width:100%;border-radius:8px;display:block" loading="lazy">'
             . '</span>';
    }, $html);
}

// [altered-card ref="ALT_CORE_B_01_C" width="166" height="230"]
// Non-unique card: plain CDN image, site language, explicit dimensions.
function _sc_render_altered_card(string $html): string {
    return preg_replace_callback('/\[altered-card\s([^\]]+)\]/i', function ($m) {
        $attrs  = _sc_attrs($m[1]);
        $ref    = trim($attrs['ref'] ?? '');
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $ref)) return $m[0];
        $parts  = explode('_', $ref);
        $set    = $parts[1] ?? '';
        if ($set === '') return $m[0];
        $lang   = getLang();
        $width  = max(1, (int)($attrs['width']  ?? 166));
        $height = max(1, (int)($attrs['height'] ?? 230));
        $imgUrl = CDN_URL . '/cards/' . $lang . '/' . $set . '/' . $ref . '.webp';
        return '<img src="'  . h($imgUrl) . '" alt="' . h($ref) . '"'
             . ' style="width:' . $width . 'px;height:' . $height . 'px'
             . ';object-fit:contain;border-radius:8px;display:inline-block;vertical-align:bottom"'
             . ' loading="lazy">';
    }, $html);
}

// [altered-card-unique ref="ALT_CORE_B_01_U_1" width="166" height="230"]
// Unique card: uses the JS card renderer (altered-card-embed, data-unique="1").
// The CDN image is the fallback; the JS renderer overlays/replaces it for unique renders.
function _sc_render_altered_card_unique(string $html): string {
    return preg_replace_callback('/\[altered-card-unique\s([^\]]+)\]/i', function ($m) {
        $attrs  = _sc_attrs($m[1]);
        $ref    = trim($attrs['ref'] ?? '');
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $ref)) return $m[0];
        $parts  = explode('_', $ref);
        $set    = $parts[1] ?? '';
        if ($set === '') return $m[0];
        $lang   = getLang();
        $width  = max(1, (int)($attrs['width']  ?? 166));
        $height = max(1, (int)($attrs['height'] ?? 230));
        $imgUrl = CDN_URL . '/cards/' . $lang . '/' . $set . '/' . $ref . '.webp';
        $detUrl = BASE_URL . '/pages/card?ref=' . rawurlencode($ref) . '&card_lang=' . $lang;
        return '<span class="altered-card-embed"'
             . ' data-ref="'    . h($ref)    . '"'
             . ' data-unique="1"'
             . ' data-lang="'   . h($lang)   . '"'
             . ' data-url="'    . h($detUrl) . '"'
             . ' style="display:inline-block;width:' . $width . 'px;height:' . $height . 'px'
             . ';cursor:pointer;vertical-align:bottom">'
             . '<img src="' . h($imgUrl) . '" alt="' . h($ref) . '"'
             . ' style="width:100%;height:100%;object-fit:contain;border-radius:8px;display:block"'
             . ' loading="lazy">'
             . '</span>';
    }, $html);
}

// Parses shortcode attribute string: name="value" name='value' name=value
// Decodes HTML entities first so TinyMCE-encoded quotes (&quot;, &#34;) are handled correctly.
function _sc_attrs(string $str): array {
    $attrs = [];
    $str = html_entity_decode($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    preg_match_all('/(\w+)=(?:"([^"]*)"|\'([^\']*)\'|(\S+))/', $str, $matches, PREG_SET_ORDER);
    foreach ($matches as $m) {
        $attrs[$m[1]] = $m[2] !== '' ? $m[2] : ($m[3] !== '' ? $m[3] : ($m[4] ?? ''));
    }
    return $attrs;
}
