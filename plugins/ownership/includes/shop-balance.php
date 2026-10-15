<?php
/**
 * The player's Alterite balance.
 *
 * Alterite is granted to a player from outside this site, and where that grant is recorded — an
 * external service, an identity attribute, a ledger fed by a webhook — has not been decided. This
 * file is the seam: everything that shows a balance asks here, and the answer today is null, which
 * the page reads as "no balance to show" rather than as zero.
 *
 * That distinction is the whole point of returning null instead of 0. A balance of zero is a real
 * balance and the shop must show it; a balance this site does not know is missing information and
 * the shop must not invent it, or the header would promise Alterite the player cannot spend.
 *
 * The two questions that will settle the implementation are where the balance is authoritative and
 * who debits it on purchase. Until then nothing here writes, and there is no table to migrate.
 */

declare(strict_types=1);

/**
 * The player's Alterite balance, or null when this site cannot say.
 *
 * $userId is accepted even though it is unused: the signature is what callers are written against,
 * so filling it in later is a change inside this function and not across the shop.
 */
function ownShopBalance(?int $userId = null): ?int {
    return null;
}
