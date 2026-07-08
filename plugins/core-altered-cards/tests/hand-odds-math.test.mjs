import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const M = require(path.join(process.cwd(), 'plugins/core-altered-cards/assets/hand-odds-math.js'));

let pass = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ok   - ' + msg); } else { console.log('  FAIL - ' + msg); process.exitCode = 1; } }
function near(a, b, msg, eps = 1e-9) { ok(Math.abs(a - b) < eps, msg + ` (got ${a}, want ${b})`); }

// binom
ok(M.binom(39, 6) === 3262623n, 'binom(39,6)=3262623');
ok(M.binom(5, 0) === 1n && M.binom(5, 5) === 1n, 'binom edges = 1');
ok(M.binom(4, 9) === 0n, 'binom(n,k>n)=0');

// pAtLeastOne: 1 - C(N-K,n)/C(N,n). N=40,K=3,n=6
near(M.pAtLeastOne(40, 3, 6), 1 - Number(M.binom(37, 6)) / Number(M.binom(40, 6)), 'pAtLeastOne matches formula');
near(M.pAtLeastOne(40, 0, 6), 0, 'pAtLeastOne with K=0 is 0');
near(M.pAtLeastOne(40, 40, 6), 1, 'pAtLeastOne with K=N is 1');

// pComboBoth: inclusion-exclusion
near(M.pComboBoth(40, 3, 3, 6),
  1 - Number(M.binom(37,6))/Number(M.binom(40,6)) - Number(M.binom(37,6))/Number(M.binom(40,6)) + Number(M.binom(34,6))/Number(M.binom(40,6)),
  'pComboBoth matches inclusion-exclusion');

// pAtLeast: P(>=t of K copies among n draws)
near(M.pAtLeast(40, 3, 6, 0), 1, 'pAtLeast t=0 is certain');
near(M.pAtLeast(40, 3, 6, 1), M.pAtLeastOne(40, 3, 6), 'pAtLeast t=1 equals pAtLeastOne');
ok(M.pAtLeast(40, 3, 6, 4) === 0, 'pAtLeast t>K is 0');
// Hand-computed: N=5,K=2,n=2 → P(>=1)=0.7, P(>=2)=0.1
near(M.pAtLeast(5, 2, 2, 1), 0.7, 'pAtLeast(5,2,2,1)=0.7');
near(M.pAtLeast(5, 2, 2, 2), 0.1, 'pAtLeast(5,2,2,2)=0.1');
ok(M.pAtLeast(5, 2, 2, 1) >= M.pAtLeast(5, 2, 2, 2), 'pAtLeast is non-increasing in t');

// handStats vs brute force on a small deck (handSize 3)
const cards = [
  { cost: 0, isCharacter: true,  qty: 2 },
  { cost: 1, isCharacter: true,  qty: 2 },
  { cost: 2, isCharacter: false, qty: 1 },
  { cost: 5, isCharacter: false, qty: 3 },
];
const hs = 3;
const got = M.handStats(cards, hs);

