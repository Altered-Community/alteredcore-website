<?php
// Authors and translators of a news article (columns `authors` and `translators` of {news}): admin/news-edit.php
// stores them, pages/news-detail.php shows them under the title.

/**
 * Names of a news article's `authors` or `translators` column (comma or semicolon separated, free text), trimmed, empty
 * ones and repeats left out.
 */
function newsPeople(?string $list): array {
    $names = array_map('trim', preg_split('/[,;]/', (string)$list) ?: []);
    return array_values(array_unique(array_filter($names, fn(string $n) => $n !== '')));
}

/** « A », « A et B », « A, B et C » (« and » in English). */
function formatPeopleList(array $names, string $lang): string {
    $and = $lang === 'fr' ? ' et ' : ' and ';
    if (count($names) < 2) return (string)($names[0] ?? '');
    return implode(', ', array_slice($names, 0, -1)) . $and . end($names);
}
