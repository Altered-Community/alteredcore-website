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
        'col_mode'      => 'Mode',
        'col_date'      => 'Last game',
        'col_games'     => 'Games',
        'col_actions'   => 'Actions',
        'view_page'     => 'View on site',
        'players'       => 'Players & corrections',
        'empty'         => 'No tournaments yet.',
        'no_matches'    => 'No tournaments match these filters.',
        'filter_mode'   => 'Mode',
        'filter_all_modes' => 'All modes',
        'filter_min_players' => 'Players',
        'filter_any_players' => 'Any',
    ],
    'fr' => [
        'title'         => 'Tournois',
        'live_error'    => 'Impossible de charger la liste des tournois GameApi : %s',
        'not_configured'=> 'GameApi n\'est pas configuré. Réglez-le dans les paramètres tournois.',
        'col_tournament'=> 'Tournoi',
        'col_mode'      => 'Mode',
        'col_date'      => 'Dernier match',
        'col_games'     => 'Matchs',
        'col_actions'   => 'Actions',
        'view_page'     => 'Voir sur le site',
        'players'       => 'Joueurs et corrections',
        'empty'         => 'Aucun tournoi pour le moment.',
        'no_matches'    => 'Aucun tournoi ne correspond à ces filtres.',
        'filter_mode'   => 'Mode',
        'filter_all_modes' => 'Tous les modes',
        'filter_min_players' => 'Joueurs',
        'filter_any_players' => 'Tous',
    ],
][getUiLang()] ?? [];

$dateFormat = getUiLang() === 'fr' ? 'd/m/Y' : 'Y-m-d';
$playerThresholds = [0, 25, 50, 100];
$pageSize = 20;

$selectedMode = isset($_GET['mode']) ? trim((string)$_GET['mode']) : '';
$selectedMinPlayers = isset($_GET['minPlayers']) ? (int)$_GET['minPlayers'] : 0;
if (!in_array($selectedMinPlayers, $playerThresholds, true)) {
    $selectedMinPlayers = 0;
}
$currentPage = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);

/** Builds an admin tournaments-list URL, keeping the given overrides on top of the current filters. */
function trAdminTournamentsListUrl(string $mode, int $minPlayers, int $page): string
{
    $params = array_filter([
        'plugin'     => 'tournament-reports',
        'section'    => 'tournament-manage',
        'mode'       => $mode,
        'minPlayers' => $minPlayers > 0 ? $minPlayers : null,
        'page'       => $page > 1 ? $page : null,
    ], fn($v) => $v !== null && $v !== '');
    return BASE_URL . '/admin/plugin-page?' . http_build_query($params);
}

// ── Build the list: GameApi's live index ────────────────────────────────────
$rows = [];
$modes = [];
$userId = (int)($_SESSION['user_id'] ?? 0);
$liveError = null;
$totalCount = 0;
$totalPages = 0;
if (trGetApiUrl() === '') {
    $liveError = $txt['not_configured'];
} else {
    $modesResult = trFetchLiveTournamentModes($userId);
    if ($modesResult['ok']) {
        $modes = (array)($modesResult['data']['modes'] ?? []);
    }

    $index = trFetchLiveTournamentIndex($userId, [
        'mode'       => $selectedMode,
        'minPlayers' => $selectedMinPlayers,
        'page'       => $currentPage,
        'pageSize'   => $pageSize,
    ]);
    if (!$index['ok']) {
        $liveError = sprintf($txt['live_error'], $index['error'] ?? 'Unknown error');
    } else {
        $totalCount = (int)($index['data']['totalCount'] ?? 0);
        $totalPages = $pageSize > 0 ? (int)ceil($totalCount / $pageSize) : 0;
        foreach ((array)($index['data']['tournaments'] ?? []) as $entry) {
            $tid = (string)($entry['tournamentParentId'] ?? '');
            if ($tid === '') continue;
            $lastGameAt = $entry['lastGameAt'] ?? null;
            $rows[] = [
                'tournament_id'   => $tid,
                'tournament_name' => (string)($entry['tournamentParentName'] ?? ''),
                'total_games'     => (int)($entry['totalGames'] ?? 0),
                'mode'            => trModeDisplay($entry['mode'] ?? null, getUiLang()),
                'last_game_at'    => $lastGameAt ? date($dateFormat, strtotime($lastGameAt)) : null,
            ];
        }
    }
}
?>

<div class="admin-header-bar">
    <h1><?= ac_icon('trophy', 'me-2') ?><?= h($txt['title']) ?></h1>
</div>

<?php if ($liveError): ?>
<div class="ac-notice ac-notice--warning mb-3" role="status"><?= ac_icon('triangle-alert') ?><div><?= h($liveError) ?></div></div>
<?php endif; ?>

