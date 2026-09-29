-- Fonts come from the design system (design-system/fonts/, --ac-font-* tokens): the admin "Font"
-- section is gone. Drop its settings and its group permission. Idempotent.
DELETE FROM `{prefix}site_settings`
WHERE `key` IN ('font_body', 'font_titles', 'font_nav', 'font_user_menu', 'font_footer');

DELETE FROM `{prefix}group_permissions` WHERE `section` = 'font';
