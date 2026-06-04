<?php
require_once __DIR__ . '/../inc/functions.php';

$lang = getUiLang();

$txt = [
    'en' => [
        'page_title'        => 'Events',
        'tab_physical'      => 'Physical',
        'tab_bga'           => 'Online (BGA)',
        'bga_no_data'       => 'No BGA tournaments loaded. An admin can import bga-tournaments.json in Events Settings.',
        'bga_updated'       => 'Data from Board Game Arena',
        'bga_open_bga'      => 'Browse on BGA',
        'bga_count'         => 'tournament(s)',
        'event_status'      => 'Status',
        'bga_registration'  => 'Registration opened',
        'bga_starts'        => 'Starts',
        'bga_ends'          => 'Estimated end',
        'bga_duration'      => 'Game duration',
        'bga_deck_format'   => 'Deck format',
        'bga_undo_off'      => 'Undo disabled',
        'bga_pace'          => 'Pace',
        'bga_max_players'   => 'Max players',
        'bga_filter_title'  => 'Filter tournaments',
        'bga_filter_format' => 'Tournament format',
        'bga_filter_deck'   => 'Deck format',
        'bga_filter_pace'   => 'Pace',
        'bga_filter_all'    => 'All',
        'bga_no_results'    => 'No tournaments match these filters.',
        'no_events'         => 'No upcoming events at the moment.',
        'no_results'        => 'No events found matching your search criteria.',
        'event_date'        => 'Date',
        'event_location'    => 'Location',
        'event_format'      => 'Format',
        'event_players'     => 'Players',
        'event_register'    => 'Register',
        'event_details'     => 'Details',
        'loading'           => 'Loading events...',
        'error_loading'     => 'Unable to load events. Please try again later.',
        'search_title'      => 'Search Events',
        'search_city'       => 'City',
        'search_city_placeholder' => 'Enter a city name...',
        'geolocate'             => 'Use my location',
        'geolocate_error'       => 'Unable to retrieve your location.',
        'geolocate_unsupported' => 'Geolocation is not supported by your browser.',
        'view_list'             => 'List',
        'view_calendar'         => 'Calendar',
        'search_radius'     => 'Radius',
        'search_radius_km'  => 'km',
        'search_date_from'  => 'From',
        'search_date_to'    => 'To',
        'search_btn'        => 'Search',
        'search_reset'      => 'Reset',
        'search_results'    => 'Search Results',
        'results_count'     => 'event(s) found',
        'create_tournament' => 'Create a tournament',
    ],
    'fr' => [
        'page_title'        => 'Événements',
        'tab_physical'      => 'Physique',
        'tab_bga'           => 'En ligne (BGA)',
        'bga_no_data'       => 'Aucun tournoi BGA chargé. Un admin peut importer bga-tournaments.json dans Paramètres Événements.',
        'bga_updated'       => 'Données Board Game Arena',
        'bga_open_bga'      => 'Voir sur BGA',
        'bga_count'         => 'tournoi(s)',
        'event_status'      => 'Statut',
        'bga_registration'  => 'Inscriptions ouvertes',
        'bga_starts'        => 'Début',
        'bga_ends'          => 'Fin estimée',
        'bga_duration'      => 'Durée des parties',
        'bga_deck_format'   => 'Format de deck',
        'bga_undo_off'      => 'Annulation désactivée',
        'bga_pace'          => 'Rythme',
        'bga_max_players'   => 'Joueurs max',
        'bga_filter_title'  => 'Filtrer les tournois',
        'bga_filter_format' => 'Format de tournoi',
        'bga_filter_deck'   => 'Format de deck',
        'bga_filter_pace'   => 'Rythme',
        'bga_filter_all'    => 'Tous',
        'bga_no_results'    => 'Aucun tournoi ne correspond à ces filtres.',
        'no_events'         => 'Aucun événement à venir pour le moment.',
        'no_results'        => 'Aucun événement ne correspond à vos critères de recherche.',
        'event_date'        => 'Date',
        'event_location'    => 'Lieu',
        'event_format'      => 'Format',
        'event_players'     => 'Joueurs',
        'event_register'    => 'S\'inscrire',
        'event_details'     => 'Détails',
        'loading'           => 'Chargement des événements...',
        'error_loading'     => 'Impossible de charger les événements. Veuillez réessayer plus tard.',
        'search_title'      => 'Rechercher des événements',
        'search_city'       => 'Ville',
        'search_city_placeholder' => 'Entrez un nom de ville...',
        'geolocate'             => 'Me localiser',
        'geolocate_error'       => 'Impossible de récupérer votre position.',
        'geolocate_unsupported' => 'La géolocalisation n\'est pas supportée par votre navigateur.',
        'view_list'             => 'Liste',
        'view_calendar'         => 'Calendrier',
        'search_radius'     => 'Rayon',
        'search_radius_km'  => 'km',
        'search_date_from'  => 'Du',
        'search_date_to'    => 'Jusqu\'au',
        'search_btn'        => 'Rechercher',
        'search_reset'      => 'Réinitialiser',
        'search_results'    => 'Résultats de recherche',
        'results_count'     => 'événement(s) trouvé(s)',
        'create_tournament' => 'Créer un tournoi',
    ],
    'de' => [
        'page_title'        => 'Events',
        'tab_physical'      => 'Präsenz',
        'tab_bga'           => 'Online (BGA)',
        'bga_no_data'       => 'Keine BGA-Turniere geladen.',
        'bga_updated'       => 'Daten von Board Game Arena',
        'bga_open_bga'      => 'Auf BGA ansehen',
        'bga_count'         => 'Turnier(e)',
        'event_status'      => 'Status',
        'bga_registration'  => 'Anmeldung geöffnet',
        'bga_starts'        => 'Start',
        'bga_ends'          => 'Vorauss. Ende',
        'bga_duration'      => 'Spieldauer',
        'bga_deck_format'   => 'Deck-Format',
        'bga_undo_off'      => 'Rückgängig deaktiviert',
        'bga_pace'          => 'Tempo',
        'bga_max_players'   => 'Max. Spieler',
        'bga_filter_title'  => 'Turniere filtern',
        'bga_filter_format' => 'Turnierformat',
        'bga_filter_deck'   => 'Deck-Format',
        'bga_filter_pace'   => 'Tempo',
        'bga_filter_all'    => 'Alle',
        'bga_no_results'    => 'Keine Turniere entsprechen diesen Filtern.',
        'no_events'         => 'Derzeit keine bevorstehenden Events.',
        'no_results'        => 'Keine Events gefunden, die Ihren Suchkriterien entsprechen.',
        'event_date'        => 'Datum',
        'event_location'    => 'Ort',
        'event_format'      => 'Format',
        'event_players'     => 'Spieler',
        'event_register'    => 'Anmelden',
        'event_details'     => 'Details',
        'loading'           => 'Events werden geladen...',
        'error_loading'     => 'Events konnten nicht geladen werden. Bitte versuchen Sie es später erneut.',
        'search_title'      => 'Events suchen',
        'search_city'       => 'Stadt',
        'search_city_placeholder' => 'Stadtname eingeben...',
        'geolocate'             => 'Meinen Standort verwenden',
        'geolocate_error'       => 'Standort konnte nicht ermittelt werden.',
        'geolocate_unsupported' => 'Geolokalisierung wird von Ihrem Browser nicht unterstützt.',
        'view_list'             => 'Liste',
        'view_calendar'         => 'Kalender',
        'search_radius'     => 'Radius',
        'search_radius_km'  => 'km',
        'search_date_from'  => 'Von',
        'search_date_to'    => 'Bis',
        'search_btn'        => 'Suchen',
        'search_reset'      => 'Zurücksetzen',
        'search_results'    => 'Suchergebnisse',
        'results_count'     => 'Event(s) gefunden',
        'create_tournament' => 'Turnier erstellen',
    ],
    'es' => [
        'page_title'        => 'Eventos',
        'tab_physical'      => 'Presencial',
        'tab_bga'           => 'En línea (BGA)',
        'bga_no_data'       => 'No hay torneos BGA cargados.',
        'bga_updated'       => 'Datos de Board Game Arena',
        'bga_open_bga'      => 'Ver en BGA',
        'bga_count'         => 'torneo(s)',
        'event_status'      => 'Estado',
        'bga_registration'  => 'Inscripción abierta',
        'bga_starts'        => 'Inicio',
        'bga_ends'          => 'Fin estimado',
        'bga_duration'      => 'Duración del juego',
        'bga_deck_format'   => 'Formato de mazo',
        'bga_undo_off'      => 'Deshacer desactivado',
        'bga_pace'          => 'Ritmo',
        'bga_max_players'   => 'Jugadores máx.',
        'bga_filter_title'  => 'Filtrar torneos',
        'bga_filter_format' => 'Formato de torneo',
        'bga_filter_deck'   => 'Formato de mazo',
        'bga_filter_pace'   => 'Ritmo',
        'bga_filter_all'    => 'Todos',
        'bga_no_results'    => 'Ningún torneo coincide con estos filtros.',
        'no_events'         => 'No hay eventos próximos por el momento.',
        'no_results'        => 'No se encontraron eventos que coincidan con sus criterios de búsqueda.',
        'event_date'        => 'Fecha',
        'event_location'    => 'Lugar',
        'event_format'      => 'Formato',
        'event_players'     => 'Jugadores',
        'event_register'    => 'Inscribirse',
        'event_details'     => 'Detalles',
        'loading'           => 'Cargando eventos...',
        'error_loading'     => 'No se pudieron cargar los eventos. Por favor, inténtelo más tarde.',
        'search_title'      => 'Buscar eventos',
        'search_city'       => 'Ciudad',
        'search_city_placeholder' => 'Ingrese el nombre de una ciudad...',
        'geolocate'             => 'Usar mi ubicación',
        'geolocate_error'       => 'No se pudo obtener su ubicación.',
        'geolocate_unsupported' => 'La geolocalización no es compatible con su navegador.',
        'view_list'             => 'Lista',
        'view_calendar'         => 'Calendario',
        'search_radius'     => 'Radio',
        'search_radius_km'  => 'km',
        'search_date_from'  => 'Desde',
        'search_date_to'    => 'Hasta',
        'search_btn'        => 'Buscar',
        'search_reset'      => 'Restablecer',
        'search_results'    => 'Resultados de búsqueda',
        'results_count'     => 'evento(s) encontrado(s)',
        'create_tournament' => 'Crear un torneo',
    ],
    'it' => [
        'page_title'        => 'Eventi',
        'tab_physical'      => 'In presenza',
        'tab_bga'           => 'Online (BGA)',
        'bga_no_data'       => 'Nessun torneo BGA caricato.',
        'bga_updated'       => 'Dati da Board Game Arena',
        'bga_open_bga'      => 'Vedi su BGA',
        'bga_count'         => 'torneo/i',
        'event_status'      => 'Stato',
        'bga_registration'  => 'Iscrizioni aperte',
        'bga_starts'        => 'Inizio',
        'bga_ends'          => 'Fine stimata',
        'bga_duration'      => 'Durata partita',
        'bga_deck_format'   => 'Formato mazzo',
        'bga_undo_off'      => 'Annullamento disattivato',
        'bga_pace'          => 'Ritmo',
        'bga_max_players'   => 'Giocatori max',
        'bga_filter_title'  => 'Filtra tornei',
        'bga_filter_format' => 'Formato torneo',
        'bga_filter_deck'   => 'Formato mazzo',
        'bga_filter_pace'   => 'Ritmo',
        'bga_filter_all'    => 'Tutti',
        'bga_no_results'    => 'Nessun torneo corrisponde a questi filtri.',
        'no_events'         => 'Nessun evento in programma al momento.',
        'no_results'        => 'Nessun evento trovato corrispondente ai criteri di ricerca.',
        'event_date'        => 'Data',
        'event_location'    => 'Luogo',
        'event_format'      => 'Formato',
        'event_players'     => 'Giocatori',
        'event_register'    => 'Iscriversi',
        'event_details'     => 'Dettagli',
        'loading'           => 'Caricamento eventi...',
        'error_loading'     => 'Impossibile caricare gli eventi. Riprovare più tardi.',
        'search_title'      => 'Cerca eventi',
        'search_city'       => 'Città',
        'search_city_placeholder' => 'Inserisci il nome di una città...',
        'geolocate'             => 'Usa la mia posizione',
        'geolocate_error'       => 'Impossibile recuperare la tua posizione.',
        'geolocate_unsupported' => 'La geolocalizzazione non è supportata dal tuo browser.',
        'view_list'             => 'Lista',
        'view_calendar'         => 'Calendario',
        'search_radius'     => 'Raggio',
        'search_radius_km'  => 'km',
        'search_date_from'  => 'Dal',
        'search_date_to'    => 'Al',
        'search_btn'        => 'Cerca',
        'search_reset'      => 'Reimposta',
        'search_results'    => 'Risultati della ricerca',
        'results_count'     => 'evento/i trovato/i',
        'create_tournament' => 'Crea un torneo',
    ],
][$lang] ?? [];

