-- Re:Builder's brush: the illustration a deck gives the 1st, 2nd and 3rd card (copy) of a multi-art card, in order.
-- The decks API keeps only the deck's references, with no order and nothing past its copies; the player's default alt
-- arts stay in the ownership service. By player, deck and card family (ownership key « familyId:faction:rarity »);
-- endpoint papi/rebuilder/deck-alt-arts.
CREATE TABLE IF NOT EXISTS `{prefix}rebuilder_deck_alt_arts` (
    `user_id`    INT          NOT NULL,
    `deck_id`    VARCHAR(64)  NOT NULL,
    `family`     VARCHAR(64)  NOT NULL,
    `card1`      VARCHAR(64)  NOT NULL,
    `card2`      VARCHAR(64)  NOT NULL,
    `card3`      VARCHAR(64)  NOT NULL,
    `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `deck_id`, `family`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