const deck = [];
cards.forEach((c, ci) => { for (let i = 0; i < c.qty; i++) deck.push({ cost: c.cost, isCharacter: c.isCharacter, id: ci + '_' + i }); });
const N = deck.length;
function canPlayTwo(costs) {
  const n = [0,0,0,0]; costs.forEach(c => { if (c <= 3) n[c]++; });
  return n[0] >= 2 || (n[0] >= 1 && (n[1]+n[2]+n[3]) >= 1) || n[1] >= 2 || (n[1] >= 1 && n[2] >= 1);
}
function maxPlayable(costs) { const n=[0,0,0,0]; costs.forEach(c=>{if(c<=3)n[c]++;}); let cnt=n[0],b=3; const t1=Math.min(n[1],b);cnt+=t1;b-=t1; const t2=Math.min(n[2],Math.floor(b/2));cnt+=t2;b-=2*t2; const t3=Math.min(n[3],Math.floor(b/3));cnt+=t3; return cnt; }
let total=0, tempo=0, heavy=0;
const bMana=[0,0,0,0], bExp=new Array(hs+1).fill(0), bPlays=[0,0,0,0], bExped=[0,0,0];
(function comb(start, chosen) {
  if (chosen.length === hs) {
    total++;
    const hand = chosen.map(i => deck[i]);
    const costs = hand.map(c => c.cost);
    const charCosts = hand.filter(c => c.isCharacter).map(c => c.cost);
    if (canPlayTwo(costs)) tempo++;
    if (costs.filter(c => c >= 4).length >= 3) heavy++;
    // max mana spendable on day 1 = largest subset-sum <= 3 (true brute force)
    let maxSpend = 0;
    for (let mask = 0; mask < (1 << costs.length); mask++) {
      let s = 0; for (let i = 0; i < costs.length; i++) if (mask & (1 << i)) s += costs[i];
      if (s <= 3 && s > maxSpend) maxSpend = s;
    }
    bMana[maxSpend]++;
    bExp[costs.filter(c => c >= 4).length]++;
    bPlays[Math.min(maxPlayable(costs), 3)]++;
    bExped[Math.min(maxPlayable(charCosts), 2)]++;
    return;
  }
  for (let i = start; i < N; i++) comb(i + 1, chosen.concat(i));
})(0, []);
near(got.tempo, tempo/total, 'handStats.tempo vs brute force');
near(got.heavy, heavy/total, 'handStats.heavy vs brute force');
ok(got.deckSize === N, 'handStats.deckSize = N');
for (let k = 0; k < 4; k++) near(got.manaSpent[k],   bMana[k]/total,  `handStats.manaSpent[${k}] vs brute force`);
for (let k = 0; k <= hs; k++) near(got.expensive[k],  bExp[k]/total,   `handStats.expensive[${k}] vs brute force`);
for (let k = 0; k < 4; k++) near(got.plays[k],        bPlays[k]/total, `handStats.plays[${k}] vs brute force`);
for (let k = 0; k < 3; k++) near(got.expeditions[k],  bExped[k]/total, `handStats.expeditions[${k}] vs brute force`);

// distributions are proper (sum to 1) and the headlines the UI derives hold
const sum = a => a.reduce((s, x) => s + x, 0);
near(sum(got.manaSpent), 1, 'manaSpent sums to 1');
near(sum(got.expensive), 1, 'expensive sums to 1');
near(sum(got.plays), 1, 'plays sums to 1');
near(sum(got.expeditions), 1, 'expeditions sums to 1');
near(got.plays[2] + got.plays[3], got.tempo, 'P(>=2 plays) equals tempo');

// edge decks
const allFive = M.handStats([{ cost: 5, isCharacter: false, qty: 10 }], 6);
near(allFive.manaSpent[0], 1, 'all 5-cost: never spend any mana on day 1');
near(allFive.plays[0], 1, 'all 5-cost: no play on day 1');
near(allFive.expensive[6], 1, 'all 5-cost: 6 expensive cards every hand');
const oneDrops = M.handStats([{ cost: 1, isCharacter: true, qty: 10 }], 6);
near(oneDrops.manaSpent[3], 1, 'all 1-cost: always spend the full 3 mana');
near(oneDrops.expeditions[2], 1, 'all 1-cost characters: both expeditions contestable');

// empty deck (a brand-new deck in the builder) must not crash and yields zeroed distributions
const emptyStats = M.handStats([], 6);
ok(emptyStats.deckSize === 0, 'handStats([]): deckSize 0');
ok(emptyStats.manaSpent.every(x => x === 0) && emptyStats.plays.every(x => x === 0)
   && emptyStats.expeditions.every(x => x === 0) && emptyStats.tempo === 0,
   'handStats([]): zeroed distributions, no crash');

console.log(`\n${pass} checks passed`);
