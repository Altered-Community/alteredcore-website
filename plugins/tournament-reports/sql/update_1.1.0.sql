-- tournament-reports v1.1.0 — hourly sync against the tournament API.
--
-- The API now precomputes one report per parent tournament and exposes a cheap
-- index (GET /api/tournament-reports) carrying each one's version. These
-- columns are what let the sync tell a report it already holds from one that
-- has moved, and let the listing page render without decoding a games_data
-- blob per row.

ALTER TABLE {tournaments}
    ADD COLUMN `name_overridden` TINYINT(1)  NOT NULL DEFAULT 0 AFTER `tournament_name`,
    ADD COLUMN `total_players`   INT         NOT NULL DEFAULT 0 AFTER `total_games`,
    ADD COLUMN `format`          VARCHAR(50) NOT NULL DEFAULT '' AFTER `total_players`,
    ADD COLUMN `first_game_at`   DATETIME    NULL DEFAULT NULL AFTER `format`,
    ADD COLUMN `api_version`     INT         NOT NULL DEFAULT 0 AFTER `first_game_at`,
    ADD COLUMN `api_hash`        VARCHAR(64) NOT NULL DEFAULT '' AFTER `api_version`,
    ADD COLUMN `synced_at`       DATETIME    NULL DEFAULT NULL AFTER `fetched_at`;

-- Existing rows were fetched before versions existed: api_version 0 never
-- matches what the index reports, so the first sync re-downloads each one
-- exactly once and fills in the new columns.

INSERT IGNORE INTO {settings} (`key`, value) VALUES ('sync_interval', '3600');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('last_sync_at', '');
INSERT IGNORE INTO {settings} (`key`, value) VALUES ('sync_pending', '0');
