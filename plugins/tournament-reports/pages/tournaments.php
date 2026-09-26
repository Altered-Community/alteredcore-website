<?php
require_once __DIR__ . '/../inc/functions.php';
require_once __DIR__ . '/../config.php';

$uiLang = getUiLang();

$txt = [
    'en' => [
        'total_games'      => '%d games',
        'players'          => '%d players',
        'no_tournaments'   => 'No tournaments available yet.',
        'login_title'      => 'GameApi tournaments',
        'login_required'   => 'Log in to see tournaments synced from GameApi.',
        'login_btn'        => 'Log in',
        'live_error'       => 'Could not load GameApi\'s tournament list: %s',
    ],
    'fr' => [
        'total_games'      => '%d matchs',
        'players'          => '%d joueurs',
        'no_tournaments'   => 'Aucun tournoi disponible.',
        'login_title'      => 'Tournois GameApi',
        'login_required'   => 'Connectez-vous pour voir les tournois synchronisés depuis GameApi.',
        'login_btn'        => 'Se connecter',
        'live_error'       => 'Impossible de charger la liste des tournois GameApi : %s',
    ],
][$uiLang] ?? [];

// GameApi tournaments require the viewing user's own session (its reads are
// gated on a Keycloak scope) — see inc/functions.php's module docblock.
$userId = (int)($_SESSION['user_id'] ?? 0);
$liveTournaments = [];
$liveError = null;
if ($userId) {
    $index = trFetchLiveTournamentIndex($userId);
    if ($index['ok']) {
        foreach ((array)($index['data']['tournaments'] ?? []) as $entry) {
            $tid = (string)($entry['tournamentParentId'] ?? '');
            if ($tid === '') continue;
            $liveTournaments[] = [
                'tournament_id'   => $tid,
                'tournament_name' => (string)($entry['tournamentParentName'] ?? ''),
                'total_players'   => (int)($entry['totalPlayers'] ?? 0),
                'total_games'     => (int)($entry['totalGames'] ?? 0),
            ];
        }
    } else {
        $liveError = $index['error'] ?? 'Unknown error';
    }
}
?>
<div class="container py-4">

    <div class="section-title mb-3"><span><?= h($txt['login_title']) ?></span></div>

    <div class="card-altered p-4">
        <?php if (!$userId): ?>
            <div class="text-center text-muted py-4">
                <i class="fa-solid fa-right-to-bracket" style="font-size:2rem;margin-bottom:1rem;display:block;opacity:.3"></i>
                <p><?= $txt['login_required'] ?></p>
                <a href="<?= BASE_URL ?>/pages/login" class="btn btn-sm btn-primary-altered"><?= h($txt['login_btn'] ?? 'Log in') ?></a>
            </div>
        <?php elseif ($liveError): ?>
            <div class="alert alert-warning mb-0"><?= h(sprintf($txt['live_error'], $liveError)) ?></div>
        <?php elseif (empty($liveTournaments)): ?>
            <div class="text-center text-muted py-4">
                <i class="fa-solid fa-trophy" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:.3"></i>
                <p><?= $txt['no_tournaments'] ?></p>
            </div>
        <?php else: ?>
            <div class="list-group">
                <?php foreach ($liveTournaments as $t): ?>
                <a href="<?= BASE_URL ?>/pages/tournament?id=<?= h(urlencode($t['tournament_id'])) ?>"
                   class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1"><?= h($t['tournament_name'] ?: 'Tournament #' . $t['tournament_id']) ?></h5>
                        <small class="text-muted d-flex flex-wrap gap-3">
                            <?php if (!empty($t['total_players'])): ?>
                            <span><i class="fa-solid fa-users me-1"></i><?= sprintf($txt['players'], (int)$t['total_players']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($t['total_games'])): ?>
                            <span><i class="fa-solid fa-chess-board me-1"></i><?= sprintf($txt['total_games'], (int)$t['total_games']) ?></span>
                            <?php endif; ?>
                        </small>
                    </div>
                    <i class="fa-solid fa-chevron-right text-muted"></i>
                </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>

</div>
