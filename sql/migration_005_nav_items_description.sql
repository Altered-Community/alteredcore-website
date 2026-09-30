-- Optional one-line description under dropdown links (shown in the azure mega menu).
-- Idempotent: MySQL + MariaDB compatible (avoids ADD COLUMN IF NOT EXISTS).

-- description_en
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}nav_items'
      AND COLUMN_NAME  = 'description_en'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `{prefix}nav_items` ADD COLUMN `description_en` VARCHAR(160) NOT NULL DEFAULT '''' AFTER `label_fr`',
    'DO 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

-- description_fr
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}nav_items'
      AND COLUMN_NAME  = 'description_fr'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `{prefix}nav_items` ADD COLUMN `description_fr` VARCHAR(160) NOT NULL DEFAULT '''' AFTER `description_en`',
    'DO 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
