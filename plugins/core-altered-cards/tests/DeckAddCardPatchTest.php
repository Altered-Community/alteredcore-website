<?php

// cacDeckAddCardPatch() builds the PATCH body of api/deck-add-card.php: +1 copy of a card, the deck's own art choices
// (altArtOverrides) sent back unchanged so the decks API keeps them.

$overrides = ['cards' => ['ALT_CORE_B_AX_02_C' => [['reference' => 'ALT_CORE_A_AX_02_C', 'quantity' => 1]]], 'tokens' => []];
$deck = [
    'cards'           => [
        ['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1],
        ['cardReference' => 'ALT_CORE_A_AX_02_C', 'quantity' => 1],
        ['cardReference' => 'ALT_CORE_B_AX_02_C', 'quantity' => 1],
    ],
    'canonicalCards'  => [
        ['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1],
        ['cardReference' => 'ALT_CORE_B_AX_02_C', 'quantity' => 2],
    ],
    'altArtOverrides' => $overrides,
];

$patch = cacDeckAddCardPatch($deck, 'ALT_CORE_B_AX_02_C');
assertSame([
    ['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1],
    ['cardReference' => 'ALT_CORE_B_AX_02_C', 'quantity' => 3],
], $patch['deckCards'], 'add card: +1 on the canonical line');
assertSame($overrides, $patch['altArtOverrides'], 'add card: altArtOverrides sent back unchanged');

$patch = cacDeckAddCardPatch($deck, 'ALT_CORE_B_AX_09_C');
assertSame(['cardReference' => 'ALT_CORE_B_AX_09_C', 'quantity' => 1], $patch['deckCards'][2], 'add card: a new card is a new line');

// A print of a card already in the deck: a line of its own, which the API stores as one more canonical copy + override.
$patch = cacDeckAddCardPatch($deck, 'ALT_CORE_A_AX_02_C');
assertSame(3, count($patch['deckCards']), 'add card: a print is a new line');
assertSame('ALT_CORE_A_AX_02_C', $patch['deckCards'][2]['cardReference'], 'add card: the print is sent as is');

// An older API (prints only): the prints are sent back, no altArtOverrides key.
$old = cacDeckAddCardPatch(['cards' => [['cardReference' => 'ALT_CORE_A_AX_02_C', 'quantity' => 2]]], 'ALT_CORE_A_AX_02_C');
assertSame([['cardReference' => 'ALT_CORE_A_AX_02_C', 'quantity' => 3]], $old['deckCards'], 'add card (old API): +1 on the print line');
assertTrue(!array_key_exists('altArtOverrides', $old), 'add card (old API): no altArtOverrides');

// An empty deck (deckCards: []).
$empty = cacDeckAddCardPatch(['deckCards' => [], 'canonicalCards' => []], 'ALT_CORE_B_AX_01_C');
assertSame([['cardReference' => 'ALT_CORE_B_AX_01_C', 'quantity' => 1]], $empty['deckCards'], 'add card: first card of an empty deck');
