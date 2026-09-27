-- tournament-reports v1.1.0 — hourly sync against the tournament API.
--
-- The API now precomputes one report per parent tournament and exposes a cheap
-- index (GET /api/tournament-reports) carrying each one's version. These
-- columns are what let the sync tell a report it already holds from one that
-- has moved, and let the listing page render without decoding a games_data
-- blob per row.
--
-- Written idempotently, one guarded block per column: a file that fails partway
-- is not recorded by sql/migrate_plugins.php, so the next deploy retries it from
-- the top and must not trip over the columns the failed run already added. MySQL
-- has no ADD COLUMN IF NOT EXISTS, hence the INFORMATION_SCHEMA + PREPARE dance
-- documented in sql/migrate.php. Note {tournaments} expands backtick-quoted, so
-- matching it against TABLE_NAME needs REPLACE() to strip them; inside the
-- prepared ALTER strings the backticks are wanted and kept as-is.

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'name_overridden');
SET @s = IF(@e = 0,
            'ALTER TABLE {tournaments} ADD COLUMN `name_overridden` TINYINT(1) NOT NULL DEFAULT 0 AFTER `tournament_name`',
            'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'total_players');
SET @s = IF(@e = 0,
            'ALTER TABLE {tournaments} ADD COLUMN `total_players` INT NOT NULL DEFAULT 0 AFTER `total_games`',
            'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'format');
SET @s = IF(@e = 0,
            'ALTER TABLE {tournaments} ADD COLUMN `format` VARCHAR(50) NOT NULL DEFAULT '''' AFTER `total_players`',
            'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'first_game_at');
SET @s = IF(@e = 0,
            'ALTER TABLE {tournaments} ADD COLUMN `first_game_at` DATETIME NULL DEFAULT NULL AFTER `format`',
            'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'api_version');
SET @s = IF(@e = 0,
            'ALTER TABLE {tournaments} ADD COLUMN `api_version` INT NOT NULL DEFAULT 0 AFTER `first_game_at`',
            'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'api_hash');
SET @s = IF(@e = 0,
            'ALTER TABLE {tournaments} ADD COLUMN `api_hash` VARCHAR(64) NOT NULL DEFAULT '''' AFTER `api_version`',
            'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'synced_at');
SET @s = IF(@e = 0,
            'ALTER TABLE {tournaments} ADD COLUMN `synced_at` DATETIME NULL DEFAULT NULL AFTER `fetched_at`',
            'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

-- Existing rows were fetched before versions existed: api_version 0 never
-- matches what the index reports, so the first sync re-downloads each one
-- exactly once and fills in the new columns.

INSERT IGNORE INTO {settings} (`key`, value) VALUES ('sync_interval', '3600');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('last_sync_at', '');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('sync_pending', '0');
