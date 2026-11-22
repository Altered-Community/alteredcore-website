-- The site's look comes from the design system only (design-system/): the admin no longer sets
-- colours, backgrounds, footer decorations, banner veil, theme, menu width or side menu position.
-- Drop those settings and the Background / Themes permissions. Idempotent.
DELETE FROM `{prefix}site_settings`
WHERE `key` IN ('theme_color', 'bg_color', 'bg_image', 'bg_image_mode',
                'footer_bg_image', 'footer_bg_mode',
                'footer_deco_left', 'footer_deco_left_opacity', 'footer_deco_right', 'footer_deco_right_opacity',
                'active_theme', 'navbar_width', 'sidebar_side', 'sidebar_btn_position');

DELETE FROM `{prefix}group_permissions` WHERE `section` IN ('background', 'themes');
