<?php
require_once __DIR__ . '/../inc/functions.php';
require_once __DIR__ . '/../config.php';

$lang   = getLang();
$uiLang = getUiLang();

$txt = [
    'en' => [
        'page_title'       => 'Tournament Report',
        'players'          => 'Players',
        'ranking_player'   => 'Player',
        'hero_label'       => 'Hero',
        'ranking_section'  => 'Ranking',
        'standings_title'  => 'Standings',
        'wl_header'        => 'W-L',
        'no_decklist'      => 'No decklist available.',
        'view_images'      => 'Cards',
        'view_list'        => 'List',
        'qty'              => 'Qty',
        'card'             => 'Card',
        'detail_label'     => 'View detail',
        'back_to_list'     => '← Back to tournaments',
        'copy_btn'         => 'Copy decklist',
        'copy_ok'          => 'Copied!',
        'duplicate_btn'    => 'Duplicate to my decks',
        'duplicate_prompt' => 'Deck name',
        'duplicate_err'    => 'Could not duplicate this deck: %s',
        'loading_tournament'    => 'Loading tournament…',
        'players_count'    => '%d players',
        'no_data'          => 'No data',
        'multiple_decks'   => 'Multiple decks',
        'variant_deck'     => 'Deck %d',
        'bga_link'         => 'View on Board Game Arena',
        'login_title'      => 'Log in to view this tournament',
        'login_text'       => 'This tournament is synced from GameApi, which requires you to be logged in to view it.',
        'login_btn'        => 'Log in',
        'not_found_title'  => 'Tournament not found',
        'not_found_text'   => 'Could not load this tournament: %s',
        'chart_faction_title' => 'Factions',
        'chart_hero_title' => 'Heroes',
        'chart_other'      => 'Other',
        'filter_faction'   => 'All factions',
        'filter_hero'      => 'All heroes',
        'filter_search_ph' => 'Search a player…',
    ],
    'fr' => [
        'page_title'       => 'Rapport de tournoi',
        'players'          => 'Joueurs',
        'ranking_player'   => 'Joueur',
        'hero_label'       => 'Héros',
        'ranking_section'  => 'Classement',
        'standings_title'  => 'Classement',
        'wl_header'        => 'V-D',
        'no_decklist'      => 'Aucune decklist disponible.',
        'view_images'      => 'Cartes',
        'view_list'        => 'Liste',
        'qty'              => 'Qty',
        'card'             => 'Carte',
        'detail_label'     => 'Voir le détail',
        'back_to_list'     => '← Retour aux tournois',
        'copy_btn'         => 'Copier la decklist',
        'copy_ok'          => 'Copié !',
        'duplicate_btn'    => 'Dupliquer dans mes decks',
        'duplicate_prompt' => 'Nom du deck',
        'duplicate_err'    => 'Impossible de dupliquer ce deck : %s',
        'loading_tournament'    => 'Chargement du tournoi…',
        'players_count'    => '%d joueurs',
        'no_data'          => 'Pas de données',
        'multiple_decks'   => 'Plusieurs decks',
        'variant_deck'     => 'Deck %d',
        'bga_link'         => 'Voir sur Board Game Arena',
        'login_title'      => 'Connectez-vous pour voir ce tournoi',
        'login_text'       => 'Ce tournoi est synchronisé depuis GameApi, ce qui nécessite d\'être connecté pour le consulter.',
        'login_btn'        => 'Se connecter',
        'not_found_title'  => 'Tournoi introuvable',
        'not_found_text'   => 'Impossible de charger ce tournoi : %s',
        'chart_faction_title' => 'Factions',
        'chart_hero_title' => 'Héros',
        'chart_other'      => 'Autres',
        'filter_faction'   => 'Toutes les factions',
        'filter_hero'      => 'Tous les héros',
        'filter_search_ph' => 'Rechercher un joueur…',
    ],
][$uiLang] ?? [];

$tournamentId = trim($_GET['id'] ?? '');

// No ID → redirect to list
if ($tournamentId === '') {
    redirect(BASE_URL . '/pages/tournaments');
}

// ── AJAX: duplicate the currently viewed deck onto the logged-in user's
// account, same interaction as core-altered-cards' deck.php "Dupliquer". ──
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_GET['ajax'] ?? '') === 'duplicate') {
    header('Content-Type: application/json');
    if (!csrfValid($_POST['csrf_token'] ?? '')) {
        echo json_encode(['ok' => false, 'error' => 'Invalid token.']);
        exit;
    }
    $cards = json_decode($_POST['cards'] ?? '[]', true);
    if (!is_array($cards)) $cards = [];
    $name = trim($_POST['name'] ?? '');
    echo json_encode(trDuplicateDeckToAccount($cards, $name));
    exit;
}

$tournamentData = null;   // synthetic single-game structure feeding the JS decklist pipeline
$standings      = [];
$tournamentName = '';
$localization   = '';
$description    = '';
$notFoundError  = null;
$loginRequired  = false;

