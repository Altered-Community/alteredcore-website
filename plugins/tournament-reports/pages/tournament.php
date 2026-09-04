<?php
require_once __DIR__ . '/../inc/functions.php';
require_once __DIR__ . '/../config.php';

$lang   = getLang();
$uiLang = getUiLang();

$txt = [
    'en' => [
        'page_title'       => 'Tournament Report',
        'tournament_games' => 'Games',
        'players'          => 'Players',
        'played_cards'     => 'Played Cards',
        'winner'           => 'Winner',
        'no_winner'        => 'No winner',
        'game_number'      => 'Game %d',
        'table_id'         => 'Table',
        'received_at'      => 'Played on',
        'no_games'         => 'No games recorded.',
        'ranking_section'  => 'Ranking',
        'ranking_empty'    => 'No rankings available.',
        'ranking_create'   => 'Create ranking',
        'ranking_position' => 'Pos.',
        'ranking_player'   => 'Player',
        'ranking_no_players' => 'No players in this ranking.',
        'no_decklist'      => 'No decklist available.',
        'view_images'      => 'Cards',
        'view_list'        => 'List',
        'qty'              => 'Qty',
        'card'             => 'Card',
        'detail_label'     => 'View detail',
        'back_to_list'     => '← Back to tournaments',
        'copy_btn'         => 'Copy decklist',
        'copy_ok'          => 'Copied!',
        'loading_tournament'    => 'Loading tournament…',
        'players_count'    => '%d players',
    ],
    'fr' => [
        'page_title'       => 'Rapport de tournoi',
        'tournament_games' => 'Matchs',
        'players'          => 'Joueurs',
        'played_cards'     => 'Cartes jouées',
        'winner'           => 'Gagnant',
        'no_winner'        => 'Pas de gagnant',
        'game_number'      => 'Match %d',
        'table_id'         => 'Table',
        'received_at'      => 'Joué le',
        'no_games'         => 'Aucun match enregistré.',
        'ranking_section'  => 'Classement',
        'ranking_empty'    => 'Aucun classement disponible.',
        'ranking_create'   => 'Créer un classement',
        'ranking_position' => 'Pos.',
        'ranking_player'   => 'Joueur',
        'ranking_no_players' => 'Aucun joueur dans ce classement.',
        'no_decklist'      => 'Aucune decklist disponible.',
        'view_images'      => 'Cartes',
        'view_list'        => 'Liste',
        'qty'              => 'Qty',
        'card'             => 'Carte',
        'detail_label'     => 'Voir le détail',
        'back_to_list'     => '← Retour aux tournois',
        'copy_btn'         => 'Copier la decklist',
        'copy_ok'          => 'Copié !',
        'loading_tournament'    => 'Chargement du tournoi…',
        'players_count'    => '%d joueurs',
    ],
][$uiLang] ?? [];

$tournamentId = trim($_GET['id'] ?? '');

// No ID → redirect to list
if ($tournamentId === '') {
    redirect(BASE_URL . '/pages/tournaments');
}

// Load tournament from DB
$tournament     = trGetTournamentByExternalId($tournamentId);
$tournamentData = $tournament ? $tournament['games_data'] : null;
$existingRankings = $tournament ? trGetRankings($tournamentId) : [];
foreach ($existingRankings as &$er) {
    $full = trGetRanking((int)$er['id']);
    $er['players'] = $full ? $full['players'] : [];
}
unset($er);

// Not found → redirect to list
if (!$tournamentData) {
    redirect(BASE_URL . '/pages/tournaments');
}

?>
<div class="container py-4" id="tr-page">

    <div id="tr-page-loader" class="tr-page-loader">
        <span class="tr-spinner tr-spinner-lg"></span>
        <span><?= h($txt['loading_tournament']) ?></span>
    </div>

    <div id="tr-page-content" style="display:none">
    <div class="section-title mb-3"><span><?= h($txt['page_title']) ?></span></div>

    <!-- Back link -->
    <div class="mb-3">
        <a href="<?= BASE_URL ?>/pages/tournaments" class="text-decoration-none">
            <?= $txt['back_to_list'] ?>
        </a>
    </div>

    <!-- Tournament header -->
    <div class="card-altered p-4 mb-4">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <h4 class="fw-bold mb-0" id="tr-tournament-name"></h4>
        </div>
        <div class="d-flex flex-wrap gap-3 text-muted small" id="tr-tournament-meta">
            <span id="tr-tournament-format"></span>
            <span id="tr-tournament-date"></span>
            <span id="tr-tournament-loc"></span>
            <span id="tr-tournament-players"></span>
        </div>
        <?php if (!empty($tournament['description'])): ?>
        <div class="mt-2 tr-tournament-description"><?= nl2br(h($tournament['description'])) ?></div>
        <?php endif; ?>
    </div>

    <!-- Ranking -->
    <div id="tr-ranking-section"></div>

    </div>
</div>

<!-- Card lightbox overlay -->
<div id="tr-lightbox" class="ac-lightbox-overlay" style="display:none">
    <div class="ac-lightbox-inner" id="tr-lightbox-inner"></div>
</div>

<!-- Player decklist side panel -->
<div id="tr-player-panel-backdrop" class="tr-panel-backdrop"></div>
<div id="tr-panel-zoom" class="tr-panel-zoom"></div>
<div id="tr-player-panel" class="tr-panel">
    <div class="tr-panel-header">
        <h5 class="tr-panel-title" id="tr-player-panel-title"></h5>
        <div class="tr-panel-header-actions">
            <button type="button" class="tr-panel-close" id="tr-player-panel-close">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    </div>
    <div class="tr-panel-body" id="tr-player-panel-body"></div>
</div>

<script>
var TR_BASE    = <?= json_encode(h(BASE_URL)) ?>;
var TR_LANG    = <?= json_encode(h($lang)) ?>;
var TR_UI_LANG = <?= json_encode(h($uiLang)) ?>;
var TR_CDN     = <?= json_encode(h(CDN_URL)) ?>;
var TR_CSRF    = <?= json_encode(h(csrfToken())) ?>;
var TR_LOGGED_IN = <?= json_encode(kcIsLoggedIn()) ?>;
var TR_TXT     = <?= json_encode($txt, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_EXISTING_RANKINGS = <?= json_encode($existingRankings, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_TOURNAMENT_DATA = <?= json_encode($tournamentData, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_TOURNAMENT_ID = <?= json_encode(h($tournamentId)) ?>;
var TR_LOCALIZATION  = <?= json_encode(h($tournament['localization'] ?? '')) ?>;
var TR_CARDS_API_URL = <?= json_encode(defined('CARDS_API_URL') && CARDS_API_URL !== '' ? CARDS_API_URL : null) ?>;
</script>