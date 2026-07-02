-- Add is_separator and is_section_header columns to nav_items (missing from prod)
ALTER TABLE `{prefix}nav_items`
    ADD COLUMN `is_separator`      TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_sidebar_toggle`,
    ADD COLUMN `is_section_header` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_separator`;
