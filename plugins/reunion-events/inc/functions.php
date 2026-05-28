<?php
/**
 * Plugin shared helpers for Réunion Events.
 *
 * Usage — include at the top of any page / admin / api file:
 *   require_once __DIR__ . '/../inc/functions.php';   // from pages/ or admin/
 *   require_once __DIR__ . '/../../inc/functions.php'; // from api/
 */

define('RE_API_BASE_URL',       'https://altered-tournament-tools.com/api/v1');
define('RE_TOURNAMENT_BASE_URL', 'https://altered-tournament-tools.com/tournaments/');

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
