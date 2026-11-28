<?php
// Tests for includes/collection-query.php and includes/account-card-search.php.
require_once __DIR__ . '/../includes/account-card-search.php';

if (!defined('COLLECTION_API_URL')) define('COLLECTION_API_URL', 'http://coll.test');
if (!defined('OWNERSHIP_API_URL'))  define('OWNERSHIP_API_URL', 'http://own.test');

// 1. Single-pass collection planner keeps single subTypes upstream and moves multi-subTypes locally.
$singlePlan = cacPlanCollectionQuery([
    'cardType' => ['CHARACTER'],
    'subTypes' => ['ELEMENTAL'],
    'mainCost' => ['1', '3'],
]);
assertTrue(strpos($singlePlan['query'], 'cardType[]=CHARACTER') !== false, 'single cardType forwarded upstream');
assertTrue(strpos($singlePlan['query'], 'subTypes=ELEMENTAL') !== false, 'single subTypes forwarded upstream');
assertSame(null, $singlePlan['localTypes'], 'single cardType needs no local filter');
assertSame(null, $singlePlan['localSubTypes'], 'single subTypes needs no local filter');
assertSame(['mainCost' => [1, 3]], $singlePlan['localNumeric'], 'disjoint mainCost tracked locally');

$multiPlan = cacPlanCollectionQuery([
    'cardType' => ['CHARACTER', 'SPELL'],
    'subTypes' => ['ELEMENTAL', 'ROBOT'],
]);
assertTrue(strpos($multiPlan['query'], 'cardType') === false, 'multiple cardTypes held locally');
assertTrue(strpos($multiPlan['query'], 'subTypes') === false, 'multiple subTypes held locally');
assertSame(['CHARACTER', 'SPELL'], $multiPlan['localTypes'], 'multiple cardTypes returned in plan');
assertSame(['ELEMENTAL', 'ROBOT'], $multiPlan['localSubTypes'], 'multiple subTypes returned in plan');

// 2. cacRunAccountSearch('collection') filters locally by types, subtypes, disjoint numeric, normalizes & paginates.
$seenCollPath = '';
$collRes = cacRunAccountSearch(
    'collection',
    [
        'cardType'     => ['CHARACTER', 'SPELL'],
        'subTypes'     => ['ELEMENTAL', 'ROBOT'],
        'mainCost'     => ['1', '3'],
        'itemsPerPage' => 1,
        'page'         => 2,
    ],
    42,
    static function (string $base, string $path, int $uid) use (&$seenCollPath): array {
        $seenCollPath = $base . $path;
        return [200, json_encode([
            ['cardReference' => 'ALT_1', 'cardType' => 'CHARACTER', 'mainCost' => 1, 'cardSubTypes' => [['reference' => 'ELEMENTAL']]],
            ['cardReference' => 'ALT_2', 'cardType' => 'CHARACTER', 'mainCost' => 2, 'cardSubTypes' => [['reference' => 'ELEMENTAL']]], // dropped by disjoint mainCost
            ['cardReference' => 'ALT_3', 'cardType' => 'PERMANENT', 'mainCost' => 3, 'cardSubTypes' => [['reference' => 'ROBOT']]],     // dropped by cardType
            ['cardReference' => 'ALT_4', 'cardType' => 'SPELL',     'mainCost' => 3, 'cardSubTypes' => [['reference' => 'MAGE']]],      // dropped by subTypes
            ['cardReference' => 'ALT_5', 'cardType' => 'SPELL',     'mainCost' => 3, 'cardSubTypes' => [['reference' => 'ROBOT']]],
        ])];
    }
);
assertSame(2, $collRes['totalItems'], 'collection local filters keep exactly 2 matching items');
assertSame(2, $collRes['lastPage'], 'pagination computes 2 pages for perPage=1');
assertSame('ALT_5', $collRes['member'][0]['reference'], 'page 2 returns second item with normalized reference');
assertSame('ALT_5', $collRes['member'][0]['cardReference'], 'normalized item preserves cardReference');

