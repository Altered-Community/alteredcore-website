-- Puts the main menu's dropdowns in the order migration 006 meant, whatever sort_order the
-- links had before: 006 slotted its section headers between the production values
-- (10, 20, 30…), so on a menu with other values every header ended up first, with empty
-- columns. Also adds the "Decks" link where the Decks dropdown has none, and hides the Cards
-- separator that 006 left next to its "My collection" header.
-- Only dropdowns that carry 006's headers are touched, rows are found by URL under their
-- parent, and links this file does not list keep their place. No semicolon inside strings:
-- sql/migrate.php splits statements on them.

-- Cards
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `url` = '/pages/cards' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Card database') > 0, @p, NULL);

UPDATE `{prefix}nav_items` SET `sort_order` = 5  WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Card database';
UPDATE `{prefix}nav_items` SET `sort_order` = 10 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/cards';
UPDATE `{prefix}nav_items` SET `sort_order` = 20 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/qrscan';
UPDATE `{prefix}nav_items` SET `sort_order` = 25 WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Game settings';
UPDATE `{prefix}nav_items` SET `sort_order` = 30 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/ownership-alt-arts';
UPDATE `{prefix}nav_items` SET `sort_order` = 40 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/current-suspensions-errata-bans';
UPDATE `{prefix}nav_items` SET `sort_order` = 50 WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'My collection';
UPDATE `{prefix}nav_items` SET `sort_order` = 60 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/ownership';
UPDATE `{prefix}nav_items` SET `sort_order` = 70 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/playset?tab=playset';

-- The "My collection" header already starts that column
SET @h = (SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'My collection');
UPDATE `{prefix}nav_items` SET `is_visible` = 0 WHERE `parent_id` = @p AND `is_separator` = 1 AND @h > 0;

-- Decks
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `url` = '/pages/decks' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Decks') > 0, @p, NULL);

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `description_en`, `description_fr`, `url`, `icon`, `sort_order`)
SELECT @p, 'Decks', 'Decks', 'Community decks and your own', 'Les decks de la communauté et les tiens', '/pages/decks', 'fa-solid fa-box', 10 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`is_section_header` = 0 AND x.`url` = '/pages/decks');

UPDATE `{prefix}nav_items` SET `sort_order` = 5  WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Decks';
UPDATE `{prefix}nav_items` SET `sort_order` = 10, `is_visible` = 1 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/decks';
UPDATE `{prefix}nav_items` SET `description_en` = 'Community decks and your own', `description_fr` = 'Les decks de la communauté et les tiens'
WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/decks' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `sort_order` = 20 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/rebuilder/decks';
UPDATE `{prefix}nav_items` SET `sort_order` = 35 WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Competition';
UPDATE `{prefix}nav_items` SET `sort_order` = 40 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/tournaments';

-- Play
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `url` = 'https://boardgamearena.com/gamepanel?game=altered' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Play online') > 0, @p, NULL);

UPDATE `{prefix}nav_items` SET `sort_order` = 5  WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Play online';
UPDATE `{prefix}nav_items` SET `sort_order` = 10 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = 'https://boardgamearena.com/gamepanel?game=altered';
UPDATE `{prefix}nav_items` SET `sort_order` = 15 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = 'https://altered-draft.altered.re';
UPDATE `{prefix}nav_items` SET `sort_order` = 18 WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Learn';
UPDATE `{prefix}nav_items` SET `sort_order` = 20 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/rules';

-- Community & Help
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `label_en` = 'Community & Help' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Get involved') > 0, @p, NULL);

UPDATE `{prefix}nav_items` SET `sort_order` = 5  WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Get involved';
UPDATE `{prefix}nav_items` SET `sort_order` = 10 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` LIKE 'https://www.helloasso.com/%';
UPDATE `{prefix}nav_items` SET `sort_order` = 15 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/current-open-roles';
UPDATE `{prefix}nav_items` SET `sort_order` = 17 WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Help';
UPDATE `{prefix}nav_items` SET `sort_order` = 20 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/faq';
UPDATE `{prefix}nav_items` SET `sort_order` = 22 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = 'https://alteredtcg.wiki.gg/';
UPDATE `{prefix}nav_items` SET `sort_order` = 24 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = '/pages/feedback';
UPDATE `{prefix}nav_items` SET `sort_order` = 26 WHERE `parent_id` = @p AND `is_section_header` = 1 AND `label_en` = 'Tools';
UPDATE `{prefix}nav_items` SET `sort_order` = 30 WHERE `parent_id` = @p AND `is_section_header` = 0 AND `url` = 'https://fragileclick.github.io/Alteredle/';
