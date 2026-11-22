import { addBlockedReason, allowedInFormat, listed, maxCopiesFor, rarityLimits, uniqueLimit, type FormatRules } from './format-rules';

const rules = (patch: Partial<FormatRules> = {}, limits: Partial<FormatRules['limits']> = {}): FormatRules => ({
  code: 'standard',
  label: 'Standard',
  minCards: 39,
  maxCards: 59,
  allowBanned: false,
  allowSuspended: false,
  limits: { unique: 3, rare: 15, exalted: 3, maxCopiesPerName: 3, maxCopiesPerRarity: null, ...limits },
  sets: { allowed: ['CORE', 'ALIZE'], forbidden: ['FUGUE'] },
  bannedCards: [],
  suspendedCards: ['BR_34_C', 'OR_27_R1', 'AX_17'],
  uniqueAllowlist: null,
  ...patch,
});

describe('format rules (GET /api/formats)', () => {
  it('caps the copies of a card by family and rarity, a Unique at 1, none without rules', () => {
    expect(maxCopiesFor({ reference: 'ALT_CORE_B_AX_04_C' }, rules())).toBe(3);
    expect(maxCopiesFor({ reference: 'ALT_CORE_B_AX_04_C' }, rules({}, { maxCopiesPerRarity: 1 }))).toBe(1);
    expect(maxCopiesFor({ reference: 'ALT_CORE_B_AX_04_U_3' }, rules())).toBe(1);
    expect(maxCopiesFor({ reference: 'ALT_CORE_B_AX_04_U_3' }, rules({}, { unique: 0 }))).toBe(0);
    expect(maxCopiesFor({ reference: 'ALT_CORE_B_AX_01_C', cardType: { reference: 'HERO' } }, rules())).toBe(1);
    expect(maxCopiesFor({ reference: 'ALT_CORE_B_AX_04_C' }, null)).toBe(99);
  });

  it('matches ban-list entries by reference, family or family + rarity', () => {
    expect(listed(['BR_34_C'], 'ALT_ALIZE_A_BR_34_C')).toBe(true);
    expect(listed(['OR_27_R1'], 'ALT_CORE_B_OR_27_R2')).toBe(false);
    expect(listed(['AX_17'], 'ALT_CORE_B_AX_17_R1')).toBe(true);
    expect(listed(['ALT_CORE_B_AX_04_U_3'], 'ALT_CORE_B_AX_04_U_3')).toBe(true);
  });

  it('leaves out of the search the cards a format refuses', () => {
    expect(allowedInFormat({ reference: 'ALT_CORE_B_AX_04_C' }, rules())).toBe(true);
    expect(allowedInFormat({ reference: 'ALT_FUGUE_B_AX_04_C' }, rules())).toBe(false);
    expect(allowedInFormat({ reference: 'ALT_EOLE_B_AX_04_C' }, rules())).toBe(false);
    expect(allowedInFormat({ reference: 'ALT_CORE_B_BR_34_C' }, rules())).toBe(false);
    expect(allowedInFormat({ reference: 'ALT_CORE_B_BR_34_C' }, rules({ allowSuspended: true }))).toBe(true);
    expect(allowedInFormat({ reference: 'ALT_CORE_B_AX_04_U_3' }, rules({ uniqueAllowlist: ['ALT_CORE_B_AX_04_U_4'] }))).toBe(false);
    expect(allowedInFormat({ reference: 'ALT_FUGUE_B_AX_04_C' }, null)).toBe(true);
  });

  it('says why a Unique cannot be added where the format has none', () => {
    expect(addBlockedReason({ reference: 'ALT_CORE_B_AX_04_U_3' }, rules({}, { unique: 0 }), 'NUC')).toBe('Cartes uniques interdites en NUC');
    expect(addBlockedReason({ reference: 'ALT_CORE_B_AX_04_C' }, rules(), 'NUC')).toBeNull();
  });

  it('reads the Uniques allowed by hero, and the rarity caps', () => {
    const singleton = rules({ uniqueLimitsByHero: { '3': ['teija'], '5': ['sierra'] } }, { unique: null, rare: null, exalted: null });
    expect(uniqueLimit(singleton, 'Sierra')).toBe(5);
    expect(uniqueLimit(singleton, 'Inconnu')).toBe(3);
    expect(rarityLimits({ R: 2, E: 0, U: 4 }, singleton, 'Sierra')).toEqual([{ key: 'U', count: 4, limit: 5 }]);
    expect(rarityLimits({ R: 2, E: 1, U: 0 }, rules())).toEqual([
      { key: 'R', count: 2, limit: 15 },
      { key: 'E', count: 1, limit: 3 },
      { key: 'U', count: 0, limit: 3 },
    ]);
    expect(rarityLimits({ R: 2, E: 1, U: 0 }, null)).toEqual([]);
  });
});
