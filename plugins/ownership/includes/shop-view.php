<?php
/**
 * The shop's markup, shared by the live page and its fixture-backed preview twin.
 *
 * Extracted from pages/shop.php so that pages/shop-preview.php renders the very same DOM — same
 * classes, same design-system components, same ids js/shop.js looks for — instead of a copy that
 * would drift the moment the real page changes. Everything here is presentation; the data comes
 * from the caller (the ownership service in production, a JSON fixture in the preview).
 *
 * Split out for the same reason as includes/subnav.php: two pages include one file, and
 * the preview must not be able to differ from what ships.
 */

declare(strict_types=1);

// The chips and the faction dots are built from the catalogue helpers, so this file needs them in
// scope; shop-catalog.php in turn pulls in the pricing table.
require_once __DIR__ . '/shop-catalog.php';

/**
 * UI strings for the shop, in every language the site ships.
 *
 * @return array<string, mixed>
 */
function ownShopText(): array {
    $uiLang = getUiLang();

    return [
        'en' => [
            'title'         => 'Alt Art Shop',
            'subtitle'      => 'Alt arts you do not own yet, and what they cost in Alterite.',
            'lbl_search'    => 'Search',
            'search_ph'     => 'Search a card…',
            'loadMore'      => 'Load more',
            'lbl_faction'   => 'Faction',
            'lbl_rarity'    => 'Rarity',
            'lbl_type'      => 'Card type',
            'all'           => 'All',
            'buy'           => 'Buy',
            'balance'       => 'Your balance',
            'price_unknown' => 'Price unavailable',
            'buy_title'     => 'Confirm this purchase',
            'buy_confirm'   => 'Confirm payment',
            'buy_cancel'    => 'Cancel',
            'buy_balance_after' => 'Balance after purchase',
            'not_available' => 'Purchases are not available yet. Nothing was spent.',
            'empty'         => 'No alt art matches these filters.',
            'noAltArts'     => 'Every alt art in this catalogue is already in your collection.',
            'loadError'     => 'Could not load the shop.',
            'networkError'  => 'Network error.',
            'busy'          => 'Loading…',
            'login'         => 'Log in / Sign up',
            'notConfigured' => 'The shop is not available on this server.',
            'previewMissing'=> 'The shop preview is not installed on this server.',
            'close'         => 'Close',
            'rarity'        => [
                'C' => 'Common',
                'R' => 'Rare',
                'U' => 'Unique',
            ],
        ],
        'fr' => [
            'title'         => 'Boutique d\'arts alternatifs',
            'subtitle'      => 'Les arts alternatifs que vous ne possédez pas encore, et leur prix en Altérite.',
            'lbl_search'    => 'Recherche',
            'search_ph'     => 'Rechercher une carte…',
            'loadMore'      => 'Charger plus',
            'lbl_faction'   => 'Faction',
            'lbl_rarity'    => 'Rareté',
            'lbl_type'      => 'Type de carte',
            'all'           => 'Toutes',
            'buy'           => 'Acheter',
            'balance'       => 'Votre solde',
            'price_unknown' => 'Prix indisponible',
            'buy_title'     => 'Confirmer cet achat',
            'buy_confirm'   => 'Confirmer le paiement',
            'buy_cancel'    => 'Annuler',
            'buy_balance_after' => 'Solde après l\'achat',
            'not_available' => 'Les achats ne sont pas encore disponibles. Rien n\'a été débité.',
            'empty'         => 'Aucune illustration alternative ne correspond à ces filtres.',
            'noAltArts'     => 'Toutes les illustrations alternatives de ce catalogue sont déjà dans votre collection.',
            'loadError'     => 'Impossible de charger la boutique.',
            'networkError'  => 'Erreur réseau.',
            'busy'          => 'Chargement…',
            'login'         => 'Se connecter / S\'inscrire',
            'notConfigured' => 'La boutique n\'est pas disponible sur ce serveur.',
            'previewMissing'=> 'L\'aperçu de la boutique n\'est pas installé sur ce serveur.',
            'close'         => 'Fermer',
            'rarity'        => [
                'C' => 'Commune',
                'R' => 'Rare',
                'U' => 'Unique',
            ],
        ],
    ][$uiLang] ?? [];
}

