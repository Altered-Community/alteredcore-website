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

$allTournaments = trGetTournamentsWithGames();

// Build display metadata per tournament, mirroring the tournament page header:
// format (first game), date (earliest receivedAt), player count (unique players).
$metaByTournament = [];
foreach ($allTournaments as $tr) {
    $games = (array)($tr['games'] ?? []);
    $meta = ['format' => '', 'date' => '', 'players' => 0];

    if (!empty($games)) {
        $meta['format'] = $games[0]['format'] ?? '';
        $dates = [];
        foreach ($games as $g) {
            if (!empty($g['receivedAt'])) $dates[] = $g['receivedAt'];
        }
        sort($dates);
        $meta['date'] = !empty($dates) ? trFormatDate($dates[0]) : '';

        $players = [];
        foreach ($games as $g) {
            foreach (($g['endGamePlayers'] ?? []) as $p) {
                if (!empty($p['id'])) $players[$p['id']] = true;
            }
        }
        $meta['players'] = count($players);
    }

    $metaByTournament[$tr['tournament_id']] = $meta;
}

/**
 * Format an ISO date the same way the tournament page does (dd/mm/yyyy HH:MM).
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
                <?php foreach ($allTournaments as $t): $m = $metaByTournament[$t['tournament_id']] ?? []; ?>
                <a href="<?= BASE_URL ?>/pages/tournament?id=<?= h(urlencode($t['tournament_id'])) ?>"
                   class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1"><?= h($t['tournament_name'] ?: 'Tournament #' . $t['tournament_id']) ?></h5>
                        <small class="text-muted d-flex flex-wrap gap-3">
                            <?php if (!empty($m['format'])): ?>
                            <span><i class="fa-solid fa-shield me-1"></i><?= h($m['format']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($m['date'])): ?>
                            <span><i class="fa-regular fa-calendar me-1"></i><?= h($m['date']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($t['localization'])): ?>
                            <span><i class="fa-solid fa-location-dot me-1"></i><?= h($t['localization']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($m['players'])): ?>
                            <span><i class="fa-solid fa-users me-1"></i><?= sprintf($txt['players'], $m['players']) ?></span>
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