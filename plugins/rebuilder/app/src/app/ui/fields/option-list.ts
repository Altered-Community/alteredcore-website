/** Text compared by the list searches: lower case, accents removed (« épuisé » finds « Épuisé »). */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Ids of the options that start a group (`group` differs from the previous option's): where a heading goes. */
export function groupStarts(options: readonly { id: number; group?: string }[]): Set<number> {
  const starts = new Set<number>();
  let last: string | undefined;
  for (const o of options) {
    if (o.group && o.group !== last) starts.add(o.id);
    last = o.group;
  }
  return starts;
}
