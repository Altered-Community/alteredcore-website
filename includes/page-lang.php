<?php
// Per-page texts, one JSON file per language (flat "key": "text" object), English as the fallback:
// a language without a file, or a key missing from its file, shows the English text.
// Add a language by dropping `<lang>.json` next to `en.json`; no code change.

/**
 * Texts of a page in the visitor's language.
 *
 * @param string $dir Folder holding en.json, fr.json…
 * @return array<string,string> key => text
 */
function pageTexts(string $dir): array {
    $load = function (string $lang) use ($dir): array {
        $file = $dir . '/' . $lang . '.json';
        if (!preg_match('/^[a-z]{2}$/', $lang) || !is_file($file)) return [];
        $data = json_decode((string)file_get_contents($file), true);
        return is_array($data) ? $data : [];
    };
    $texts = $load('en');
    $lang  = getLang();
    if ($lang !== 'en') $texts = array_merge($texts, $load($lang));
    return $texts;
}

/** Escaped text for a key; the key itself when it exists in no file (makes a typo visible). */
function pageText(array $texts, string $key): string {
    return h($texts[$key] ?? $key);
}

/**
 * Escaped text with the only markup a text file may carry: **word** becomes <strong>word</strong>, and
 * [label](https://…) becomes a link that opens in a new tab (https addresses only; the "opens in a new tab" hint comes
 * from the page's `play.external` text when it has one).
 */
function pageRich(array $texts, string $key): string {
    $hint = isset($texts['play.external']) ? '<span class="ac-sr-only"> (' . h($texts['play.external']) . ')</span>' : '';
    $html = h($texts[$key] ?? $key);
    $html = preg_replace('/\[([^\]]+)\]\((https:\/\/[^\s)"<]+)\)/u', '<a href="$2" target="_blank" rel="noopener">$1' . $hint . '</a>', $html);
    return preg_replace('/\*\*(.+?)\*\*/u', '<strong>$1</strong>', $html);
}
