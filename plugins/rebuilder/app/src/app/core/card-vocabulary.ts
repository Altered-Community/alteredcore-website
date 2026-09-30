// Vocabulary of the cards API filters, from the site's `plugins/core-altered-cards/data/altered.json` (kept in step by
// hand, as `formats.ts`): keywords, subtypes (`subTypes[]`), variations (`variation[]`) and the
// promo editions (`set.reference[]`, sets of `subtype: sub` with their `parent`).
import { uiLocale } from './i18n';

export interface Term {
  code: string;
  fr: string;
  en: string;
}

/** A term in the interface language. */
export function termLabel(t: Term): string {
  return uiLocale() === 'fr' ? t.fr : t.en;
}

/** Effect keywords (Aguerri, Ancré…), French order: the printed names of the Uniques search API codes (`keywordLabel`). */
export const KEYWORDS: readonly Term[] = [
  { code: "MAW", fr: "0/0/0 Maw", en: "Maw 0/0/0" },
  { code: "WOOLLYBACK", fr: "1/1/1 Dotouffu", en: "Woollyback 1/1/1" },
  { code: "ORDIS_RECRUIT", fr: "1/1/1 Recrue Ordis", en: "Ordis Recruit 1/1/1" },
  { code: "BOODA", fr: "2/2/2 Booda", en: "Booda 2/2/2" },
  { code: "HALUA", fr: "2/2/2 Halua", en: "Halua 2/2/2" },
  { code: "MANA_MOTH", fr: "2/2/2 Phalène de Mana", en: "Mana Moth 2/2/2" },
  { code: "BRASSBUG", fr: "2/2/2 Scarabot", en: "Brassbug 2/2/2" },
  { code: "DRAGON_SHADE", fr: "5/5/5 Reflet Draconique", en: "Dragon Shade 5/5/5" },
  { code: "AGUERRI", fr: "Aguerri", en: "Seasoned" },
  { code: "AUGMENT", fr: "Amplifier", en: "Augment" },
  { code: "ANCRE", fr: "Ancré", en: "Anchored" },
  { code: "AFTER_YOU", fr: "Après vous", en: "After You" },
  { code: "AEROLITH", fr: "Aérolithe", en: "Aerolith" },
  { code: "BOOSTE", fr: "Boosté", en: "Boosted" },
  { code: "CORIACE", fr: "Coriace", en: "Tough" },
  { code: "DON", fr: "Don", en: "Gift" },
  { code: "DEFENSEUR", fr: "Défenseur", en: "Defender" },
  { code: "IN_CONTACT", fr: "En Contact", en: "In Contact" },
  { code: "ENDORMI", fr: "Endormi", en: "Asleep" },
  { code: "FONCER", fr: "Foncer", en: "Rush" },
  { code: "FUGACE", fr: "Fugace", en: "Fleeting" },
  { code: "GIGANTESQUE", fr: "Gigantesque", en: "Gigantic" },
  { code: "MANASEED", fr: "Graine de Mana", en: "Manaseed" },
  { code: "RAFRAICHISSEMENT", fr: "Rafraîchissement", en: "Cooldown" },
  { code: "RAVITAILLEZ", fr: "Ravitaillez", en: "Resupply" },
  { code: "RAVITAILLEZ_EPUISE", fr: "Ravitaillez Épuisé", en: "Exhausted Resupply" },
  { code: "REPERAGE", fr: "Repérage", en: "Scout" },
  { code: "SABOTEZ", fr: "Sabotez", en: "Sabotage" },
  { code: "ASCENDS", fr: "s'Élève", en: "Ascends" },
  { code: "ETERNEL", fr: "Éternel", en: "Eternal" },
];

/** The keywords by the code the Uniques search API writes in its texts: the English name in capitals (`AFTER_YOU`). */
const BY_API_CODE = new Map(KEYWORDS.map((k) => [k.en.replace(/\d+\/\d+\/\d+/g, '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'), k]));

/**
 * The printed keyword for a code of the Uniques search API (`[FLEETING]`), `null` when unknown. Variants map to the
 * base keyword (`RESUPPLY_T`, `RESUPPLY_INF` → Ravitaillez, `BOOSTED_CHA_P` → Boosté), a trailing number stays
 * (`TOUGH_1` → Coriace 1): the cards API prints them so.
 */
export function keywordLabel(code: string, locale: 'fr' | 'en'): string | null {
  const m = /^(.+?)_(\d+)$/.exec(code);
  const parts = (m ? m[1] : code).split('_');
  for (let i = parts.length; i > 0; i--) {
    const k = BY_API_CODE.get(parts.slice(0, i).join('_'));
    if (k) return m ? `${k[locale]} ${m[2]}` : k[locale];
  }
  return null;
}

/** A text of the Uniques search API with its `[CODE]` keywords printed in `locale` (French, English otherwise). */
export function printKeywordCodes(text: string, locale: string): string {
  const loc = locale === 'fr' ? 'fr' : 'en';
  return text.replace(/\[([A-Z][A-Z0-9_]*)\]/g, (all: string, code: string) => {
    const label = keywordLabel(code, loc);
    return label ? `[${label}]` : all;
  });
}

