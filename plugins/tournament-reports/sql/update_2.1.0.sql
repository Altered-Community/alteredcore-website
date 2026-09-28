-- tournament-reports v2.1.0 — manual tournaments and the admin overlay
-- (name/localization/description overrides for GameApi tournaments) are
-- retired; every tournament now comes straight from GameApi. Drops the table
-- that backed both features.

DROP TABLE IF EXISTS {tournaments};
