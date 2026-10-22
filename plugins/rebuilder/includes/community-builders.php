<?php
// The community deckbuilders of the site (admin › Community builders, table {community_builders}): the banner of the
// decks list, as on the site's decks page (core-altered-cards pages/decks.php). Read by papi/community-builders.php and,
// so that the banner is on the page's first screen instead of arriving after it, by placeholder.php.

/** @return array<int, array{title: string, description: string, image: ?string, url: string}> */
function rebuilderCommunityBuilders(string $lang): array {
    $rows = getDB()->query(q(
        "SELECT title, desc_en, desc_fr, image, url
         FROM {community_builders}
         WHERE is_visible = 1 ORDER BY sort_order ASC, created_at ASC"
    ))->fetchAll();
    return array_map(fn($r) => [
        'title'       => (string)$r['title'],
        'description' => (string)(($lang === 'fr' ? $r['desc_fr'] : $r['desc_en']) ?: ($r['desc_en'] ?? '')),
        'image'       => !empty($r['image']) ? assetUrl($r['image']) : null,
        'url'         => (string)$r['url'],
    ], $rows);
}
