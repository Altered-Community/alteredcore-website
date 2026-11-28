<?php
// Tests for plugins/core-altered-cards/includes/deck-service.php (DeckService).
require_once dirname(__DIR__) . '/includes/deck-service.php';

// 1. parseDecklist
$parsed = DeckService::parseDecklist("# Comment\n\n1 ALT_CORE_B_AX_01_C\r\n3 ALT_CORE_B_AX_02_C\ninvalid line\n");
assertSame([
    ['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1],
    ['cardReference' => 'ALT_CORE_B_AX_02_C', 'quantity' => 3],
], $parsed, 'parseDecklist skips comments/blanks/invalid lines and parses qty + ref');

// 2. parseAlteredGgId
assertSame('01KD6B123456', DeckService::parseAlteredGgId('https://www.altered.gg/fr-fr/decks/01kd6b123456'), 'extracts ID from localized Altered.gg URL');
assertSame('01KD6B123456', DeckService::parseAlteredGgId('01kd6b123456'), 'accepts raw deck ID');
assertSame(null, DeckService::parseAlteredGgId('not-valid'), 'rejects invalid GG input');

// 3. buildAlteredGgImportPayload
$formats = ['standard' => ['gg_format' => 'STANDARD'], 'frontier' => ['gg_format' => 'FRONTIER']];
$ggPayload = DeckService::buildAlteredGgImportPayload([
    'name'            => 'My GG Deck',
    'eventFormat'     => 'frontier',
    'alterator'       => ['reference' => 'ALT_CORE_B_AX_01_C'],
    'deckCardsByType' => [
        ['deckUserListCard' => [['card' => ['reference' => 'ALT_CORE_B_AX_04_R1'], 'quantity' => 3]]],
    ],
], $formats, 'Unnamed');
assertSame('frontier', $ggPayload['format'], 'maps GG eventFormat to deckbuilder format');
assertSame(2, count($ggPayload['deckCards']), 'includes hero + cards from deckCardsByType');
assertSame(null, DeckService::buildAlteredGgImportPayload(['name' => 'Empty'], $formats), 'returns null when no cards');

// 4. sortDeckListPayload defensively sorts member envelope
$sorted = DeckService::sortDeckListPayload([
    'member' => [
        ['id' => '2', 'name' => 'Zebra'],
        ['id' => '1', 'name' => 'Alpha'],
    ],
], 'name', 'asc');
assertSame('Alpha', $sorted['member'][0]['name'], 'sortDeckListPayload sorts member ascending');

// 5. duplicate() re-fetches source deck and posts copy preserving altArtOverrides
$recorded = [];
$fakeClient = new AcServiceClient(
    static function (AcHttpRequest $req, ?string $token) use (&$recorded): AcHttpResponse {
        $recorded[] = [$req->method, $req->url, $req->body];
        if ($req->method === 'GET') {
            return new AcHttpResponse(200, json_encode([
                'id'              => 'src-1',
                'name'            => 'Original',
                'format'          => 'standard',
                'canonicalCards'  => [['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1]],
                'altArtOverrides' => ['cards' => ['ALT_CORE_B_AX_01_C' => 'ALT_CORE_A_AX_01_C'], 'tokens' => []],
            ]));
        }
        return new AcHttpResponse(201, json_encode(['id' => 'copy-99']));
    },
    static fn(int $uid, bool $force): ?string => 'tok',
    static function (bool $release): void {}
);
$svc = new DeckService('https://decks.test', $fakeClient);
$dup = $svc->duplicate('src-1', '', ' (Copy)', 'en', 12);
assertSame(true, $dup['ok'], 'duplicate succeeds');
assertSame('copy-99', $dup['id'], 'duplicate returns created deck id');
$posted = json_decode((string)$recorded[1][2], true);
assertSame('Original (Copy)', $posted['name'], 'duplicate appends default suffix when name blank');
assertSame('ALT_CORE_A_AX_01_C', $posted['altArtOverrides']['cards']['ALT_CORE_B_AX_01_C'], 'duplicate preserves altArtOverrides');
