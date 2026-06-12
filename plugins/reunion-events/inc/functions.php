<?php
/**
 * Plugin shared helpers for Réunion Events.
 *
 * Usage — include at the top of any page / admin / api file:
 *   require_once __DIR__ . '/../inc/functions.php';   // from pages/ or admin/
 *   require_once __DIR__ . '/../../inc/functions.php'; // from api/
 */

define('RE_API_BASE_URL',        'https://altered-tournament-tools.com/api/v1');
define('RE_TOURNAMENT_BASE_URL', 'https://altered-tournament-tools.com/tournaments/');
define('RE_BGA_TOURNAMENT_BASE_URL', 'https://boardgamearena.com/tournament?id=');

/** BGA statuses shown on the site (open registration, planned, in progress — not finished). */
define('RE_BGA_ALLOWED_STATUSES', ['register', 'future', 'progress']);

/** IANA timezone for naive start_datetime values in scrape JSON (BGA scrape = Europe/Paris, CEST/CET). */
define('RE_BGA_DATETIME_SOURCE_TZ', 'Europe/Paris');

/** Deck format choices for admin “add tournament” form. */
define('RE_BGA_ADMIN_DECK_FORMATS', [
    'Standard All Uniques',
    'Standard No Unique',
    'Singleton No Unique',
    'Sandbox',
]);

/** Pace choices for admin “add tournament” form. */
define('RE_BGA_ADMIN_PACE_OPTIONS', [
    'Turn-Based',
    'Real-Time',
]);

function reGetBgaJsonPath(): string
{
    return dirname(__DIR__) . '/data/bga-tournaments.json';
}

function reGetPhysTzCachePath(): string
{
    return dirname(__DIR__) . '/data/phys-tz-cache.json';
}

/**
 * Return a plugin setting value, or $default if the key does not exist.
 */
function reGetSetting(string $key, string $default = ''): string
{
    global $db;
    $row = $db->prepare(qp("SELECT value FROM {settings} WHERE `key` = :k"));
    $row->execute([':k' => $key]);
    $val = $row->fetchColumn();
    return $val !== false ? (string)$val : $default;
}

/**
 * Upsert a plugin setting (insert or update on duplicate key).
 */
function reSaveSetting(string $key, string $value): void
{
    global $db;
    $db->prepare(qp(
        "INSERT INTO {settings} (`key`, value) VALUES (:k, :v)
         ON DUPLICATE KEY UPDATE value = :v2"
    ))->execute([':k' => $key, ':v' => $value, ':v2' => $value]);
}

/**
 * Get the API key from settings.
 */
function reGetApiKey(): string
{
    return reGetSetting('api_key', '');
}

/**
 * Make an API request to Altered Tournament Tools.
 *
 * @param string $endpoint The API endpoint (e.g., 'tournaments/upcoming')
 * @param array $params Query parameters (GET) or request body (POST)
 * @param bool $post When true, sends a JSON POST request instead of GET
 * @return array|null The decoded JSON response, or null on error
 */
function reApiRequest(string $endpoint, array $params = [], bool $post = false): ?array
{
    $url     = RE_API_BASE_URL . '/' . ltrim($endpoint, '/');
    $headers = ['Accept: application/json'];

    $apiKey = reGetApiKey();
    if (!empty($apiKey)) {
        $headers[] = 'X-API-Key: ' . $apiKey;
    }

    $opts = [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
    ];

    if ($post) {
        $opts[CURLOPT_POST]       = true;
        $opts[CURLOPT_POSTFIELDS] = json_encode($params);
        $headers[]                = 'Content-Type: application/json';
    } elseif (!empty($params)) {
        $opts[CURLOPT_URL] = $url . '?' . http_build_query($params);
    }

    $opts[CURLOPT_HTTPHEADER] = $headers;

    $ch = curl_init();
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || $response === false) {
        return null;
    }

    $data = json_decode($response, true);
    return is_array($data) ? $data : null;
}

/**
 * Fetch upcoming tournaments from the API.
 *
 * @param int $limit Maximum number of tournaments to fetch
 * @param int $offset Offset for pagination
 * @return array|null The API response array, or null on error
 */
function reGetUpcomingTournaments(int $limit = 50, int $offset = 0): ?array
{
    return reApiRequest('tournaments/upcoming', [
        'limit'  => $limit,
        'offset' => $offset,
    ]);
}

/**
 * Format a tournament date for display.
 *
 * @param string $dateStr ISO date string
 * @param string $lang Language code ('fr', 'en', 'de', 'es', 'it')
 * @return string Formatted date
 */
