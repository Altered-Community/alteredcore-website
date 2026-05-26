<?php
/**
 * HTML content sanitization — applied to rich-text fields before saving.
 *
 * Add new rules to $INLINE_STYLE_STRIP below.
 * Each entry removes one CSS property from every inline style="…" attribute
 * when that property's value matches the given regex.
 */

// rules

/**
 * Inline style properties to strip.
 * Format: 'css-property' => 'regex matching the unwanted value(s)'
 *
 * Add a new line here to strip another property/value combination.
 */
$INLINE_STYLE_STRIP = [

    // Black text color injected by copy-paste from Google Docs / Word.
    // Breaks dark theme (hardcoded black on dark background = invisible text).
    'color' => '/#000(?:000)?|black|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/i',

    // White background injected by copy-paste — breaks dark theme backgrounds.
    // 'background-color' => '/#fff(?:fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/i',

    // Explicit font-family from copy-paste — overrides site font stack.
    // 'font-family' => '/.+/i',

];

// engine

/**
 * Strips unwanted inline style declarations from an HTML string.
 * Removes the entire style="…" attribute when it becomes empty after stripping.
 */
function sanitizeHtmlContent(string $html): string {
    global $INLINE_STYLE_STRIP;

    return preg_replace_callback(
        '/\bstyle="([^"]*)"/i',
        function (array $m) {
            global $INLINE_STYLE_STRIP;
            $style = $m[1];
            foreach ($INLINE_STYLE_STRIP as $prop => $valuePattern) {
                $style = preg_replace(
                    '/\b' . preg_quote($prop, '/') . '\s*:\s*' . $valuePattern . '\s*;?\s*/i',
                    '',
                    $style
                );
            }
            $style = trim($style, " \t;");
            if ($style === '') return '';
            return 'style="' . $style . '"';
        },
        $html
    ) ?? $html;
}