/** Card subtypes (Animal, Ingénieur…), French order. */
export const SUBTYPES: readonly Term[] = [
  { code: "BUREAUCRATOOF", fr: "#Bureaucrate#", en: "#Bureaucrat#" },
  { code: "ANIMAL", fr: "Animal", en: "Animal" },
  { code: "APPRENTICE", fr: "Apprenti", en: "Apprentice" },
  { code: "ARTIST", fr: "Artiste", en: "Artist" },
  { code: "ADVENTURER", fr: "Aventurier", en: "Adventurer" },
  { code: "BUREAUCRAT", fr: "Bureaucrate", en: "Bureaucrat" },
  { code: "BOON", fr: "Bénédiction", en: "Boon" },
  { code: "SONG", fr: "Chant", en: "Song" },
  { code: "CITIZEN", fr: "Citoyen", en: "Citizen" },
  { code: "COMPANION", fr: "Compagnon", en: "Companion" },
  { code: "CONJURATION", fr: "Conjuration", en: "Conjuration" },
  { code: "CONSTRUCTION", fr: "Construction", en: "Construction" },
  { code: "CORRUPTION", fr: "Corruption", en: "Corruption" },
  { code: "DEITY", fr: "Divinité", en: "Deity" },
  { code: "DRAGON", fr: "Dragon", en: "Dragon" },
  { code: "DRUID", fr: "Druide", en: "Druid" },
  { code: "SPIRIT", fr: "Esprit", en: "Spirit" },
  { code: "FAIRY", fr: "Fée", en: "Fairy" },
  { code: "ROGUE", fr: "Gredin", en: "Rogue" },
  { code: "ILLUSION", fr: "Illusion", en: "Illusion" },
  { code: "ENGINEER", fr: "Ingénieur", en: "Engineer" },
  { code: "DISRUPTION", fr: "Interférence", en: "Disruption" },
  { code: "SITE", fr: "Lieu", en: "Site" },
  { code: "LEVIATHAN", fr: "Léviathan", en: "Leviathan" },
  { code: "MAGE", fr: "Mage", en: "Mage" },
  { code: "MANEUVER", fr: "Manœuvre", en: "Maneuver" },
  { code: "MERCHANT", fr: "Marchand", en: "Merchant" },
  { code: "GEAR", fr: "Matos", en: "Gear" },
  { code: "TRAINER", fr: "Mentor", en: "Trainer" },
  { code: "NOBLE", fr: "Noble", en: "Noble" },
  { code: "PLANT", fr: "Plante", en: "Plant" },
  { code: "FEAT", fr: "Prouesse", en: "Feat" },
  { code: "LANDMARK", fr: "Repère", en: "Landmark" },
  { code: "ROBOT", fr: "Robot", en: "Robot" },
  { code: "ORE", fr: "Roc", en: "Ore" },
  { code: "SCIENTIST", fr: "Scientifique", en: "Scientist" },
  { code: "SOLDIER", fr: "Soldat", en: "Soldier" },
  { code: "SAP", fr: "Sève", en: "Sap" },
  { code: "TITAN", fr: "Titan", en: "Titan" },
  { code: "ELEMENTAL", fr: "Élémentaire", en: "Elemental" },
  { code: "MESSENGER", fr: "Émissaire", en: "Messenger" },
  { code: "SCHOLAR", fr: "Érudit", en: "Scholar" },
];

/** Printings of a card: « Alt arts » selects them all. */
export const VARIATIONS: readonly Term[] = [
  { code: "standard", fr: "Standard", en: "Standard" },
  { code: "alt-art", fr: "Art Alternatif", en: "Alt Art" },
  { code: "promo", fr: "Promo", en: "Promo" },
  { code: "kickstarter", fr: "Kickstarter", en: "Kickstarter" },
  { code: "serialized", fr: "Numérotée", en: "Serialized" },
];

/** Promo editions and the main set they belong to (shown with « Alt arts » on). */
export const PROMO_SETS: readonly (Term & { parent: string })[] = [
  { code: "DUSTEROP", parent: "DUSTER", fr: "Les Graines de l'Unité – Jeu Organisé", en: "Seeds of Unity – Organized Play" },
  { code: "DUSTERTOP", parent: "DUSTER", fr: "Les Graines de l'Unité – Box Topper", en: "Seeds of Unity – Box Topper" },
  { code: "DUSTERCB", parent: "DUSTER", fr: "Les Graines de l'Unité – Collector Booster", en: "Seeds of Unity – Collector Booster" },
  { code: "EOLEOP", parent: "EOLE", fr: "Les Racines de la Corruption – Jeu Organisé", en: "Roots of Corruption – Organized Play" },
  { code: "EOLETOP", parent: "EOLE", fr: "Les Racines de la Corruption – Box Topper", en: "Roots of Corruption – Box Topper" },
  { code: "EOLECB", parent: "EOLE", fr: "Les Racines de la Corruption – Collector Booster", en: "Roots of Corruption – Collector Booster" },
  { code: "TCS3", parent: "BISE", fr: "Tumult Faction Champion – Set 3", en: "Tumult Faction Champion – Set 3" },
  { code: "WCQ25", parent: "CORE", fr: "World Championship Qualifier 2025", en: "World Championship Qualifier 2025" },
  { code: "WCF25", parent: "CORE", fr: "World Championship 2025", en: "World Championship 2025" },
  { code: "WCS25", parent: "CORE", fr: "World Championship Series 2025", en: "World Championship Series 2025" },
  { code: "JUDGE", parent: "CORE", fr: "Judge Rewards", en: "Judge Rewards" },
  { code: "MUSUBI", parent: "CORE", fr: "Musubi", en: "Musubi" },
  { code: "WCS26", parent: "DUSTER", fr: "World Championship Series 2026", en: "World Championship Series 2026" },
];
