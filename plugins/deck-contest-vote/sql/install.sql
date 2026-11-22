CREATE TABLE IF NOT EXISTS {decks} (
    `id`          VARCHAR(64)  NOT NULL PRIMARY KEY,
    `faction`     VARCHAR(32)  NOT NULL,
    `hero`        VARCHAR(64)  NOT NULL,
    `author`      VARCHAR(100) NOT NULL DEFAULT '',
    `difficulty`  VARCHAR(16)  NOT NULL DEFAULT '' COMMENT 'Easy | Medium | Complex',
    `archetype`   VARCHAR(64)  NOT NULL DEFAULT '' COMMENT 'Aggro, Control, Buildup, Balanced, Combo, WIP (several: Buildup/Combo)',
    `url`         VARCHAR(500) NOT NULL DEFAULT '',
    `deck_uuid`   VARCHAR(36)  NOT NULL DEFAULT '' COMMENT 'id of the deck on the decks API, read from the url',
    `explanation` TEXT         NULL,
    `data`        MEDIUMTEXT   NULL COMMENT 'decklist cache {fr|en: {hero, hero_img, cards}}, refreshed from the admin',
    `fetched_at`  DATETIME     NULL,
    `position`    INT          NOT NULL DEFAULT 0,
    `active`      TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '0: out of the vote (jury refusal, withdrawn)',
    KEY `faction` (`faction`, `position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per (voter, deck). tier 5..1 = S..D, NULL = not placed in the tier list. frustrating = flagged as
-- frustrating to face (not to play). A deck neither placed nor flagged has no row. The primary key is what limits a
-- person to one vote per deck.
CREATE TABLE IF NOT EXISTS {votes} (
    `user_id`     INT         NOT NULL,
    `deck_id`     VARCHAR(64) NOT NULL,
    `tier`        TINYINT     NULL,
    `frustrating` TINYINT(1)  NOT NULL DEFAULT 0,
    `updated_at`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `deck_id`),
    KEY `deck_id` (`deck_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS {settings} (
    `key`   VARCHAR(64) NOT NULL PRIMARY KEY,
    `value` VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO {settings} (`key`, `value`) VALUES
    ('opens_at',      '2026-11-05 12:00:00'),
    ('closes_at',     '2026-11-09 23:59:59'),
    ('decks_api_url', 'https://decks.alteredcore.org');

-- Submissions of the contest (Decklist submissions_v2.csv), hero spelling and archetype typos fixed.
INSERT INTO {decks} (`id`, `faction`, `hero`, `author`, `difficulty`, `archetype`, `url`, `deck_uuid`, `explanation`, `position`) VALUES
('axiom-della-1', 'Axiom', 'Della', 'Luiginico', 'Complex', 'Aggro', 'https://altered.re/pages/deck?id=01a191a9-5930-7e22-9c16-54a3bfe550ea', '01a191a9-5930-7e22-9c16-54a3bfe550ea', 'Why the 3 uniques are generic: I was looking for uniques that both
Exhaust cards in reserve, to allow an Axiom deck to have some sort of reactive/defensive cards and allow the Della player to feel like their Hero is doing something powerful, since you can ignore the downside if you want;
Provide some extra benefit for having exhausted cards in play;

We are now on three Tik-Toks who create a Brassbug on arrow, still pretty good but not as annoying as double sabotage.

How does the deck play? 
Classic aggressive Axiom: Play cheap units to steal expeditions in the early-game, then boost the crap out of them in the mid-to-late-game to win expeditions before running out of resources.

Why does it still work with 20% of the cards swapped?
Most of the cards in the deck are generic, swapping a cheap threat for another or swapping a permanent for another will result in basically the same deck, just with a different flavor.

Swappable cards
Axiom Salvager and Hop-o''-my-Thumb can be swapped for basically any other cheap character;

Kelon Cilinder and Axiom Exhibit can be swapped for any Landmark with a Tap ability;
Mothcatcher Wand may be deemed too complex a card for a starter deck, they too can be swapped for any other Landmark with a Tap ability.', 1),
('axiom-isaree-2', 'Axiom', 'Isaree', 'Matmar', 'Medium', 'Buildup', 'https://altered.re/pages/deck?id=01a18d17-0a8c-7849-81c2-d930bc0829bd', '01a18d17-0a8c-7849-81c2-d930bc0829bd', 'Why the 3 uniques are generic : 
The unique reward you for creating tokens, but aren’t essential for create big stats
Any unique that creates aeroliths or rewards the creation of aeroliths will work

The deck : 
A complete deck that will teach new players how to play in all game zones, and which will force them to make decisions about clearing the board at the end of the day.
The aim is to create Aeroliths to make use of the sacrifice effects and build up a large reserve for the following day

Why it still works with 20% of the cards swapped:

I reckon we can swap out several cards without disrupting the archetype, even the Exalted ones.
You can try out the cards you like that have cool reserve effects

I’ve deliberately left out cards with support effects so as not to add complexity to the deck; we can add some Paju for even more Aerolith.

Bonus: you can win by playing a big Lucan. And for a new player, that sense of power will make them want to play another game 😄', 2),
('axiom-isaree-3', 'Axiom', 'Isaree', 'Matata', 'Complex', 'Combo', 'https://altered.re/pages/deck?id=01a1a8ec-8772-752f-9a6f-b17c8584e8af', '01a1a8ec-8772-752f-9a6f-b17c8584e8af', 'Why the 3 unique cards are generic:

They can be replaced by any unique card with a reserve effect wich could be activated by the power of the Foundry. The goal here is to have a good unique when played from reserve but which becomes really good with a minimal hand cost for the same effect with Foundry (or other cards doing the same thing).

How to play the deck (3 to 5 key areas a new player can follow):

The deck''s strategy is to put the Foundry permanent earlier as possible. Don''t hesitate to open with the Foundry on the first turn. Il could be also a Kedarm sometimes, or of course 2 plays like a 1 cost and a 2 cost
the deck works with recursivity with the Ouroboros Incaster and Kedarm sustained by the restocking station. Your gameplan is to abuse of your cards like the fisherman, grems, ... or your uniques for their hand cost with all your foundry''s effects and rebounce them with these two bouncer cards.
This deck is a buildup one so it is sensitive to permanent removals, so sometimes you will prefer to not put the Foundry on board but you have other costless options like Kedarm or Fab lab.
Remember that: only the Foundry could activate 2 reserve effects with a single activation. You could do the same with 2 other activations (like Kedarm + Fab lab, or 2 Fab lab or 2 Kedarm) but i will cost you more ressources.
2 Foundry''s effects can''t be cumulated, either a Foundry effect and a Fab lab/Kedarm effect.

Why the deck remains functional even if you replace 20% of the cards:

Like I said earlier, the structure of the deck is its "Foundry effects" cards (enablers), its bounce cards and its payoff cards (fisherman and uniques above all). But the rest of cards are very swappables depending on the player’s preferences. I also put some ratio that could be discuss like only 2 fisherman or 2 Kedarm.

The 8 interchangeable cards (including 3 rares) that can be removed without altering the core of the deck:

Demolition expert
Axiom Salvager
Tik Tok
Nikola Tesla
Medusa
Boom
Grems
Hooked', 3),
('axiom-isaree-4', 'Axiom', 'Isaree', '[ATP]-Bdbou du Kadigir-David', 'Medium', 'Balanced', 'https://altered.re/pages/deck?id=01a1a1eb-621f-7009-bfbe-7b22500c2fca', '01a1a1eb-621f-7009-bfbe-7b22500c2fca', 'The three "unique" cards allow you to create aerolith tokens, ensuring your reserves remain full. 
They also enable diverse game plans, offering options like removal or ramp.

The goal of the deck is to generate a massive reserve by creating aeroliths, and to use refineries to build up high stats on low-cost cards.', 4),
('axiom-isaree-5', 'Axiom', 'Isaree', 'Keldeofus', 'Medium', 'Buildup', 'https://altered.re/pages/deck?id=01a1ac9c-8f41-7cb0-9ffb-14931caff06b', '01a1ac9c-8f41-7cb0-9ffb-14931caff06b', 'Why the 3 uniques are generic:
One of them create Aeroliths, always useful for Isaree. Another one use a sacrifice to generate boosts per card in reserve. The last one is less generic but give boosts when using Aeroliths.

How the deck plays (3 to 5 lines a new player can follow):
Empty your hand and fill your reserve to gain a lot of boosts thanks to Anansi and Shortage Supervisor.
Generate Aerolith with your hero power, a Pebble in the pond and the feat.
Hop-o''-my-Thumb allows to generate Aeroliths, place the cards you need in your reserve and empty your hand.
Use Deploy the Shield with the Aeroliths and Manaseed from Ira to boosts all your cards.

Why it still works with 20% of the cards swapped:
Tech lab allows to keep the cards in reserve but the deck could work without it cause you usually use your cards in reserve. Avalanche could be switch with other removals. Little Match Girl works with no cards in hand but also fill your hands, good when you really lack of cards.

The 8 swappable cards (3 of them rares) that can leave without losing the deck''s soul:
Tech Lab Unit
The little match girl
Avalanche
Other cards could be swap ( Reka Magnate ; Make it work or others )', 5),
('bravos-gretel-5', 'Bravos', 'Gretel', 'wozow', 'Easy', 'Aggro', 'https://altered.re/pages/deck?id=01a179dc-1ce7-7e60-8998-5e2c55448703', '01a179dc-1ce7-7e60-8998-5e2c55448703', 'Why the 3 uniques are generic:
These uniques are used to provide stats. They can easily be replaced by draw effects or ramp.

How the deck plays (3 to 5 lines a new player can follow):

The goal of the deck is  to play permanents to gain Rust. Activate your Feats to secure an advantage.

Why it still works with 20% of the cards swapped:

The Gretel build is around his feats, you can replace most of the characters and spell of the deck.

The 8 swappable cards : 
-Gather the Pack (R)  can be replace by  Make it Work to play "hands off" 
-Carmela, Fast Striker (C)  can be change by Reka Fixer ( C) to get CA
-Bravos Tracer (C) , we can try The Mess for the CA.', 6),
('bravos-gretel-6', 'Bravos', 'Gretel', 'Paulysh', 'Medium', 'Buildup', 'https://altered.re/pages/deck?id=01a1a8ce-486d-7604-aa82-4e3a5097779a', '01a1a8ce-486d-7604-aa82-4e3a5097779a', 'Why the 3 unique cards are generic:
They can be replaced by any unique card that activates the power of a feat. This is the core gameplay of the deck. If they can boost, that''s a bonus.

How to play the deck (3 to 5 key areas a new player can follow):
The deck''s strategy is to hold out while setting up your feats. To do this, you need to reduce your characters'' Fleeting effect as much as possible to cycle through reserve effects. Finally, you need to successfully anchor your boosted characters.

Why the deck remains functional even if you replace 20% of the cards:
The feats are important but interchangeable. Any character that boosts is usable.

The 8 interchangeable cards (including 3 rares) that can be removed without altering the core of the deck:
Fire Rabbit
Ozma
Spirit Wielder
Catch of the Day
Reka Fixer
Spry Scout
The Last Stand', 7),
('bravos-gretel-7', 'Bravos', 'Gretel', 'Nyleirel', 'Easy', 'Aggro', 'https://altered.re/pages/deck?id=01a05e35-ac29-7f89-84db-a1e743498bbd', '01a05e35-ac29-7f89-84db-a1e743498bbd', 'Why the 3 uniques are generic:
These uniques trigger on char gaining Fleeting. You can swap them for CA, flat boosts, or Feat triggering effects

How the deck plays:

The goal is to have a burst of stats, either from the feats (Hold the Line, Rust) or through the uniques giving out boosts when a character gains fleeting

Why it still works with the cards swapped:

This build relies on keeping characters on the board despite having multiple gaining Fleeting naturally, through Aoifes, Protect the Assets, Helping Hand...You can prefer not having those on the board and rather play non fleeting cards or anchoring them

The 8 swappable cards : 
-Protect the Assets can be switch for Gather the Pack or Muna Botanist to keep char on the board 
-Aoife and Spry Scout can be swapped for CA cards (Fixer, Priya)
-Raksha R can be swapped for Mighty Djinn, for CA', 8),
('bravos-sol-8', 'Bravos', 'Sol', 'wozow', 'Medium', 'Combo', 'https://altered.re/pages/deck?id=01a18e1b-68a3-70ea-a148-99843a026de6', '01a18e1b-68a3-70ea-a148-99843a026de6', 'Why the 3 uniques are generic: 
The deck need unique to ramp  for reaching 10 mana earlier in the game!  I play a unique Reka Pedler that has the ability to rush from the reserve while keeping its boosts and removing "fleeting."

How the deck plays (3 to 5 lines a new player can follow):
The goal of this deck is to ramp up to 10 or more mana. Once this objective is reached, you should aim to set up the Mask + Noot combo, applying 7 boosts to the Noot to end the turn and secure a 2-0 victory with the help of Halua.

Why it still works with 20% of the cards swapped:
The deck''s strategy is based on simple principles: playing quickly, ramping, and drawing cards to find your combo.

The 8 swappable cards (3 of them rares) that can leave without losing the deck''s soul:
-Stigma of Cowardice is a card for Sol. It helps make completing the quest easier.
-Halua, Raging Leviathan can be used in the late game to generate card advantage.
-Jumping Frog  is a filler to get some cost 1.
-Hold the Line!   its condition can be tricky to fulfill.', 9),
('bravos-sol-9', 'Bravos', 'Sol', 'Paulysh', 'Easy', 'Aggro', 'https://altered.re/pages/deck?id=01a1a87e-148c-7992-9c81-641084e333be', '01a1a87e-148c-7992-9c81-641084e333be', 'Why the 3 unique cards are generic:
They can be replaced by any unique cards that allow you to skip your turn. If they provide boosts, it''s a bonus for encouraging combos and player progression.

How to play the deck (3 to 5 strategies a new player can follow):
Play with your Halua using cards that allow you to skip your turn and rush cards. Boost your gigantic Halua. Play aggressively with high stats.

Why the deck remains functional even if you replace 20% of the cards:
The core of the deck is based on the rush and pass mechanics and the maneuverability of the cards (low cost). Many cards can therefore be changed as long as this principle is respected.

The 8 interchangeable cards (including 3 rare ones) that can be removed without altering the core of the deck:
Bravos Pathfinder
Catch of the Day
Parliament of Ashes
Issun-boshi
Tengu
Bravos Harpooner
The Shell
Helpful Diver', 10),
('bravos-sol-10', 'Bravos', 'Sol', 'Cernnunos', 'Medium', 'Aggro', 'https://altered.re/pages/deck?id=01a19cc0-ad24-7360-bc50-702dbccfa8e5', '01a19cc0-ad24-7360-bc50-702dbccfa8e5', 'Why the 3 uniques are generic: 
The uniques aren''t that important in the deck. I choose some low cost that draws and one big halua that feels like "Sol''s ace character". You can easily put other uniques.

How the deck plays : 
Sol loves to pass first, so the deck got a lot of tools to do it. Nephele and Stigmata of cowardice being the best options to do so. The stigmata being also the center of the deck, in early game it allows to build easily Sol''s power, and in late you can juste start your turn with it and play rush card into rush card when your opponent passed, or just plays some "removals".
The deck isn''t really subtile, your goal is to create pile of stats that your opponent won''t be able to overcome. 
And don''t sleep on "Hold the line" if you can accomplish it : your halua will be bigger !

The "core" of the deck revolve around Stigmata of cowardice. So as long you keep some 2 mana rush card and stat burst at 2 or 1 mana, the deck will keep it''s flavor.

Card you can swap out :
Cuckoo : the easy boost it can provide are good to accomplished Hold the line, but another card can fit in that role.
Priya : the deck got already 2 must have 4 cost (Nephle and Stigmata), priya can bit a bit too much, something at a lower cost can be a good option.
Halua : despite being "THE boss monster" of a Sol deck, it''s a card "high risk/ high reward" if you don''t like it, you can avoir it. (but be carefull to add a way to draw instead : lowering the mana cost of your deck is dangerous without a lot of draw)', 11),
('lyra-nadir-11', 'Lyra', 'Nadir', 'Nyleirel', 'Medium', 'Balanced', 'https://altered.re/pages/deck?id=01a18c85-195c-73cf-a978-6a4c5a5a38cc', '01a18c85-195c-73cf-a978-6a4c5a5a38cc', 'Hero : Nadir
Difficulty : Medium (but Nadir by itself can already be a bit to control) 
Archetype : Balanced
decklist : https://altered.re/pages/deck?id=01a18c85-195c-73cf-a978-6a4c5a5a38cc

Why the 3 uniques are generic:

The uniques are here for CA and allow the boost(s) gain for Anansi and Magpeng. Any card that can draw and/or add a card in reserve is good to go. 

Why it still works with the cards swapped:
You can focus more on one biome or another. Magpeng / Anansi / Signet can be stats spikes but they require resources in reserve than you might not have and prefer to focus on flat stats from hand

The 8 swappable cards : 
Martengale (eg: for Bassist)
Djinn (good in early but less in mid/late game)
Magpeng or Wisp
Control cards (Zou, Requiem) can be traded for other gestions, according to the facing deck', 12),
('lyra-nadir-12', 'Lyra', 'Nadir', 'Nefenrhys', 'Medium', 'Balanced', 'https://altered.re/pages/deck?id=01a18e77-d606-7e49-a63d-6d4d2d17933c', '01a18e77-d606-7e49-a63d-6d4d2d17933c', 'Why the 3 uniques are generic:

This deck specializes in Forest and Mountain biomes. It''s possible to play without the Ocean biome thanks to Nadir''s ability. Biome management is the deck''s main focus.

The challenge is to achieve the mono-water biome. This will require replacing it with a Nadir biome, or using more technical cards like Diocles or the Station.

Why it still works with 20% of the cards swapped:

The deck blocks the opponent in Forest and Mountain and advances through these biomes. The chosen cards have good stats relative to their cost, but it''s possible to replace them with effect cards that have decent stats in the two main biomes.

The 8 swappable cards : 
Reka Ropedancer
Martengale
Nyala (R)', 13),
('lyra-nadir-13', 'Lyra', 'Nadir', 'Elwiwi', 'Complex', 'Control', 'https://altered.re/pages/deck?id=01a196d6-876e-7d6e-8201-c99db5fe9eb5', '01a196d6-876e-7d6e-8201-c99db5fe9eb5', 'This Nadir deck is a Control + Card Advantage build, focused on controlling card draw and Expedition biomes.

The common cards are generally flexible, with 3 Contortionists and the Will-o''-the-Wisps being easy to replace, alongside 1 Djinn, 1 Tag and 1 Requiem in the rare slots.

It''s a complex deck with a very high skill ceiling, but surprisingly easy to pick up, even for beginners, as it relies on Lyra''s core mechanics.

The deck offers huge room for improvement as players learn to optimize their decisions and resource management.

The 3 uniques should focus on card draw and moving cards into reserve, reinforcing Nadir''s core strategy without locking the deck into a single game plan.', 14),
('lyra-yeong-gi-14', 'Lyra', 'Yeong-gi', 'Beneko', 'Medium', 'Buildup', 'https://altered.re/pages/deck?id=01a18bd4-8558-7366-b011-b426944cd209', '01a18bd4-8558-7366-b011-b426944cd209', 'One of the decklist we worked the most with Lyra friends. 

Strength :
The strong point of this decklist is to always keep body on board with resupply effect in order to have a strong CA.
Kodama able to anchor itself
Cat''s Cradle in order to adjust your boad according to the biome/opponent
Great CA ( Sloth, Qorgan Phantom, Aloe Vera, Parliament of ashes)
a well-distributed statistic

Weakness :
Possibility to quick lose your board if you fail your hero power on the bad moment.
Kodama and Sloth can be useless in endgame (if in hand) due to sleep effect if you just need stats.

The Mia unique will have 2 benefits:
be able to anchor 2 body (with the unique effect and the :discard: )
give boost to your anchor body and be able to adapt according your opponent turn. (and be less sensitive to direct attack on your unique)

Many change can be performed on the deck according to you preferences like :
Sap 
Clot cocon
Bastet
Skunk 
Qorgan 
...

Hope it will help you to have fun With our GOAT Yeong-gi', 15),
('muna-kauri-15', 'Muna', 'Kauri', 'Matata', 'Medium', 'Balanced', 'https://altered.re/pages/deck?id=01a1aaff-d5f5-7aa4-9033-37eea3692703', '01a1aaff-d5f5-7aa4-9033-37eea3692703', 'Why the 3 unique cards are generic:

They can be replaced by another uniques which make the opponent exhausted resuply (it works with simple resupply but it''s a better gift to your opponent) 

How to play the deck (3 to 5 key areas a new player can follow):

the goal of the deck is to do a lot of false gifts to your opponent in return to which you have a big amount of stats. Don''t hesitate to abuse of these gifts when you have payoff on board (Picnic areas, Gran Bwa, Noosh)
Your permanent "Picnic area" is here to increase these stats, so more you put it on the board earlier, more it will rewards you.
Your key cards are the burrowing noosh, the Gran Bwa. Try to abuse of them by anchoring them befor the end of the day, and they will increase with the natural draw of your opponents the next morning. The noosh could be anchored with your botannists and your Reka agronomist unique.
Your sap duende is here to steal the boosts from an opponent character, but also to switch boosts between two of your own characters.

Why the deck remains functional even if you replace 20% of the cards:

This deck works with enablers and payoff which are very identified. The enablers give an exhausted resupply wherease your payoff increase your board presence with these gifts.
But some other cards are here to bring other game plan. These cards could easily be replaced.

The 8 interchangeable cards (including 3 rares) that can be removed without altering the core of the deck:

Jack Frost
Lost in woods
Requiem
Colorfull Cuckoo
the rabits could be past in common to offer some other possibilities (like soar)
Sap Duende
You could cut Gran Bwa to reduce the cost of your deck (but it''s a good card in the deck)
You could switch rarities for the botannists too but you will do better gifts (but it''s possible !)', 16),
('muna-kauri-16', 'Muna', 'Kauri', 'Cernnunos', 'Easy', 'Aggro', 'https://altered.re/pages/deck?id=01a18bf6-9c65-708c-be23-6ef9990fe8aa', '01a18bf6-9c65-708c-be23-6ef9990fe8aa', 'Why the 3 uniques are generic : 
The important things about those uniques it''s to create tokens or boost all your character. those 2 effect are pretty common. You can also focus on draw effect if you prefere.
The 3 I chose got boost + draw, token + boost and draw + token, to show what the deck need in general.

How the deck plays : 
This deck is about having a lot of character on the board, Kauri''s power will make you draw naturally so use this advantage to have a lot of small character on the board ! This kind of strategy can give you a bit of advance in the early game, Be carefull, in the later, it won''t be enough to win ! But you can count on the townhall and some of your uniques to boost your littles guys to create a powerfull army !

The deck is not really fixed, you can try other card to make it works ! The global strategy is simple, need small character, need some draw to not exhaust yourself and need some boost. You can easily swap a card for something that fill the same role. (some exemple below)

Cards you can swap out : 
Corrupted Jeanne, even if she''s a power full way to constently have character on you board, she can be a bit hard to play in the early game, so if don''t like it, don''t hesitate to change it for another option. (card with the anchored mechanics works also well)
Soul Encounter, the spell is strong because it''s flexible, but it''s not something that fit totally the global idea of the deck. 
Bumblebeet, one of the small character of the deck you can swap out for another, the card is nice but won''t be really do much in a lot of cases, so feel free to try others character instead.', 17),
('muna-turuun-17', 'Muna', 'Turuun', 'Vader_MIB', 'Easy', 'Buildup', 'https://altered.re/pages/deck?id=01a1a361-980d-79d3-8c7c-67d51a889277', '01a1a361-980d-79d3-8c7c-67d51a889277', 'Uniques : 5 mana giga Sons of Naos with ramp. I chose the draw gift over resupply or create mana seed because it''s a little bit better if some cards are not resupplied and giving mana seed is, against this deck that gifts cards, a threat worse than draw.

I really like referees for their versatility and opportunity to remove everything, even bug strong perma. However, they could be swapped as they are still expensive. 
Skunks could replace them to be able to shoot a Son of Naos T2 when you got no sustenance.
Update : replacement of dapengs by skunks, it''s better.

Swappable commons : probably kitsunes (for foxes ?), Muna caregivers also.

Here''s a take on Turunn that enables to show up Ploutos, who, once set up, is quite oppressive.', 18),
('muna-turuun-18', 'Muna', 'Turuun', 'Laujhik', 'Complex', 'Combo', 'https://altered.re/pages/deck?id=01a1a086-7e10-71ea-895c-566c55c5c1db', '01a1a086-7e10-71ea-895c-566c55c5c1db', 'Why the 3 uniques are generic : 
The important things about those uniques are that they help with ramp (reduction cost from reserve here) or they can be used as after you. In this deck, the ones I chose are draw effects and token spawn in the opponent''s expedition to help with the stats stabilization for the pegasus effect. It can also be use with Turuun''s effect to spawn a token in your expedition to fight for an expedition.

How the deck plays : 
This deck is about ramping enough to be able to play around the opponent, stabilizing the stats in every expedition to win with a pégasus that will ascend both of your expeditions. In the early game, the deck needs to slow the game down and set up your plan with ramp and draw. Turuun is the best hero to do so, as it can optimize most of the important cards to draw more or balance the stats with token copies.

The deck also has a lot of stats ( Daughter of Yggdrasil, raksha…) and can win with the expedition if the opponent is too slow.

To optimize the deck, beauty sleep is obviously a card worth considering but not in the original deck because of the ban.

Key cards : 
Naos: you want to set one or two as soon as possible, it gives you everything you want.
Pegasus: your most important win condition.
Soar: best after you of the deck, helps with your cuckoos and your early expedition.

Cards you can swap out : 

Resentful Robin : Any one-drop with small stats like rabbit farmer (rare mostly) or bumblebeet could be used to help early game and balance the stats later for the winning turn.
Kauri intervention : Other 1 mana spells could be use as after you. 
Mana channeling: can be swapped if you want to fight more for the expedition and be more dépendent on your naos for the setup.', 19),
('muna-turuun-19', 'Muna', 'Turuun', 'Luiginico', 'Medium', 'Balanced', 'https://altered.re/pages/deck?id=01a19c24-09b0-7940-b9e0-bf62f383f909', '01a19c24-09b0-7940-b9e0-bf62f383f909', 'Why the 3 uniques are generic: Some people will tell you that Turuun needs a unique Loki to function, I disagree, it doesn''t matter how many cards you give to your opponent if your have more 1-drops than them.
Some generic -> Each player draws a card will work well in any Turuun deck.

How does the deck play?
Fill both player''s hands with cards then either:
Gain a lot of value with Grand Bwa and/or Burrowing Noosh if you think your opponent is not running enough removal
Play a bunch of value-1-drops if you think your opponent is not playing enough characters.

Why does it still work with 20% of the cards swapped?
Both Muna in general, and the list of "gift" cards in particular, is plentiful with good, efficient, powerful cards that any deck can make use of, I can see this very deck working in the exact same way with even 50% of the cards swapped.

Swappable cards:
All of the 1-drops can be swapped for other 1-drops (except Rabbit Farmer): The Ugly Duckling is going to be good here, Soar is going to be good here, Floral Tent is going to be good here etc...
Kitsune and Reka Gatherer can be swapped for any of the Seeds of Unity cards that generate different kinds of gifts;
Smoking Skunk is here to provide a small speedbump to removal-heavy decks, it can be swapped for any tech/splashy rare, like Loki;
Newton''s Law can be swapped for Mana Reaping or any other form of removal', 20),
('muna-kauri-21', 'Muna', 'Kauri', 'Matata', 'Easy', 'Aggro', 'https://altered.re/pages/deck?id=01a1ac90-fe4b-7db5-bd3d-f59f6fb883b7', '01a1ac90-fe4b-7db5-bd3d-f59f6fb883b7', 'Why the 3 unique cards are generic:

We search here uniques with Pasiphae effect. Indeed, Kauri put a token in opponent companion expedition once every 2 turns. So this deck search to turn that in an advantage for the Kauri player. You search to have a maximum of Pasiphae in the deck (3 Pasipahae herself and 3 uniques which do the same kind of powerfull things)

How to play the deck (3 to 5 key areas a new player can follow):

The deck''s strategy is to rush, so you have to take advantage quickly because if the game is during to long you will certainly miss gaz.
Your strategy consist to put some woolybacks on the opponnent field, take a lot of after you with some little plays and put a Pasiphae or a unique to take expeditions. Your gargoyles, soars and ducks will help with the ascend capacity.
The better advise that I could give is to go forward, even if the opponnent try to stop as well as he/she can. Don''t stop the agression.
Don''t hesistate to do some token gifts at your opponent.

Why the deck remains functional even if you replace 20% of the cards:

The deck DNA is the agression. If you replace some cards without change its DNA it is all good. You need to keep all the cards which give some tokens, all the very overstated characters (Pasiphae and uniques) and some ascend capacities to take expeditions by surprise.
But for the rest of the cards, it depends on the player''s preference. The only rule is to keep a low curve of mana to keep the deck aggressive.

The 8 interchangeable cards (including 3 rares) that can be removed without altering the core of the deck:

Raksha
Drawsy dodo
Colorfull cuckoo (you don''t necessary need this card in 3 copies but it''s a good card to endure the gifts of  tokens
The Ugly Duckling could be replace by other cards like Smoking Skunk or the ascended trooper for exemple', 21),
('ordis-matz-20', 'Ordis', 'Matz', 'Luiginico', 'Medium', 'Buildup', 'https://altered.re/pages/deck?id=01a1a63b-e091-73da-a09e-173bcfc36131', '01a1a63b-e091-73da-a09e-173bcfc36131', 'Why the 3 uniques are generic: 
Most landmarks now require you to exhaust them to use their ability, so having some cool uniques to ready them is pretty cool, also, Matz doesn''t care too much about a resupply, since it has so many Landmarks in the deck.

How the deck plays?
The deck is called "The Obvious Thing" because the goal of the deck is incredibly straightforward: just use your hero ability ASAP and get a The Reunion in play ASAP.

Why it still works with 20% of the cards swapped:
The best part about Matz is the versatility, any and all Landmarks can be swapped for other landmarks with the same cost, any and all the characters can be swapped for other curve-filler and/or set-up helpers.

Swappable cards:
Reka Investor can be swapped with any Manaseed/Aerolith generators
Aegis Templar is just a powerful 1-drop, can be swapped for any other cheap character
Most Matz players have already abandoned Astrape with the release of Roots, I haven''t, you can
Armored Jammer is a double sabotage card, can be swapped for Aerolith Reef', 22),
('ordis-zhen-21', 'Ordis', 'Zhen', 'noobiwow', 'Medium', 'Balanced', 'https://altered.re/pages/deck?id=01a0c018-2e74-778e-a5d6-320190de3491', '01a0c018-2e74-778e-a5d6-320190de3491', 'Why are the 3 uniques generic?
The deck mainly needs two unique effects: Mana Seed generation and card draw. Mana Seeds let Zhen place stats or Elevation on either expedition to keep pressure on both sides. In this deck any unique that creates Mana Seeds or benefits from Elevation without requiring a specific expedition or condition will work.

How does the deck play? 
Play aggressively early using Elevation and Cable Car Station for card draw in early turns and putting pression on opponent by winning expeditions. Then either keep pushing your lead or shift into a more reactive game plan with Sabotage. The uniques provide extra stats, after you or card advantage to support both plans.

Why does it still work with 20% of the cards swapped? 
The deck''s core comes from the newest sets. Older cards are flexible and can be replaced with more aggressive or controlling options without changing the strategy or the spirit of the deck.

Swappable cards
Tiny Jail can be replaced by Strategic Deployment or any other spell that deals with characters already in play.
Melusine and Adamant Receptionist can be swapped for the Gargoyles if you want to make the deck more aggressive.
Seeker Howl is mainly included to enable stronger aggressive turns and can easily be replaced with a more generic option.
Astrape is more of a gimmick in this list and can also be replaced with a more consistent card, such as one with an Elevation or card draw effect.', 23),
('ysmir-moyo-22', 'Ysmir', 'Moyo', 'Yutsa', 'Complex', 'Control', 'https://altered.re/pages/deck?id=01a18933-c42c-7ddc-9def-6dc96b6c686e', '01a18933-c42c-7ddc-9def-6dc96b6c686e', 'The 3 uniques are generic to every Moyo build. They provide card advantage and value when playing 4+ spells which is what Moyo wants to do

How to play : 

The deck wants to play the control gameplan, with powerfull 4 cost spells that discard. You also have conjuring seal to get a lot of cards in hand. The decks wants to have some "after you" then discard powerful cards while creating a Moth token with Moyo''s power.

The uniques are here to help in the midgame, if you can play a unique and play a 4 cost spell, especially if you do it day 3 (5 mana) with the help of a mana seed or a reduce cost in reserve it can be a powerful turn to do a 2-0.

In late game you have 2 powerfull 7 cost spells, one that is on the discard side and the other which is focused on creating a lot of moths tokens. Maleros can be a powerful way to make an additional after you while putting up some stats. Flutter of Moths can be played cheaply with The infirmary and a Rime Frost.

Also having Maleros and Finisher is cool and thematic to Moyo even if it''s not the most powerful play', 24),
('ysmir-sam-23', 'Ysmir', 'Sam', 'LuigiPoliakoff', 'Complex', 'Control', 'https://altered.re/pages/deck?id=01a1893e-3129-702d-993c-f06802de4564', '01a1893e-3129-702d-993c-f06802de4564', 'The deck is quite complex to master but surely easy to learn as the goal is first to unlock the hero''s ability, playing cards that fill the reserve while fueling the hand. Beginners will surely follow this principles to learn the deck.

The list also emphasizes on cards that look terrible in hand (stargazer) but are strong from reserve, and include some resupply effects in addition to the draw-discard core.

Once done, benefit from after you support effects in reserve to react to your opponent''s plays, then try to surprise them with strong burst (removal or stagnation stigma). The key is to know what card to discard with Sam depending on the situation.

The 3 uniques showcase 3 different Sam''s playstyle hence are versatile: either boost distribution when discarding cards, either strong burst if discarding your whole hand, either some hero power enabler.

Swappable cards are legion: the weaker ones (stargazer, spycraft) and the good ones but quite universal (reka supporter, baba yaga), including questionnable rare slots (greater good is sufficient in common, rare stigma, skarabru).', 25)
ON DUPLICATE KEY UPDATE `faction` = VALUES(`faction`), `hero` = VALUES(`hero`), `author` = VALUES(`author`), `difficulty` = VALUES(`difficulty`),
    `archetype` = VALUES(`archetype`), `url` = VALUES(`url`), `deck_uuid` = VALUES(`deck_uuid`), `explanation` = VALUES(`explanation`), `position` = VALUES(`position`);
