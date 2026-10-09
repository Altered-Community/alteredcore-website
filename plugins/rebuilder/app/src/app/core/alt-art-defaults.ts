import type { HydratedLine } from './models';
import { familyKey, type AltArtChoice } from './ownership-api.service';

/**
 * Default alt arts. The player picks once, on the site's « Arts alternatifs par défaut » page, which print each copy of
 * a card takes (1st, 2nd, 3rd copy: the ownership service's slots); a deck only stores the prints it uses. The defaults
 * apply when a card enters a deck and on « Appliquer les arts par défaut »; Board Game Arena plays the deck's prints
 * (the base art for copies the player does not own).
 */

/** The family's plain illustration, everyone's: the service lists it first. */
export function basePrint(choice: AltArtChoice): string {
  return choice.options.options[0]?.reference ?? '';
}

/** Copies the player owns of `reference`; `null` for unlimited (a print the service does not list, as a reprint). */
export function ownedOf(choice: AltArtChoice, reference: string): number | null {
  const option = choice.options.options.find((o) => o.reference === reference);
  return option ? option.ownedQuantity : null;
}

/** The family's slots, 1st copy first (the service numbers them from 1, the stack's mock from 0). */
export function slotPrints(choice: AltArtChoice): string[] {
  return [...choice.options.slots].sort((a, b) => a.slotIndex - b.slotIndex).map((s) => s.reference);
}

/** Choices of the brush (1st, 2nd, 3rd): one a copy slot of the ownership service. */
export const RANK_COUNT = 3;

/**
 * The player's default alt arts of the family as choices, 1st first: its slots (the last one repeated), the base print
 * without any.
 */
export function rankPrints(choice: AltArtChoice): string[] {
  const slots = slotPrints(choice);
  const base = basePrint(choice);
  return Array.from({ length: RANK_COUNT }, (_, i) => (slots.length ? slots[Math.min(i, slots.length - 1)] : base));
}

/** `choice` with the default alt arts `ranks` (1st choice first). */
export function withRanks(choice: AltArtChoice, ranks: readonly string[]): AltArtChoice {
  const slots = ranks.map((reference, i) => ({ slotIndex: i + 1, reference, isExplicitChoice: true }));
  return { ...choice, options: { ...choice.options, slots } };
}

/** Choice `rank` can take `reference`: the player owns more copies of it than the other choices hold (`null`: unlimited). */
export function canRank(choice: AltArtChoice, ranks: readonly string[], rank: number, reference: string): boolean {
  const owned = ownedOf(choice, reference);
  return owned === null || ranks.filter((r, i) => i !== rank && r === reference).length < owned;
}

/**
 * The prints of `count` copies by the player's defaults: copy i takes slot i (the copies past the last slot take the
 * last one), or the base print once the copies owned of that print are used.
 */
export function defaultPrints(choice: AltArtChoice, count: number): string[] {
  return slotDefaults(choice, Array<string | null>(count).fill(null));
}

/**
 * The prints of copies whose illustration is chosen in the deck (`chosen[i]`) or left to the defaults (`null`): a free
 * copy i takes slot i (the copies past the last slot take the last one), or the base print once the copies owned of
 * that print are used, the chosen copies first.
 */
export function slotDefaults(choice: AltArtChoice, chosen: readonly (string | null)[]): string[] {
  const slots = slotPrints(choice);
  const base = basePrint(choice);
  const used = counts(chosen.filter((c): c is string => c !== null));
  return chosen.map((c, i) => {
    if (c !== null) return c;
    const wanted = slots.length ? slots[Math.min(i, slots.length - 1)] : base;
    const owned = ownedOf(choice, wanted);
    const print = owned === null || (used.get(wanted) ?? 0) < owned ? wanted : base;
    used.set(print, (used.get(print) ?? 0) + 1);
    return print;
  });
}

/**
 * The deck's copies of a family (`prints`) as copies chosen in the deck or left to the defaults (`null`), so that
 * `slotDefaults` gives the same prints. The deck stores no order: the prints its defaults do not explain are chosen and
 * come first (copy 1 is the deck's own choice, the front of its pile), the other copies are free when their slot's
 * default matches, chosen otherwise.
 */
