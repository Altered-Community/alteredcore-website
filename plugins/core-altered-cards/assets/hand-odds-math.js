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

        var acc = { slowStart: 0, noEarlyChar: 0, tempo: 0, doubleChar: 0, onCurve: 0, avgPlayable: 0, heavy: 0, explosive: 0, balanced: 0, congestion: 0 };
        var m = buckets.length;
        var counts = new Array(m).fill(0);
        (function rec(i, remaining, numBig) {
            if (i === m - 1) {
                if (remaining > buckets[i].size) return;
                counts[i] = remaining;
                numBig = numBig * binom(buckets[i].size, remaining);
                if (numBig === 0n) return;
                var w = ratio(numBig, denom);
                if (w <= 0) return;
                var n = [0, 0, 0, 0], cn = [0, 0, 0, 0], nGe4 = 0, nEq4 = 0, charTotal = 0;
                for (var b = 0; b < m; b++) {
                    var c = buckets[b].cost, k = counts[b];
                    if (c <= 3) { n[c] += k; if (buckets[b].isChar) cn[c] += k; }
                    else { nGe4 += k; if (c === 4) nEq4 += k; }
                    if (buckets[b].isChar) charTotal += k;
                }
                var cheap = n[0] + n[1] + n[2] + n[3];
                var charCheap = cn[0] + cn[1] + cn[2] + cn[3];
                var tempo = canPlayTwo(n[0], n[1], n[2], n[3]);
                if (cheap === 0) acc.slowStart += w;
                if (charCheap === 0) acc.noEarlyChar += w;
                if (tempo) acc.tempo += w;
                if (canPlayTwo(cn[0], cn[1], cn[2], cn[3])) acc.doubleChar += w;
                // On curve: can spend all 3 mana on day 1 (a 3, or a 2+1, or three 1s).
                if (n[3] >= 1 || (n[2] >= 1 && n[1] >= 1) || n[1] >= 3) acc.onCurve += w;
                acc.avgPlayable += w * maxPlayable(n[0], n[1], n[2], n[3]);
                if (nGe4 >= 3) acc.heavy += w;
                if (n[0] + n[1] + n[2] >= 3) acc.explosive += w;
                if (charTotal >= 1 && charTotal <= hs - 1) acc.balanced += w;
                // Congestion: ≥4 cards sharing one mana value (5+ grouped together).
                if (n[0] >= 4 || n[1] >= 4 || n[2] >= 4 || n[3] >= 4 || nEq4 >= 4 || (nGe4 - nEq4) >= 4) acc.congestion += w;
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

    return { binom: binom, pAtLeastOne: pAtLeastOne, pAtLeast: pAtLeast, pComboBoth: pComboBoth, handStats: handStats, canPlayTwo: canPlayTwo, maxPlayable: maxPlayable };
}));
