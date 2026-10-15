-- Prices for the alt-art shop, in Alterite.
--
-- A price is a property of a kind of print, not of one card: the shop asks "what does a unique
-- Alterite of a hero card type cost". Keyed on rarity + card_type because that is where the
-- catalogue actually varies — the same rarity is a different product for a TOKEN than for a HERO.
--
-- Seeding is deliberately the same figure per rarity as before prices moved into a table (500 /
-- 3000 / 8000), so a fresh install quotes what the shop used to quote and the admin screen is
-- where they diverge. Kept in step with ownShopPriceRows() in ../includes/shop-pricing.php.
--
-- A combination with no row is shown as "price unavailable", never as free: an unlisted print must
-- not be quoted at another print's price.
--
-- The seed lives here for a fresh install. An existing installation gets the same table from
-- ownShopEnsurePricesTable(), because plugins.php only ever runs this file on activation.
CREATE TABLE IF NOT EXISTS {prices} (
    `rarity`    VARCHAR(4)  NOT NULL,
    `card_type` VARCHAR(32) NOT NULL,
    `price`     INT UNSIGNED NOT NULL,
    PRIMARY KEY (`rarity`, `card_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO {prices} (`rarity`, `card_type`, `price`) VALUES
    ('C', 'CHARACTER',           500),
    ('C', 'SPELL',               500),
    ('C', 'TOKEN',               500),
    ('R', 'CHARACTER',          3000),
    ('R', 'LANDMARK_PERMANENT', 3000),
    ('R', 'SPELL',              3000),
    ('U', 'CHARACTER',          8000),
    ('U', 'HERO',               8000);
