CREATE TABLE IF NOT EXISTS {creatures} (
    `id`           VARCHAR(64)  NOT NULL PRIMARY KEY,
    `name_fr`      VARCHAR(100) NOT NULL DEFAULT '',
    `name_en`      VARCHAR(100) NOT NULL DEFAULT '',
    `image_normal` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'uploads/… ; empty: the component''s cotton ball',
    `image_click`  VARCHAR(255) NOT NULL DEFAULT '',
    `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS {spots} (
    `id`          VARCHAR(64)  NOT NULL PRIMARY KEY,
    `creature_id` VARCHAR(64)  NOT NULL,
    `pages`       VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'page slugs separated by spaces, * for all',
    `rule`        VARCHAR(255) NOT NULL DEFAULT 'load' COMMENT 'load | scroll-end | event:<name> | link:<url>',
    `code`        VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'contest code shown on a find',
    `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `creature_id` (`creature_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS {finds} (
    `user_id`  INT         NOT NULL,
    `spot`     VARCHAR(64) NOT NULL,
    `found_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `spot`),
    KEY `spot` (`spot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
