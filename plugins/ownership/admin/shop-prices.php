<?php
/**
 * Admin → Digital Ownership → Shop Prices.
 *
 * The only place an Alterite price changes. Prices are keyed on rarity + cardType (see
 * ../includes/shop-pricing.php) because that is the granularity the catalogue varies at; a
 * combination with no row here is one the shop shows as "price unavailable" rather than guessing.
 *
 * Save is an upsert per row and is deliberately tolerant: a blank or non-numeric field leaves the
 * stored price alone instead of zeroing it, so a mistyped edit cannot quietly hand out free alt arts.
 */

require_once dirname(__DIR__) . '/includes/shop-list.php';

$txt = getUiLang() === 'fr' ? [
    'title'       => 'Prix des arts alternatifs',
    'intro'       => 'Prix d\'un exemplaire, en Altérite, par rareté et type de carte. Une combinaison sans prix n\'est pas affichée comme étant gratuite.',
    'rarity'      => 'Rareté',
    'card_type'   => 'Type de carte',
    'price'       => 'Prix',
    'save'        => 'Enregistrer',
    'saved'       => 'Prix enregistrés.',
    'failed'      => 'Impossible d\'enregistrer les prix.',
    'invalid'     => 'Saisissez un nombre positif, ou laissez le champ vide pour conserver le prix actuel.',
    'table_fail'  => 'La table des prix est inaccessible. Vérifiez que le plugin est bien installé.',
] : [
    'title'       => 'Shop Prices',
    'intro'       => 'Price of one copy in Alterite, by rarity and card type. A combination with no price is shown as unavailable rather than as free.',
    'rarity'      => 'Rarity',
    'card_type'   => 'Card type',
    'price'       => 'Price',
    'save'        => 'Save',
    'saved'       => 'Prices saved.',
    'failed'      => 'Could not save prices.',
    'invalid'     => 'Enter a positive number, or leave the field empty to keep the current price.',
    'table_fail'  => 'The price table is not reachable. Check that the plugin is installed.',
];

$settingsUrl = BASE_URL . '/admin/plugin-page?plugin=ownership&section=shop-prices';

ownShopEnsurePricesTable();
$table = ownShopPriceTable();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrfValid($_POST['csrf_token'] ?? null)) {
        flash('Invalid CSRF token.', 'error');
        redirect($settingsUrl);
    }

    $result = ownShopSavePrices(
        is_array($_POST['price'] ?? null) ? $_POST['price'] : [],
        $table
    );
    $table = $result['table'];

    if ($result['error'])   flash($txt['failed'], 'error');
    elseif ($result['invalid']) flash($txt['invalid'], 'warning');
    elseif ($result['saved']) flash($txt['saved']);
    redirect($settingsUrl);
}

// The seeded combinations, plus any extra combination a price was once stored for, so a row added
// by hand or by a future card type is editable here rather than invisible.
$rows = [];
foreach (ownShopPriceRows() as $seed) {
    $rows[ownShopPriceKey($seed['rarity'], $seed['cardType'])] = $seed;
}
foreach ($table as $key => $price) {
    if (isset($rows[$key])) continue;
    $parts = explode('|', $key, 2);
    $rows[$key] = ['rarity' => $parts[0] ?? '', 'cardType' => $parts[1] ?? '', 'price' => $price];
}
ksort($rows);
?>
<div class="ac-page">
    <header class="ac-page-header">
        <div>
            <h1 class="ac-page-header__title"><?= h($txt['title']) ?></h1>
            <p class="ac-page-header__subtitle"><?= h($txt['intro']) ?></p>
        </div>
    </header>

    <?php if ($table === []): ?>
    <div class="ac-notice ac-notice--warning" role="alert">
        <?= ac_icon('triangle-alert') ?>
        <div><p class="ac-notice__title"><?= h($txt['table_fail']) ?></p></div>
    </div>
    <?php endif; ?>

    <form method="post" action="<?= h($settingsUrl) ?>">
        <input type="hidden" name="csrf_token" value="<?= h(csrfToken()) ?>">
        <input type="hidden" name="action" value="save">

        <div class="ac-table-wrap">
            <table class="ac-table">
                <thead>
                    <tr>
                        <th scope="col"><?= h($txt['rarity']) ?></th>
                        <th scope="col"><?= h($txt['card_type']) ?></th>
                        <th scope="col"><?= h($txt['price']) ?></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($rows as $key => $row): ?>
                    <tr>
                        <th scope="row"><?= h(ownShopRarityName($row['rarity'])) ?></th>
                        <td><code><?= h($row['cardType']) ?></code></td>
                        <td>
                            <div class="ac-field">
                                <label class="ac-field__label" for="price-<?= h($key) ?>">
                                    <?= h($txt['price']) ?> <?= h(ownShopRarityName($row['rarity'])) ?>
                                </label>
                                <input class="ac-input" type="number" min="0" step="1"
                                       id="price-<?= h($key) ?>"
                                       name="price[<?= h($key) ?>]"
                                       value="<?= isset($table[$key]) ? (int)$table[$key] : '' ?>">
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <div class="ac-row mb-3">
            <button type="submit" class="ac-button"><?= ac_icon('save') ?> <?= h($txt['save']) ?></button>
        </div>
    </form>
</div>
