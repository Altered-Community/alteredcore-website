import type { DeckFormat } from './models';

/**
 * How the formats are presented (label, descriptions, Board Game Arena availability, badge). Their rules (sizes,
 * limits, ban lists, sets) come from the decks API (`GET /api/formats`, `FormatsService`), and a deck's legality from
 * the decks API only (`deck-legality.ts`).
 */

export type BgaAvailability = 'available' | 'arena' | 'unavailable';

export interface FormatInfo {
  value: DeckFormat;
  label: string;
  /** Long description (création). */
  description: string;
  /** Short description (réglages). */
  short: string;
  bga: BgaAvailability;
  /** Offered only to the BGA test team (`visibleFormats`). */
  hidden?: boolean;
  badgeTone: 'blue' | 'violet' | 'neutral';
}

export const DECK_FORMATS: readonly FormatInfo[] = [
  {
    value: 'standard',
    label: 'Standard All Uniques',
    description: $localize`:@@format.standard.description:39 à 59 cartes · 3 uniques maximum`,
    short: $localize`:@@format.standard.short:39 à 59 cartes · 3 uniques max.`,
    bga: 'available',
    badgeTone: 'blue',
  },
  {
    value: 'frontier',
    label: 'Frontier',
    description: $localize`:@@format.frontier.description:39 à 59 cartes · uniques de la liste Frontier`,
    short: $localize`:@@format.frontier.short:39 à 59 cartes · uniques de la liste Frontier`,
    bga: 'arena',
    badgeTone: 'violet',
  },
  {
    value: 'nuc',
    label: 'Standard No Unique',
    description: $localize`:@@format.nuc.description:39 à 59 cartes · sans cartes uniques`,
    short: $localize`:@@format.nuc.short:39 à 59 cartes · sans uniques`,
    bga: 'available',
    badgeTone: 'blue',
  },
  {
    value: 'singleton',
    label: 'Singleton',
    description: $localize`:@@format.singleton.description:59 à 79 cartes · 1 exemplaire par carte · 3 à 5 uniques selon le héros`,
    short: $localize`:@@format.singleton.short:59 à 79 cartes · 1 ex. par carte`,
    bga: 'unavailable',
    badgeTone: 'blue',
  },
  {
    value: 'singleton_nuc',
    label: 'Singleton No Unique',
    description: $localize`:@@format.singletonNuc.description:59 à 79 cartes · 1 exemplaire par carte · sans uniques`,
    short: $localize`:@@format.singletonNuc.short:59 à 79 cartes · 1 ex. par carte · sans uniques`,
    bga: 'available',
    badgeTone: 'blue',
  },
  {
    value: 'sandbox',
    label: 'Sandbox',
    description: $localize`:@@format.sandbox.description:4 à 100 cartes · aucune contrainte`,
    short: $localize`:@@format.sandbox.short:4 à 100 cartes · aucune contrainte`,
    bga: 'available',
    badgeTone: 'neutral',
  },
  {
    value: 'test',
    label: 'Test',
    description: $localize`:@@format.test.description:4 à 100 cartes · format de test BGA`,
    short: $localize`:@@format.test.short:4 à 100 cartes · format de test BGA`,
    bga: 'unavailable',
    badgeTone: 'neutral',
    hidden: true,
  },
];

/**
 * Sets and whether Board Game Arena has them (`sets[].bgalegal` of the site's `altered.json`): the « BGA » tag of a hero
 * (`heroOnBga`). Which sets a format allows comes from the decks API (`FormatRules.sets`).
 */
export const BGA_SETS: Readonly<Record<string, boolean>> = {
  CORE: true,
  COREKS: true,
  ALIZE: true,
  BISE: true,
  CYCLONE: true,
  DUSTER: true,
  DUSTEROP: true,
  DUSTERTOP: true,
  DUSTERCB: true,
  EOLE: true,
  EOLEOP: true,
  EOLETOP: true,
  EOLECB: true,
  FUGUE: false,
  TCS3: true,
  WCQ25: true,
  WCF25: true,
  WCS25: true,
  JUDGE: true,
  MUSUBI: true,
  WCS26: true,
};

/** A hero is on Board Game Arena when one of its prints is of a set BGA has (the site's hero picker badge). */
export function heroOnBga(references: readonly string[]): boolean {
  return references.some((ref) => BGA_SETS[ref.split('_')[1] ?? ''] === true);
}

/**
 * BGA tag of a format in the format choice: « Héros indispo. BGA » over an available format when the chosen hero is
 * not on BGA (the site's format pills follow the hero).
 */
export function bgaTag(info: FormatInfo, heroUnavailable: boolean): { label: string; tone: 'green' | 'violet' | 'red' } {
  const base = BGA_LABEL[info.bga];
  if (heroUnavailable && info.bga !== 'unavailable') return { label: $localize`:@@format.bga.heroUnavailable:Héros indispo. BGA`, tone: 'red' };
  return { label: base.short, tone: base.tone };
}

/** The site's opt-in page for the BGA test team (`/pages/bgatester`) sets this flag. */
export const BGA_TESTER_KEY = 'bgatester';

/** The formats offered in the pickers and filters: the hidden `test` format only for the BGA test team, as on the site. */
export function visibleFormats(): readonly FormatInfo[] {
  let tester = false;
  try {
    tester = localStorage.getItem(BGA_TESTER_KEY) === 'true';
  } catch {
    tester = false;
  }
  return DECK_FORMATS.filter((f) => !f.hidden || tester);
}

export function formatInfo(format: DeckFormat | string | null | undefined): FormatInfo {
  return DECK_FORMATS.find((f) => f.value === format) ?? DECK_FORMATS[0];
}

export const BGA_LABEL: Record<BgaAvailability, { long: string; short: string; tone: 'green' | 'violet' | 'red' }> = {
  available: { long: $localize`:@@format.bga.available:BGA : disponible`, short: 'BGA', tone: 'green' },
  arena: { long: $localize`:@@format.bga.arena:Arène BGA`, short: $localize`:@@format.bga.arena:Arène BGA`, tone: 'violet' },
  unavailable: { long: $localize`:@@format.bga.unavailable:BGA : indisponible`, short: $localize`:@@format.bga.unavailableShort:BGA indispo.`, tone: 'red' },
};
