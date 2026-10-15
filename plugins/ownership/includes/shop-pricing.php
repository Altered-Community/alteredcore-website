<?php
/**
 * Prices for the alt-art shop, in Alterite.
 *
 * A price is a property of a *kind* of print, not of one card: the shop asks for "what does a
 * unique Alterite, of a hero card type, cost", and the answer is a row an administrator edits in
 * Admin → Digital Ownership → Shop Prices. The ownership service carries no price field at all
 * (see shop-catalog.php), so a table here is the only place a price can live — and the admin screen
 * is the only place one can change.
 *
 * Keyed on rarity + cardType because that is the granularity the catalogue actually varies at: the
 * same rarity is a different product for a TOKEN than for a HERO, while two different rares of the
 * same type are not.
 *
 * A missing row yields null, not a fallback number. An unlisted print is shown as "price
 * unavailable" rather than quoted at some other print's price — a wrong number here reads as a real
 * offer. ownShopPriceRows() seeds the combinations the catalogue is known to contain, so a fresh
 * install is never empty.
 *
 * Where the balance itself comes from is not decided yet (ownShopBalance() in shop-balance.php
 * returns null for now). Prices exist independently of that: quoting a price costs nothing.
 */

declare(strict_types=1);

/**
 * The rarities the shop prices, cheapest first, keyed by the code the ownership service uses.
 *
 * That code is the gem letter — a family comes back as `rarity: "C"` — not the name. It is also
 * what the service's own rarity[] filter expects, so the same value drives both the price and the
 * filter chips.
 *
 * @return array<string, string> service code => display name
 */
function ownShopRarityTiers(): array {
    return ['C' => 'Common', 'R' => 'Rare', 'U' => 'Unique'];
}

/**
 * The rarity + cardType combinations the catalogue is known to contain, with their seeded price.
 *
 * Seed prices are the same per rarity for every card type, which is what the shop quoted before
 * prices were per print; the admin screen is where they diverge. Kept as data rather than written
 * inline in sql/install.sql so the admin screen and the fixture agree on what "a known
 * combination" is, and so a new card type is one line here plus one seeded row.
 *
 * @return array<int, array{rarity:string, cardType:string, price:int}>
 */
function ownShopPriceRows(): array {
    $byType = [
        'CHARACTER'         => ['C', 'R', 'U'],
        'HERO'              => ['U'],
        'LANDMARK_PERMANENT'=> ['R'],
        'SPELL'             => ['C', 'R'],
        'TOKEN'             => ['C'],
    ];
    $seed = ['C' => 500, 'R' => 3000, 'U' => 8000];

    $rows = [];
    foreach ($byType as $cardType => $rarities) {
        foreach ($rarities as $rarity) {
            $rows[] = ['rarity' => $rarity, 'cardType' => $cardType, 'price' => $seed[$rarity]];
        }
    }
    return $rows;
}

/** Table key for a rarity + cardType pair. */
function ownShopPriceKey(string $rarity, string $cardType): string {
    return strtoupper(trim($rarity)) . '|' . strtoupper(trim($cardType));
}

/**
 * Whether this deployment can talk to the database at all.
 *
 * getDB() dies on a connection failure rather than returning null, so every price read is gated on
 * the configuration being loaded. That is what lets the unit tests exercise the lookup without a
 * server: they require this file, not config.local.php.
 */
function ownShopPricesAvailable(): bool {
    return defined('DB_NAME') && defined('DB_PREFIX') && function_exists('getDB');
}

/**
 * Create the price table if it is not there yet.
 *
 * plugins.php only ever runs a manifest's sql file on activation, and only while sql_installed_at
 * is NULL — so a plugin that gains a table after it was installed would silently never get one, on
 * every server but a fresh one. This is the fix for that specific case: idempotent, cheap after the
 * first run, and safe to call from a read path.
 */
