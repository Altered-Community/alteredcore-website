-- tournament-reports v2.0.0 — full schema
--
-- Tournament data mostly lives on GameApi now and is fetched live on every
-- read (see inc/functions.php) — nothing from it is cached here. {tournaments}
-- only ever holds two kinds of rows:
--  - Manual tournaments (games_data populated) — entirely local, no external
--    source, unaffected by any of this.
--  - A sparse admin-authored overlay for a GameApi tournament (games_data
--    empty) — just a display-name override / localization / description for
--    that tournament id. A GameApi tournament with no admin edits has no row
--    here at all.

CREATE TABLE IF NOT EXISTS {tournaments} (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `tournament_id`   VARCHAR(50)  NOT NULL,
    `tournament_name` VARCHAR(255) NOT NULL DEFAULT '',
    -- Set when an admin overrides the display name by hand.
    `name_overridden` TINYINT(1)   NOT NULL DEFAULT 0,
    `games_data`      LONGTEXT,
    `localization`    VARCHAR(255) NOT NULL DEFAULT '',
    `description`     TEXT,
    `fetched_at`      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `created_by`      INT          NOT NULL DEFAULT 0,
    UNIQUE KEY `uk_t_tournament_id` (`tournament_id`),
    INDEX `idx_t_fetched_at` (`fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings
CREATE TABLE IF NOT EXISTS {settings} (
    `key`   VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- api_url: GameApi's base URL. api_key: GameApi's adjustment key (only used
-- when correcting a result — reads use the logged-in admin's own session).
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('api_url', '');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('api_key', '');
