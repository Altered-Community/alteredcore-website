<?php

// deckImageGuestDeck() turns the guest deck Re:Builder sends (kept in the browser) into a deck of the decks API
// for the image: names resolved in the language, card references checked (they go in the CDN's URLs), sizes capped.

require_once __DIR__ . '/../includes/deck-preview/image.php';

$deck = deckImageGuestDeck([
    'name'   => '  Mon deck  ',
    'format' => 'standard',
    'hero'   => ['reference' => 'ALT_CORE_B_AX_01_C', 'name' => ['fr' => 'Sierra', 'en' => 'Sierra EN']],
    'cards'  => [
        ['cardReference' => 'ALT_CORE_B_AX_04_C', 'quantity' => 3, 'name' => ['fr' => 'Carte', 'en' => 'Card'], 'cardTypeReference' => 'CHARACTER', 'mainCost' => 2, 'forestPower' => '1'],
        ['cardReference' => 'ALT_CORE_B_AX_05_U_42', 'quantity' => 1, 'name' => 'Unique'],
        ['cardReference' => '../../etc/passwd', 'quantity' => 1],
        ['cardReference' => 'ALT_CORE_B_AX_06_C', 'quantity' => 0],
    ],
], 'fr');

assertSame('Mon deck', $deck['name'], 'guest deck: name trimmed');
assertSame('standard', $deck['format'], 'guest deck: known format kept');
assertSame(['reference' => 'ALT_CORE_B_AX_01_C', 'name' => 'Sierra'], $deck['stats']['hero'], 'guest deck: hero as stats.hero, name in the language');
assertSame(2, count($deck['cards']), 'guest deck: invalid reference and empty line left out');
assertSame('Carte', $deck['cards'][0]['name'], 'guest deck: card name in the language');
assertSame(1, $deck['cards'][0]['forestPower'], 'guest deck: numeric string power as int');
assertTrue(!isset($deck['cards'][0]['recallCost']), 'guest deck: missing cost stays missing');
assertSame('ALT_CORE_B_AX_05_U_42', $deck['cards'][1]['cardReference'], 'guest deck: unique reference kept');
assertTrue(!isset($deck['id']), 'guest deck: no id (no QR code)');

assertSame('', deckImageGuestDeck(['format' => 'nope', 'hero' => ['reference' => 'ALT_CORE_B_AX_01_C']], 'en')['format'], 'guest deck: unknown format dropped');
assertSame(null, deckImageGuestDeck(['cards' => [['cardReference' => 'x', 'quantity' => 1]]], 'en'), 'guest deck: nothing to draw → null');
assertSame(null, deckImageGuestDeck('nope', 'en'), 'guest deck: not an object → null');
$big = array_fill(0, 4, ['cardReference' => 'ALT_CORE_B_AX_04_C', 'quantity' => 99]);
assertSame(null, deckImageGuestDeck(['cards' => $big], 'en'), 'guest deck: more than 300 copies → null');
