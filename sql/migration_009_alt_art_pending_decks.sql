-- Default alt arts: a player still in the ownership service's « Global » alt-art mode is switched to « par deck » on
-- their next visit (includes/func.alt-arts.php). Their decks then take their default alt arts the next time Re:Builder
-- opens them: the decks waiting for it.
CREATE TABLE IF NOT EXISTS `{prefix}alt_art_pending_decks` (
    `user_id`    INT          NOT NULL,
    `deck_id`    VARCHAR(64)  NOT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `deck_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