/**
 * The whole shop body: header, filters, grid, load-more, confirmation dialog.
 *
 * $listUrl is the URL js/shop.js reads its catalogue from — this plugin's own proxy in production,
 * the fixture-backed proxy in the preview. Both answer the same shape, because both are built by
 * includes/shop-list.php. Anonymous visitors get the sign-in card instead of the grid, exactly as
 * on the live page.
 *
 * @param array<string, mixed> $txt      Strings from ownShopText().
 * @param array<string, mixed> $factions Faction code => localised name, for the faction chips.
 */
function ownShopHtml(array $txt, bool $loggedIn, array $factions, string $listUrl): void
{
    ?>
    <div class="ac-page">
        <header class="ac-page-header">
            <div>
                <h1 class="ac-page-header__title"><?= h($txt['title']) ?></h1>
                <p class="ac-page-header__subtitle"><?= h($txt['subtitle']) ?></p>
            </div>
            <div class="ac-page-header__actions">
                <!-- Hidden until a response carries a balance. The server cannot always say what the
                     player has (see shop-balance.php), and rendering an empty chip — or a 0 that
                     means "unknown" — would promise Alterite the shop cannot spend. -->
                <p class="own-shop-balance" id="own-shop-balance" hidden>
                    <img class="own-shop-balance__icon" src="<?= h(ownShopCurrencyIcon()) ?>" alt="" width="20" height="20">
                    <span class="own-shop-balance__text">
                        <span class="own-shop-balance__label"><?= h($txt['balance']) ?></span>
                        <span class="own-shop-balance__value" id="own-shop-balance-value">0</span>
                    </span>
                </p>
            </div>
        </header>

        <?php if (!$loggedIn): ?>
        <div class="ac-card">
            <a class="ac-button ac-button--sm" href="<?= h(BASE_URL) ?>/pages/login">
                <?= ac_icon('log-in') ?><?= h($txt['login']) ?>
            </a>
        </div>
        <?php else: ?>

        <form class="own-shop-filters mb-3" id="own-shop-filters" role="search" aria-label="<?= h($txt['title']) ?>">
            <div class="ac-field own-shop-filters__q">
                <label class="ac-field__label" for="own-shop-q"><?= h($txt['lbl_search']) ?></label>
                <input class="ac-input" type="search" id="own-shop-q" name="q"
                       placeholder="<?= h($txt['search_ph']) ?>" autocomplete="off">
            </div>
            <?php // Chips are multi-select: each toggles independently, and the "All" chip clears its
                  // group. js/shop.js computes the pressed look from the selection, so the markup only
                  // has to start every group empty. ?>
            <fieldset class="own-shop-filters__group" data-filter="rarity">
                <legend class="ac-field__label"><?= h($txt['lbl_rarity']) ?></legend>
                <div class="ac-row">
                    <button type="button" class="ac-chip is-on" data-filter="rarity" data-value="" aria-pressed="true"><?= h($txt['all']) ?></button>
                    <?php foreach (ownShopRarityTiers() as $code => $name): ?>
                    <button type="button" class="ac-chip" data-filter="rarity" data-value="<?= h((string)$code) ?>" aria-pressed="false">
                        <?= h(ownShopRarityName((string)$code)) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
            </fieldset>
            <fieldset class="own-shop-filters__group" data-filter="type">
                <legend class="ac-field__label"><?= h($txt['lbl_type']) ?></legend>
                <div class="ac-row">
                    <button type="button" class="ac-chip is-on" data-filter="type" data-value="" aria-pressed="true"><?= h($txt['all']) ?></button>
                    <?php foreach (ownShopCardTypeTiers() as $code => $name): ?>
                    <button type="button" class="ac-chip" data-filter="type" data-value="<?= h((string)$code) ?>" aria-pressed="false">
                        <?= h(ownShopCardTypeName((string)$code)) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
            </fieldset>
            <?php if ($factions !== []): ?>
            <fieldset class="own-shop-filters__group" data-filter="faction">
                <legend class="ac-field__label"><?= h($txt['lbl_faction']) ?></legend>
                <div class="ac-row">
                    <button type="button" class="ac-chip is-on" data-filter="faction" data-value="" aria-pressed="true"><?= h($txt['all']) ?></button>
                    <?php foreach (array_keys($factions) as $code): ?>
                    <?php $token = ownShopFactionToken((string)$code); ?>
                    <button type="button" class="ac-chip" data-filter="faction" data-value="<?= h((string)$code) ?>" aria-pressed="false">
                        <?php if ($token !== ''): ?>
                        <span class="ac-chip__dot" style="--ac-chip-dot: var(--ac-faction-<?= h($token) ?>)"></span>
                        <?php endif; ?>
                        <?= h(ownShopFactionLabel((string)$code, $factions)) ?>
                    </button>
                    <?php endforeach; ?>
                </div>
            </fieldset>
            <?php endif; ?>
        </form>

        <div id="own-shop-status" class="own-shop-status" role="status" aria-live="polite"></div>

        <div class="own-shop-grid" id="own-shop-grid" aria-busy="true">
            <div class="ac-empty"><?= ac_icon('loader', 'ac-icon--spin') ?><p class="ac-empty__title"><?= h($txt['busy']) ?></p></div>
        </div>

        <div class="own-shop-loadmore" id="own-shop-loadmore" hidden>
            <button type="button" class="ac-button" id="own-shop-loadmore-btn"><?= h($txt['loadMore']) ?></button>
        </div>

        <?php
        // One dialog for the whole grid: the confirmation is per purchase, not per tile, so a tile
        // would mean fifty copies of the same markup. Native <dialog> + showModal() brings the
        // backdrop, focus trap and Escape; under 768px the design system turns it into a bottom
        // sheet, which a stack of divs would not. Buttons are type="button" — nothing here posts.
        ?>
        <dialog class="ac-dialog" id="own-shop-buy" aria-labelledby="own-shop-buy-title">
            <div class="ac-dialog__header">
                <h2 class="ac-dialog__title" id="own-shop-buy-title"><?= h($txt['buy_title']) ?></h2>
                <button type="button" class="ac-icon-button ac-icon-button--ghost"
                        data-own-shop-close aria-label="<?= h($txt['close']) ?>"><?= ac_icon('x') ?></button>
            </div>
            <div class="ac-dialog__body">
                <div class="own-shop-buy">
                    <img class="own-shop-buy__img" id="own-shop-buy-img" src="" alt="" width="120" height="168">
                    <div class="own-shop-buy__detail">
                        <p class="own-shop-buy__name" id="own-shop-buy-name"></p>
                        <p class="own-shop-buy__meta" id="own-shop-buy-meta"></p>
                        <p class="own-shop-buy__row">
                            <span class="own-shop-buy__row-label"><?= h($txt['balance']) ?></span>
                            <span class="own-shop-buy__row-value" id="own-shop-buy-balance"></span>
                        </p>
                        <p class="own-shop-buy__row">
                            <span class="own-shop-buy__row-label"><?= h($txt['buy_balance_after']) ?></span>
                            <span class="own-shop-buy__row-value" id="own-shop-buy-after"></span>
                        </p>
                    </div>
                    <p class="own-shop-buy__price">
                        <img class="own-shop-balance__icon" src="<?= h(ownShopCurrencyIcon()) ?>" alt="" width="20" height="20">
                        <span id="own-shop-buy-price">—</span>
                    </p>
                </div>
            </div>
            <div class="ac-dialog__footer">
                <button type="button" class="ac-button ac-button--ghost" data-own-shop-close><?= h($txt['buy_cancel']) ?></button>
                <button type="button" class="ac-button" id="own-shop-buy-confirm"><?= h($txt['buy_confirm']) ?></button>
            </div>
        </dialog>

        <script>
        window.OWN_SHOP = {
            listUrl: <?= json_encode($listUrl) ?>,
            txt: <?= json_encode($txt) ?>,
            currency: <?= json_encode(ownShopCurrencyName()) ?>,
            // The mark is built server-side so BASE_URL is honoured on a sub-path install; the tile
            // and the header then quote the same icon instead of one of them hard-coding /assets.
            currencyIcon: <?= json_encode(ownShopCurrencyIcon()) ?>
        };
        </script>
        <?php endif; ?>
    </div>
    <?php
}
