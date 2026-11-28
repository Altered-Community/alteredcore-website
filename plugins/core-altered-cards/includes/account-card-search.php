<?php
// Deep PHP module unifying account-tab card searches (physical collection, digital ownership,
// and SQL favorites): owns Keycloak session auth, unified query parsing, single-pass numeric
// filter planning, local multi-value filtering, pagination, and normalized item envelopes.
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/collection-query.php';

/**
 * Authenticates an account-tab search (`collection` | `ownership` | `favorites`).
 * Calls `$isLoggedIn()` BEFORE `$readUserId()` so `kcIsLoggedIn()` starts the PHP
 * session before `$_SESSION['user_id']` is read.
 *
 * @return array{ok: bool, userId: int, error?: array<string, string>}
 */
function cacResolveAccountSearchAuth(
    string $source,
    bool $kcConfigured,
    callable $isLoggedIn,
    callable $readUserId
): array {
    $err = $source === 'favorites'
        ? ['error' => 'Unauthorized', 'code' => 'FS01']
        : ['error' => 'Unauthorized'];

    $kcMissing = ($source !== 'favorites') && !$kcConfigured;
    if ($kcMissing || !$isLoggedIn()) {
        return ['ok' => false, 'userId' => 0, 'error' => $err];
    }

    $userId = (int)$readUserId();
    if ($userId <= 0) {
        return ['ok' => false, 'userId' => 0, 'error' => $err];
    }

    return ['ok' => true, 'userId' => $userId];
}

/**
 * Executes an account-tab search (`collection` | `ownership` | `favorites`) and emits JSON.
 * Exists as the single seam behind the thin `/papi/core-altered-cards/*-search` route files.
 */
function cacHandleAccountSearch(string $source): void
{
    header('Content-Type: application/json');

    if ($source === 'ownership' && (!defined('OWNERSHIP_API_URL') || !OWNERSHIP_API_URL)) {
        http_response_code(503);
        echo json_encode(['error' => 'Ownership API not configured']);
        exit;
    }

    $auth = cacResolveAccountSearchAuth(
        $source,
        defined('KC_URL') && KC_URL !== '',
        static fn(): bool => kcIsLoggedIn(),
        static fn(): int => (int)($_SESSION['user_id'] ?? 0)
    );
    if (!$auth['ok']) {
        header('X-Ac-Auth-State: unauthenticated');
        http_response_code(401);
        echo json_encode($auth['error']);
        exit;
    }

    $result = cacRunAccountSearch($source, $_GET, $auth['userId']);
    if (isset($result['status']) && $result['status'] !== 200) {
        if ($result['status'] === 401) {
            header('X-Ac-Auth-State: unauthenticated');
        }
        http_response_code($result['status']);
        echo json_encode(['error' => $result['error'] ?? 'Search error']);
        exit;
    }

    echo json_encode([
        'member'     => $result['member'],
        'totalItems' => $result['totalItems'],
        'lastPage'   => $result['lastPage'],
    ]);
}

/**
 * Pure-ish orchestration seam (accepts injectable upstream/favorites adapters for testing).
 *
 * @return array{status?: int, error?: string, member?: array<int, mixed>, totalItems?: int, lastPage?: int}
 */
function cacRunAccountSearch(string $source, array $get, int $userId, ?callable $httpAdapter = null): array
{
    $perPage = max(1, (int)($get['itemsPerPage'] ?? 30));
    $page    = max(1, (int)($get['page'] ?? 1));

    if ($source === 'favorites') {
        return cacAccountFavoritesAdapter($get, $userId, $page, $perPage);
    }

    $request = $httpAdapter ?? static fn(string $base, string $path, int $uid): array =>
        collApiRequestRaw($base, 'GET', $path, $uid);

    if ($source === 'collection') {
        return cacAccountCollectionAdapter($get, $userId, $page, $perPage, $request);
    }
    if ($source === 'ownership') {
        return cacAccountOwnershipAdapter($get, $userId, $page, $perPage, $request);
    }

    return ['status' => 400, 'error' => 'Unknown account search source'];
}

/** @return array{member: array<int, mixed>, totalItems: int, lastPage: int} */
function cacPaginateAccountItems(array $items, int $page, int $perPage): array
{
    $total    = count($items);
    $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
    $clamped  = min(max(1, $page), $lastPage);
    $offset   = ($clamped - 1) * $perPage;
    return [
        'member'     => array_slice($items, $offset, $perPage),
        'totalItems' => $total,
        'lastPage'   => $lastPage,
    ];
}

/** Normalize both `reference` and `cardReference` so classic JS and Re:Builder read one shape. */
function cacNormalizeAccountItem(array $it): array
{
    $ref = (string)($it['reference'] ?? ($it['cardReference'] ?? ''));
    if ($ref !== '') {
        $it['reference']     = $ref;
        $it['cardReference'] = $ref;
    }
    return $it;
}

/** Filter items locally by multiple subtypes when upstream collection API only supports scalar. */
function cacFilterItemsBySubTypes(array $items, ?array $wantedSubTypes): array
{
    if ($wantedSubTypes === null || $wantedSubTypes === []) return $items;
    $wanted = array_map('strtoupper', $wantedSubTypes);

    return array_values(array_filter($items, static function ($it) use ($wanted): bool {
        if (!is_array($it)) return false;
        $raw = $it['cardSubTypes'] ?? ($it['subTypes'] ?? null);
        if (!is_array($raw)) return true; // Upstream item omits subtypes: don't silently hide everything.
        foreach ($raw as $st) {
            $code = is_array($st) ? (string)($st['reference'] ?? '') : (string)$st;
            if ($code !== '' && in_array(strtoupper($code), $wanted, true)) {
                return true;
            }
        }
        return false;
    }));
}

