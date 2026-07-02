-- Remove faction_pref column (feature dropped)
ALTER TABLE `{prefix}users`
    DROP COLUMN `faction_pref`;
