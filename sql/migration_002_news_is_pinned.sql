-- Add is_pinned column to news table
ALTER TABLE `{prefix}news`
    ADD COLUMN IF NOT EXISTS `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_published`;