// 3. cacRunAccountSearch('ownership') maps power fields, handles 401 and 502 cleanly.
$seenOwnPath = '';
$ownRes = cacRunAccountSearch(
    'ownership',
    [
        'locale'      => 'fr',
        'forestPower' => ['1', '4'],
        'subTypes'    => ['ROBOT', 'MAGE'],
        'isBanned'    => 'false',
    ],
    42,
    static function (string $base, string $path, int $uid) use (&$seenOwnPath): array {
        $seenOwnPath = $base . $path;
        return [200, json_encode([
            ['reference' => 'OWN_1', 'forest' => 1],
            ['reference' => 'OWN_2', 'forest' => 2],
            ['reference' => 'OWN_3', 'forest' => 4],
        ])];
    }
);
assertTrue(strpos($seenOwnPath, 'subtype[]=ROBOT') !== false && strpos($seenOwnPath, 'subtype[]=MAGE') !== false, 'ownership forwards multi-subtypes');
assertTrue(strpos($seenOwnPath, 'forest[gte]=1') !== false && strpos($seenOwnPath, 'forest[lte]=4') !== false, 'ownership maps forestPower to forest bounds');
assertSame(2, $ownRes['totalItems'], 'ownership local numeric filter drops forest=2');
assertSame('OWN_1', $ownRes['member'][0]['cardReference'], 'ownership normalizes cardReference');

$unauth = cacRunAccountSearch('ownership', [], 42, static fn(): array => [401, '']);
assertSame(401, $unauth['status'], '401 from upstream propagates cleanly');

$badGw = cacRunAccountSearch('collection', [], 42, static fn(): array => [500, 'oops']);
assertSame(502, $badGw['status'], 'invalid upstream body maps to 502');

// 4. Regression: cacResolveAccountSearchAuth() must call kcIsLoggedIn() BEFORE reading $_SESSION['user_id'],
//    because /papi/core-altered-cards/*-search endpoints have no manifest auth guard so session_start() only
//    runs inside kcIsLoggedIn(). Reading $_SESSION['user_id'] before kcIsLoggedIn() yielded 0 -> 401 ->
//    X-Ac-Auth-State: unauthenticated -> top-right header flipped to Guest on Beta/Standard pages.
foreach (['favorites', 'collection', 'ownership'] as $src) {
    $session = [];
    $callOrder = [];
    $auth = cacResolveAccountSearchAuth(
        $src,
        true,
        static function () use (&$session, &$callOrder): bool {
            $callOrder[] = 'isLoggedIn';
            $session['user_id'] = 7; // simulates session_start() hydrating $_SESSION
            return true;
        },
        static function () use (&$session, &$callOrder): int {
            $callOrder[] = 'readUserId';
            return (int)($session['user_id'] ?? 0);
        }
    );
    assertSame(true, $auth['ok'], "{$src}: auth succeeds when session hydrates during kcIsLoggedIn()");
    assertSame(7, $auth['userId'], "{$src}: userId is read after kcIsLoggedIn() starts session");
    assertSame(['isLoggedIn', 'readUserId'], $callOrder, "{$src}: kcIsLoggedIn() executes before reading user_id");
}

$guestFav = cacResolveAccountSearchAuth('favorites', true, static fn(): bool => false, static fn(): int => 7);
assertSame(false, $guestFav['ok'], 'favorites rejects unauthenticated user');
assertSame(['error' => 'Unauthorized', 'code' => 'FS01'], $guestFav['error'], 'favorites preserves FS01 error code');

$zeroUid = cacResolveAccountSearchAuth('collection', true, static fn(): bool => true, static fn(): int => 0);
assertSame(false, $zeroUid['ok'], 'collection rejects missing/zero userId even if logged-in flag is true');

$localFav = cacResolveAccountSearchAuth('favorites', false, static fn(): bool => true, static fn(): int => 9);
assertSame(true, $localFav['ok'], 'favorites works without KC_URL (local auth)');
assertSame(9, $localFav['userId'], 'favorites returns local userId');

$noKcColl = cacResolveAccountSearchAuth('collection', false, static fn(): bool => true, static fn(): int => 9);
assertSame(false, $noKcColl['ok'], 'collection requires KC_URL');
