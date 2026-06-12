<?php

// normalizeCardRef() maps a card reference to the form used for CDN image URLs.
// It must mirror the client-side normalizeRef()/normalizeHeroRef() helpers in
// decks.php and deckbuilder.php:
//   - promo prints (segment 2 === 'P') fall back to the base booster art ('B')
//   - BISE-set refs (segment 1 === 'BISE') map to CORE
// Used by deck.php for the hero cover image; an undefined call here blanks the
// whole deck-detail page (fatal swallowed by the router's output buffer).

assertTrue(function_exists('normalizeCardRef'), 'normalizeCardRef: function is defined');

assertSame(
    'ALT_CORE_B_AX_01_C',
    normalizeCardRef('ALT_CORE_P_AX_01_C'),
    'normalizeCardRef: promo print P -> B'
);

assertSame(
    'ALT_CORE_B_AX_01_C',
    normalizeCardRef('ALT_BISE_B_AX_01_C'),
    'normalizeCardRef: BISE set -> CORE'
);

assertSame(
    'ALT_CORE_B_AX_01_C',
    normalizeCardRef('ALT_BISE_P_AX_01_C'),
    'normalizeCardRef: BISE promo -> CORE base'
);

assertSame(
    'ALT_CORE_B_AX_01_C',
    normalizeCardRef('ALT_CORE_B_AX_01_C'),
    'normalizeCardRef: already-normalized ref is unchanged'
);

assertSame(
    'ALT_CORE_C_AX_01_R',
    normalizeCardRef('ALT_CORE_C_AX_01_R'),
    'normalizeCardRef: non-promo non-BISE ref is unchanged'
);
