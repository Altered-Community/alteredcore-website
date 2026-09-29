<?php
require_once __DIR__ . '/../inc/functions.php';
require_once __DIR__ . '/../config.php';

$uiLang = getUiLang();

$txt = [
    'en' => [
        'total_games'      => '%d games',
        'players'          => '%d players',
        'no_tournaments'   => 'No tournaments available yet.',
        'no_matches'       => 'No tournaments match these filters.',
        'login_title'      => 'GameApi tournaments',
        'login_required'   => 'Log in to see tournaments synced from GameApi.',
        'login_btn'        => 'Log in',
        'live_error'       => 'Could not load GameApi\'s tournament list: %s',
        'filter_mode'      => 'Mode',
        'filter_all_modes' => 'All modes',
        'filter_min_players' => 'Players',
        'filter_any_players' => 'Any',
    ],
    'fr' => [
        'total_games'      => '%d matchs',
        'players'          => '%d joueurs',
        'no_tournaments'   => 'Aucun tournoi disponible.',
        'no_matches'       => 'Aucun tournoi ne correspond à ces filtres.',
        'login_title'      => 'Tournois GameApi',
        'login_required'   => 'Connectez-vous pour voir les tournois synchronisés depuis GameApi.',
        'login_btn'        => 'Se connecter',
        'live_error'       => 'Impossible de charger la liste des tournois GameApi : %s',
        'filter_mode'      => 'Mode',
        'filter_all_modes' => 'Tous les modes',
        'filter_min_players' => 'Joueurs',
        'filter_any_players' => 'Tous',
    ],
][$uiLang] ?? [];

$dateFormat = $uiLang === 'fr' ? 'd/m/Y' : 'Y-m-d';
$playerThresholds = [0, 25, 50, 100];
$pageSize = 20;

$selectedMode = isset($_GET['mode']) ? trim((string)$_GET['mode']) : '';
$selectedMinPlayers = isset($_GET['minPlayers']) ? (int)$_GET['minPlayers'] : 0;
if (!in_array($selectedMinPlayers, $playerThresholds, true)) {
    $selectedMinPlayers = 0;
}
$currentPage = max(1, isset($_GET['page']) ? (int)$_GET['page'] : 1);

/** Builds a tournaments-page URL, keeping the given overrides on top of the current filters. */
function trTournamentsListUrl(string $mode, int $minPlayers, int $page): string
{
    $params = array_filter([
        'mode'       => $mode,
        'minPlayers' => $minPlayers > 0 ? $minPlayers : null,
        'page'       => $page > 1 ? $page : null,
    ], fn($v) => $v !== null && $v !== '');
    $query = http_build_query($params);
    return BASE_URL . '/pages/tournaments' . ($query !== '' ? '?' . $query : '');
}