function cacAccountCollectionAdapter(array $get, int $userId, int $page, int $perPage, callable $request): array
{
    $plan  = cacPlanCollectionQuery($get);
    $path  = '/api/collection' . ($plan['query'] !== '' ? '?' . $plan['query'] : '');
    [$code, $raw] = $request(COLLECTION_API_URL, $path, $userId);

    if ($code === 401) {
        return ['status' => 401, 'error' => 'Unauthorized'];
    }
    $data = ($code > 0 && $code < 400 && $raw !== null && $raw !== '') ? json_decode($raw, true) : false;
    if (!is_array($data)) {
        return ['status' => 502, 'error' => 'Collection API error'];
    }

    $items = [];
    foreach ($data as $it) {
        if (is_array($it)) $items[] = cacNormalizeAccountItem($it);
    }
    if ($plan['localTypes'] !== null) {
        $types = $plan['localTypes'];
        $items = array_values(array_filter($items, static fn($it) => in_array($it['cardType'] ?? '', $types, true)));
    }
    $items = cacFilterItemsBySubTypes($items, $plan['localSubTypes']);
    $items = cacFilterItemsByNumeric($items, $plan['localNumeric']);

    return cacPaginateAccountItems($items, $page, $perPage);
}

function cacAccountOwnershipAdapter(array $get, int $userId, int $page, int $perPage, callable $request): array
{
    $arrayMap = [
        'faction'   => 'faction[]',
        'cardType'  => 'type[]',
        'rarity'    => 'rarity[]',
        'cardSet'   => 'set[]',
        'set'       => 'set[]',
        'subTypes'  => 'subtype[]',
        'variation' => 'variation[]',
    ];
    $numericMap = [
        'mainCost'      => 'mainCost',
        'recallCost'    => 'recallCost',
        'forestPower'   => 'forest',
        'mountainPower' => 'mountain',
        'oceanPower'    => 'ocean',
    ];

    $parts = [];
    $loc = is_string($get['locale'] ?? null) ? $get['locale'] : 'en';
    $parts[] = 'locale=' . rawurlencode($loc);

    foreach ($arrayMap as $in => $out) {
        if (!isset($get[$in])) continue;
        $vals = is_array($get[$in]) ? $get[$in] : [$get[$in]];
        foreach ($vals as $v) {
            if (is_string($v) && $v !== '') $parts[] = $out . '=' . rawurlencode($v);
        }
    }

    $numPlan = cacPlanNumericFilter($get, $numericMap);
    array_push($parts, ...$numPlan['queryParts']);

    foreach (['isBanned', 'isSuspended'] as $flag) {
        $val = $get[$flag] ?? '';
        if ($val === 'true' || $val === 'false') $parts[] = $flag . '=' . $val;
    }

    if (isset($get['name']) && is_string($get['name']) && $get['name'] !== '') {
        $parts[] = 'name=' . rawurlencode($get['name']);
    }

    $base = rtrim(OWNERSHIP_API_URL, '/');
    $path = '/api/collection' . ($parts ? '?' . implode('&', $parts) : '');
    [$code, $raw] = $request($base, $path, $userId);

    if ($code === 401) {
        return ['status' => 401, 'error' => 'Unauthorized'];
    }
    $data = ($code > 0 && $code < 400 && $raw !== null && $raw !== '') ? json_decode($raw, true) : false;
    if (!is_array($data)) {
        return ['status' => 502, 'error' => 'Ownership API error'];
    }

    $items = [];
    foreach ($data as $it) {
        if (is_array($it)) $items[] = cacNormalizeAccountItem($it);
    }
    $items = cacFilterItemsByNumeric($items, $numPlan['localFilters']);

    return cacPaginateAccountItems($items, $page, $perPage);
}

function cacAccountFavoritesAdapter(array $get, int $userId, int $page, int $perPage): array
{
    require_once __DIR__ . '/favorites.php';

    $locale   = preg_match('/^[a-z]{2}$/', (string)($get['locale'] ?? '')) ? (string)$get['locale'] : 'en';
    $factions = cacCollectionValues($get, 'faction');
    $rarities = cacCollectionValues($get, 'rarity');
    $sets     = cacCollectionValues($get, 'set') ?: cacCollectionValues($get, 'cardSet');
    $hasFilter = !empty($factions) || !empty($rarities) || !empty($sets);

    $total    = cacFavCount($userId, $factions, $rarities, $sets);
    $lastPage = $total > 0 ? (int)ceil($total / $perPage) : 1;
    $clamped  = min(max(1, $page), $lastPage);
    $refs     = cacFavGetPage($userId, $clamped, $perPage, $factions, $rarities, $sets);

    $member = [];
    if (!empty($refs)) {
        $cards = cacCardsApiBatch($refs, $locale);
        $byRef = [];
        foreach ($cards as $card) {
            if (!empty($card['reference'])) $byRef[$card['reference']] = $card;
        }
        foreach ($refs as $ref) {
            if (isset($byRef[$ref])) {
                $card = $byRef[$ref];
                $member[] = $card;
                if (!$hasFilter) {
                    cacFavBackfillMeta(
                        $userId,
                        $ref,
                        $card['faction']['code']     ?? '',
                        $card['rarity']['reference'] ?? '',
                        $card['set']['reference']    ?? ''
                    );
                }
            } else {
                $member[] = ['reference' => $ref];
            }
        }
    }

    return [
        'member'     => $member,
        'totalItems' => $total,
        'lastPage'   => $lastPage,
    ];
}
