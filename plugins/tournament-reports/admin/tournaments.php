<?php
// Admin page: the live list of GameApi tournaments (fetched on every load,
// nothing cached locally — see inc/functions.php's module docblock).
require_once __DIR__ . '/../inc/functions.php';

$txt = [
    'en' => [
        'title'         => 'Tournaments',
        'live_error'    => 'Could not load GameApi\'s tournament list: %s',
        'not_configured'=> 'GameApi is not configured. Set it in Tournament Settings.',
        'col_tournament'=> 'Tournament',
        'col_games'     => 'Games',
        'col_actions'   => 'Actions',
        'view_page'     => 'View on site',
        'players'       => 'Players & corrections',
        'empty'         => 'No tournaments yet.',
    ],
    'fr' => [
        'title'         => 'Tournois',
        'live_error'    => 'Impossible de charger la liste des tournois GameApi : %s',
        'not_configured'=> 'GameApi n\'est pas configuré. Réglez-le dans les paramètres tournois.',
        'col_tournament'=> 'Tournoi',
        'col_games'     => 'Matchs',
        'col_actions'   => 'Actions',
        'view_page'     => 'Voir sur le site',
        'players'       => 'Joueurs et corrections',
        'empty'         => 'Aucun tournoi pour le moment.',
    ],
][getUiLang()] ?? [];

// ── Build the list: GameApi's live index ────────────────────────────────────
$rows = [];
$userId = (int)($_SESSION['user_id'] ?? 0);
$liveError = null;
if (trGetApiUrl() === '') {
    $liveError = $txt['not_configured'];
} else {
    $index = trFetchLiveTournamentIndex($userId);
    if (!$index['ok']) {
        $liveError = sprintf($txt['live_error'], $index['error'] ?? 'Unknown error');
    } else {
        foreach ((array)($index['data']['tournaments'] ?? []) as $entry) {
            $tid = (string)($entry['tournamentParentId'] ?? '');
            if ($tid === '') continue;
            $rows[] = [
                'tournament_id'   => $tid,
                'tournament_name' => (string)($entry['tournamentParentName'] ?? ''),
                'total_games'     => (int)($entry['totalGames'] ?? 0),
            ];
        }
    }
}
?>

<div class="admin-header-bar">
    <h1><i class="fa-solid fa-trophy me-2"></i><?= h($txt['title']) ?></h1>
</div>

<?php if ($liveError): ?>
<div class="alert alert-warning"><?= h($liveError) ?></div>
<?php endif; ?>

<!-- Tournament list -->
<div class="card-altered mb-4">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th><?= h($txt['col_tournament']) ?></th>
                    <th><?= h($txt['col_games']) ?></th>
                    <th class="text-end"><?= h($txt['col_actions']) ?></th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($rows)): ?>
                <tr><td colspan="3" class="text-center text-muted py-4"><?= $txt['empty'] ?></td></tr>
            <?php else: ?>
                <?php foreach ($rows as $t): ?>
                <tr>
                    <td>
                        <strong><?= h($t['tournament_name'] ?: 'Tournament #' . $t['tournament_id']) ?></strong>
                        <div class="text-muted small">External ID: <?= h($t['tournament_id']) ?></div>
                    </td>
                    <td><?= $t['total_games'] ?></td>
                    <td class="text-end" style="white-space:nowrap">
                        <a href="<?= BASE_URL ?>/pages/tournament?id=<?= h(urlencode($t['tournament_id'])) ?>"
                           class="btn btn-sm btn-outline-primary" target="_blank"
                           title="<?= h($txt['view_page']) ?>">
                            <i class="fa-solid fa-eye"></i>
                        </a>
                        <a href="<?= BASE_URL ?>/admin/plugin-page?plugin=tournament-reports&section=tournament-ranking&tournament=<?= h(urlencode($t['tournament_id'])) ?>"
                           class="btn btn-sm btn-outline-secondary"
                           title="<?= h($txt['players']) ?>">
                            <i class="fa-solid fa-ranking-star"></i>
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
