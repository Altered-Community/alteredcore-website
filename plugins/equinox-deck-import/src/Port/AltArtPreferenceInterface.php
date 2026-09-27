<?php

namespace AlteredCore\EquinoxDeckImport\Port;

/**
 * Applies the importing player's alt-art preferences to a deck's cards — the same
 * "Global mode auto-apply" step the deckbuilder performs on open/duplicate/quantity
 * change (see plugins/core-altered-cards/includes/functions.php,
 * cacApplyAltArtPreferencesToCards()). A no-op when the player's mode is PerDeck, in
 * which case the imported deck's own card references (as Equinox exported them) are
 * kept verbatim.
 */
interface AltArtPreferenceInterface
{
    public function isGlobalMode(): bool;

    /**
     * @param array<int,array{cardReference:string,quantity:int}> $cards
     * @return array<int,array{cardReference:string,quantity:int}>
     */
    public function applyPreferences(array $cards): array;
}
