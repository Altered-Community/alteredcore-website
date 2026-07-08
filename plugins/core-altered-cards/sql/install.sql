-- Per-user favorite cards. faction/rarity/card_set are stored at favorite time
-- (real codes from the normalized card) so filtering happens 100% in SQL.
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
