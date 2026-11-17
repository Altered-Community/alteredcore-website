-- Authors and translators of a news article: names, comma-separated (free text, they need no account), shown under the
-- title of the article (pages/news-detail.php). Idempotent: MySQL + MariaDB compatible.
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}news'
      AND COLUMN_NAME  = 'authors'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `{prefix}news` ADD COLUMN `authors` VARCHAR(500) DEFAULT NULL AFTER `youtube_url`',
    'DO 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}news'
      AND COLUMN_NAME  = 'translators'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `{prefix}news` ADD COLUMN `translators` VARCHAR(500) DEFAULT NULL AFTER `authors`',
    'DO 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