function ownShopEnsurePricesTable(): void {
    static $done = false;
    if ($done || !ownShopPricesAvailable()) return;
    $done = true;

    $table = trim(qp('{prices}'), '`');

    try {
        $check = getDB()->prepare(
            'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?'
        );
        $check->execute([$table]);
        if ((int)$check->fetchColumn() > 0) return;

        getDB()->exec(qp(
            'CREATE TABLE IF NOT EXISTS {prices} ('
            . '`rarity` VARCHAR(4) NOT NULL,'
            . '`card_type` VARCHAR(32) NOT NULL,'
            . '`price` INT UNSIGNED NOT NULL,'
            . 'PRIMARY KEY (`rarity`, `card_type`)'
            . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        ));

        $insert = getDB()->prepare(qp('INSERT IGNORE INTO {prices} (`rarity`, `card_type`, `price`) VALUES (?, ?, ?)'));
        foreach (ownShopPriceRows() as $row) {
            $insert->execute([$row['rarity'], $row['cardType'], $row['price']]);
        }
    } catch (Throwable $e) {
        // A price is not worth a fatal error: the shop degrades to "price unavailable" and the
        // admin screen reports the failure, rather than taking the page down.
        error_log('AlteredCore shop prices table unavailable: ' . $e->getMessage());
    }
}

/**
 * Every price in the table, as ownShopPriceKey() => price. Empty when there is no table to read.
 *
 * One query per request, cached: the grid renders up to 50 items that each ask for a price, and
 * the answer cannot change mid-request.
 *
 * @return array<string, int>
 */
function ownShopPriceTable(): array {
    static $table = null;
    if ($table !== null) return $table;

    $table = [];
    if (!ownShopPricesAvailable()) return $table;

    ownShopEnsurePricesTable();

    try {
        $rows = getDB()->query(qp('SELECT `rarity`, `card_type`, `price` FROM {prices}'))->fetchAll();
    } catch (Throwable $e) {
        error_log('AlteredCore shop prices could not be read: ' . $e->getMessage());
        return $table;
    }

    foreach ($rows as $row) {
        $table[ownShopPriceKey((string)$row['rarity'], (string)$row['card_type'])] = max(0, (int)$row['price']);
    }
    return $table;
}

/**
 * Price of one print of the given rarity and card type, or null when the table says nothing.
 *
 * Pure: takes the table as an argument so the rule "an unlisted print has no price" can be tested
 * without a database.
 *
 * @param array<string, int> $table
 */
function ownShopPriceInTable(array $table, string $rarity, string $cardType): ?int {
    $key = ownShopPriceKey($rarity, $cardType);
    return array_key_exists($key, $table) ? (int)$table[$key] : null;
}

/**
 * Price of one print in the shop, read from the price table.
 *
 * $priceTable is injectable so a caller that already loaded the table — the page, the admin
 * screen — pays for one query, and so the mapping stays testable.
 *
 * @param array<string, int>|null $priceTable
 */
function ownShopPrice(string $rarity, string $cardType, ?array $priceTable = null): ?int {
    return ownShopPriceInTable($priceTable ?? ownShopPriceTable(), $rarity, $cardType);
}

/**
 * Apply a submitted price form.
 *
 * $prices is the admin screen's `price[<rarity>|<cardType>]` input, as submitted. Two rules that a
 * plain read-modify-write would get wrong:
 *
 *   - an empty field means "leave this one alone", not "free". A browser that drops a single field
 *     from a long form must not wipe a price, and an alt art that costs nothing is a real loss.
 *   - anything that is not a plain non-negative integer is rejected rather than coerced. "12 500"
 *     and "1e5" and "-40" are all mistakes a human makes, and storing them would be worse than not
 *     saving.
 *
 * Returns ['saved' => int, 'invalid' => int, 'error' => bool]; the caller decides how loud to be.
 * The accepted values are written back into $current so a screen can re-render without re-querying.
 *
 * @param array<string, mixed> $prices  Submitted values.
 * @param array<string, int>   $current Known table, passed by value and returned updated.
 * @return array{saved:int,invalid:int,error:bool,table:array<string,int>}
 */
