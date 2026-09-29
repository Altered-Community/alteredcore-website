-- Section headers and descriptions for the main menu's dropdowns (shown as columns in the
-- azure mega menu), and the Home link hidden since the logo already goes home.
-- Rows are found by URL under their parent, never by id: a dropdown that already has a section
-- header is left as it is, a missing link is skipped, and a link with a description keeps it. No semicolon inside strings:
-- sql/migrate.php splits statements on them.

-- Home
UPDATE `{prefix}nav_items` SET `is_visible` = 0
WHERE `parent_id` IS NULL AND `url` = '/pages/index' AND `label_en` = 'Home';

-- Cards
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `url` = '/pages/cards' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1) > 0, NULL, @p);

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Card database', 'Base de cartes', '#', 5, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`is_section_header` = 1);

UPDATE `{prefix}nav_items` SET `description_en` = 'Every card, with filters', `description_fr` = 'Toutes les cartes, avec filtres'
WHERE `parent_id` = @p AND `url` = '/pages/cards' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'Identify a card with your camera', `description_fr` = 'Identifier une carte avec la caméra'
WHERE `parent_id` = @p AND `url` = '/pages/qrscan' AND `description_en` = '';

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Game settings', 'Réglages du jeu', '#', 25, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`label_en` = 'Game settings');

UPDATE `{prefix}nav_items` SET `description_en` = 'Choose which art BGA shows', `description_fr` = 'Choisir les illustrations affichées sur BGA'
WHERE `parent_id` = @p AND `url` = '/pages/ownership-alt-arts' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'Current suspensions, errata and bans', `description_fr` = 'Suspensions, errata et bans en cours'
WHERE `parent_id` = @p AND `url` = '/pages/current-suspensions-errata-bans' AND `description_en` = '';

-- The separator before the collection links becomes their section header
UPDATE `{prefix}nav_items` SET `is_separator` = 0, `is_section_header` = 1, `label_en` = 'My collection', `label_fr` = 'Ma collection', `icon` = 'fa-solid fa-link'
WHERE `parent_id` = @p AND `is_separator` = 1 AND `sort_order` BETWEEN 41 AND 59;
INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'My collection', 'Ma collection', '#', 50, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`label_en` = 'My collection');

UPDATE `{prefix}nav_items` SET `description_en` = 'Your digital cards', `description_fr` = 'Tes cartes numériques'
WHERE `parent_id` = @p AND `url` = '/pages/ownership' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'Track your physical playset', `description_fr` = 'Ton playset de cartes papier'
WHERE `parent_id` = @p AND `url` = '/pages/playset?tab=playset' AND `description_en` = '';

-- Decks
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `url` = '/pages/decks' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1) > 0, NULL, @p);

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Decks', 'Decks', '#', 5, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`is_section_header` = 1);

UPDATE `{prefix}nav_items` SET `description_en` = 'Community decks and your own', `description_fr` = 'Les decks de la communauté et les tiens', `sort_order` = 10
WHERE `parent_id` = @p AND `url` = '/pages/decks' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'The new deckbuilder, in beta', `description_fr` = 'Le nouveau deckbuilder, en bêta', `sort_order` = 20
WHERE `parent_id` = @p AND `url` = '/pages/rebuilder/decks' AND `description_en` = '';

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Competition', 'Compétition', '#', 35, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`label_en` = 'Competition');

UPDATE `{prefix}nav_items` SET `description_en` = 'Decks played in tournaments', `description_fr` = 'Les decks joués en tournoi', `sort_order` = 40
WHERE `parent_id` = @p AND `url` = '/pages/tournaments' AND `description_en` = '';

-- Play
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `url` = 'https://boardgamearena.com/gamepanel?game=altered' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1) > 0, NULL, @p);

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Play online', 'Jouer en ligne', '#', 5, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`is_section_header` = 1);

UPDATE `{prefix}nav_items` SET `description_en` = 'Online games against other players', `description_fr` = 'Parties en ligne contre d''autres joueurs', `sort_order` = 10
WHERE `parent_id` = @p AND `url` = 'https://boardgamearena.com/gamepanel?game=altered' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'Limited formats on altered-draft', `description_fr` = 'Formats limités sur altered-draft', `sort_order` = 15
WHERE `parent_id` = @p AND `url` = 'https://altered-draft.altered.re' AND `description_en` = '';

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Learn', 'Apprendre', '#', 18, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`label_en` = 'Learn');

UPDATE `{prefix}nav_items` SET `description_en` = 'The basics of the game', `description_fr` = 'Les bases du jeu', `sort_order` = 20
WHERE `parent_id` = @p AND `url` = '/pages/rules' AND `description_en` = '';

-- Community & Help
SET @p = (SELECT `id` FROM `{prefix}nav_items` WHERE `parent_id` IS NULL AND `label_en` = 'Community & Help' ORDER BY `id` LIMIT 1);
SET @p = IF((SELECT COUNT(*) FROM `{prefix}nav_items` WHERE `parent_id` = @p AND `is_section_header` = 1) > 0, NULL, @p);

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Get involved', 'Participer', '#', 5, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`is_section_header` = 1);

UPDATE `{prefix}nav_items` SET `description_en` = 'Support the Re:Union association', `description_fr` = 'Soutenir l''association Re:Union', `sort_order` = 10
WHERE `parent_id` = @p AND `url` LIKE 'https://www.helloasso.com/%' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'Open roles in the team', `description_fr` = 'Les rôles ouverts dans l''équipe', `sort_order` = 15
WHERE `parent_id` = @p AND `url` = '/pages/current-open-roles' AND `description_en` = '';

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Help', 'Aide', '#', 17, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`label_en` = 'Help');

UPDATE `{prefix}nav_items` SET `description_en` = 'Frequently asked questions', `description_fr` = 'Questions fréquentes', `sort_order` = 20
WHERE `parent_id` = @p AND `url` = '/pages/faq' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'Game documentation', `description_fr` = 'Documentation du jeu', `sort_order` = 22
WHERE `parent_id` = @p AND `url` = 'https://alteredtcg.wiki.gg/' AND `description_en` = '';
UPDATE `{prefix}nav_items` SET `description_en` = 'Report a problem', `description_fr` = 'Signaler un problème', `sort_order` = 24
WHERE `parent_id` = @p AND `url` = '/pages/feedback' AND `description_en` = '';

INSERT INTO `{prefix}nav_items` (`parent_id`, `label_en`, `label_fr`, `url`, `sort_order`, `is_section_header`)
SELECT @p, 'Tools', 'Outils', '#', 26, 1 FROM DUAL
WHERE @p IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `{prefix}nav_items` x WHERE x.`parent_id` = @p AND x.`label_en` = 'Tools');

UPDATE `{prefix}nav_items` SET `description_en` = 'The community mini-game', `description_fr` = 'Le mini-jeu de la communauté', `sort_order` = 30
WHERE `parent_id` = @p AND `url` = 'https://fragileclick.github.io/Alteredle/' AND `description_en` = '';
