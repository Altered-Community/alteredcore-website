-- Added in v1.1.0: settings table
CREATE TABLE IF NOT EXISTS {settings} (
    `key`   VARCHAR(100) NOT NULL PRIMARY KEY,
    `value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO {settings} (`key`, `value`) VALUES ('greeting', 'Hello!');
