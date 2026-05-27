<?php
require_once __DIR__ . '/../inc/functions.php';

$lang = getUiLang();

$txt = [
    'en' => [
        'page_title'        => 'Upcoming physical Events',
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
        'page_title'        => 'Événements physiques à venir',
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
        'page_title'        => 'Bevorstehende Präsenz-Events',
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
        'page_title'        => 'Próximos eventos presenciales',
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
        'page_title'        => 'Prossimi eventi in presenza',
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
?>
<div class="container py-4">

    <div class="d-flex align-items-center justify-content-between mb-4">
        <div class="section-title mb-0"><span><?= h($pageTitle) ?></span></div>
        <a href="https://altered-tournament-tools.com/tournaments/create"
           class="btn btn-primary-altered"
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
                            <?php if (!empty($event['date']) || !empty($event['startDate'])): ?>
                            <span><i class="fa-solid fa-calendar"></i><?= h(reFormatDate($event['date'] ?? $event['startDate'], $lang)) ?></span>
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
    window._reLang   = <?= json_encode($lang) ?>;
    </script>

    <?php endif; ?>

</div>
