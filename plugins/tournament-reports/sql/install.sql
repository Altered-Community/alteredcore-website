-- tournament-reports v2.1.0 — full schema
--
-- Tournament data lives entirely on GameApi and is fetched live on every read
-- (see inc/functions.php) — nothing about it is cached or overridden locally
-- anymore, so there is no {tournaments} table.

-- Settings
CREATE TABLE IF NOT EXISTS {settings} (
    `key`   VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- api_url: GameApi's base URL. api_key: GameApi's adjustment key (only used
-- when correcting a result — reads use the logged-in admin's own session).
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('api_url', '');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('api_key', '');