<?php if (!empty($modes)): ?>
<div class="mb-2">
    <div class="text-muted small mb-1"><?= h($txt['filter_mode']) ?></div>
    <div class="cat-filter">
        <a href="<?= h(trAdminTournamentsListUrl('', $selectedMinPlayers, 1)) ?>"
           class="<?= $selectedMode === '' ? 'active' : '' ?>"><?= h($txt['filter_all_modes']) ?></a>
        <?php foreach ($modes as $mode):
            $modeDisplay = trModeDisplay((string)$mode, getUiLang());
        ?>
        <a href="<?= h(trAdminTournamentsListUrl((string)$mode, $selectedMinPlayers, 1)) ?>"
           class="<?= $selectedMode === (string)$mode ? 'active' : '' ?>">
            <span class="ac-chip__dot me-1" style="--ac-chip-dot:<?= h($modeDisplay['color']) ?>"></span><?= h($modeDisplay['label']) ?>
        </a>
        <?php endforeach; ?>
    </div>
</div>
<?php endif; ?>

<div class="mb-3">
    <div class="text-muted small mb-1"><?= h($txt['filter_min_players']) ?></div>
    <div class="cat-filter">
        <?php foreach ($playerThresholds as $threshold): ?>
        <a href="<?= h(trAdminTournamentsListUrl($selectedMode, $threshold, 1)) ?>"
           class="<?= $selectedMinPlayers === $threshold ? 'active' : '' ?>">
            <?= $threshold === 0 ? h($txt['filter_any_players']) : h($threshold . '+') ?>
        </a>
        <?php endforeach; ?>
    </div>
</div>

<!-- Tournament list -->
<div class="ac-card ac-card--flush mb-4">
    <div class="table-responsive">
        <table class="table table-hover table-altered mb-0">
            <thead>
                <tr>
                    <th><?= h($txt['col_tournament']) ?></th>
                    <th><?= h($txt['col_mode']) ?></th>
                    <th><?= h($txt['col_date']) ?></th>
                    <th><?= h($txt['col_games']) ?></th>
                    <th class="text-end"><?= h($txt['col_actions']) ?></th>
                </tr>
            </thead>
            <tbody>
            <?php if (empty($rows)): ?>
                <tr><td colspan="5" class="text-center text-muted py-4">
                    <?= $totalCount === 0 && $selectedMode === '' && $selectedMinPlayers === 0 ? h($txt['empty']) : h($txt['no_matches']) ?>
                </td></tr>
            <?php else: ?>
                <?php foreach ($rows as $t): ?>
                <tr>
                    <td>
                        <strong><?= h($t['tournament_name'] ?: 'Tournament #' . $t['tournament_id']) ?></strong>
                        <div class="text-muted small">External ID: <?= h($t['tournament_id']) ?></div>
                    </td>
                    <td>
                        <?php if ($t['mode']['label'] !== ''): ?>
                        <span class="ac-badge"><span class="ac-chip__dot" style="--ac-chip-dot:<?= h($t['mode']['color']) ?>"></span><?= h($t['mode']['label']) ?></span>
                        <?php else: ?>
                        —
                        <?php endif; ?>
                    </td>
                    <td><?= $t['last_game_at'] ? h($t['last_game_at']) : '—' ?></td>
                    <td><?= $t['total_games'] ?></td>
                    <td class="text-end text-nowrap">
                        <a href="<?= BASE_URL ?>/pages/tournament?id=<?= h(urlencode($t['tournament_id'])) ?>"
                           class="ac-icon-button ac-icon-button--sm" target="_blank"
                           title="<?= h($txt['view_page']) ?>" aria-label="<?= h($txt['view_page']) ?>">
                            <?= ac_icon('eye') ?>
                        </a>
                        <a href="<?= BASE_URL ?>/admin/plugin-page?plugin=tournament-reports&section=tournament-ranking&tournament=<?= h(urlencode($t['tournament_id'])) ?>"
                           class="ac-icon-button ac-icon-button--sm"
                           title="<?= h($txt['players']) ?>" aria-label="<?= h($txt['players']) ?>">
                            <?= ac_icon('medal') ?>
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php if ($totalPages > 1): ?>
<nav class="mb-4 d-flex justify-content-center">
    <ul class="pagination pagination-altered">
        <?php for ($i = 1; $i <= $totalPages; $i++): ?>
        <li class="page-item <?= $i === $currentPage ? 'active' : '' ?>">
            <a class="page-link" href="<?= h(trAdminTournamentsListUrl($selectedMode, $selectedMinPlayers, $i)) ?>"><?= $i ?></a>
        </li>
        <?php endfor; ?>
    </ul>
</nav>
<?php endif; ?>
