-- Added in v1.1.0: per-user favorite cards (first local table for this plugin).
-- Idempotent so it is safe whether run as the fresh install or as the 1.0.0→1.1.0 upgrade.
CREATE TABLE IF NOT EXISTS {favorites} (
    `user_id`    INT          NOT NULL,
    `card_ref`   VARCHAR(100) NOT NULL,
    `faction`    VARCHAR(8)   NOT NULL DEFAULT '',
    `rarity`     VARCHAR(16)  NOT NULL DEFAULT '',
    `card_set`   VARCHAR(16)  NOT NULL DEFAULT '',
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `card_ref`),
    KEY `user_created` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
