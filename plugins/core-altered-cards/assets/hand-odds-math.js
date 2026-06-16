/* Pure draw-odds math for the starting-hand tab. No DOM.
 * Browser: window.HandOddsMath.  Node: module.exports (for the unit test). */
(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.HandOddsMath = api;
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function binom(n, k) {
        n = BigInt(n); k = BigInt(k);
        if (k < 0n || k > n) return 0n;
        if (k > n - k) k = n - k;
        var r = 1n;
        for (var i = 0n; i < k; i++) r = (r * (n - i)) / (i + 1n);
        return r;
    }
    function ratio(numBig, denBig) { return denBig === 0n ? 0 : Number(numBig) / Number(denBig); }

    function pAtLeastOne(N, K, n) {
        if (K <= 0) return 0;
        if (n >= N) return 1;
        return 1 - ratio(binom(N - K, n), binom(N, n));
    }
    // P(at least t of the K copies are among n drawn) — exact, sum of hypergeometric pmf.
    function pAtLeast(N, K, n, t) {
        if (t <= 0) return 1;
        var jmax = Math.min(K, n);
        if (K <= 0 || t > jmax) return 0;
        if (n >= N) return K >= t ? 1 : 0;
        var d = binom(N, n), p = 0;
        for (var j = t; j <= jmax; j++) p += ratio(binom(K, j) * binom(N - K, n - j), d);
        return Math.min(1, Math.max(0, p));
    }
    function pComboBoth(N, a, b, n) {
        var d = binom(N, n);
        var p0a = ratio(binom(N - a, n), d);
        var p0b = ratio(binom(N - b, n), d);
        var p0ab = ratio(binom(N - a - b, n), d);
        return Math.max(0, 1 - p0a - p0b + p0ab);
    }

    function canPlayTwo(n0, n1, n2, n3) {
        return n0 >= 2 || (n0 >= 1 && (n1 + n2 + n3) >= 1) || n1 >= 2 || (n1 >= 1 && n2 >= 1);
    }
    function maxPlayable(n0, n1, n2, n3) {
        var cnt = n0, b = 3;
        var t1 = Math.min(n1, b); cnt += t1; b -= t1;
        var t2 = Math.min(n2, Math.floor(b / 2)); cnt += t2; b -= 2 * t2;
        var t3 = Math.min(n3, Math.floor(b / 3)); cnt += t3;
        return cnt;
    }
    // Most of the 3 day-1 mana you can actually spend, given counts of 1/2/3-cost cards.
    function maxManaSpend(n1, n2, n3) {
        if (n3 >= 1 || (n2 >= 1 && n1 >= 1) || n1 >= 3) return 3;
        if (n2 >= 1 || n1 >= 2) return 2;
        if (n1 >= 1) return 1;
        return 0;
    }

    function handStats(cards, handSize) {
        var bk = {};
        var N = 0;
        cards.forEach(function (c) {
            var cost = Math.min(Math.max(c.cost | 0, 0), 5);
            var key = cost + (c.isCharacter ? 'C' : 'N');
            if (!bk[key]) bk[key] = { cost: cost, isChar: !!c.isCharacter, size: 0 };
            bk[key].size += (c.qty | 0);
            N += (c.qty | 0);
        });
        var buckets = Object.keys(bk).map(function (k) { return bk[k]; });
        var hs = Math.min(handSize, N);
        var denom = binom(N, hs);

        // Two scalars feed the "at a glance" cards; four distributions feed the detailed blocks.
        var acc = {
            tempo: 0, heavy: 0,
            manaSpent: [0, 0, 0, 0],              // P(max mana spent on day 1 = k), k = 0..3
            expensive: new Array(hs + 1).fill(0), // P(exactly k cards cost >= 4), k = 0..hs
            plays: [0, 0, 0, 0],                  // P(max cards playable on day 1 = k), capped at 3
            expeditions: [0, 0, 0]                // P(max characters playable on day 1 = k), capped at 2
        };
        var m = buckets.length;
        var counts = new Array(m).fill(0);
        if (m > 0) (function rec(i, remaining, numBig) {
            if (i === m - 1) {
                if (remaining > buckets[i].size) return;
                counts[i] = remaining;
                numBig = numBig * binom(buckets[i].size, remaining);
                if (numBig === 0n) return;
                var w = ratio(numBig, denom);
                if (w <= 0) return;
                var n = [0, 0, 0, 0], cn = [0, 0, 0, 0], nGe4 = 0;
                for (var b = 0; b < m; b++) {
                    var c = buckets[b].cost, k = counts[b];
                    if (c <= 3) { n[c] += k; if (buckets[b].isChar) cn[c] += k; }
                    else nGe4 += k;
                }
                if (canPlayTwo(n[0], n[1], n[2], n[3])) acc.tempo += w;   // can chain >=2 plays on day 1
                if (nGe4 >= 3) acc.heavy += w;                           // >=3 cards cost >=4
                acc.manaSpent[maxManaSpend(n[1], n[2], n[3])] += w;
                acc.expensive[nGe4] += w;
                acc.plays[Math.min(maxPlayable(n[0], n[1], n[2], n[3]), 3)] += w;
                acc.expeditions[Math.min(maxPlayable(cn[0], cn[1], cn[2], cn[3]), 2)] += w;
                return;
            }
            var maxK = Math.min(remaining, buckets[i].size);
            for (var k = 0; k <= maxK; k++) {
                counts[i] = k;
                rec(i + 1, remaining - k, numBig * binom(buckets[i].size, k));
            }
        })(0, hs, 1n);

        acc.deckSize = N;
        return acc;
    }

    return { binom: binom, pAtLeastOne: pAtLeastOne, pAtLeast: pAtLeast, pComboBoth: pComboBoth, handStats: handStats, canPlayTwo: canPlayTwo, maxPlayable: maxPlayable, maxManaSpend: maxManaSpend };
}));
