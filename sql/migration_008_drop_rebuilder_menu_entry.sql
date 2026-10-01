-- « Re:Builder (beta) » leaves the Decks menu: with « Beta Deckbuilder » on (account menu), the menu's
-- own Decks entry (/pages/decks) opens Re:Builder, at the same URL. The entry was the plugin's menu
-- suggestion (plugins/rebuilder/plugin.json "menu", removed).
DELETE FROM `{prefix}nav_items` WHERE `url` = '/pages/rebuilder/decks';
