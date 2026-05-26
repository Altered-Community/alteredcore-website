-- AlteredCore — Complete schema (all tables, fresh install)
-- Target: MariaDB (not MySQL — some syntax such as ADD COLUMN IF NOT EXISTS is MariaDB-specific)
-- Run via setup.php (browser) — it handles the prefix and creates the admin account.
-- Manual import (no prefix): mariadb -u root -p dbname < sql/schema.sql
-- ============================================================
-- TABLE PREFIX — must match DB_PREFIX in config.local.php.
-- Leave empty for the default instance.
-- ============================================================
-- @prefix:

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ─── News ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}news_categories` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `name_en`    VARCHAR(100) NOT NULL,
    `name_fr`    VARCHAR(100) NOT NULL,
    `slug`       VARCHAR(100) NOT NULL UNIQUE,
    `is_hidden`  TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `{prefix}news` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `category_id`  INT DEFAULT NULL,
    `slug`         VARCHAR(255) DEFAULT NULL,
    `title_en`     VARCHAR(255) NOT NULL,
    `title_fr`     VARCHAR(255) NOT NULL,
    `content_en`   TEXT NOT NULL,
    `content_fr`   TEXT NOT NULL,
    `excerpt_en`   VARCHAR(500) DEFAULT NULL,
    `excerpt_fr`   VARCHAR(500) DEFAULT NULL,
    `image`        VARCHAR(500) DEFAULT NULL,
    `youtube_url`  VARCHAR(500) DEFAULT NULL,
    `published_at` DATETIME DEFAULT NULL,
    `is_published` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_news_slug` (`slug`),
    FOREIGN KEY (`category_id`) REFERENCES `{prefix}news_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}user_groups` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `name`          VARCHAR(100) NOT NULL,
    `slug`          VARCHAR(100) NOT NULL,
    `color`         VARCHAR(7)   NOT NULL DEFAULT '#6b7280',
    `icon`          VARCHAR(100) NOT NULL DEFAULT '',
    `can_access_admin` TINYINT(1)   NOT NULL DEFAULT 0,
    `can_delete`       TINYINT(1)   NOT NULL DEFAULT 1,
    `can_publish`      TINYINT(1)   NOT NULL DEFAULT 0,
    `can_create`       TINYINT(1)   NOT NULL DEFAULT 1,
    `can_edit`         TINYINT(1)   NOT NULL DEFAULT 1,
    `can_readonly_all` TINYINT(1)   NOT NULL DEFAULT 0,
    `can_preview`      TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `{prefix}group_permissions` (
    `id`       INT AUTO_INCREMENT PRIMARY KEY,
    `group_id` INT         NOT NULL,
    `section`  VARCHAR(50) NOT NULL,
    UNIQUE KEY `uq_group_section` (`group_id`, `section`),
    CONSTRAINT `{prefix}fk_gp_group` FOREIGN KEY (`group_id`)
        REFERENCES `{prefix}user_groups`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE IF NOT EXISTS `{prefix}users` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `kc_sub`              VARCHAR(36)  DEFAULT NULL UNIQUE COMMENT 'NULL for local admin accounts',
    `email`               VARCHAR(255) DEFAULT NULL COMMENT 'NULL when STORE_KC_USER_DATA=false',
    `username`            VARCHAR(100) DEFAULT NULL COMMENT 'NULL when STORE_KC_USER_DATA=false',
    `is_admin`            TINYINT(1)   NOT NULL DEFAULT 0,
    `group_id`            INT          DEFAULT NULL,
    `admin_username`      VARCHAR(50)  DEFAULT NULL UNIQUE,
    `admin_password_hash` VARCHAR(255) DEFAULT NULL,
    `local_password_hash`  VARCHAR(255) DEFAULT NULL COMMENT 'bcrypt hash for local auth mode (KC_URL empty)',
    `local_remember_token`  CHAR(64)    DEFAULT NULL,
    `local_remember_expiry` INT         DEFAULT NULL,
    `lang_pref`           VARCHAR(5)   DEFAULT NULL COMMENT 'en or fr, NULL = browser auto-detect',
    `kc_refresh_token`    TEXT         DEFAULT NULL COMMENT 'AES-256-CBC encrypted',
    `kc_token_expiry`     INT          NOT NULL DEFAULT 0 COMMENT '0 = offline token',
    `created_at`          DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `{prefix}fk_users_group` FOREIGN KEY (`group_id`)
        REFERENCES `{prefix}user_groups`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Banner ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}banner` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `title_en`        VARCHAR(255) NOT NULL DEFAULT '',
    `title_fr`        VARCHAR(255) NOT NULL DEFAULT '',
    `subtitle_en`     VARCHAR(500) NOT NULL DEFAULT '',
    `subtitle_fr`     VARCHAR(500) NOT NULL DEFAULT '',
    `btn_label_en`    VARCHAR(100) NOT NULL DEFAULT '',
    `btn_label_fr`    VARCHAR(100) NOT NULL DEFAULT '',
    `btn_url`         VARCHAR(500) NOT NULL DEFAULT '',
    `bg_image`        VARCHAR(500) DEFAULT NULL,
    `overlay_color`   VARCHAR(20)  NOT NULL DEFAULT '#000000',
    `overlay_opacity` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Site settings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}site_settings` (
    `key`        VARCHAR(100) NOT NULL PRIMARY KEY,
    `value`      TEXT DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- theme_settings table removed: all visual settings are now global in site_settings.



-- ─── Footer ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}footer_links` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `label_en`    VARCHAR(100) NOT NULL DEFAULT '',
    `label_fr`    VARCHAR(100) NOT NULL DEFAULT '',
    `url`         VARCHAR(500) NOT NULL DEFAULT '',
    `icon`        VARCHAR(100) DEFAULT NULL,
    `column_num`  TINYINT NOT NULL DEFAULT 2,
    `sort_order`  SMALLINT NOT NULL DEFAULT 0,
    `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Navigation menu ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}nav_items` (
    `id`                INT AUTO_INCREMENT PRIMARY KEY,
    `parent_id`         INT DEFAULT NULL,
    `label_en`          VARCHAR(100) NOT NULL DEFAULT '',
    `label_fr`          VARCHAR(100) NOT NULL DEFAULT '',
    `url`               VARCHAR(500) NOT NULL DEFAULT '#',
    `icon`              VARCHAR(100) NOT NULL DEFAULT 'fa-solid fa-link',
    `sort_order`        SMALLINT NOT NULL DEFAULT 0,
    `is_visible`        TINYINT(1) NOT NULL DEFAULT 1,
    `is_iframe`         TINYINT(1) NOT NULL DEFAULT 0,
    `is_blank`          TINYINT(1) NOT NULL DEFAULT 0,
    `is_fullwidth`      TINYINT(1) NOT NULL DEFAULT 0,
    `hide_label`        TINYINT(1) NOT NULL DEFAULT 0,
    `is_sidebar_toggle` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at`        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`parent_id`) REFERENCES `{prefix}nav_items`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Sidebar items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `{prefix}sidebar_items` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `label_en`     VARCHAR(100) NOT NULL DEFAULT '',
    `label_fr`     VARCHAR(100) NOT NULL DEFAULT '',
    `url`          VARCHAR(500) NOT NULL DEFAULT '#',
    `icon`         VARCHAR(100) NOT NULL DEFAULT '',
    `sort_order`   SMALLINT NOT NULL DEFAULT 0,
    `is_visible`   TINYINT(1) NOT NULL DEFAULT 1,
    `is_separator`      TINYINT(1) NOT NULL DEFAULT 0,
    `is_section_header` TINYINT(1) NOT NULL DEFAULT 0,
    `is_blank`          TINYINT(1) NOT NULL DEFAULT 0,
    `created_at`        DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─── User menu ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}user_menu_items` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `type`       ENUM('system','link','separator') NOT NULL DEFAULT 'link',
    `system_key` VARCHAR(50)  DEFAULT NULL,
    `label_en`   VARCHAR(100) DEFAULT NULL,
    `label_fr`   VARCHAR(100) DEFAULT NULL,
    `url`        VARCHAR(500) DEFAULT NULL,
    `icon`       VARCHAR(100) DEFAULT NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─── Visit stats ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}page_views` (
    `page`  VARCHAR(100) NOT NULL,
    `date`  DATE         NOT NULL,
    `views` INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (`page`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `{prefix}visitor_log` (
    `visitor_id` VARCHAR(32) NOT NULL,
    `date`       DATE        NOT NULL,
    PRIMARY KEY (`visitor_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Community projects ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}project_categories` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `name_en`    VARCHAR(100) NOT NULL,
    `name_fr`    VARCHAR(100) NOT NULL,
    `slug`       VARCHAR(100) NOT NULL UNIQUE,
    `is_hidden`  TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order` SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `{prefix}projects` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `category_id`  INT DEFAULT NULL,
    `title`        VARCHAR(255) NOT NULL,
    `description`  TEXT DEFAULT NULL,
    `url`          VARCHAR(500) NOT NULL,
    `image`        VARCHAR(500) DEFAULT NULL,
    `submitted_by` VARCHAR(255) DEFAULT NULL COMMENT 'Name/email provided on submission',
    `source`       ENUM('admin','user') NOT NULL DEFAULT 'admin',
    `is_approved`  TINYINT(1) NOT NULL DEFAULT 1,
    `is_visible`   TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order`   SMALLINT NOT NULL DEFAULT 0,
    `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `{prefix}fk_projects_category` FOREIGN KEY (`category_id`) REFERENCES `{prefix}project_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Community Builders ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}community_builders` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `title`               VARCHAR(255) NOT NULL,
    `desc_en`             VARCHAR(500) DEFAULT NULL,
    `desc_fr`             VARCHAR(500) DEFAULT NULL,
    `image`               VARCHAR(500) DEFAULT NULL,
    `url`                 VARCHAR(500) NOT NULL,
    `deckbuilder_url`     VARCHAR(500) DEFAULT NULL,
    `deckbuilder_logo`    VARCHAR(500) DEFAULT NULL,
    `deckbuilder_enabled` TINYINT(1)   NOT NULL DEFAULT 0,
    `is_visible`          TINYINT(1)   NOT NULL DEFAULT 1,
    `sort_order`          SMALLINT     NOT NULL DEFAULT 0,
    `created_at`          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Announcements ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}announcements` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `title_en`      VARCHAR(200) DEFAULT NULL,
    `title_fr`      VARCHAR(200) DEFAULT NULL,
    `text_en`       TEXT DEFAULT NULL,
    `text_fr`       TEXT DEFAULT NULL,
    `color`         VARCHAR(20)  NOT NULL DEFAULT 'info',
    `icon`          VARCHAR(100) NOT NULL DEFAULT 'fa-solid fa-circle-info',
    `link_url`      VARCHAR(500) DEFAULT NULL,
    `link_target`   VARCHAR(10)  NOT NULL DEFAULT '_self',
    `link_label_en` VARCHAR(200) DEFAULT NULL,
    `link_label_fr` VARCHAR(200) DEFAULT NULL,
    `is_active`     TINYINT(1)   NOT NULL DEFAULT 0,
    `sort_order`    SMALLINT     NOT NULL DEFAULT 0,
    `created_at`    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Pages ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}pages` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `slug`       VARCHAR(100) NOT NULL UNIQUE,
    `type`       ENUM('code','content') NOT NULL DEFAULT 'code',
    `title_en`   VARCHAR(255) NOT NULL DEFAULT '',
    `title_fr`   VARCHAR(255) NOT NULL DEFAULT '',
    `file_path`  VARCHAR(500) NOT NULL DEFAULT '',
    `content_en` MEDIUMTEXT   NULL,
    `content_fr` MEDIUMTEXT   NULL,
    `is_visible` TINYINT(1)   NOT NULL DEFAULT 1,
    `sort_order` SMALLINT     NOT NULL DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_pages_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Note: cards, card, deck, decks, deckbuilder, collection are served by the
-- core-altered-cards plugin and must not be registered here (would cause slug conflicts).

-- ─── RSS Feeds ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}rss_feeds` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `name`            VARCHAR(255) NOT NULL,
    `url`             VARCHAR(1000) NOT NULL,
    `url_fr`          VARCHAR(1000) DEFAULT NULL,
    `category_id`     INT DEFAULT NULL,
    `refresh_minutes` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    `map_title`       VARCHAR(100) NOT NULL DEFAULT 'title',
    `map_link`        VARCHAR(100) NOT NULL DEFAULT 'link',
    `map_description` VARCHAR(100) NOT NULL DEFAULT 'description',
    `map_image`       VARCHAR(100) NOT NULL DEFAULT '',
    `map_date`        VARCHAR(100) NOT NULL DEFAULT 'pubDate',
    `is_visible`      TINYINT(1) NOT NULL DEFAULT 1,
    `sort_order`      SMALLINT NOT NULL DEFAULT 0,
    `last_fetched_at` DATETIME DEFAULT NULL,
    `created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `{prefix}fk_rss_feeds_category` FOREIGN KEY (`category_id`)
        REFERENCES `{prefix}news_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `{prefix}rss_cache` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `feed_id`      INT NOT NULL,
    `lang`         CHAR(2) NOT NULL DEFAULT '',
    `guid`         TEXT NOT NULL,
    `guid_hash`    CHAR(32) NOT NULL,
    `title`        VARCHAR(500) NOT NULL DEFAULT '',
    `link`         VARCHAR(2048) NOT NULL DEFAULT '',
    `description`  TEXT DEFAULT NULL,
    `image`        VARCHAR(2048) DEFAULT NULL,
    `published_at` DATETIME NOT NULL,
    `fetched_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_rss_guid` (`feed_id`, `guid_hash`, `lang`),
    KEY `idx_rss_cache_published` (`feed_id`, `published_at`),
    CONSTRAINT `{prefix}fk_rss_cache_feed` FOREIGN KEY (`feed_id`)
        REFERENCES `{prefix}rss_feeds`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Newsletter subscriptions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}newsletter_sub` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `email`         VARCHAR(255) NOT NULL,
    `subscribed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_newsletter_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Plugins ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}plugins` (
    `id`               VARCHAR(100) NOT NULL PRIMARY KEY,
    `is_active`        TINYINT(1)   NOT NULL DEFAULT 0,
    `version`          VARCHAR(20)  DEFAULT NULL,
    `sql_installed_at` DATETIME     DEFAULT NULL,
    `installed_at`     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `activated_at`     DATETIME     DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Feedback rate limiting ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `{prefix}feedback_rate_limit` (
    `kc_sub`  VARCHAR(64)   NOT NULL COMMENT 'Keycloak subject (unique user ID)',
    `last_at` INT UNSIGNED  NOT NULL COMMENT 'Unix timestamp of last submission',
    PRIMARY KEY (`kc_sub`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --- Seed / demo data -------------------------------------------------------

INSERT INTO `{prefix}footer_links` (`id`, `label_en`, `label_fr`, `url`, `icon`, `column_num`, `sort_order`, `created_at`) VALUES
(1, 'News', 'News', '/pages/news', 'fa-solid fa-newspaper', 2, 1, '2026-05-13 18:00:00'),
(2, 'RSS', 'RSS', '/pages/rss', 'fa-solid fa-square-rss', 2, 4, '2026-05-13 18:02:21'),
(3, 'Altered.gg', 'Altered.gg', 'https://altered.gg', 'fak fa-altered-swirl', 3, 5, '2026-05-13 18:03:52'),
(4, 'Board Game Arena', 'Board Game Arena', 'https://boardgamearena.com/', 'fak fa-bga', 3, 6, '2026-05-13 18:04:11');

INSERT INTO `{prefix}group_permissions` (`id`, `group_id`, `section`) VALUES
(1, 1, 'altered-json'),
(2, 1, 'announcement'),
(3, 1, 'background'),
(4, 1, 'banner'),
(5, 1, 'categories'),
(6, 1, 'community-builders'),
(7, 1, 'dashboard'),
(8, 1, 'font'),
(9, 1, 'footer'),
(10, 1, 'groups'),
(11, 1, 'homepage'),
(12, 1, 'logo'),
(13, 1, 'maintenance'),
(14, 1, 'media'),
(15, 1, 'nav'),
(16, 1, 'news'),
(17, 1, 'pages'),
(18, 1, 'plugins'),
(19, 1, 'privacy'),
(20, 1, 'project-categories'),
(21, 1, 'projects'),
(22, 1, 'settings'),
(23, 1, 'sidebar'),
(24, 1, 'themes'),
(25, 1, 'user-menu'),
(26, 1, 'users'),

INSERT INTO `{prefix}nav_items` (`id`, `parent_id`, `label_en`, `label_fr`, `url`, `icon`, `sort_order`, `is_visible`, `is_iframe`, `is_blank`, `is_fullwidth`, `hide_label`, `is_sidebar_toggle`, `created_at`) VALUES
(1, NULL, 'Home', 'Accueil', '/pages/index', 'fa-solid fa-house', 10, 1, 0, 0, 0, 0, 0, '2026-05-13 14:21:02'),
(2, NULL, 'News', 'News', '/pages/news', 'fa-solid fa-newspaper', 20, 1, 0, 0, 0, 0, 0, '2026-05-13 14:21:02'),
(3, NULL, 'Cards', 'Cartes', '/pages/cards', 'fa-solid fa-layer-group', 30, 1, 0, 0, 0, 0, 0, '2026-05-13 14:21:02'),
(4, NULL, 'Decks', 'Decks', '/pages/decks', 'fa-solid fa-table-list', 40, 1, 0, 0, 0, 0, 0, '2026-05-13 14:21:02'),
(5, NULL, 'Menu', 'Menu', '#', 'fa-solid fa-bars-staggered', 999, 1, 0, 0, 0, 1, 1, '2026-05-13 15:57:57'),
(6, NULL, 'Bugs', 'Bugs', '/pages/feedback', 'fa-solid fa-bug', 1001, 1, 0, 0, 0, 1, 0, '2026-05-17 20:39:11');

INSERT INTO `{prefix}news` (`id`, `category_id`, `slug`, `title_en`, `title_fr`, `content_en`, `content_fr`, `excerpt_en`, `excerpt_fr`, `image`, `youtube_url`, `published_at`, `is_published`, `created_at`, `updated_at`) VALUES
(1, 1, 'demo-news-article', 'Demo news article', 'Article de démo', '<p>This is a demo news article. Replace this content from the admin panel.</p>', '<p>Ceci est un article de démo. Remplacez ce contenu depuis le panneau d''administration.</p>', 'Demo news article excerpt.', 'Extrait de l''article de démo.', NULL, NULL, '2026-01-01 12:00:00', 1, '2026-01-01 12:00:00', '2026-01-01 12:00:00');

INSERT INTO `{prefix}news_categories` (`id`, `name_en`, `name_fr`, `slug`, `is_hidden`, `sort_order`, `created_at`) VALUES
(1, 'News', 'News', 'news', 0, 0, '2026-05-13 19:27:09'),
(2, 'Lore', 'Lore', 'lore', 0, 0, '2026-05-16 23:48:00');

INSERT INTO `{prefix}sidebar_items` (`id`, `label_en`, `label_fr`, `url`, `icon`, `sort_order`, `is_visible`, `is_separator`, `is_section_header`, `is_blank`, `created_at`) VALUES
(1, 'Start Here', 'Pour Commencer', '#', '', 1, 1, 0, 1, 0, '2026-05-13 18:06:01'),
(2, 'What is Altered', 'Qu\'est-ce qu\'Altered ?', 'https://www.altered.gg/the-game/what-is-altered', 'fak fa-altered-swirl', 2, 1, 0, 0, 1, '2026-05-13 18:06:25'),
(3, 'How to Play', 'Comment jouer ?', 'https://www.altered.gg/the-game/how-to-play', 'fa-solid fa-graduation-cap', 3, 1, 0, 0, 1, '2026-05-13 18:06:46'),
(4, 'Play Altered Online', 'Joue Ã  Altered en ligne', 'https://boardgamearena.com/gamepanel?game=altered', 'fak fa-bga', 4, 1, 0, 0, 1, '2026-05-13 18:07:12'),

INSERT INTO `{prefix}site_settings` (`key`, `value`, `updated_at`) VALUES
('active_theme', 'azure', '2026-05-13 14:21:02')

INSERT INTO `{prefix}user_groups` (`id`, `name`, `slug`, `color`, `icon`, `can_access_admin`, `can_delete`, `can_publish`, `can_create`, `can_edit`, `can_readonly_all`, `can_preview`, `created_at`) VALUES
(1, 'Admin', 'admin', '#f59e0b', 'fa-solid fa-crown', 1, 1, 1, 1, 1, 0, 1, '2026-05-13 14:21:02'),
(2, 'Editors', 'editors', '#3b82f6', 'fa-solid fa-pen', 1, 1, 1, 1, 1, 0, 0, '2026-05-13 14:21:02'),
(3, 'Users', 'users', '#6b7280', 'fa-solid fa-user', 0, 0, 0, 1, 1, 0, 0, '2026-05-13 14:21:02');

INSERT INTO `{prefix}user_menu_items` (`id`, `type`, `system_key`, `label_en`, `label_fr`, `url`, `icon`, `sort_order`, `is_visible`, `created_at`) VALUES
(1, 'system', 'email_display', NULL, NULL, NULL, NULL, 10, 1, '2026-05-13 14:21:02'),
(2, 'system', 'account', 'My account', 'Mon compte', NULL, 'fa-solid fa-user', 20, 1, '2026-05-13 14:21:02'),
(3, 'separator', NULL, NULL, NULL, NULL, NULL, 30, 1, '2026-05-13 14:21:02'),
(4, 'system', 'logout', 'Sign out', 'DÃ©connexion', NULL, 'fa-solid fa-right-from-bracket', 40, 1, '2026-05-13 14:21:02');

INSERT INTO `{prefix}users` (`id`, `kc_sub`, `email`, `username`, `is_admin`, `group_id`, `admin_username`, `admin_password_hash`, `local_password_hash`, `local_remember_token`, `local_remember_expiry`, `lang_pref`, `kc_refresh_token`, `kc_token_expiry`, `created_at`, `updated_at`) VALUES
(1, NULL, NULL, NULL, 1, 1, 'admin', '$2y$10$KD56IU3XvzJ88l3FguOL7.3hkBZMzjIOnV7626JrepXTLGN7QYSfu', NULL, NULL, NULL, 'en', NULL, 0, NOW(), NOW());

SET foreign_key_checks = 1;