$userId = (int)($_SESSION['user_id'] ?? 0);
$liveTournaments = [];
$modes = [];
$totalCount = 0;
$totalPages = 0;
$liveError = null;
if ($userId) {
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
    if ($index['ok']) {
        $totalCount = (int)($index['data']['totalCount'] ?? 0);
        $totalPages = $pageSize > 0 ? (int)ceil($totalCount / $pageSize) : 0;
        foreach ((array)($index['data']['tournaments'] ?? []) as $entry) {
            $tid = (string)($entry['tournamentParentId'] ?? '');
            if ($tid === '') continue;
            $lastGameAt = $entry['lastGameAt'] ?? null;
            $liveTournaments[] = [
                'tournament_id'   => $tid,
                'tournament_name' => (string)($entry['tournamentParentName'] ?? ''),
                'total_players'   => (int)($entry['totalPlayers'] ?? 0),
                'total_games'     => (int)($entry['totalGames'] ?? 0),
                'mode'            => trModeDisplay($entry['mode'] ?? null, $uiLang),
                'last_game_at'    => $lastGameAt ? date($dateFormat, strtotime($lastGameAt)) : null,
            ];
        }
    } else {
        $liveError = $index['error'] ?? 'Unknown error';
    }
}
?>
<div class="ac-page">

    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($txt['login_title']) ?></h1>
        </div>
    </header>

    <div class="ac-card">
        <?php if (!$userId): ?>
            <div class="ac-empty">
                <?= ac_icon('log-in') ?>
                <p class="mb-0"><?= $txt['login_required'] ?></p>
                <a href="<?= BASE_URL ?>/pages/login" class="ac-button ac-button--sm"><?= ac_icon('log-in') ?><?= h($txt['login_btn'] ?? 'Log in') ?></a>
            </div>
        <?php elseif ($liveError): ?>
            <div class="ac-notice ac-notice--warning" role="status"><?= ac_icon('triangle-alert') ?><div><?= h(sprintf($txt['live_error'], $liveError)) ?></div></div>
        <?php else: ?>

            <?php if (!empty($modes)): ?>
            <div class="mb-3">
                <div class="ac-text-overline mb-1"><?= h($txt['filter_mode']) ?></div>
                <div class="ac-row">
                    <a href="<?= h(trTournamentsListUrl('', $selectedMinPlayers, 1)) ?>"
                       class="ac-chip"<?= $selectedMode === '' ? ' aria-current="true"' : '' ?>><?= h($txt['filter_all_modes']) ?></a>
                    <?php foreach ($modes as $mode):
                        $modeDisplay = trModeDisplay((string)$mode, $uiLang);
                    ?>
                    <a href="<?= h(trTournamentsListUrl((string)$mode, $selectedMinPlayers, 1)) ?>"
                       class="ac-chip"<?= $selectedMode === (string)$mode ? ' aria-current="true"' : '' ?>>
                        <span class="ac-chip__dot" style="--ac-chip-dot:<?= h($modeDisplay['color']) ?>"></span><?= h($modeDisplay['label']) ?>
                    </a>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <div class="mb-3">
                <div class="ac-text-overline mb-1"><?= h($txt['filter_min_players']) ?></div>
                <div class="ac-row">
                    <?php foreach ($playerThresholds as $threshold): ?>
                    <a href="<?= h(trTournamentsListUrl($selectedMode, $threshold, 1)) ?>"
                       class="ac-chip"<?= $selectedMinPlayers === $threshold ? ' aria-current="true"' : '' ?>>
                        <?= $threshold === 0 ? h($txt['filter_any_players']) : h($threshold . '+') ?>
                    </a>
                    <?php endforeach; ?>
                </div>
            </div>

            <?php if (empty($liveTournaments)): ?>
            <div class="ac-empty">
                <?= ac_icon('trophy') ?>
                <p class="mb-0"><?= $totalCount === 0 && $selectedMode === '' && $selectedMinPlayers === 0 ? $txt['no_tournaments'] : $txt['no_matches'] ?></p>
            </div>
            <?php else: ?>
            <div class="list-group">
                <?php foreach ($liveTournaments as $t): ?>
                <a href="<?= BASE_URL ?>/pages/tournament?id=<?= h(urlencode($t['tournament_id'])) ?>"
                   class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <h2 class="tr-list-title">
                            <?= h($t['tournament_name'] ?: 'Tournament #' . $t['tournament_id']) ?>
                            <?php if ($t['mode']['label'] !== ''): ?>
                            <span class="ac-badge"><span class="ac-chip__dot" style="--ac-chip-dot:<?= h($t['mode']['color']) ?>"></span><?= h($t['mode']['label']) ?></span>
                            <?php endif; ?>
                        </h2>
                        <small class="text-muted d-flex flex-wrap gap-3">
                            <?php if ($t['last_game_at']): ?>
                            <span><?= ac_icon('calendar', 'me-1') ?><?= h($t['last_game_at']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($t['total_players'])): ?>
                            <span><?= ac_icon('users', 'me-1') ?><?= sprintf($txt['players'], (int)$t['total_players']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($t['total_games'])): ?>
                            <span><?= ac_icon('grid-3x3', 'me-1') ?><?= sprintf($txt['total_games'], (int)$t['total_games']) ?></span>
                            <?php endif; ?>
                        </small>
                    </div>
                    <?= ac_icon('chevron-right', 'text-muted') ?>
                </a>
                <?php endforeach; ?>
            </div>

            <?php if ($totalPages > 1): ?>
            <nav aria-label="Pagination">
                <ul class="ac-pagination">
                    <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                    <li>
                        <a href="<?= h(trTournamentsListUrl($selectedMode, $selectedMinPlayers, $i)) ?>"<?= $i === $currentPage ? ' aria-current="page"' : '' ?>><?= $i ?></a>
                    </li>
                    <?php endfor; ?>
                </ul>
            </nav>
            <?php endif; ?>

            <?php endif; ?>
        <?php endif; ?>
    </div>

</div>