function reFormatDate(string $dateStr, string $lang = 'fr'): string
{
    try {
        $date = new DateTime($dateStr);
    } catch (Exception $e) {
        return $dateStr;
    }

    // Only show time if the source string actually contains a time component
    $hasTime = (bool) preg_match('/T\d{2}:\d{2}/', $dateStr);

    if (class_exists('IntlDateFormatter')) {
        $localeMap = ['fr' => 'fr_FR', 'de' => 'de_DE', 'es' => 'es_ES', 'it' => 'it_IT', 'en' => 'en_US'];
        $locale    = $localeMap[$lang] ?? 'en_US';
        $timeFmt   = $hasTime ? IntlDateFormatter::SHORT : IntlDateFormatter::NONE;
        $formatter = new IntlDateFormatter($locale, IntlDateFormatter::LONG, $timeFmt);
        return $formatter->format($date);
    }

    $day   = (int) $date->format('j');
    $month = (int) $date->format('n');
    $year  = $date->format('Y');
    $time  = $date->format('H:i');

    if ($lang === 'fr') {
        $months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
        $label  = $day . ' ' . $months[$month - 1] . ' ' . $year;
        return $hasTime ? "$label à $time" : $label;
    }

    if ($lang === 'de') {
        $months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        $label  = $day . '. ' . $months[$month - 1] . ' ' . $year;
        return $hasTime ? "$label um $time Uhr" : $label;
    }

    if ($lang === 'es') {
        $months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        $label  = $day . ' de ' . $months[$month - 1] . ' de ' . $year;
        return $hasTime ? "$label a las $time" : $label;
    }

    if ($lang === 'it') {
        $months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
        $label  = $day . ' ' . $months[$month - 1] . ' ' . $year;
        return $hasTime ? "$label alle $time" : $label;
    }

    return $hasTime
        ? $date->format('F j, Y \a\t g:i A')
        : $date->format('F j, Y');
}

/**
 * Load the geocoded timezone cache from disk.
 *
 * @return array<string, string> Map of location string → IANA timezone
 */
