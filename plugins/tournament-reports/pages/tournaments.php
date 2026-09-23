<?php
require_once __DIR__ . '/../inc/functions.php';
require_once __DIR__ . '/../config.php';

$uiLang = getUiLang();

$txt = [
    'en' => [
        'page_title'      => 'Tournament Reports',
        'tournament_list'  => 'All Tournaments',
        'total_games'      => '%d games',
        'fetched_on'       => '%s',
        'players'          => '%d players',
        'no_tournaments'   => 'No tournaments available yet.',
        'view'             => 'View report',
    ],
    'fr' => [
        'page_title'      => 'Rapports de tournois',
        'tournament_list'  => 'Tous les tournois',
        'total_games'      => '%d matchs',
        'fetched_on'       => '%s',
        'players'          => '%d joueurs',
        'no_tournaments'   => 'Aucun tournoi disponible.',
        'view'             => 'Voir le rapport',
    ],
][$uiLang] ?? [];

// Pull anything new from the API before rendering, at most once per interval.
// With no job runner on this site, the schedule rides on visitor traffic --
// see trAutoSyncTournaments().
trAutoSyncTournaments();

// One row per parent tournament. Name, participant count, format and date used
// to be recomputed here by decoding every tournament's games_data on every
// render; they are stored columns now, so this page reads no blobs at all.
$allTournaments = trGetTournaments();

/**
 * Format a stored DATETIME the same way the tournament page does.
 */
function trFormatDate(string $iso): string
{
    $ts = strtotime($iso);
    if (!$ts) return $iso;
    return date('d/m/Y H:i', $ts);
}
?>
<div class="container py-4">

    <div class="section-title mb-3"><span><?= h($txt['page_title']) ?></span></div>

    <div class="card-altered p-4">
        <?php if (empty($allTournaments)): ?>
            <div class="text-center text-muted py-4">
                <i class="fa-solid fa-trophy" style="font-size:3rem;margin-bottom:1rem;display:block;opacity:.3"></i>
                <p><?= $txt['no_tournaments'] ?></p>
            </div>
        <?php else: ?>
            <div class="list-group">
                <?php foreach ($allTournaments as $t): ?>
                <a href="<?= BASE_URL ?>/pages/tournament?id=<?= h(urlencode($t['tournament_id'])) ?>"
                   class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1"><?= h($t['tournament_name'] ?: 'Tournament #' . $t['tournament_id']) ?></h5>
                        <small class="text-muted d-flex flex-wrap gap-3">
                            <?php if (!empty($t['format'])): ?>
                            <span><i class="fa-solid fa-shield me-1"></i><?= h($t['format']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($t['first_game_at'])): ?>
                            <span><i class="fa-regular fa-calendar me-1"></i><?= h(trFormatDate($t['first_game_at'])) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($t['localization'])): ?>
                            <span><i class="fa-solid fa-location-dot me-1"></i><?= h($t['localization']) ?></span>
                            <?php endif; ?>
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