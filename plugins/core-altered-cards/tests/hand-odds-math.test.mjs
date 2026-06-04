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
let total=0, slow=0, noChar=0, tempo=0, dbl=0, keep=0, avgSum=0;
(function comb(start, chosen) {
  if (chosen.length === hs) {
    total++;
    const hand = chosen.map(i => deck[i]);
    const costs = hand.map(c => c.cost);
    const charCosts = hand.filter(c => c.isCharacter).map(c => c.cost);
    const cheap = costs.filter(c => c <= 3).length;
    const charCheap = charCosts.filter(c => c <= 3).length;
    if (cheap === 0) slow++;
    if (charCheap === 0) noChar++;
    const t = canPlayTwo(costs); if (t) tempo++;
    if (canPlayTwo(charCosts)) dbl++;
    if (charCheap >= 1 && t) keep++;
    avgSum += maxPlayable(costs);
    return;
  }
  for (let i = start; i < N; i++) comb(i + 1, chosen.concat(i));
})(0, []);
near(got.slowStart,   slow/total,   'handStats.slowStart vs brute force');
near(got.noEarlyChar, noChar/total, 'handStats.noEarlyChar vs brute force');
near(got.tempo,       tempo/total,  'handStats.tempo vs brute force');
near(got.doubleChar,  dbl/total,    'handStats.doubleChar vs brute force');
near(got.keepable,    keep/total,   'handStats.keepable vs brute force');
near(got.avgPlayable, avgSum/total, 'handStats.avgPlayable vs brute force');
ok(got.deckSize === N, 'handStats.deckSize = N');

console.log(`\n${pass} checks passed`);
