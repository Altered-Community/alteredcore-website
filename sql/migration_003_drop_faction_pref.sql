-- Remove faction_pref column (feature dropped)
-- Idempotent: MySQL + MariaDB compatible (avoids DROP COLUMN IF EXISTS).
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}users'
      AND COLUMN_NAME  = 'faction_pref'
);
SET @sql = IF(@col_exists = 1,
    'ALTER TABLE `{prefix}users` DROP COLUMN `faction_pref`',
    'DO 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
