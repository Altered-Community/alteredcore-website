<?php

// The owner's pseudo the decks API gives on public decks (owner.pseudo): the deck pages and the link preview.

require_once __DIR__ . '/../includes/deck-preview/preview.php';

assertSame('Polux', cacDeckOwnerPseudo(['owner' => ['pseudo' => ' Polux ']]), 'owner: pseudo trimmed');
assertSame(null, cacDeckOwnerPseudo(['owner' => ['pseudo' => null]]), 'owner: null pseudo');
assertSame(null, cacDeckOwnerPseudo(['owner' => ['pseudo' => '  ']]), 'owner: blank pseudo');
assertSame(null, cacDeckOwnerPseudo(['user' => []]), 'owner: private context (no owner)');

assertSame('Polux', deckPreviewAuthor(['owner' => ['pseudo' => 'Polux'], 'user' => []]), 'preview author: owner.pseudo (decks API sends user: [])');
assertSame('Polux', deckPreviewAuthor(['owner' => ['pseudo' => 'Polux'], 'user' => ['username' => 'Other']]), 'preview author: owner.pseudo wins over user.username');
assertSame('Legacy', deckPreviewAuthor(['user' => ['username' => 'Legacy']]), 'preview author: user.username of the older API');
assertSame(null, deckPreviewAuthor(['owner' => ['pseudo' => ''], 'user' => []]), 'preview author: none');
assertSame('par Polux', deckPreviewByLine(['owner' => ['pseudo' => 'Polux']], 'fr'), 'preview by-line from owner.pseudo');