function rePhysLoadTzCache(): array
{
    $path = reGetPhysTzCachePath();
    if (!file_exists($path)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

/**
 * Persist the timezone cache to disk.
 *
 * @param array<string, string> $cache
 */
function rePhysSaveTzCache(array $cache): void
{
    file_put_contents(
        reGetPhysTzCachePath(),
        json_encode($cache, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
}

/**
 * Geocode a full address string via Nominatim, returning lat, lon and ISO country code.
 *
 * @return array{lat: float, lon: float, country_code: string}|null
 */
function rePhysGeocodeAddress(string $address): ?array
{
    $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
        'q'              => $address,
        'format'         => 'json',
        'limit'          => 1,
        'addressdetails' => 1,
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['User-Agent: ReunionEventsPlugin/1.0'],
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || $response === false) {
        return null;
    }

    $data = json_decode((string) $response, true);
    if (!is_array($data) || empty($data[0])) {
        return null;
    }

    $item        = $data[0];
    $countryCode = $item['address']['country_code'] ?? null;
    if (!$countryCode) {
        return null;
    }

    return [
        'lat'          => (float) $item['lat'],
        'lon'          => (float) $item['lon'],
        'country_code' => strtoupper((string) $countryCode),
    ];
}

/**
 * Pick the IANA timezone identifier whose canonical location is closest
 * to the given coordinates, among all timezones for the given ISO country code.
 *
 * Uses only PHP built-ins: DateTimeZone::listIdentifiers() + getLocation().
 */
function rePhysTimezoneFromCoords(float $lat, float $lon, string $countryCode): string
{
    $identifiers = DateTimeZone::listIdentifiers(DateTimeZone::PER_COUNTRY, $countryCode);
    if (empty($identifiers)) {
        return 'UTC';
    }
    if (count($identifiers) === 1) {
        return $identifiers[0];
    }

    $best     = null;
    $bestDist = PHP_FLOAT_MAX;
    foreach ($identifiers as $id) {
        try {
            $loc  = (new DateTimeZone($id))->getLocation();
            $dist = ($lat - $loc['latitude']) ** 2 + ($lon - $loc['longitude']) ** 2;
            if ($dist < $bestDist) {
                $bestDist = $dist;
                $best     = $id;
            }
        } catch (Exception $e) {
            continue;
        }
    }

    return $best ?? $identifiers[0];
}

/**
 * Resolve the IANA timezone for a physical tournament location string.
 *
 * Geocodes the address via Nominatim (one call, result cached in
 * data/phys-tz-cache.json) then picks the timezone closest to the
 * coordinates using PHP's built-in DateTimeZone data — no external
 * timezone API required.
 */
function rePhysLocationTimezone(string $location): string
{
    if (trim($location) === '') {
        return 'UTC';
    }

    $cache = rePhysLoadTzCache();
    if (isset($cache[$location])) {
        return $cache[$location];
    }

    $geo = rePhysGeocodeAddress($location);
    if (!$geo) {
        // Fallback: try progressively shorter suffixes (strip leading segments)
        // e.g. "Multiplayer, Palermo, Italy" → "Palermo, Italy" → "Italy"
        $segments = array_map('trim', explode(',', $location));
        for ($i = 1; $i < count($segments); $i++) {
            $shorter = implode(', ', array_slice($segments, $i));
            $geo = rePhysGeocodeAddress($shorter);
            if ($geo) {
                break;
            }
        }
    }
    if (!$geo) {
        return 'UTC';
    }

    $tz = rePhysTimezoneFromCoords($geo['lat'], $geo['lon'], $geo['country_code']);

    $cache[$location] = $tz;
    rePhysSaveTzCache($cache);

    return $tz;
}

/**
 * Convert a physical tournament date string to a UTC ISO instant.
 *
 * The API stores local venue time but labels the offset as +00:00 (known API bug).
 * We strip that incorrect offset, interpret the time in the venue's timezone
 * (inferred from the location string), and return a true UTC ISO-8601 string.
 */
function rePhysStartInstantIso(?string $dateStr, string $location = ''): ?string
{
    if ($dateStr === null || trim($dateStr) === '') {
        return null;
    }
    try {
        $naive = preg_replace('/(Z|[+-]\d{2}:?\d{2})$/', '', trim($dateStr));
        $tz    = rePhysLocationTimezone($location);
        $dt    = new DateTime($naive, new DateTimeZone($tz));
        $dt->setTimezone(new DateTimeZone('UTC'));
        return $dt->format('Y-m-d\TH:i:s\Z');
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Whether a BGA date string includes a time component.
 */
function reBgaStartHasTime(string $dateStr): bool
{
    return (bool) preg_match('/T\d{2}:\d{2}/', $dateStr);
}

/**
 * Resolve source timezone for naive BGA datetimes (file-level or per-tournament override).
 */
function reResolveBgaDatetimeSourceTz(array $payload, ?array $row = null): string
{
    if ($row !== null && !empty($row['start_timezone']) && is_string($row['start_timezone'])) {
        return $row['start_timezone'];
    }
    if (!empty($payload['datetime_timezone']) && is_string($payload['datetime_timezone'])) {
        return $payload['datetime_timezone'];
    }

    return RE_BGA_DATETIME_SOURCE_TZ;
}

/**
 * Convert a BGA start value to an ISO-8601 UTC instant for client-side local display.
 */
function reBgaStartInstantIso(?string $datetime, string $sourceTz = 'UTC'): ?string
{
    if ($datetime === null || trim($datetime) === '') {
        return null;
    }

    $datetime = trim($datetime);

    try {
        if (preg_match('/(Z|[+-]\d{2}:?\d{2})$/i', $datetime)) {
            $dt = new DateTime($datetime);
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $datetime)) {
            $dt = new DateTime($datetime . 'T12:00:00', new DateTimeZone($sourceTz));
        } else {
            $dt = new DateTime($datetime, new DateTimeZone($sourceTz));
        }
        $dt->setTimezone(new DateTimeZone('UTC'));

        return $dt->format('Y-m-d\TH:i:s\Z');
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Add UTC instant + has_time flags for browser timezone formatting.
 */
function reAugmentBgaStartInstant(array $tournament, string $sourceTz): array
{
    $raw = $tournament['start_datetime'] ?? $tournament['start_date'] ?? '';
    $raw = is_string($raw) ? trim($raw) : '';

    $tournament['start_has_time']    = $raw !== '' && reBgaStartHasTime($raw);
    $tournament['start_instant_iso'] = $raw !== '' ? reBgaStartInstantIso($raw, $sourceTz) : null;

    return $tournament;
}

/**
 * BGA tournament still upcoming (start not reached yet).
 */
function reIsBgaTournamentUpcoming(array $tournament): bool
{
    if (($tournament['status'] ?? '') === 'finished') {
        return false;
    }

    $iso = $tournament['start_instant_iso'] ?? null;
    if (is_string($iso) && $iso !== '') {
        try {
            $start = new DateTime($iso);
            $now   = new DateTime('now', new DateTimeZone('UTC'));

            return $start > $now;
        } catch (Exception $e) {
            return true;
        }
    }

    $startDate = $tournament['start_date'] ?? null;
    if (is_string($startDate) && $startDate !== '') {
        $today = (new DateTime('now', new DateTimeZone(RE_BGA_DATETIME_SOURCE_TZ)))->format('Y-m-d');

        return $startDate >= $today;
    }

    return true;
}

/**
 * Keep only BGA tournaments whose start is still in the future.
 *
 * @param array<int, array> $tournaments
 * @return array<int, array>
 */
function reFilterBgaUpcomingTournaments(array $tournaments): array
{
    return array_values(array_filter($tournaments, 'reIsBgaTournamentUpcoming'));
}

/**
 * Format a tournament format code for display.
 *
 * @param string $format Format code (e.g., 'constructed_standard')
 * @param string $lang   Language code ('fr', 'en', 'de', 'es', 'it')
 * @return string Human-readable format name
 */
function reFormatTournamentFormat(string $format, string $lang = 'fr'): string
{
    $formats = [
        'en' => [
            'constructed_standard' => 'Standard Constructed',
            'constructed_nuc'      => 'Standard No Unique',
            'draft'                => 'Draft',
            'sealed'               => 'Sealed',
        ],
        'fr' => [
            'constructed_standard' => 'Standard Construit',
            'constructed_nuc'      => 'Standard No Unique',
            'draft'                => 'Draft',
            'sealed'               => 'Scellé',
        ],
    ];

    $map = $formats[$lang] ?? $formats['en'];
    return $map[$format] ?? ucwords(str_replace('_', ' ', $format));
}

/**
 * Search tournaments via POST API.
 *
 * @param array $searchParams Search parameters (location, latitude, longitude, radius, dateFrom, dateTo, etc.)
 * @return array Array with 'tournaments', 'total', 'limit', 'offset' keys
 */
function reSearchTournaments(array $searchParams): array
{
    $result = reApiRequest('tournaments/search', $searchParams, true);
    return $result ?? [
        'tournaments' => [],
        'total'       => 0,
        'limit'       => $searchParams['limit']  ?? 50,
        'offset'      => $searchParams['offset'] ?? 0,
    ];
}

/**
 * Geocode a city name to coordinates using Nominatim (OpenStreetMap).
 *
 * @param string $city City name
 * @return array|null Array with 'lat', 'lon', 'display_name' or null if not found
 */
function reGeocodeCity(string $city): ?array
{
    $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
        'q'      => $city,
        'format' => 'json',
        'limit'  => 1,
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'User-Agent: ReunionEventsPlugin/1.0',
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || $response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if (!is_array($data) || empty($data)) {
        return null;
    }

    return [
        'lat'          => (float)$data[0]['lat'],
        'lon'          => (float)$data[0]['lon'],
        'display_name' => $data[0]['display_name'] ?? $city,
    ];
}

/**
 * Whether a JSON row uses the manual scrape format (series, players_registered, …).
 */
function reIsScrapedBgaRow(array $row): bool
{
    return isset($row['series'])
        || isset($row['deck_format_detail'])
        || isset($row['players_registered'])
        || isset($row['tournament_format']);
}

/**
 * Whether the full JSON file is a manual scrape export.
 */
function reIsScrapedBgaPayload(array $data): bool
{
    if (empty($data['tournaments'][0]) || !is_array($data['tournaments'][0])) {
        return !empty($data['scraped_at']);
    }

    return reIsScrapedBgaRow($data['tournaments'][0]);
}

/**
 * Map scraped status text to internal status + keep original label.
 *
 * @return array{status: string, status_label: string}
 */
function reMapScrapedBgaStatus(string $label): array
{
    $lower = strtolower(trim($label));
    if ($lower === 'full' || strpos($lower, 'registration') !== false || strpos($lower, 'inscription') !== false) {
        return ['status' => 'register', 'status_label' => $label];
    }
    if (strpos($lower, 'progress') !== false || strpos($lower, 'cours') !== false) {
        return ['status' => 'progress', 'status_label' => $label];
    }

    return ['status' => 'future', 'status_label' => $label];
}

/**
 * Parse allow_undo from scrape (bool or "player preference").
 */
function reParseScrapedAllowUndo(string $value): ?bool
{
    if (is_bool($value)) {
        return $value;
    }
    if ($value === null || $value === '') {
        return null;
    }
    $s = strtolower(trim((string)$value));
    if ($s === 'false' || $s === '0' || $s === 'no') {
        return false;
    }
    if ($s === 'true' || $s === '1' || $s === 'yes') {
        return true;
    }

    return null;
}

/**
 * Normalize one row from the manual BGA scrape JSON.
 */
function reNormalizeScrapedBgaTournament(array $raw): array
{
    $id = (int)($raw['id'] ?? 0);
    $startDatetime = $raw['start_datetime'] ?? null;
    $startDate     = null;
    if (is_string($startDatetime) && strlen($startDatetime) >= 10) {
        $startDate = substr($startDatetime, 0, 10);
    }

    $statusMap = reMapScrapedBgaStatus((string)($raw['status'] ?? 'future'));
    $deckFormat = $raw['deck_format'] ?? null;
    $deckDetail = $raw['deck_format_detail'] ?? null;
    $rulesFormat = $deckFormat;
    if ($deckFormat && $deckDetail) {
        $rulesFormat = $deckFormat . ' — ' . $deckDetail;
    }

    return [
        'id'                      => $id,
        'name'                    => $raw['name'] ?? '',
        'championship_name'       => $raw['series'] ?? '',
        'game_name'               => $raw['game'] ?? 'Altered',
        'status'                  => $statusMap['status'],
        'status_label'            => $statusMap['status_label'],
        'format'                  => $raw['tournament_format'] ?? '',
        'registered'              => isset($raw['players_registered']) ? (int)$raw['players_registered'] : null,
        'max_players'             => isset($raw['players_max']) ? (int)$raw['players_max'] : null,
        'players_min_required'    => isset($raw['players_min_required']) ? (int)$raw['players_min_required'] : null,
        'start_date'              => $startDate,
        'end_date'                => null,
        'start_datetime'          => $startDatetime,
        'end_datetime'            => null,
        'game_duration'           => $raw['game_duration'] ?? null,
        'game_pace'               => $raw['game_pace'] ?? null,
        'deck_format'             => $deckFormat,
        'deck_format_description' => $deckDetail,
        'game_mode'               => $raw['game_mode'] ?? null,
        'rules_format'            => $rulesFormat,
        'allow_undo'              => reParseScrapedAllowUndo($raw['allow_undo'] ?? null),
        'karma_required'          => $raw['karma_required'] ?? null,
        'level_required'          => $raw['level_required'] ?? null,
        'category'                => $raw['category'] ?? null,
        'prestige'                => isset($raw['xp_reward']) ? (int)$raw['xp_reward'] : null,
        'date_source'             => $startDate ? 'scraped' : null,
        'detail_enriched'         => true,
        'detail_source'           => 'scraped_json',
        'url'                     => !empty($raw['url'])
            ? (string)$raw['url']
            : (RE_BGA_TOURNAMENT_BASE_URL . $id),
    ];
}

/**
 * Human-readable BGA tournament status.
 */
function reFormatBgaStatus(string $status, string $lang = 'fr'): string
{
    $map = [
        'en' => [
            'register' => 'Registration open',
            'future'   => 'Planned',
            'progress' => 'In progress',
            'finished' => 'Finished',
            'all'      => 'All',
        ],
        'fr' => [
            'register' => 'Inscriptions ouvertes',
            'future'   => 'Planifié',
            'progress' => 'En cours',
            'finished' => 'Terminé',
            'all'      => 'Tous',
        ],
        'de' => [
            'register' => 'Anmeldung offen',
            'future'   => 'Geplant',
            'progress' => 'Läuft',
            'finished' => 'Beendet',
            'all'      => 'Alle',
        ],
        'es' => [
            'register' => 'Inscripción abierta',
            'future'   => 'Planificado',
            'progress' => 'En curso',
            'finished' => 'Finalizado',
            'all'      => 'Todos',
        ],
        'it' => [
            'register' => 'Iscrizioni aperte',
            'future'   => 'Pianificato',
            'progress' => 'In corso',
            'finished' => 'Terminato',
            'all'      => 'Tutti',
        ],
    ];

    $labels = $map[$lang] ?? $map['en'];
    return $labels[$status] ?? ucfirst($status);
}

/**
 * Infer a calendar date from BGA text (e.g. championship_name "20260615").
 */
function reInferBgaDateFromText(string $text): ?string
{
    if (!preg_match('/\b(20\d{6})\b/', $text, $m)) {
        return null;
    }
    $s = $m[1];
    $iso = substr($s, 0, 4) . '-' . substr($s, 4, 2) . '-' . substr($s, 6, 2);
    $dt  = DateTime::createFromFormat('Y-m-d', $iso);
    return ($dt && $dt->format('Y-m-d') === $iso) ? $iso : null;
}

/**
 * Resolve start/end dates from API fields, export, or name heuristics.
 */
function reResolveBgaDates(array $raw): array
{
    $start = $raw['base_date'] ?? $raw['start_date'] ?? null;
    if (empty($start) && !empty($raw['start_datetime']) && is_string($raw['start_datetime'])) {
        $start = substr($raw['start_datetime'], 0, 10);
    }
    $end   = $raw['end_date'] ?? null;
    $source = !empty($start) ? 'api' : null;

    if (empty($start)) {
        $start = reInferBgaDateFromText((string)($raw['championship_name'] ?? ''));
        if ($start) {
            $source = 'inferred_name';
        }
    }
    if (empty($start)) {
        $start = reInferBgaDateFromText((string)($raw['name'] ?? ''));
        if ($start) {
            $source = 'inferred_name';
        }
    }

    return [
        'start_date'  => $start ?: null,
        'end_date'    => $end ?: null,
        'date_source' => $raw['date_source'] ?? $source,
    ];
}

/**
 * Normalize one tournament from BGA JSON (scrape or legacy shapes) to display fields.
 *
 * @param array $raw
 * @return array
 */
function reNormalizeBgaTournament(array $raw): array
{
    if (reIsScrapedBgaRow($raw)) {
        return reNormalizeScrapedBgaTournament($raw);
    }

    $id    = (int)($raw['id'] ?? 0);
    $dates = reResolveBgaDates($raw);

    return [
        'id'                => $id,
        'name'              => $raw['name'] ?? '',
        'full_title'        => $raw['full_title'] ?? '',
        'championship_name' => $raw['championship_name'] ?? ($raw['series'] ?? ''),
        'game_name'         => $raw['game_name'] ?? '',
        'status'            => $raw['status'] ?? '',
        'status_label'      => $raw['status_details'] ?? $raw['status_label'] ?? ($raw['status'] ?? ''),
        'format'            => $raw['type_formatted'] ?? $raw['format'] ?? ($raw['type'] ?? ''),
        'registered'        => $raw['registered'] ?? null,
        'max_players'       => $raw['max_players'] ?? null,
        'players_per_match' => $raw['players_per_match'] ?? null,
        'rounds'            => $raw['rounds'] ?? null,
        'round_limit_days'  => $raw['round_limit_days'] ?? null,
        'registration_opened_at' => $raw['registration_opened_at'] ?? null,
        'start_date'        => $dates['start_date'],
        'end_date'          => $dates['end_date'],
        'start_datetime'    => $raw['start_datetime'] ?? null,
        'end_datetime'      => $raw['end_datetime'] ?? null,
        'game_duration'     => $raw['game_duration'] ?? null,
        'deck_format'       => $raw['deck_format'] ?? null,
        'deck_format_description' => $raw['deck_format_description'] ?? ($raw['deck_format_detail'] ?? null),
        'game_mode'         => $raw['game_mode'] ?? null,
        'game_pace'         => $raw['game_pace'] ?? null,
        'rules_format'      => $raw['rules_format'] ?? null,
        'allow_undo'        => array_key_exists('allow_undo', $raw) ? (bool)$raw['allow_undo'] : null,
        'date_source'       => $dates['date_source'] ?? ($raw['date_source'] ?? null),
        'prestige'          => $raw['prestige'] ?? null,
        'progress'          => isset($raw['progress']) ? (float)$raw['progress'] : null,
        'is_official'       => !empty($raw['is_official']),
        'detail_enriched'   => !empty($raw['detail_enriched']),
        'url'               => !empty($raw['url']) ? (string)$raw['url'] : (RE_BGA_TOURNAMENT_BASE_URL . $id),
    ];
}

/**
 * Extract tournament rows from various JSON file shapes.
 *
 * @param array $data Decoded JSON
 * @return array{exported_at: ?string, tournaments: array}
 */
function reParseBgaJsonPayload(array $data): array
{
    $exportedAt = $data['exported_at'] ?? $data['scraped_at'] ?? null;
    $rows       = [];

    if (!empty($data['tournaments']) && is_array($data['tournaments'])) {
        $rows = $data['tournaments'];
    } elseif (!empty($data['data']['list']) && is_array($data['data']['list'])) {
        $rows = $data['data']['list'];
    } elseif (!empty($data['list']) && is_array($data['list'])) {
        $rows = $data['list'];
    }

    return [
        'exported_at' => is_string($exportedAt) ? $exportedAt : null,
        'scraped'     => reIsScrapedBgaPayload($data),
        'source'      => $data['source'] ?? null,
        'tournaments' => $rows,
    ];
}

/**
 * Sort BGA tournaments for display (start date, then name).
 */
function reSortBgaTournaments(array $list): array
{
    usort($list, function ($a, $b) {
        $da = $a['start_date'] ?? ($a['start_datetime'] ?? '');
        $db = $b['start_date'] ?? ($b['start_datetime'] ?? '');
        if ($da !== $db) {
            if ($da === '') {
                return 1;
            }
            if ($db === '') {
                return -1;
            }
            return strcmp($da, $db);
        }
        return strcasecmp($a['name'] ?? '', $b['name'] ?? '');
    });

    return $list;
}

/**
 * Deck format label without trailing parenthetical detail.
 */
function reBgaDeckFormatLabel(?string $deckFormat): string
{
    if ($deckFormat === null || $deckFormat === '') {
        return '';
    }

    return trim(preg_replace('/\s*\([^)]*\)\s*$/u', '', trim($deckFormat)));
}

/**
 * Unique filter option values from loaded BGA tournaments.
 *
 * @return array{formats: string[], decks: string[], paces: string[]}
 */
function reCollectBgaFilterOptions(array $tournaments): array
{
    $formats = [];
    $decks   = [];
    $paces   = [];

    foreach ($tournaments as $t) {
        if (!is_array($t)) {
            continue;
        }
        $format = trim((string)($t['format'] ?? ''));
        if ($format !== '') {
            $formats[$format] = true;
        }
        $deck = reBgaDeckFormatLabel($t['deck_format'] ?? null);
        if ($deck !== '') {
            $decks[$deck] = true;
        }
        $pace = trim((string)($t['game_pace'] ?? ''));
        if ($pace !== '') {
            $paces[$pace] = true;
        }
    }

    $sort = static function (array $keys): array {
        $list = array_keys($keys);
        sort($list, SORT_NATURAL | SORT_FLAG_CASE);

        return $list;
    };

    return [
        'formats' => $sort($formats),
        'decks'   => $sort($decks),
        'paces'   => $sort($paces),
    ];
}

/**
 * Distinct tournament format strings from the uploaded BGA JSON (raw rows).
 * Used for the admin “add tournament” format dropdown.
 *
 * @return string[]
 */
function reCollectBgaAdminTournamentFormatOptions(): array
{
    $formats = [];
    $raw     = reLoadBgaJsonRaw();

    foreach ($raw['tournaments'] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $format = trim((string)($row['tournament_format'] ?? $row['format'] ?? $row['type_formatted'] ?? ''));
        if ($format !== '') {
            $formats[$format] = true;
        }
    }

    $list = array_keys($formats);
    sort($list, SORT_NATURAL | SORT_FLAG_CASE);

    return $list;
}

/**
 * Deck format choices for admin “add tournament”: defaults plus values from uploaded JSON.
 *
 * @return string[]
 */
function reCollectBgaAdminDeckFormatOptions(): array
{
    $decks = [];
    foreach (RE_BGA_ADMIN_DECK_FORMATS as $deck) {
        $decks[$deck] = true;
    }

    $raw = reLoadBgaJsonRaw();
    foreach ($raw['tournaments'] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $deck = reBgaDeckFormatLabel($row['deck_format'] ?? null);
        if ($deck !== '') {
            $decks[$deck] = true;
        }
    }

    $list = array_keys($decks);
    sort($list, SORT_NATURAL | SORT_FLAG_CASE);

    return $list;
}

/**
 * Load BGA tournaments from the on-disk JSON cache (admin upload).
 *
 * @return array{exported_at: ?string, tournaments: array, count: int}
 */
function reLoadBgaTournamentsJson(): array
{
    $path = reGetBgaJsonPath();
    if (!is_file($path)) {
        return ['exported_at' => null, 'tournaments' => [], 'count' => 0];
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        return ['exported_at' => null, 'tournaments' => [], 'count' => 0];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return ['exported_at' => null, 'tournaments' => [], 'count' => 0];
    }

    $parsed = reParseBgaJsonPayload($data);
    $list   = [];
    foreach ($parsed['tournaments'] as $row) {
        if (!is_array($row) || empty($row['id'])) {
            continue;
        }
        $item = reNormalizeBgaTournament($row);
        if (!$parsed['scraped'] && !in_array($item['status'] ?? '', RE_BGA_ALLOWED_STATUSES, true)) {
            continue;
        }
        $list[] = reAugmentBgaStartInstant($item, reResolveBgaDatetimeSourceTz($data, $row));
    }

    if ($parsed['scraped']) {
        $list = reSortBgaTournaments($list);
    } else {
        usort($list, function ($a, $b) {
            $order = ['progress' => 0, 'register' => 1, 'future' => 2];
            $sa    = $order[$a['status'] ?? ''] ?? 9;
            $sb    = $order[$b['status'] ?? ''] ?? 9;
            if ($sa !== $sb) {
                return $sa <=> $sb;
            }
            return strcasecmp($a['name'] ?? '', $b['name'] ?? '');
        });
    }

    return [
        'exported_at' => $parsed['exported_at'] ?? ($data['exported_at'] ?? $data['scraped_at'] ?? null),
        'source'      => $parsed['source'] ?? ($data['source'] ?? null),
        'scraped'     => $parsed['scraped'],
        'tournaments' => $list,
        'count'       => count($list),
    ];
}

/**
 * Validate and save uploaded BGA JSON to the plugin data directory.
 *
 * @return array{ok: bool, count?: int, error?: string}
 */
function reSaveBgaTournamentsJsonFile(string $rawJson): array
{
    $data = json_decode($rawJson, true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'invalid_json'];
    }

    $parsed = reParseBgaJsonPayload($data);
    if (empty($parsed['tournaments'])) {
        return ['ok' => false, 'error' => 'no_tournaments'];
    }

    $dir = dirname(reGetBgaJsonPath());
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        return ['ok' => false, 'error' => 'mkdir_failed'];
    }

    // Keep manual scrape JSON as-is (plugin normalizes on read).
    if ($parsed['scraped']) {
        if (!isset($data['total']) && is_array($data['tournaments'])) {
            $data['total'] = count($data['tournaments']);
        }
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false || file_put_contents(reGetBgaJsonPath(), $json) === false) {
            return ['ok' => false, 'error' => 'write_failed'];
        }
        reSaveSetting('bga_json_uploaded_at', gmdate('Y-m-d H:i:s'));

        return ['ok' => true, 'count' => count($data['tournaments'])];
    }

    $normalized = [];
    foreach ($parsed['tournaments'] as $row) {
        if (!is_array($row) || empty($row['id'])) {
            continue;
        }
        $item = reNormalizeBgaTournament($row);
        if (!in_array($item['status'] ?? '', RE_BGA_ALLOWED_STATUSES, true)) {
            continue;
        }
        $normalized[] = $item;
    }

    $out = [
        'exported_at'   => $parsed['exported_at'] ?? gmdate('c'),
        'source'        => 'boardgamearena',
        'game_id'       => 1909,
        'gamecateg'     => 3,
        'status_filter' => RE_BGA_ALLOWED_STATUSES,
        'count'         => count($normalized),
        'tournaments'   => $normalized,
    ];

    $json = json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents(reGetBgaJsonPath(), $json) === false) {
        return ['ok' => false, 'error' => 'write_failed'];
    }

    reSaveSetting('bga_json_uploaded_at', gmdate('Y-m-d H:i:s'));

    return ['ok' => true, 'count' => count($normalized)];
}

/**
 * Default empty scrape JSON document.
 */
function reEmptyBgaScrapedJson(): array
{
    return [
        'scraped_at'          => gmdate('Y-m-d'),
        'datetime_timezone'   => RE_BGA_DATETIME_SOURCE_TZ,
        'source'              => 'https://boardgamearena.com/tournamentlist?gamecateg=3&game=1909',
        'game'                => 'Altered',
        'total'               => 0,
        'tournaments'         => [],
    ];
}

/**
 * Load raw BGA JSON from disk (scrape format preserved).
 */
function reLoadBgaJsonRaw(): array
{
    $path = reGetBgaJsonPath();
    if (!is_file($path)) {
        return reEmptyBgaScrapedJson();
    }

    $data = json_decode((string) file_get_contents($path), true);

    return is_array($data) ? $data : reEmptyBgaScrapedJson();
}

/**
 * Persist scrape-format BGA JSON.
 *
 * @return array{ok: bool, count?: int, error?: string}
 */
function reSaveBgaScrapedData(array $data): array
{
    if (!isset($data['tournaments']) || !is_array($data['tournaments'])) {
        $data['tournaments'] = [];
    }

    $data['total'] = count($data['tournaments']);
    if (empty($data['scraped_at'])) {
        $data['scraped_at'] = gmdate('Y-m-d');
    }
    if (empty($data['datetime_timezone'])) {
        $data['datetime_timezone'] = RE_BGA_DATETIME_SOURCE_TZ;
    }
    if (empty($data['game'])) {
        $data['game'] = 'Altered';
    }

    $dir = dirname(reGetBgaJsonPath());
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        return ['ok' => false, 'error' => 'mkdir_failed'];
    }

    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents(reGetBgaJsonPath(), $json) === false) {
        return ['ok' => false, 'error' => 'write_failed'];
    }

    reSaveSetting('bga_json_uploaded_at', gmdate('Y-m-d H:i:s'));

    return ['ok' => true, 'count' => $data['total']];
}

