-- Private notes a user keeps on one of their decks (site database, not the decks API).
CREATE TABLE IF NOT EXISTS {deck_notes} (
    `user_id`    INT          NOT NULL,
    `deck_id`    VARCHAR(64)  NOT NULL,
    `body`       TEXT         NOT NULL,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `deck_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
