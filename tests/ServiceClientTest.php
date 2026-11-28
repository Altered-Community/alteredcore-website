<?php
// Tests for includes/service-client.php (AcServiceClient, AcHttpRequest, AcHttpResponse).
require_once dirname(__DIR__) . '/includes/service-client.php';

// 1. 2xx JSON response + bearer header + session lock release before transport
$events = [];
$seenTokens = [];
$client = new AcServiceClient(
    static function (AcHttpRequest $req, ?string $token) use (&$events, &$seenTokens): AcHttpResponse {
        $events[] = 'transport:' . $req->method . ':' . $req->url;
        $seenTokens[] = $token;
        return new AcHttpResponse(200, '{"ok":true,"id":"abc"}', 'application/json');
    },
    static function (int $userId, bool $forceRefresh) use (&$events): ?string {
        $events[] = 'token:' . $userId . ':' . ($forceRefresh ? 'refresh' : 'cached');
        return 'tok-1';
    },
    static function (bool $release) use (&$events): void {
        $events[] = $release ? 'session:release' : 'session:acquire';
    }
);

$res = $client->send(AcHttpRequest::json('GET', 'https://api.example/decks', null, 42));
assertSame(true, $res->isOk(), '200 response isOk');
assertSame(['ok' => true, 'id' => 'abc'], $res->json(), 'json() decodes body');
assertSame(['tok-1'], $seenTokens, 'bearer token passed to transport');
assertSame(
    ['token:42:cached', 'session:release', 'transport:GET:https://api.example/decks'],
    $events,
    'session lock released before transport call'
);

// 2. Single 401 refresh-and-retry succeeds on second attempt
$attempts = 0;
$events2 = [];
$retryClient = new AcServiceClient(
    static function (AcHttpRequest $req, ?string $token) use (&$attempts, &$events2): AcHttpResponse {
        $attempts++;
        $events2[] = 'transport:' . $token;
        if ($attempts === 1) {
            return new AcHttpResponse(401, '{"error":"expired"}', 'application/json');
        }
        return new AcHttpResponse(200, '{"id":"ok"}', 'application/json');
    },
    static function (int $userId, bool $forceRefresh) use (&$events2): ?string {
        $events2[] = 'token:' . ($forceRefresh ? 'refresh' : 'cached');
        return $forceRefresh ? 'tok-fresh' : 'tok-stale';
    },
    static function (bool $release) use (&$events2): void {
        $events2[] = $release ? 'session:release' : 'session:acquire';
    }
);

$res2 = $retryClient->send(AcHttpRequest::json('PATCH', 'https://api.example/decks/1', ['name' => 'A'], 7));
assertSame(200, $res2->status, '401 retry recovers with 200');
assertSame(false, $res2->authExpired, 'recovered 401 does not flag authExpired');
assertSame(
    ['token:cached', 'session:release', 'transport:tok-stale', 'session:acquire', 'token:refresh', 'session:release', 'transport:tok-fresh'],
    $events2,
    '401 retry reacquires session to refresh, then releases before retry'
);

// 3. 401 when refresh returns null flags authExpired without a second upstream call
$attempts3 = 0;
$failRefreshClient = new AcServiceClient(
    static function (AcHttpRequest $req, ?string $token) use (&$attempts3): AcHttpResponse {
        $attempts3++;
        return new AcHttpResponse(401, '{"error":"expired"}', 'application/json');
    },
    static fn(int $uid, bool $forceRefresh): ?string => $forceRefresh ? null : 'tok-stale',
    static function (bool $release): void {}
);
$res3 = $failRefreshClient->send(new AcHttpRequest('GET', 'https://api.example/me', [], null, 10, 5, false, 7));
assertSame(1, $attempts3, 'failed refresh does not retry upstream');
assertSame(true, $res3->authExpired, 'failed refresh marks authExpired');

// 4. API-Platform violation / detail / title formatting
$rViol = new AcHttpResponse(422, json_encode([
    'violations' => [
        ['propertyPath' => 'name', 'message' => 'Too short'],
        ['propertyPath' => '', 'message' => 'Deck invalid'],
    ],
]));
assertSame('name: Too short — Deck invalid', $rViol->errorDetail(), 'formats violations array');

$rDetail = new AcHttpResponse(400, json_encode(['detail' => 'Bad deck format', 'title' => 'Bad Request']));
assertSame('Bad deck format', $rDetail->errorDetail(), 'falls back to detail');

$rTitle = new AcHttpResponse(500, json_encode(['title' => 'Internal Error']));
assertSame('Internal Error', $rTitle->errorDetail(), 'falls back to title');

// 5. sendMulti dispatches all requests with shared user token
$multiClient = new AcServiceClient(
    null,
    static fn(int $uid, bool $force): ?string => 'multi-tok',
    static function (bool $release): void {},
    static function (array $prepared): array {
        $out = [];
        foreach ($prepared as $k => $entry) {
            $out[$k] = new AcHttpResponse(200, json_encode(['url' => $entry['req']->url, 'tok' => $entry['token']]));
        }
        return $out;
    }
);
$multiRes = $multiClient->sendMulti([
    new AcHttpRequest('GET', 'https://api.example/a'),
    new AcHttpRequest('GET', 'https://api.example/b'),
], 9);
assertSame(2, count($multiRes), 'sendMulti returns response per request');
assertSame('multi-tok', $multiRes[1]->json()['tok'], 'sendMulti shares fetched token across handles');
