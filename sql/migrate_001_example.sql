-- Migration 001 — example
-- Naming: migrate_NNN_short_description.sql
-- NNN is zero-padded (001, 002, ...) to guarantee execution order.
-- {prefix} is substituted at runtime with DB_PREFIX (same as schema.sql).
-- This file runs automatically on `docker compose up` for fresh databases.
-- For existing databases, run it manually in phpMyAdmin or via CLI.

-- Example: add a column to the users table
-- ALTER TABLE `{prefix}users`
--     ADD COLUMN `example_column` VARCHAR(255) DEFAULT NULL AFTER `faction_pref`;
