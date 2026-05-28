CREATE TABLE IF NOT EXISTS {messages} (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `text`       VARCHAR(500) NOT NULL,
    `author`     VARCHAR(100) NOT NULL DEFAULT '',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS {settings} (
    `key`   VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO {settings} (`key`, `value`) VALUES ('greeting', 'Hello!');
