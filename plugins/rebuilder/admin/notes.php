<?php
// Admin section "Re:Builder notes": how many private deck notes users keep. The notes are
// private, so their content is not shown.
$lang = getUiLang();
$txt = $lang === 'fr'
    ? ['title' => 'Notes de deck (Re:Builder)', 'notes' => 'Notes', 'users' => 'Utilisateurs', 'last' => 'Dernière modification', 'none' => '—',
       'help' => 'Notes privées que les joueurs écrivent sur leurs decks dans l’éditeur. Leur contenu reste privé.']
    : ['title' => 'Deck notes (Re:Builder)', 'notes' => 'Notes', 'users' => 'Users', 'last' => 'Last edit', 'none' => '—',
       'help' => 'Private notes players write on their decks in the editor. Their content stays private.'];

$stats = getDB()->query(qp("SELECT COUNT(*) AS notes, COUNT(DISTINCT user_id) AS users, MAX(updated_at) AS last FROM {deck_notes}"))->fetch();
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-note-sticky me-2"></i><?= h($txt['title']) ?></h1>
</div>
<p class="text-muted"><?= h($txt['help']) ?></p>
<table class="table" style="max-width: 32rem">
    <tr><th><?= h($txt['notes']) ?></th><td data-rb-stat="notes"><?= (int)$stats['notes'] ?></td></tr>
    <tr><th><?= h($txt['users']) ?></th><td data-rb-stat="users"><?= (int)$stats['users'] ?></td></tr>
    <tr><th><?= h($txt['last']) ?></th><td><?= h($stats['last'] ?? $txt['none']) ?></td></tr>
</table>
