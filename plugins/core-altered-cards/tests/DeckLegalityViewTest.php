<?php

// cacDeckLegalityView(): what the deck pages show of a deck's legality, from the decks API's verdict only.

$v = cacDeckLegalityView([
    'legal'          => false,
    'errors'         => [
        ['code' => 'card.family.copies', 'reference' => 'ALT_CORE_B_AX_04_C', 'message' => ' La carte « X » dépasse 3 exemplaires. '],
        ['code' => 'deck.size', 'reference' => null, 'message' => 'Le deck doit contenir entre 39 et 59 cartes.'],
        ['code' => 'other', 'message' => ''],
    ],
    'formatErrors'   => ['ignored when errors has messages'],
    'legalityDetail' => ['copies' => false, 'deckSize' => false, 'hero' => true, 'global' => false],
]);
assertSame('illegal', $v['status'], 'legality: illegal with errors');
assertSame(['La carte « X » dépasse 3 exemplaires.', 'Le deck doit contenir entre 39 et 59 cartes.'], $v['messages'], 'legality: the API\'s translated messages, trimmed, empty ones skipped');
assertSame(['copies', 'deckSize'], $v['rules'], 'legality: failing rules without global');

$v = cacDeckLegalityView(['legal' => false, 'formatErrors' => ['Old API message'], 'legalityDetail' => null]);
assertSame('illegal', $v['status'], 'legality: older API, formatErrors only');
assertSame(['Old API message'], $v['messages'], 'legality: formatErrors used when errors is absent');

$v = cacDeckLegalityView(['legal' => false, 'errors' => [], 'legalityDetail' => ['pool' => false, 'frontierUniques' => false, 'global' => false]]);
assertSame('illegal', $v['status'], 'legality: failing rules alone make the deck illegal');
assertSame(['pool', 'frontierUniques'], $v['rules'], 'legality: new rule keys kept as is');

$v = cacDeckLegalityView(['legal' => true, 'errors' => [], 'formatErrors' => null, 'legalityDetail' => ['global' => true]]);
assertSame('legal', $v['status'], 'legality: legal');

// A draft (not validated by the API): legal false, no errors, no detail -> nothing shown.
$v = cacDeckLegalityView(['legal' => false, 'isDraft' => true, 'errors' => [], 'formatErrors' => null, 'legalityDetail' => null]);
assertSame('none', $v['status'], 'legality: draft without errors shows nothing');

assertSame('none', cacDeckLegalityView([])['status'], 'legality: no verdict at all');