/**
 * Build one scrape-format tournament row from admin form input.
 *
 * @param array<string, mixed> $input
 * @return array{ok: bool, row?: array, error?: string}
 */
function reBuildBgaScrapeRowFromInput(array $input): array
{
    $id = trim((string)($input['id'] ?? ''));
    if ($id === '' || !preg_match('/^\d+$/', $id)) {
        return ['ok' => false, 'error' => 'invalid_id'];
    }

    $name = trim((string)($input['name'] ?? ''));
    if ($name === '') {
        return ['ok' => false, 'error' => 'missing_name'];
    }

    $startDate = trim((string)($input['start_date'] ?? ''));
    $startTime = trim((string)($input['start_time'] ?? ''));
    if ($startDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
        return ['ok' => false, 'error' => 'invalid_date'];
    }
    if ($startTime === '') {
        $startTime = '12:00';
    }
    if (!preg_match('/^\d{2}:\d{2}$/', $startTime)) {
        return ['ok' => false, 'error' => 'invalid_time'];
    }

    $startDatetime = $startDate . 'T' . $startTime;

    $url = trim((string)($input['url'] ?? ''));
    if ($url === '') {
        return ['ok' => false, 'error' => 'missing_url'];
    }
    if (!preg_match('#^https?://#i', $url)) {
        return ['ok' => false, 'error' => 'invalid_url'];
    }

    $tournamentFormat = trim((string)($input['tournament_format'] ?? ''));
    if ($tournamentFormat === '') {
        return ['ok' => false, 'error' => 'missing_format'];
    }
    $allowedFormats = reCollectBgaAdminTournamentFormatOptions();
    if ($allowedFormats !== [] && !in_array($tournamentFormat, $allowedFormats, true)) {
        return ['ok' => false, 'error' => 'invalid_format'];
    }

    $deckFormat = trim((string)($input['deck_format'] ?? ''));
    if ($deckFormat === '') {
        return ['ok' => false, 'error' => 'missing_deck'];
    }
    if (!in_array($deckFormat, reCollectBgaAdminDeckFormatOptions(), true)) {
        return ['ok' => false, 'error' => 'invalid_deck'];
    }

    $gameMode = trim((string)($input['game_mode'] ?? ''));
    if ($gameMode === '') {
        return ['ok' => false, 'error' => 'missing_game_mode'];
    }

    $gamePace = trim((string)($input['game_pace'] ?? ''));
    if ($gamePace === '') {
        return ['ok' => false, 'error' => 'missing_pace'];
    }
    if (!in_array($gamePace, RE_BGA_ADMIN_PACE_OPTIONS, true)) {
        return ['ok' => false, 'error' => 'invalid_pace'];
    }

    $row = [
        'id'                => $id,
        'name'              => $name,
        'series'            => trim((string)($input['series'] ?? '')),
        'start_datetime'    => $startDatetime,
        'tournament_format' => $tournamentFormat,
        'deck_format'       => $deckFormat,
        'game_mode'         => $gameMode,
        'game_pace'         => $gamePace,
        'game_duration'     => trim((string)($input['game_duration'] ?? '')),
        'status'            => 'Open to registrations',
        'url'               => $url,
    ];

    $deckDetail = trim((string)($input['deck_format_detail'] ?? ''));
    if ($deckDetail !== '') {
        $row['deck_format_detail'] = $deckDetail;
    }

    $maxPlayers = trim((string)($input['players_max'] ?? ''));
    if ($maxPlayers !== '' && ctype_digit($maxPlayers)) {
        $row['players_max'] = (int) $maxPlayers;
    }

    $allowUndoRaw = trim((string)($input['allow_undo'] ?? ''));
    if ($allowUndoRaw !== '') {
        if ($allowUndoRaw === '1' || strtolower($allowUndoRaw) === 'true') {
            $row['allow_undo'] = true;
        } elseif ($allowUndoRaw === '0' || strtolower($allowUndoRaw) === 'false') {
            $row['allow_undo'] = false;
        } else {
            return ['ok' => false, 'error' => 'invalid_allow_undo'];
        }
    }

    return ['ok' => true, 'row' => $row];
}