$userId = (int)($_SESSION['user_id'] ?? 0);
if (!$userId) {
    $loginRequired = true;
} else {
    $live = trFetchLiveTournament($tournamentId, $userId);
    if (!$live['ok']) {
        $notFoundError = $live['error'] ?? 'Unknown error';
    } else {
        $tournamentName = $live['tournament_name'];
        $localization   = $live['localization'];
        $description    = $live['description'];
        $standings      = $live['standings'];

        // Decode every shown player's deck and shape it into the same
        // single-synthetic-game structure the decklist rendering pipeline
        // (buildPlayerDecks() et al. in app.js) expects.
        $endGamePlayers = [];
        foreach ($standings as $s) {
            $decoded = trDecodeMainDeck($s['main_deck'] ?? null);
            $endGamePlayers[] = [
                'id'          => $s['id'],
                'name'        => $s['name'],
                'faction'     => $s['faction'],
                'deck'        => $decoded['ok'] ? $decoded['cards'] : [],
                'playedCards' => [],
            ];
        }
        $tournamentData = [
            'tournamentId'   => $tournamentId,
            'tournamentName' => $tournamentName,
            'totalGames'     => (int)($live['total_games'] ?? 0),
            'games'          => [[
                'format'         => '',
                'receivedAt'     => '',
                'endGamePlayers' => $endGamePlayers,
            ]],
        ];
    }
}

$bgaUrl = 'https://boardgamearena.com/tournament?id=' . rawurlencode($tournamentId);
?>
<div class="container py-4" id="tr-page">

<?php if ($loginRequired): ?>
    <div class="card-altered p-4 text-center">
        <i class="fa-solid fa-right-to-bracket" style="font-size:2.5rem;margin-bottom:1rem;display:block;opacity:.3"></i>
        <h4 class="fw-bold"><?= h($txt['login_title']) ?></h4>
        <p class="text-muted"><?= h($txt['login_text']) ?></p>
        <a href="<?= BASE_URL ?>/pages/login" class="btn btn-primary-altered"><?= h($txt['login_btn']) ?></a>
    </div>
<?php elseif ($notFoundError !== null): ?>
    <div class="card-altered p-4 text-center">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;margin-bottom:1rem;display:block;opacity:.3"></i>
        <h4 class="fw-bold"><?= h($txt['not_found_title']) ?></h4>
        <p class="text-muted"><?= h(sprintf($txt['not_found_text'], $notFoundError)) ?></p>
        <a href="<?= BASE_URL ?>/pages/tournaments" class="btn btn-outline-secondary"><?= $txt['back_to_list'] ?></a>
    </div>
<?php else: ?>

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
            <a href="<?= h($bgaUrl) ?>" target="_blank" rel="noopener" class="btn btn-sm btn-outline-secondary">
                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i><?= h($txt['bga_link']) ?>
            </a>
        </div>
        <div class="d-flex flex-wrap gap-3 text-muted small" id="tr-tournament-meta">
            <span id="tr-tournament-format"></span>
            <span id="tr-tournament-date"></span>
            <span id="tr-tournament-loc"></span>
            <span id="tr-tournament-players"></span>
        </div>
        <?php if (!empty($description)): ?>
        <div class="mt-2 tr-tournament-description"><?= nl2br(h($description)) ?></div>
        <?php endif; ?>
    </div>

    <!-- Faction / hero distribution -->
    <div class="tr-charts-row">
        <div id="tr-chart-faction"></div>
        <div id="tr-chart-hero"></div>
    </div>

    <!-- Filters -->
    <div class="tr-filter-bar">
        <select id="tr-filter-faction" class="form-select form-select-sm" style="max-width:180px">
            <option value=""><?= h($txt['filter_faction']) ?></option>
        </select>
        <select id="tr-filter-hero" class="form-select form-select-sm" style="max-width:200px">
            <option value=""><?= h($txt['filter_hero']) ?></option>
        </select>
        <input type="search" id="tr-filter-search" class="form-control form-control-sm" style="max-width:220px" placeholder="<?= h($txt['filter_search_ph']) ?>">
    </div>

    <!-- Standings -->
    <div id="tr-ranking-section"></div>

    </div>
<?php endif; ?>
</div>

<?php if (!$loginRequired && $notFoundError === null): ?>
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
var TR_IS_GAMEAPI = true;
var TR_TXT     = <?= json_encode($txt, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_STANDINGS       = <?= json_encode($standings, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_TOURNAMENT_DATA = <?= json_encode($tournamentData, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE) ?>;
var TR_TOURNAMENT_ID = <?= json_encode(h($tournamentId)) ?>;
var TR_TOURNAMENT_NAME = <?= json_encode(h($tournamentName)) ?>;
var TR_LOCALIZATION  = <?= json_encode(h($localization)) ?>;
var TR_CARDS_API_URL = <?= json_encode(defined('CARDS_API_URL') && CARDS_API_URL !== '' ? CARDS_API_URL : null) ?>;
</script>
<?php endif; ?>
