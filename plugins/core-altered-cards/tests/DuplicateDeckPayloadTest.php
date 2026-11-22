<?php

// cacBuildDuplicateDeckPayload() turns a source deck (as returned by
// GET /api/decks/{id}) into the create payload for POST /api/decks.
// It copies every card (INCLUDING the hero — unlike the starting-hand pool)
// with the source's art choices, always resets visibility to private, mirrors
// the source draft flag, and only carries a description when the source has a
// non-empty one.

assertTrue(function_exists('cacBuildDuplicateDeckPayload'), 'cacBuildDuplicateDeckPayload: function is defined');

// An older API: only the concrete prints (`cards`).
$source = [
    'name'        => 'My Deck',
    'description' => 'A nice deck',
    'format'      => 'standard',
    'isPublic'    => true,
    'isDraft'     => false,
    'cards'       => [
        ['cardReference' => 'ALT_CORE_B_AX_01_C', 'cardTypeReference' => 'HERO',      'quantity' => 1],
        ['cardReference' => 'ALT_CORE_B_AX_02_C', 'cardTypeReference' => 'CHARACTER', 'quantity' => 3],
        ['cardReference' => 'ALT_CORE_B_AX_03_C', 'cardTypeReference' => 'SPELL',     'quantity' => '2'],
        ['cardTypeReference' => 'SPELL'], // no cardReference -> skipped
    ],
];

$p = cacBuildDuplicateDeckPayload($source, 'My Deck (Copy)');

assertSame('My Deck (Copy)', $p['name'], 'payload: uses provided new name');
assertSame('standard', $p['format'], 'payload: copies source format');
assertSame(false, $p['isPublic'], 'payload: always private');
assertSame(false, $p['isDraft'], 'payload: mirrors source isDraft (false)');
assertSame('A nice deck', $p['description'], 'payload: carries non-empty description');
assertSame(3, count($p['deckCards']), 'payload: 3 valid cards kept, card without reference skipped');
assertSame('ALT_CORE_B_AX_01_C', $p['deckCards'][0]['cardReference'], 'payload: hero card included (index 0)');
assertSame(1, $p['deckCards'][0]['quantity'], 'payload: hero quantity is 1');
assertSame(3, $p['deckCards'][1]['quantity'], 'payload: quantity preserved as int');
assertSame(2, $p['deckCards'][2]['quantity'], 'payload: string quantity coerced to int');
assertTrue(!array_key_exists('altArtOverrides', $p), 'payload: no altArtOverrides without canonicalCards (prints carry the art)');

// The new decks API: canonical lines + the deck's own art choices, both copied.
$overrides = [
    'cards'  => ['ALT_CORE_B_AX_02_C' => [['reference' => 'ALT_CORE_A_AX_02_C', 'quantity' => 2]]],
    'tokens' => [['reference' => 'ALT_CORE_A_BR_31_C', 'quantity' => 1]],
];
$canon = cacBuildDuplicateDeckPayload([
    'format'          => 'frontier',
    'isDraft'         => false,
    'cards'           => [
        ['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1],
        ['cardReference' => 'ALT_CORE_A_AX_02_C', 'quantity' => 2],
        ['cardReference' => 'ALT_CORE_B_AX_02_C', 'quantity' => 1],
    ],
    'canonicalCards'  => [
        ['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1],
        ['cardReference' => 'ALT_CORE_B_AX_02_C', 'quantity' => 3],
    ],
    'altArtOverrides' => $overrides,
], 'Copy');
assertSame([
    ['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1],
    ['cardReference' => 'ALT_CORE_B_AX_02_C', 'quantity' => 3],
], $canon['deckCards'], 'payload: canonicalCards sent as deckCards when present');
assertSame($overrides, $canon['altArtOverrides'], 'payload: the source altArtOverrides are copied (cards and tokens)');

// canonicalCards without overrides: no altArtOverrides key.
$canonNoOverrides = cacBuildDuplicateDeckPayload([
    'canonicalCards'  => [['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1]],
    'altArtOverrides' => null,
], 'Copy');
assertTrue(!array_key_exists('altArtOverrides', $canonNoOverrides), 'payload: null altArtOverrides not sent');

// Only token overrides: the empty `cards` map is sent as a JSON object, not a list.
$tokensOnly = cacBuildDuplicateDeckPayload([
    'canonicalCards'  => [['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1]],
    'altArtOverrides' => ['cards' => [], 'tokens' => [['reference' => 'ALT_CORE_A_BR_31_C', 'quantity' => 1]]],
], 'Copy');
assertSame('{"cards":{},"tokens":[{"reference":"ALT_CORE_A_BR_31_C","quantity":1}]}', json_encode($tokensOnly['altArtOverrides']), 'payload: empty cards map encoded as {}');

// A deck answered with deckCards only: falls back to deckCards.
$fromDeckCards = cacBuildDuplicateDeckPayload(['deckCards' => [['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1]]], 'X');
assertSame(1, count($fromDeckCards['deckCards']), 'payload: falls back to deckCards when cards is absent');

// The duplicate guard of pages/deck.php: an empty deck (deckCards: []) has nothing to copy.
assertSame([], cacDeckContentForWrite(['deckCards' => [], 'canonicalCards' => []])['deckCards'], 'content: an empty deck has no line');

// isDraft means archived: a copy is a new, active deck, whatever the source.
$fromArchived = cacBuildDuplicateDeckPayload(['format' => 'standard', 'isDraft' => true, 'cards' => []], 'X');
assertSame(false, $fromArchived['isDraft'], 'payload: the copy of an archived deck is not archived');

$sandbox = cacBuildDuplicateDeckPayload(['format' => 'sandbox', 'cards' => []], 'X');
assertSame(false, $sandbox['isDraft'], 'payload: a sandbox copy is not archived');

// format defaults to standard when absent.
$noFormat = cacBuildDuplicateDeckPayload(['cards' => []], 'X');
assertSame('standard', $noFormat['format'], 'payload: format defaults to standard when absent');

// empty new name falls back to the source name.
$emptyName = cacBuildDuplicateDeckPayload(['name' => 'Source', 'cards' => []], '');
assertSame('Source', $emptyName['name'], 'payload: empty new name falls back to source name');

// empty/absent description is omitted entirely (not sent as '').
$noDesc = cacBuildDuplicateDeckPayload(['name' => 'D', 'cards' => [], 'description' => '  '], 'D');
assertTrue(!array_key_exists('description', $noDesc), 'payload: blank description is omitted');