/**
 * Append one tournament to the on-disk scrape JSON.
 *
 * @param array<string, mixed> $input Same fields as admin form
 * @return array{ok: bool, count?: int, error?: string}
 */
function reAddBgaTournamentFromAdmin(array $input): array
{
    $built = reBuildBgaScrapeRowFromInput($input);
    if (empty($built['ok'])) {
        return $built;
    }

    $row  = $built['row'];
    $data = reLoadBgaJsonRaw();

    if (!isset($data['tournaments']) || !is_array($data['tournaments'])) {
        $data['tournaments'] = [];
    }

    foreach ($data['tournaments'] as $existing) {
        if (!is_array($existing)) {
            continue;
        }
        if ((string)($existing['id'] ?? '') === (string)$row['id']) {
            return ['ok' => false, 'error' => 'duplicate_id'];
        }
    }

    $data['tournaments'][] = $row;
    $data['scraped_at']    = gmdate('Y-m-d');

    return reSaveBgaScrapedData($data);
}

/**
 * Stream bga-tournaments.json as a download (admin only — call after auth checks).
 */
function reSendBgaTournamentsJsonDownload(): void
{
    $path = reGetBgaJsonPath();
    if (is_file($path)) {
        $content = file_get_contents($path);
        if ($content === false) {
            $content = json_encode(reEmptyBgaScrapedJson(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    } else {
        $content = json_encode(reEmptyBgaScrapedJson(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="bga-tournaments.json"');
    header('Content-Length: ' . strlen((string) $content));
    header('Cache-Control: no-store');

    echo $content;
    exit;
}