export function slotChoices(choice: AltArtChoice, prints: readonly string[]): (string | null)[] {
  const left = counts(prints);
  for (const d of defaultPrints(choice, prints.length)) {
    const n = left.get(d) ?? 0;
    if (n) left.set(d, n - 1);
  }
  const own = [...left].flatMap(([print, n]) => Array<string>(n).fill(print));
  const chosen: (string | null)[] = [...own, ...Array<null>(prints.length - own.length).fill(null)];
  // A free copy whose default is not one of the deck's prints left (an owned print the chosen copies took): chosen.
  for (;;) {
    const missing = counts(prints);
    const shown = slotDefaults(choice, chosen);
    for (const s of shown) missing.set(s, (missing.get(s) ?? 0) - 1);
    if ([...missing.values()].every((n) => n === 0)) return chosen;
    const extra = shown.findIndex((s, i) => chosen[i] === null && (missing.get(s) ?? 0) < 0);
    const lacking = [...missing].find(([, n]) => n > 0)?.[0];
    if (extra === -1 || lacking === undefined) return [...prints];
    chosen[extra] = lacking;
  }
}

/**
 * The print of a copy added to a family whose copies show `current`: the first default (by slot) the copies lack,
 * so that a copy chosen in the deck stays and the next copies follow the defaults; the base print otherwise.
 */
export function addedCopyPrint(choice: AltArtChoice, current: readonly string[]): string {
  const left = counts(current);
  for (const print of defaultPrints(choice, current.length + 1)) {
    const n = left.get(print) ?? 0;
    if (n === 0) return print;
    left.set(print, n - 1);
  }
  return basePrint(choice);
}

/**
 * The print of the copy removed from a family whose copies show `current`: the last copy's default when the deck has
 * it, else the base print, else the last copy; a print chosen in the deck goes last.
 */
export function removedCopyPrint(choice: AltArtChoice, current: readonly string[]): string {
  const last = defaultPrints(choice, current.length).at(-1);
  if (last && current.includes(last)) return last;
  const base = basePrint(choice);
  return current.includes(base) ? base : (current.at(-1) ?? base);
}

/** Copies by print, in the order of `prints`. */
export function counts(prints: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of prints) out.set(p, (out.get(p) ?? 0) + 1);
  return out;
}

/** A family's copies, one print a copy: its lines in deck order. */
export function familyPrints(lines: readonly HydratedLine[], members: ReadonlySet<string>): string[] {
  return lines.filter((l) => members.has(l.card.reference)).flatMap((l) => Array<string>(l.quantity).fill(l.card.reference));
}

/**
 * `lines` with the family's lines (references in `members`) replaced by `prints`, at the place of its first line. The
 * new lines copy the card of `template`, with their reference.
 */
export function withFamilyPrints(lines: readonly HydratedLine[], members: ReadonlySet<string>, template: HydratedLine['card'], prints: readonly string[]): HydratedLine[] {
  const replaced = [...counts(prints)].map(([reference, quantity]) => {
    const existing = lines.find((l) => l.card.reference === reference);
    // Another print: the template's card without its image (the art follows the reference).
    return { card: existing?.card ?? (reference === template.reference ? template : { ...template, reference, imagePath: undefined }), quantity };
  });
  const at = lines.findIndex((l) => members.has(l.card.reference));
  const rest = lines.filter((l) => !members.has(l.card.reference));
  const index = at === -1 ? rest.length : lines.slice(0, at).filter((l) => !members.has(l.card.reference)).length;
  return [...rest.slice(0, index), ...replaced, ...rest.slice(index)];
}

/** The deck's references grouped by family (multi-art families only), by family key. */
export function familiesOf(references: Iterable<string>, choices: Readonly<Record<string, AltArtChoice>>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const ref of references) {
    const choice = choices[ref];
    if (!choice) continue;
    const key = familyKey(choice.family);
    const set = out.get(key) ?? new Set<string>();
    set.add(ref);
    out.set(key, set);
  }
  return out;
}

/**
 * « Appliquer les arts par défaut »: every multi-art family of `lines` takes the player's defaults for its copies
 * (`defaultPrints`). `null` when every line already matches.
 */
export function linesWithDefaults(lines: readonly HydratedLine[], choices: Readonly<Record<string, AltArtChoice>>): HydratedLine[] | null {
  let out = [...lines];
  let changed = false;
  for (const members of familiesOf(lines.map((l) => l.card.reference), choices).values()) {
    const current = familyPrints(out, members);
    const choice = choices[[...members][0]];
    const next = defaultPrints(choice, current.length);
    if (sameCopies(current, next)) continue;
    changed = true;
    const template = out.find((l) => members.has(l.card.reference))!.card;
    out = withFamilyPrints(out, members, template, next);
  }
  return changed ? out : null;
}

/** Same copies of each print, in any order. */
export function sameCopies(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const left = counts(a);
  return [...counts(b)].every(([print, n]) => left.get(print) === n);
}
