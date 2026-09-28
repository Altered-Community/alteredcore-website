<?php
// Local / CI stack only (docker/entrypoint.sh, AC_STACK_SEED=1): gives the site the name, logo and
// main menu of production (altered.re, September 2026), so pages look like they do there. Runs once
// per SEED_VERSION, before plugins are activated (they then add their own menu entries).

require_once dirname(__DIR__, 2) . '/includes/functions.php';

const SEED_VERSION = '2';

if (getSetting('stack_seed_version') === SEED_VERSION) {
    echo "[seed] already applied\n";
    exit(0);
}

// [label_en, label_fr, url, icon, children] — children: same shape, '-' for a separator.
$menu = [
    ['Home', 'Accueil', '/pages/index', 'fa-solid fa-house', [], ['hide_label' => 1]],
    ['Cards', 'Cartes', '/pages/cards', 'fak fa-collection', [
        ['Search', 'Rechercher', '/pages/cards', 'fa-solid fa-magnifying-glass'],
        ['Scan', 'Scanner', '/pages/qrscan', 'fa-solid fa-qrcode'],
        ['Alt art preferences', 'Préférence alt art', '/pages/ownership-alt-arts', 'fa-solid fa-brush'],
        ['Balance Patch', "Patch d'équilibrage", '/pages/current-suspensions-errata-bans', 'fa-solid fa-scale-balanced'],
        '-',
        ['Digital Ownership', 'Propriété numérique', '/pages/ownership', 'fa-solid fa-key'],
        ['Physical Collection', 'Collection Physique', '/pages/playset?tab=playset', 'fa-solid fa-object-group'],
    ]],
    ['Decks', 'Decks', '/pages/decks', 'fa-solid fa-box', [
        ['Decks', 'Decks', '/pages/decks', 'fa-solid fa-box'],
        ['Tournament Decklists', 'Listes de tournoi', '/pages/tournaments', 'fa-solid fa-trophy'],
    ]],
    ['Events', 'Évènements', '/pages/events', 'fa-solid fa-location-dot', []],
    ['Play', 'Jouer', 'https://boardgamearena.com/gamepanel?game=altered', 'fa-solid fa-dice', [
        ['Play on Board Game Arena', 'Jouer sur Board Game Arena', 'https://boardgamearena.com/gamepanel?game=altered', 'fa-solid fa-play'],
        ['Quick Rules', 'Règles rapides', '/pages/rules', 'fa-solid fa-book'],
        ['Draft & Sealed', 'Draft & Scellés', 'https://altered-draft.altered.re', 'fa-solid fa-cube'],
    ]],
    ['News', 'Actualités', '/pages/news', 'fa-solid fa-newspaper', []],
    ['Community & Help', 'Communauté & Aide', 'https://www.helloasso.com/associations/altered-re-union/formulaires/1', 'fa-solid fa-users-between-lines', [
        ['Make a gift', 'Faire un don', 'https://www.helloasso.com/associations/altered-re-union/formulaires/1', 'fa-solid fa-hand-holding-heart'],
        ['FAQ', 'FAQ', '/pages/faq', 'fa-solid fa-circle-question'],
        ['Alteredle', 'Alteredle', 'https://fragileclick.github.io/Alteredle/', 'fa-solid fa-square-check'],
        ['Join Re:Union', 'Rejoindre Re:Union', '/pages/current-open-roles', 'fa-solid fa-user-plus'],
        ['Bugs', 'Bugs', '/pages/feedback', 'fa-solid fa-bug'],
        ['Wiki', 'Wiki', 'https://alteredtcg.wiki.gg/', 'fa-brands fa-wikipedia-w'],
    ]],
];

$db = getDB();
$db->beginTransaction();
$db->exec(q("DELETE FROM {nav_items} WHERE parent_id IS NOT NULL"));
$db->exec(q("DELETE FROM {nav_items}"));
$insert = $db->prepare(q(
    "INSERT INTO {nav_items} (parent_id, label_en, label_fr, url, icon, sort_order, is_visible, is_blank, hide_label, is_separator)
     VALUES (:parent, :en, :fr, :url, :icon, :sort, 1, :blank, :hide, :sep)"
));
$add = function (?int $parent, array $item, int $sort, array $flags = []) use ($db, $insert): int {
    [$en, $fr, $url, $icon] = $item;
    $insert->execute([
        ':parent' => $parent, ':en' => $en, ':fr' => $fr, ':url' => $url, ':icon' => $icon, ':sort' => $sort,
        ':blank' => preg_match('#^https?://#', $url) ? 1 : 0, ':hide' => $flags['hide_label'] ?? 0, ':sep' => $flags['is_separator'] ?? 0,
    ]);
    return (int)$db->lastInsertId();
};
// Entries every 10: plugins slot their entries in between, or last in a menu (rebuilder: in Decks).
foreach ($menu as $i => $top) {
    $id = $add(null, $top, ($i + 1) * 10, $top[5] ?? []);
    foreach ($top[4] as $j => $child) {
        $sort = ($j + 1) * 10;
        if ($child === '-') $add($id, ['', '', '#', 'fa-solid fa-minus'], $sort, ['is_separator' => 1]);
        else $add($id, $child, $sort);
    }
}
saveSetting('site_name', 'Altered Re:Union');
saveSetting('logo_path', 'docker/stack/reunion-logo.png');
saveSetting('stack_seed_version', SEED_VERSION);
$db->commit();
echo "[seed] production menu, name and logo applied\n";