$pageTitle = $txt['page_title'];

$tournaments = [];
$error = false;
$isSearch = false;
$searchParams = [];
$totalResults = 0;

// Handle search form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'search') {
    $isSearch = true;

    $city = trim($_POST['city'] ?? '');
    $radius = (int)($_POST['radius'] ?? 50);
    $dateFrom = $_POST['date_from'] ?? '';
    $dateTo = $_POST['date_to'] ?? '';

    $searchParams = [
        'city'     => $city,
        'radius'   => $radius,
        'dateFrom' => $dateFrom,
        'dateTo'   => $dateTo,
    ];

    $apiParams = [
        'limit'  => 50,
        'offset' => 0,
    ];

    // Geocode city if provided
    if (!empty($city)) {
        $coords = reGeocodeCity($city);
        if ($coords) {
            $apiParams['location'] = $city;
            $apiParams['latitude'] = $coords['lat'];
            $apiParams['longitude'] = $coords['lon'];
            $apiParams['radius'] = $radius;
        }
    }

    if (!empty($dateFrom)) {
        $apiParams['dateFrom'] = $dateFrom;
    }
    if (!empty($dateTo)) {
        $apiParams['dateTo'] = $dateTo;
    }

    $result = reSearchTournaments($apiParams);
    $tournaments = $result['tournaments'] ?? [];
    $totalResults = $result['total'] ?? count($tournaments);
} else {
    $result = reGetUpcomingTournaments();
    if ($result === null) {
        $error = true;
    } else {
        $tournaments = $result['tournaments'] ?? [];
    }
}

