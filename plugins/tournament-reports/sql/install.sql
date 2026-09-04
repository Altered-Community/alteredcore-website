-- tournament-reports v2.0.0 — full schema

CREATE TABLE IF NOT EXISTS {tournaments} (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `tournament_id`   VARCHAR(50)  NOT NULL,
    `tournament_name` VARCHAR(255) NOT NULL DEFAULT '',
    `total_games`     INT          NOT NULL DEFAULT 0,
    `games_data`      LONGTEXT,
    `localization`    VARCHAR(255) NOT NULL DEFAULT '',
    `description`     TEXT,
    `fetched_at`      DATETIME     DEFAULT CURRENT_TIMESTAMP,
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
