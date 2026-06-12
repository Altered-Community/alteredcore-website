<?php

// cacBuildDuplicateDeckPayload() turns a source deck (as returned by
// GET /api/decks/{id}) into the create payload for POST /api/decks.
// It copies every card (INCLUDING the hero — unlike the starting-hand pool),
// always resets visibility to private, mirrors the source draft flag, and
// only carries a description when the source has a non-empty one.

assertTrue(function_exists('cacBuildDuplicateDeckPayload'), 'cacBuildDuplicateDeckPayload: function is defined');

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

// isDraft falls back to (format === sandbox) when source omits it.
$sandbox = cacBuildDuplicateDeckPayload(['format' => 'sandbox', 'cards' => []], 'X');
assertSame(true, $sandbox['isDraft'], 'payload: isDraft defaults to true for sandbox when source omits it');

$noDraft = cacBuildDuplicateDeckPayload(['format' => 'standard', 'cards' => []], 'X');
assertSame(false, $noDraft['isDraft'], 'payload: isDraft defaults to false for non-sandbox when source omits it');

// format defaults to standard when absent.
$noFormat = cacBuildDuplicateDeckPayload(['cards' => []], 'X');
assertSame('standard', $noFormat['format'], 'payload: format defaults to standard when absent');

// empty new name falls back to the source name.
$emptyName = cacBuildDuplicateDeckPayload(['name' => 'Source', 'cards' => []], '');
assertSame('Source', $emptyName['name'], 'payload: empty new name falls back to source name');

// empty/absent description is omitted entirely (not sent as '').
$noDesc = cacBuildDuplicateDeckPayload(['name' => 'D', 'cards' => [], 'description' => '  '], 'D');
assertTrue(!array_key_exists('description', $noDesc), 'payload: blank description is omitted');
