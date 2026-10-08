-- docker-compose.ownership.yml: the players of the stack's realm (docker/stack/players-realm.json) in the real
-- AlteredOwnership service, once its migrations ran. Idempotent: run on every start, resets their mode, ownership and
-- default alt arts.
--
-- alice: « Global » mode (the site switches it to « par deck » on her next visit and marks her decks to receive her
-- default alt arts). bob: « par deck » already. Both own the same Axiom alt arts, in various quantities, and have the
-- same default alt arts.
-- Most MUSUBI prints (Fée Clochette, Prestidigitatrice de l'Ouroboros, Le Roi-Grenouille…) are everyone's in unlimited
-- quantity: they need no ownership row.

INSERT INTO "Users" ("Id", "KeycloakId", "CreatedAt", "AltArtPreferenceMode")
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', now(), 'Global'),
       ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', now(), 'PerDeck')
ON CONFLICT ("KeycloakId") DO UPDATE SET "AltArtPreferenceMode" = EXCLUDED."AltArtPreferenceMode";

DELETE FROM "CardOwnerships" WHERE "UserId" IN ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
INSERT INTO "CardOwnerships" ("UserId", "CardReference", "Quantity", "IsUnique")
SELECT u.id, ref, qty, false
FROM (VALUES ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('aaaaaaaa-0000-0000-0000-000000000002'::uuid)) AS u(id),
(VALUES
  ('ALT_ALIZE_A_AX_35_C', 2),   -- Vaike, l'Énergéticienne: 2 of 3 copies
  ('ALT_BISE_A_AX_56_C', 3),    -- Icare: a full playset
  ('ALT_CORE_A_AX_22_C', 1),    -- Entraînement Mécanique: 1 copy
  ('ALT_CYCLONE_A_AX_74_C', 2), -- Lucan, Léviathan Affamé
  ('ALT_CYCLONE_A_AX_76_C', 1), -- Sceau Axiom
  ('ALT_EOLECB_A_AX_106_C', 1), -- Salamandre Furtive (Evil Eye)
  ('ALT_ALIZE_A_AX_46_C', 3),   -- Galeries Saisies par les Glaces
  ('ALT_CORE_P_AX_01_C', 1),    -- Sierra & Oddball, promo hero
  ('ALT_WCS25_P_AX_01_C', 1),   -- Sierra & Oddball, WCS 2025 hero
  ('ALT_WCS26_A_AX_31_C', 1),   -- Scarabot token, WCS 2026
  ('ALT_MUSUBI_B_AX_30_R1', 1)  -- Ruche des Scarabots, MUSUBI 2.0 (a tracked MUSUBI print)
) AS owned(ref, qty);

-- Default alt arts (1st, 2nd, 3rd copy). Fée Clochette: the MUSUBI print for the first two copies.
DELETE FROM "UserCardArtPreferences" WHERE "UserId" IN ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
INSERT INTO "UserCardArtPreferences" ("UserId", "FamilyId", "Faction", "Rarity", "SlotIndex", "PreferredReference")
SELECT u.id, f.family, f.faction, f.rarity, f.slot, f.ref
FROM (VALUES ('aaaaaaaa-0000-0000-0000-000000000001'::uuid), ('aaaaaaaa-0000-0000-0000-000000000002'::uuid)) AS u(id),
(VALUES
  (64,  'AX', 'C', 1, 'ALT_ALIZE_A_AX_35_C'),
  (64,  'AX', 'C', 2, 'ALT_ALIZE_A_AX_35_C'),
  (165, 'AX', 'C', 1, 'ALT_BISE_A_AX_56_C'),
  (165, 'AX', 'C', 2, 'ALT_BISE_A_AX_56_C'),
  (165, 'AX', 'C', 3, 'ALT_BISE_A_AX_56_C'),
  (304, 'AX', 'C', 1, 'ALT_MUSUBI_B_AX_09_C'),
  (304, 'AX', 'C', 2, 'ALT_MUSUBI_B_AX_09_C'),
  (69,  'AX', 'C', 1, 'ALT_CORE_P_AX_01_C')
) AS f(family, faction, rarity, slot, ref);
