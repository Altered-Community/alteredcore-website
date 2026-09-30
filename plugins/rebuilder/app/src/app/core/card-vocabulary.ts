// Vocabulary of the cards API filters, from the site's `plugins/core-altered-cards/data/altered.json` (kept in step by
// hand, as `formats.ts`): subtypes (`subTypes[]`), variations (`variation[]`) and the
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
