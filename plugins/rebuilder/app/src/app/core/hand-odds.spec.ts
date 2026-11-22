import { bestFraction, binom, handStats, oddsGroups, pAtLeast, pAtLeastOne, pComboBoth, type OddsCard } from './hand-odds';
import type { HydratedLine } from './models';

/** Same checks as the site's `core-altered-cards/tests/hand-odds-math.test.mjs`. */
describe('hand odds', () => {
  const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

  it('computes binomials and draw probabilities exactly', () => {
    expect(binom(39, 6)).toBe(3262623n);
    expect(binom(5, 0)).toBe(1n);
    expect(binom(4, 9)).toBe(0n);
    close(pAtLeastOne(40, 3, 6), 1 - Number(binom(37, 6)) / Number(binom(40, 6)));
    close(pAtLeastOne(40, 0, 6), 0);
    close(pAtLeastOne(40, 40, 6), 1);
    close(pAtLeast(5, 2, 2, 1), 0.7);
    close(pAtLeast(5, 2, 2, 2), 0.1);
    expect(pAtLeast(40, 3, 6, 4)).toBe(0);
    const q = Number(binom(37, 6)) / Number(binom(40, 6));
    close(pComboBoth(40, 3, 3, 6), 1 - 2 * q + Number(binom(34, 6)) / Number(binom(40, 6)));
  });

  it('matches a brute force over every opening hand of a small deck', () => {
    const cards: OddsCard[] = [
      { cost: 0, isCharacter: true, qty: 2 },
      { cost: 1, isCharacter: true, qty: 2 },
      { cost: 2, isCharacter: false, qty: 1 },
      { cost: 5, isCharacter: false, qty: 3 },
    ];
    const hs = 3;
    const got = handStats(cards, hs);
    const deck = cards.flatMap((c) => Array.from({ length: c.qty }, () => c));
    const maxPlayable = (costs: number[]) => {
      const n = [0, 0, 0, 0];
      costs.forEach((c) => c <= 3 && n[c]++);
      let cnt = n[0];
      let b = 3;
      const t1 = Math.min(n[1], b);
      cnt += t1;
      b -= t1;
      const t2 = Math.min(n[2], Math.floor(b / 2));
      cnt += t2;
      b -= 2 * t2;
      return cnt + Math.min(n[3], Math.floor(b / 3));
    };
    let total = 0;
    let heavy = 0;
    const mana = [0, 0, 0, 0];
    const plays = [0, 0, 0, 0];
    const exped = [0, 0, 0];
    const comb = (start: number, chosen: number[]) => {
      if (chosen.length === hs) {
        total++;
        const costs = chosen.map((i) => deck[i].cost);
        if (costs.filter((c) => c >= 4).length >= 3) heavy++;
        let spend = 0;
        for (let mask = 0; mask < 1 << costs.length; mask++) {
          const s = costs.reduce((sum, c, i) => (mask & (1 << i) ? sum + c : sum), 0);
          if (s <= 3 && s > spend) spend = s;
        }
        mana[spend]++;
        plays[Math.min(maxPlayable(costs), 3)]++;
        exped[Math.min(maxPlayable(chosen.filter((i) => deck[i].isCharacter).map((i) => deck[i].cost)), 2)]++;
        return;
      }
      for (let i = start; i < deck.length; i++) comb(i + 1, [...chosen, i]);
    };
    comb(0, []);
    close(got.heavy, heavy / total);
    mana.forEach((v, k) => close(got.manaSpent[k], v / total));
    plays.forEach((v, k) => close(got.plays[k], v / total));
    exped.forEach((v, k) => close(got.expeditions[k], v / total));
    close(got.plays[2] + got.plays[3], got.tempo);
  });

  it('handles edge decks', () => {
    close(handStats([{ cost: 5, isCharacter: false, qty: 10 }], 6).expensive[6], 1);
    close(handStats([{ cost: 1, isCharacter: true, qty: 10 }], 6).expeditions[2], 1);
    const empty = handStats([], 6);
    expect(empty.deckSize).toBe(0);
    expect(empty.plays.every((x) => x === 0)).toBe(true);
  });

  it('groups cards by name and rarity, uniques apart, and picks readable fractions', () => {
    const lines: HydratedLine[] = [
      { quantity: 2, card: { reference: 'ALT_CORE_B_YZ_10_C', name: 'Zou', cardType: { reference: 'SPELL' }, mainCost: 2 } },
      { quantity: 1, card: { reference: 'ALT_ALIZE_B_YZ_10_C', name: 'Zou', cardType: { reference: 'SPELL' }, mainCost: 2 } },
      { quantity: 1, card: { reference: 'ALT_CORE_B_YZ_11_U_3', name: 'Baba', cardType: { reference: 'CHARACTER' }, mainCost: 3 } },
      { quantity: 1, card: { reference: 'ALT_CORE_B_YZ_11_U_4', name: 'Baba', cardType: { reference: 'CHARACTER' }, mainCost: 3 } },
    ];
    expect(oddsGroups(lines).map((g) => [g.name, g.rarity, g.qty])).toEqual([
      ['Baba', 'U', 1],
      ['Baba', 'U', 1],
      ['Zou', 'C', 3],
    ]);
    expect(bestFraction(0.72)).toEqual({ x: 3, y: 4 });
    expect(bestFraction(1)).toBeNull();
  });
});
