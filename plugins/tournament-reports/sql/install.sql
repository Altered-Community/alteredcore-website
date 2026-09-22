-- tournament-reports v2.0.0 — full schema

-- `tournament_id` holds the API's tournamentParentId: one row per tournament,
-- every stage folded in. A manually created tournament uses a "manual-…" id
-- here instead, and is never touched by the sync.
CREATE TABLE IF NOT EXISTS {tournaments} (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `tournament_id`   VARCHAR(50)  NOT NULL,
    `tournament_name` VARCHAR(255) NOT NULL DEFAULT '',
    -- Set when an admin renames the tournament by hand, so the hourly sync
    -- stops overwriting that name.
    `name_overridden` TINYINT(1)   NOT NULL DEFAULT 0,
    `total_games`     INT          NOT NULL DEFAULT 0,
    -- Distinct participants across every stage, straight from the API.
    `total_players`   INT          NOT NULL DEFAULT 0,
    -- Denormalized off the first game so the listing page needs no games_data.
    `format`          VARCHAR(50)  NOT NULL DEFAULT '',
    `first_game_at`   DATETIME     NULL DEFAULT NULL,
    -- Version and hash of the report document held in games_data, compared
    -- against the API index to decide whether a re-fetch is needed at all.
    `api_version`     INT          NOT NULL DEFAULT 0,
    `api_hash`        VARCHAR(64)  NOT NULL DEFAULT '',
    `games_data`      LONGTEXT,
    `localization`    VARCHAR(255) NOT NULL DEFAULT '',
    `description`     TEXT,
    `fetched_at`      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `synced_at`       DATETIME     NULL DEFAULT NULL,
    `created_by`      INT          NOT NULL DEFAULT 0,
    UNIQUE KEY `uk_t_tournament_id` (`tournament_id`),
    INDEX `idx_t_fetched_at` (`fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS {rankings} (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `tournament_id`  VARCHAR(50)  NOT NULL,
    `tournament_name` VARCHAR(255) NOT NULL DEFAULT '',
    `created_by`     INT          NOT NULL DEFAULT 0,
    `created_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS {ranking_players} (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `ranking_id`  INT          NOT NULL,
    `position`    INT          NOT NULL DEFAULT 0,
    `player_id`   VARCHAR(50)  NOT NULL DEFAULT '',
    `player_name` VARCHAR(255) NOT NULL DEFAULT '',
    INDEX `idx_rp_rid` (`ranking_id`),
    FOREIGN KEY (`ranking_id`) REFERENCES {rankings}(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings
CREATE TABLE IF NOT EXISTS {settings} (
    `key`   VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO {settings} (`key`, value) VALUES ('api_url', '');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('api_key', '');

INSERT IGNORE INTO {settings} (`key`, value) VALUES ('sync_interval', '3600');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('last_sync_at', '');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('sync_pending', '0');