function ownShopSavePrices(array $prices, array $current): array {
    $saved   = 0;
    $invalid = 0;
    $error   = false;

    foreach ($prices as $key => $raw) {
        $key = (string)$key;
        $raw = is_scalar($raw) ? trim((string)$raw) : '';

        if ($raw === '') continue; // unchanged, not free
        if (!preg_match('/^\d{1,9}$/', $raw)) { $invalid++; continue; }

        $parts = explode('|', $key);
        if (count($parts) !== 2 || trim($parts[0]) === '' || trim($parts[1]) === '') { $invalid++; continue; }

        $rarity    = strtoupper(trim($parts[0]));
        $cardType  = strtoupper(trim($parts[1]));
        $ownKey    = ownShopPriceKey($rarity, $cardType);

        if (!ownShopPricesAvailable()) { $error = true; continue; }

        try {
            $stmt = getDB()->prepare(qp(
                'INSERT INTO {prices} (`rarity`, `card_type`, `price`) VALUES (?, ?, ?)'
                . ' ON DUPLICATE KEY UPDATE `price` = VALUES(`price`)'
            ));
            $stmt->execute([$rarity, $cardType, (int)$raw]);
            $current[$ownKey] = (int)$raw;
            $saved++;
        } catch (Throwable $e) {
            error_log('AlteredCore shop prices could not be saved: ' . $e->getMessage());
            $error = true;
        }
    }

    return ['saved' => $saved, 'invalid' => $invalid, 'error' => $error, 'table' => $current];
}

/** The currency's name, as the interface shows it. */
function ownShopCurrencyName(string $lang = ''): string {
    $lang = $lang !== '' ? $lang : getUiLang();
    return $lang === 'fr' ? 'Altérite' : 'Alterite';
}

/**
 * The currency's mark.
 *
 * The site's PWA icon, reused rather than drawn: it is already on every install and is the one
 * image here that is guaranteed to exist. Decorative everywhere it appears (it always sits beside
 * the spelled-out currency name), so it is rendered with an empty alt.
 */
function ownShopCurrencyIcon(): string {
    $base = defined('BASE_URL') && BASE_URL ? rtrim(BASE_URL, '/') : '';
    return $base . '/assets/favicon/web-app-manifest-192x192.png';
}

/** Localised display name for a rarity code, for the filter chips and the tile tag. */
function ownShopRarityName(string $rarity, string $lang = ''): string {
    $code = strtoupper(trim($rarity));
    $lang = $lang !== '' ? $lang : getUiLang();

    $fr = ['C' => 'Commune', 'R' => 'Rare', 'U' => 'Unique'];
    $en = ownShopRarityTiers();

    if ($lang === 'fr') return $fr[$code] ?? $code;
    return $en[$code] ?? $code;
}

/**
 * The card types the shop prices, keyed by the code the ownership service uses.
 *
 * The same codes ownShopPriceRows() seeds, because a card type the price table does not know is a
 * card type the shop cannot quote — and so is not worth a filter chip. A new type is one line here
 * and one seeded row there.
 *
 * @return array<string, string> service code => display name
 */
function ownShopCardTypeTiers(): array {
    return [
        'CHARACTER'          => 'Character',
        'HERO'               => 'Hero',
        'LANDMARK_PERMANENT' => 'Landmark',
        'SPELL'              => 'Spell',
        'TOKEN'              => 'Token',
    ];
}

/** Localised display name for a card type code, for the filter chips. */
function ownShopCardTypeName(string $cardType, string $lang = ''): string {
    $code = strtoupper(trim($cardType));
    $lang = $lang !== '' ? $lang : getUiLang();

    $fr = [
        'CHARACTER'          => 'Personnage',
        'HERO'               => 'Héros',
        'LANDMARK_PERMANENT' => 'Lieu',
        'SPELL'              => 'Sort',
        'TOKEN'              => 'Jeton',
    ];
    $en = ownShopCardTypeTiers();

    if ($lang === 'fr') return $fr[$code] ?? $code;
    return $en[$code] ?? $code;
}
