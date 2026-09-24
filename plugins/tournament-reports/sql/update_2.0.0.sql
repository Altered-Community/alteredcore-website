-- tournament-reports v2.0.0 — GameApi is now called live, nothing about it is
-- cached locally anymore, and the manual drag-and-drop ranking feature is
-- retired (standings are wins/games/losses, corrected only through GameApi's
-- own adjustment endpoint). Reconciles any preprod/dev instance that already
-- ran the old install.sql/update_1.1.0.sql to the new (smaller) shape in
-- sql/install.sql. Written idempotently like update_1.1.0.sql: a file that
-- fails partway is not recorded by sql/migrate_plugins.php, so the next
-- deploy retries it from the top.

DROP TABLE IF EXISTS {ranking_players};
DROP TABLE IF EXISTS {rankings};

-- MySQL has no DROP COLUMN IF EXISTS (portably), hence the same
-- INFORMATION_SCHEMA + PREPARE dance update_1.1.0.sql used for ADD COLUMN,
-- just inverted. {tournaments} expands backtick-quoted, so matching it
-- against TABLE_NAME needs REPLACE() to strip them.

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'total_games');
SET @s = IF(@e > 0, 'ALTER TABLE {tournaments} DROP COLUMN `total_games`', 'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'total_players');
SET @s = IF(@e > 0, 'ALTER TABLE {tournaments} DROP COLUMN `total_players`', 'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'format');
SET @s = IF(@e > 0, 'ALTER TABLE {tournaments} DROP COLUMN `format`', 'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'first_game_at');
SET @s = IF(@e > 0, 'ALTER TABLE {tournaments} DROP COLUMN `first_game_at`', 'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'api_version');
SET @s = IF(@e > 0, 'ALTER TABLE {tournaments} DROP COLUMN `api_version`', 'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'api_hash');
SET @s = IF(@e > 0, 'ALTER TABLE {tournaments} DROP COLUMN `api_hash`', 'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

SET @e = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME   = REPLACE('{tournaments}', '`', '')
            AND COLUMN_NAME  = 'synced_at');
SET @s = IF(@e > 0, 'ALTER TABLE {tournaments} DROP COLUMN `synced_at`', 'DO 1');
PREPARE _stmt FROM @s;
EXECUTE _stmt;
DEALLOCATE PREPARE _stmt;

DELETE FROM {settings} WHERE `key` IN ('sync_interval', 'last_sync_at', 'sync_pending');
