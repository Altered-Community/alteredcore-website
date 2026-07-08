-- Add is_separator and is_section_header columns to nav_items (missing from prod)
-- Idempotent: MySQL + MariaDB compatible (avoids ADD COLUMN IF NOT EXISTS).

-- is_separator
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}nav_items'
      AND COLUMN_NAME  = 'is_separator'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `{prefix}nav_items` ADD COLUMN `is_separator` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_sidebar_toggle`',
    'DO 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

-- is_section_header
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = '{prefix}nav_items'
      AND COLUMN_NAME  = 'is_section_header'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `{prefix}nav_items` ADD COLUMN `is_section_header` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_separator`',
    'DO 1'
);
PREPARE _stmt FROM @sql;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;
