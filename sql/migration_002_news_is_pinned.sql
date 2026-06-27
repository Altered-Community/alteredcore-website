-- Add is_pinned column to news table (idempotent: MySQL + MariaDB compatible)
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}news'
      AND COLUMN_NAME  = 'is_pinned'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `{prefix}news` ADD COLUMN `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_published`',
    'SELECT 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