$physicalCount = $error ? 0 : count($tournaments);

$bgaData        = reLoadBgaTournamentsJson();
$bgaTournaments = reFilterBgaUpcomingTournaments($bgaData['tournaments']);
$bgaCount       = count($bgaTournaments);
$bgaExportedAt  = $bgaData['exported_at'];
$bgaListUrl     = 'https://boardgamearena.com/tournamentlist?gamecateg=3&game=1909';
$bgaFilterOpts  = $bgaCount > 0 ? reCollectBgaFilterOptions($bgaTournaments) : ['formats' => [], 'decks' => [], 'paces' => []];
$bgaForJs       = array_values(array_map(function ($b) use ($lang, $txt) {
    $date = $b['start_date'] ?? '';
    if ($date === '' && !empty($b['start_datetime'])) {
        $date = substr((string)$b['start_datetime'], 0, 10);
    }
    $deckLabel = reBgaDeckFormatLabel($b['deck_format'] ?? null);

    return [
        'id'                => $b['id'],
        'name'              => $b['name'] ?? '',
        'series'            => $b['championship_name'] ?? '',
        'date'              => $date,
        'start_instant_iso' => $b['start_instant_iso'] ?? null,
        'start_has_time'    => !empty($b['start_has_time']),
        'starts_label'      => $txt['bga_starts'] ?? 'Starts',
        'format'            => $b['format'] ?? '',
        'filter_format'     => $b['format'] ?? '',
        'deck_format'       => $deckLabel,
        'filter_deck'       => $deckLabel,
        'game_mode'         => $b['game_mode'] ?? '',
        'game_pace'         => $b['game_pace'] ?? '',
        'filter_pace'       => $b['game_pace'] ?? '',
        'max_players'       => !empty($b['max_players']) ? (int)$b['max_players'] : null,
        'max_players_label' => $txt['bga_max_players'] ?? 'Max players',
        'url'               => $b['url'] ?? '',
    ];
}, $bgaTournaments));
$bgaJsonFlags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE;
?>
<div class="container py-4">

    <div class="section-title mb-4"><span><?= h($pageTitle) ?></span></div>

    <div class="re-events-tabs-sticky">
        <ul class="nav nav-tabs re-events-tabs" id="reEventsTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="re-tab-physical-btn" data-bs-toggle="tab"
                        data-bs-target="#re-tab-physical" type="button" role="tab" aria-controls="re-tab-physical" aria-selected="true">
                    <i class="fa-solid fa-location-dot re-events-tab-icon" aria-hidden="true"></i>
                    <span class="re-events-tab-label"><?= h($txt['tab_physical']) ?></span>
                    <?php if ($physicalCount > 0): ?>
                    <span class="badge re-events-tab-badge"><?= h($physicalCount) ?></span>
                    <?php endif; ?>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="re-tab-bga-btn" data-bs-toggle="tab"
                        data-bs-target="#re-tab-bga" type="button" role="tab" aria-controls="re-tab-bga" aria-selected="false">
                    <i class="fa-solid fa-globe re-events-tab-icon" aria-hidden="true"></i>
                    <span class="re-events-tab-label"><?= h($txt['tab_bga']) ?></span>
                    <?php if ($bgaCount > 0): ?>
                    <span class="badge re-events-tab-badge"><?= h($bgaCount) ?></span>
                    <?php endif; ?>
                </button>
            </li>
        </ul>
    </div>

    <div class="tab-content">
    <div class="tab-pane fade show active" id="re-tab-physical" role="tabpanel">

    <div class="d-flex align-items-center justify-content-end mb-4">
        <a href="https://altered-tournament-tools.com/tournaments/create"
           class="btn btn-primary-altered btn-sm"
           target="_blank"
           rel="noopener">
            <i class="fa-solid fa-plus me-2"></i><?= h($txt['create_tournament']) ?>
        </a>
    </div>

    <?php if ($error): ?>
    <div class="alert alert-danger">
        <i class="fa-solid fa-circle-xmark me-2"></i>
        <?= h($txt['error_loading']) ?>
    </div>

    <?php else: ?>

    <!-- Search Form -->
    <div class="card-altered p-4 mb-4">
        <h5 class="mb-3">
            <i class="fa-solid fa-magnifying-glass me-2"></i>
            <?= h($txt['search_title']) ?>
        </h5>
        <form method="post" id="search-form">
            <input type="hidden" name="action" value="search">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label small fw-semibold"><?= h($txt['search_city']) ?></label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="fa-solid fa-location-dot"></i></span>
                        <input type="text"
                               name="city"
                               id="search-city"
                               class="form-control"
                               placeholder="<?= h($txt['search_city_placeholder']) ?>"
                               value="<?= h($searchParams['city'] ?? '') ?>"
                               autocomplete="off">
                        <button type="button"
                                id="btn-geolocate"
                                class="btn btn-outline-secondary"
                                title="<?= h($txt['geolocate']) ?>"
                                data-error="<?= h($txt['geolocate_error']) ?>"
                                data-unsupported="<?= h($txt['geolocate_unsupported']) ?>">
                            <i class="fa-solid fa-crosshairs"></i>
                        </button>
                    </div>
                </div>
                <div class="col-md-2">
                    <label class="form-label small fw-semibold"><?= h($txt['search_radius']) ?></label>
                    <div class="input-group">
                        <select name="radius" class="form-select" id="search-radius">
                            <?php
                            $radiusOptions = [10, 25, 50, 100, 200, 500];
                            $selectedRadius = $searchParams['radius'] ?? 50;
                            foreach ($radiusOptions as $r):
                            ?>
                            <option value="<?= $r ?>" <?= $selectedRadius == $r ? 'selected' : '' ?>>
                                <?= $r ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                        <span class="input-group-text"><?= h($txt['search_radius_km']) ?></span>
                    </div>
                </div>
                <div class="col-md-2">
                    <label class="form-label small fw-semibold"><?= h($txt['search_date_from']) ?></label>
                    <input type="date"
                           name="date_from"
                           id="search-date-from"
                           class="form-control"
                           value="<?= h($searchParams['dateFrom'] ?? '') ?>">
                </div>
                <div class="col-md-2">
                    <label class="form-label small fw-semibold"><?= h($txt['search_date_to']) ?></label>
                    <input type="date"
                           name="date_to"
                           id="search-date-to"
                           class="form-control"
                           value="<?= h($searchParams['dateTo'] ?? '') ?>">
                </div>
                <div class="col-md-2 d-flex align-items-end gap-2">
                    <button type="submit" class="btn btn-primary-altered flex-grow-1">
                        <i class="fa-solid fa-search me-1"></i>
                        <?= h($txt['search_btn']) ?>
                    </button>
                    <a href="<?= BASE_URL ?>/pages/events" class="btn btn-outline-secondary" title="<?= h($txt['search_reset']) ?>">
                        <i class="fa-solid fa-rotate-left"></i>
                    </a>
                </div>
            </div>
        </form>
    </div>

    <!-- View toggle -->
    <div class="view-toggle mb-3">
        <button type="button" class="view-toggle-btn active" id="btn-view-list">
            <i class="fa-solid fa-list"></i> <?= h($txt['view_list']) ?>
        </button>
        <button type="button" class="view-toggle-btn" id="btn-view-calendar">
            <i class="fa-solid fa-calendar-days"></i> <?= h($txt['view_calendar']) ?>
        </button>
    </div>

    <?php if ($isSearch): ?>
    <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="mb-0">
            <i class="fa-solid fa-list me-2"></i>
            <?= h($txt['search_results']) ?>
        </h5>
        <span class="badge bg-primary"><?= h($totalResults) ?> <?= h($txt['results_count']) ?></span>
    </div>
    <?php endif; ?>

    <!-- Liste -->
    <div id="view-list">
        <?php if (empty($tournaments)): ?>
        <div class="card-altered p-4 text-center">
            <i class="fa-solid fa-calendar-xmark fa-3x text-muted mb-3"></i>
            <p class="text-muted mb-0"><?= h($isSearch ? $txt['no_results'] : $txt['no_events']) ?></p>
        </div>
        <?php else: ?>
        <div class="events-list">
            <?php foreach ($tournaments as $event): ?>
            <?php $eventUrl = RE_TOURNAMENT_BASE_URL . ($event['id'] ?? ''); ?>
            <a href="<?= h($eventUrl) ?>" class="event-card card-altered p-4" target="_blank" rel="noopener">
                <div class="event-card-inner">
                    <div class="event-info">
                        <h5 class="event-title mb-1">
                            <i class="fa-solid fa-trophy text-warning me-2"></i>
                            <?= h($event['name'] ?? 'Unnamed Event') ?>
                        </h5>

                        <div class="event-details">
                            <?php
                            $physDateRaw  = $event['date'] ?? $event['startDate'] ?? '';
                            $physLocation = $event['location'] ?? $event['venue'] ?? '';
                            $physInstant  = $physDateRaw !== '' ? rePhysStartInstantIso($physDateRaw, $physLocation) : null;
                            $physHasTime  = (bool) preg_match('/T\d{2}:\d{2}/', $physDateRaw);
                            ?>
                            <?php if ($physDateRaw !== ''): ?>
                            <span><i class="fa-solid fa-calendar"></i>
                                <?php if ($physInstant): ?>
                                <time class="re-phys-start-dt"
                                      datetime="<?= h($physInstant) ?>"
                                      data-has-time="<?= $physHasTime ? '1' : '0' ?>">
                                    <?= h(reFormatDate($physDateRaw, $lang)) ?>
                                </time>
                                <?php else: ?>
                                <?= h(reFormatDate($physDateRaw, $lang)) ?>
                                <?php endif; ?>
                            </span>
                            <?php endif; ?>

                            <?php if (!empty($event['location']) || !empty($event['venue'])): ?>
                            <span><i class="fa-solid fa-location-dot"></i><?= h($event['location'] ?? $event['venue']) ?></span>
                            <?php endif; ?>

                            <?php if (!empty($event['format'])): ?>
                            <span><i class="fa-solid fa-layer-group"></i><?= h(reFormatTournamentFormat($event['format'], $lang)) ?></span>
                            <?php endif; ?>

                            <?php if (isset($event['playerCount']) || isset($event['maxPlayers'])): ?>
                            <span>
                                <i class="fa-solid fa-users"></i>
                                <?= h($event['playerCount'] ?? 0) ?><?= !empty($event['maxPlayers']) ? ' / ' . h($event['maxPlayers']) : '' ?>
                            </span>
                            <?php endif; ?>

                            <?php if (!empty($event['distance'])): ?>
                            <span><i class="fa-solid fa-route"></i><?= h(round($event['distance'], 1)) ?> km</span>
                            <?php endif; ?>
                        </div>

                        <?php if (!empty($event['description'])): ?>
                        <p class="event-description mb-0">
                            <?= h(mb_substr($event['description'], 0, 200)) ?><?= mb_strlen($event['description']) > 200 ? '…' : '' ?>
                        </p>
                        <?php endif; ?>
                    </div>

                    <div class="event-actions">
                        <i class="fa-solid fa-arrow-up-right-from-square text-muted"></i>
                    </div>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>

    <!-- Calendrier -->
    <div id="view-calendar" style="display:none"></div>

    <?php
    $eventsForJs = array_values(array_map(function ($e) use ($lang) {
        return [
            'id'       => $e['id'] ?? '',
            'name'     => $e['name'] ?? '',
            'date'     => $e['date'] ?? $e['startDate'] ?? '',
            'location' => $e['location'] ?? $e['venue'] ?? '',
            'format'   => reFormatTournamentFormat($e['format'] ?? '', $lang),
            'players'  => isset($e['playerCount'])
                ? ($e['playerCount'] . (!empty($e['maxPlayers']) ? ' / ' . $e['maxPlayers'] : ''))
                : '',
            'distance' => !empty($e['distance']) ? round($e['distance'], 1) : null,
            'url'      => RE_TOURNAMENT_BASE_URL . ($e['id'] ?? ''),
        ];
    }, $tournaments));
    ?>
    <script>
    window._reEvents = <?= json_encode($eventsForJs, JSON_HEX_TAG | JSON_HEX_AMP) ?>;
    </script>

    <?php endif; ?>

    </div><!-- /re-tab-physical -->

    <div class="tab-pane fade" id="re-tab-bga" role="tabpanel">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
                <?php if ($bgaCount > 0): ?>
                <span class="badge bg-primary"><?= h($bgaCount) ?> <?= h($txt['bga_count']) ?></span>
                <?php if (!empty($bgaExportedAt)): ?>
                <span class="small text-muted ms-2">
                    <?= h($txt['bga_updated']) ?> — <?= h($bgaExportedAt) ?>
                </span>
                <?php endif; ?>
                <?php endif; ?>
            </div>
            <a href="<?= h($bgaListUrl) ?>"
               class="btn btn-outline-secondary btn-sm"
               target="_blank"
               rel="noopener">
                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i><?= h($txt['bga_open_bga']) ?>
            </a>
        </div>

        <?php if ($bgaCount === 0): ?>
        <div class="card-altered p-4 text-center">
            <i class="fa-solid fa-cloud-arrow-down fa-3x text-muted mb-3"></i>
            <p class="text-muted mb-0"><?= h($txt['bga_no_data']) ?></p>
        </div>
        <?php else: ?>
        <script type="application/json" id="re-bga-events-json"><?= json_encode($bgaForJs, $bgaJsonFlags) ?></script>

        <div class="card-altered p-4 mb-4" id="bga-filter-panel">
            <h5 class="mb-3">
                <i class="fa-solid fa-filter me-2"></i><?= h($txt['bga_filter_title']) ?>
            </h5>
            <form id="bga-filter-form" action="#" method="get" autocomplete="off">
            <div class="row g-3 align-items-end">
                <div class="col-md-3">
                    <label class="form-label small fw-semibold" for="bga-filter-format"><?= h($txt['bga_filter_format']) ?></label>
                    <select class="form-select" id="bga-filter-format">
                        <option value=""><?= h($txt['bga_filter_all']) ?></option>
                        <?php foreach ($bgaFilterOpts['formats'] as $opt): ?>
                        <option value="<?= h($opt) ?>"><?= h($opt) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-semibold" for="bga-filter-deck"><?= h($txt['bga_filter_deck']) ?></label>
                    <select class="form-select" id="bga-filter-deck">
                        <option value=""><?= h($txt['bga_filter_all']) ?></option>
                        <?php foreach ($bgaFilterOpts['decks'] as $opt): ?>
                        <option value="<?= h($opt) ?>"><?= h($opt) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label small fw-semibold" for="bga-filter-pace"><?= h($txt['bga_filter_pace']) ?></label>
                    <select class="form-select" id="bga-filter-pace">
                        <option value=""><?= h($txt['bga_filter_all']) ?></option>
                        <?php foreach ($bgaFilterOpts['paces'] as $opt): ?>
                        <option value="<?= h($opt) ?>"><?= h($opt) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-4 d-flex align-items-end gap-2">
                    <button type="submit" class="btn btn-primary-altered flex-grow-1" id="bga-filter-search">
                        <i class="fa-solid fa-search me-1"></i><?= h($txt['search_btn']) ?>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" id="bga-filter-reset" title="<?= h($txt['search_reset']) ?>">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
            </div>
            </form>
        </div>

        <div class="view-toggle mb-3">
            <button type="button" class="view-toggle-btn active" id="btn-bga-view-list">
                <i class="fa-solid fa-list"></i> <?= h($txt['view_list']) ?>
            </button>
            <button type="button" class="view-toggle-btn" id="btn-bga-view-calendar">
                <i class="fa-solid fa-calendar-days"></i> <?= h($txt['view_calendar']) ?>
            </button>
        </div>

        <div id="bga-view-list">
        <div class="card-altered p-4 text-center d-none mb-3" id="bga-filter-empty">
            <i class="fa-solid fa-filter-circle-xmark fa-2x text-muted mb-2"></i>
            <p class="text-muted mb-0"><?= h($txt['bga_no_results']) ?></p>
        </div>
        <div class="events-list" id="bga-events-list">
            <?php foreach ($bgaTournaments as $bga): ?>
            <?php
                $bgaStartDisplay = $bga['start_datetime'] ?? $bga['start_date'] ?? '';
                $bgaDeckLabel = reBgaDeckFormatLabel($bga['deck_format'] ?? null);
            ?>
            <a href="<?= h($bga['url']) ?>"
               class="event-card card-altered p-4 bga-event-card"
               target="_blank"
               rel="noopener"
               data-bga-format="<?= h($bga['format'] ?? '') ?>"
               data-bga-deck="<?= h($bgaDeckLabel) ?>"
               data-bga-pace="<?= h($bga['game_pace'] ?? '') ?>">
                <div class="event-card-inner">
                    <div class="event-info">
                        <h5 class="event-title mb-1">
                            <i class="fa-solid fa-trophy text-warning me-2"></i>
                            <?= h($bga['name'] ?: 'Tournament') ?>
                        </h5>
                        <?php if (!empty($bga['championship_name'])): ?>
                        <p class="small text-muted mb-2"><?= h($bga['championship_name']) ?></p>
                        <?php endif; ?>
                        <div class="event-details">
                            <?php if (!empty($bga['start_instant_iso']) || $bgaStartDisplay !== ''): ?>
                            <span>
                                <i class="fa-solid fa-calendar"></i><?= h($txt['bga_starts']) ?>:
                                <time class="re-bga-start-dt"
                                      datetime="<?= h($bga['start_instant_iso'] ?? '') ?>"
                                      data-has-time="<?= !empty($bga['start_has_time']) ? '1' : '0' ?>">
                                    <?= h(reFormatDate($bgaStartDisplay, $lang)) ?>
                                </time>
                            </span>
                            <?php endif; ?>
                            <?php if (!empty($bga['format'])): ?>
                            <span><i class="fa-solid fa-layer-group"></i><?= h($bga['format']) ?></span>
                            <?php endif; ?>
                            <?php if ($bgaDeckLabel !== ''): ?>
                            <span>
                                <i class="fa-solid fa-clone"></i>
                                <?= h($txt['bga_deck_format']) ?>: <?= h($bgaDeckLabel) ?>
                            </span>
                            <?php endif; ?>
                            <?php if (!empty($bga['game_mode'])): ?>
                            <span><i class="fa-solid fa-gamepad"></i><?= h($bga['game_mode']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($bga['game_pace'])): ?>
                            <span><i class="fa-solid fa-clock"></i><?= h($txt['bga_pace']) ?>: <?= h($bga['game_pace']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($bga['max_players'])): ?>
                            <span>
                                <i class="fa-solid fa-users"></i>
                                <?= h($txt['bga_max_players']) ?>: <?= h((int)$bga['max_players']) ?>
                            </span>
                            <?php endif; ?>
                            <?php if (isset($bga['allow_undo']) && $bga['allow_undo'] === false): ?>
                            <span><i class="fa-solid fa-rotate-left"></i><?= h($txt['bga_undo_off']) ?></span>
                            <?php endif; ?>
                            <?php if (!empty($bga['game_duration'])): ?>
                            <span><i class="fa-solid fa-hourglass-half"></i><?= h($txt['bga_duration']) ?>: <?= h($bga['game_duration']) ?></span>
                            <?php endif; ?>
                            <?php if (isset($bga['progress']) && $bga['status'] === 'progress'): ?>
                            <span><i class="fa-solid fa-chart-line"></i><?= h(round($bga['progress'] * 100)) ?>%</span>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="event-actions">
                        <i class="fa-solid fa-arrow-up-right-from-square text-muted"></i>
                    </div>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
        </div>

        <div id="bga-view-calendar" style="display:none"></div>
        <?php endif; ?>
    </div><!-- /re-tab-bga -->

    </div><!-- /tab-content -->
    <p class="text-end text-muted small mt-3">
        Plugin by <strong>Benhol</strong> and <strong>Re:Union team</strong>
    </p>
</div>

<script>
window._reLang = <?= json_encode($lang) ?>;
window._reBgaEvents = <?= json_encode($bgaForJs, $bgaJsonFlags) ?>;
window._reBgaStrings = <?= json_encode([
    'no_results' => $txt['bga_no_results'] ?? '',
], JSON_HEX_TAG | JSON_HEX_AMP) ?>;
</script>
