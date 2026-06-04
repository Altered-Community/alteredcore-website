/* Playtest sandbox for the deck detail page — "Main de départ" tab.
 *
 * Reads globals defined inline in deck.php: handDeckCards, handLang, handTxt.
 * Phase 0: explicit state model + hand render + reset. Behavior is identical to
 * the previous inline version (draw 6, redraw, summary, lazy first draw); mana /
 * draw-from-deck / board / discard arrive in later étapes. Card DOM elements are
 * created lazily (elFor) and cached on the card object so later étapes can move
 * them between zones instead of rebuilding (which would re-init <altered-card>).
 */
(function () {
    var handEl    = document.getElementById('hand-cards');
    var summaryEl = document.getElementById('hand-summary');
    var drawBtn   = document.getElementById('hand-draw-btn');
    var tabBtn    = document.getElementById('deck-view-hand');
    var commitBtn = document.getElementById('pt-commit-mana');
    var manaBadge = document.getElementById('pt-mana');
    var manaCount = document.getElementById('pt-mana-count');
    var phaseHint = document.getElementById('pt-phase-hint');
    var deckCountEl = document.getElementById('pt-deck-count');
    var deckZoneEl  = document.getElementById('pt-deck');
    var boardCardsEl = document.getElementById('pt-board-cards');
    var boardMoreEl  = document.getElementById('pt-board-more');
    var discardPile  = document.getElementById('pt-discard-pile');
    var discardCount = document.getElementById('pt-discard-count');
    var BOARD_OVERLAP_AT = 8;
    if (!handEl || typeof handDeckCards === 'undefined') return;

    var HAND_SIZE = 6;

    var state = {
        phase:   'setup',   // 'setup' | 'play' (unused until étape 2)
        hand:    [],
        manaSel: {},        // setup-phase selection (étape 2)
        mana:    [],        // étape 2
        deck:    [],        // remaining draw pile (étape 3)
        board:   [],        // étape 4
        discard: []         // étape 4
    };
    var started = false;

    function buildPool() {
        var pool = [], uid = 0;
        handDeckCards.forEach(function (c) {
            for (var i = 0; i < c.qty; i++) {
                pool.push({
                    id: 'c' + (uid++), ref: c.ref, name: c.name, type: c.type,
                    mainCost: c.mainCost, unique: c.unique, img: c.img, el: null
                });
            }
        });
        return pool;
    }
    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }
    function makeCardEl(card) {
        var wrap = document.createElement('div');
        wrap.className = 'deck-card-wrap pt-card hand-card-anim';
        wrap.dataset.id     = card.id;
        wrap.dataset.ref    = card.ref;
        wrap.dataset.unique = card.unique ? '1' : '0';
        wrap.dataset.lang   = handLang;

        var flip = document.createElement('div');
        flip.className = 'pt-flip';
        var front = document.createElement('div');
        front.className = 'pt-face pt-front';
        var inner;
        if (card.unique) {
            inner = document.createElement('altered-card');
            inner.setAttribute('ref', card.ref);
            inner.setAttribute('locale', handLang);
        } else {
            inner = document.createElement('img');
            inner.className = 'deck-card-img';
            inner.src = card.img;
            inner.alt = card.name || card.ref;
            inner.loading = 'lazy';
        }
        front.appendChild(inner);
        var back = document.createElement('div');
        back.className = 'pt-face pt-back';
        flip.appendChild(front);
        flip.appendChild(back);
        wrap.appendChild(flip);

        var loupe = document.createElement('button');
        loupe.type = 'button';
        loupe.className = 'pt-loupe';
        loupe.title = 'Zoom';
        loupe.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
        loupe.addEventListener('click', function (e) {
            e.stopPropagation();
            var img = front.querySelector('img');
            window.acOpenCardZoom(card.ref, !!card.unique, handLang, img ? img.src : (card.img || ''));
        });
        wrap.appendChild(loupe);

        var toMana = document.createElement('button');
        toMana.type = 'button';
        toMana.className = 'pt-tomana';
        toMana.title = handTxt.toMana;
        toMana.innerHTML = '<i class="fa-solid fa-droplet"></i>';
        toMana.addEventListener('click', function (e) {
            e.stopPropagation();
            sendCardToMana(card);
        });
        wrap.appendChild(toMana);

        return wrap;
    }
    function elFor(card) {
        if (!card.el) card.el = makeCardEl(card);
        return card.el;
    }
    function findCard(id) {
        var zones = ['hand', 'board', 'discard', 'mana'];
        for (var i = 0; i < zones.length; i++) {
            var hit = state[zones[i]].filter(function (c) { return c.id === id; })[0];
            if (hit) return { card: hit, zone: zones[i] };
        }
        return null;
    }
    function moveCard(id, toZone) {
        var f = findCard(id);
        if (!f || f.zone === toZone) return;
        state[f.zone] = state[f.zone].filter(function (c) { return c.id !== id; });
        state[toZone].push(f.card);
        if (f.card.el) f.card.el.style.transform = '';   // clear any drag transform
        renderHand(); renderBoard(); renderDiscard(); renderMana();
    }
    function renderBoard() {
        if (!boardCardsEl) return;
        var overlap = state.board.length > BOARD_OVERLAP_AT;
        boardCardsEl.classList.toggle('pt-overlap', overlap);
        var desired = state.board.map(elFor);
        Array.prototype.slice.call(boardCardsEl.childNodes).forEach(function (ch) {
            if (desired.indexOf(ch) === -1) boardCardsEl.removeChild(ch);
        });
        desired.forEach(function (el, i) {
            el.style.animationDelay = '';   // board cards don't use the hand's staggered delay
            if (boardCardsEl.children[i] !== el) boardCardsEl.insertBefore(el, boardCardsEl.children[i] || null);
        });
        if (boardMoreEl) boardMoreEl.style.display = overlap ? '' : 'none';
    }
    function renderDiscard() {
        if (!discardPile) return;
        discardPile.innerHTML = '';
        if (discardCount) discardCount.textContent = state.discard.length;
        discardPile.classList.toggle('pt-stacked', state.discard.length > 1);
        if (state.discard.length) {
            var top = state.discard[state.discard.length - 1];
            var face;
            if (top.unique) {
                face = document.createElement('altered-card');
                face.setAttribute('ref', top.ref); face.setAttribute('locale', handLang);
            } else {
                face = document.createElement('img');
                face.className = 'deck-card-img'; face.src = top.img || ''; face.alt = top.name || top.ref; face.loading = 'lazy';
            }
            discardPile.appendChild(face);
        }
    }
    function openBoardList() {
        if (typeof window.acOpenCardListModal === 'function') window.acOpenCardListModal(handTxt.boardList, state.board, null);
    }
    function openDiscardList() {
        if (typeof window.acOpenCardListModal === 'function') {
            window.acOpenCardListModal(handTxt.discardList, state.discard, { label: handTxt.returnHand, fn: function (c) { moveCard(c.id, 'hand'); } });
        }
    }
    function renderSummary() {
        var counts = { CHARACTER: 0, SPELL: 0, OTHER: 0 }, costTotal = 0;
        state.hand.forEach(function (c) {
            if (c.type === 'CHARACTER') counts.CHARACTER++;
            else if (c.type === 'SPELL') counts.SPELL++;
            else counts.OTHER++;
            costTotal += c.mainCost;
        });
        var avg = state.hand.length ? (costTotal / state.hand.length).toFixed(1) : '0.0';
        summaryEl.innerHTML =
            '<span class="hand-stat">' + handTxt.characters + ' <b>' + counts.CHARACTER + '</b></span>' +
            '<span class="hand-stat">' + handTxt.spells + ' <b>' + counts.SPELL + '</b></span>' +
            '<span class="hand-stat">' + handTxt.permanents + ' <b>' + counts.OTHER + '</b></span>' +
            '<span class="hand-stat">' + handTxt.avgCost + ' <b>' + avg + '</b></span>';
    }
    function renderHand() {
        if (!state.hand.length && !state.deck.length) {
            summaryEl.innerHTML = '';
            handEl.innerHTML = '<p class="text-muted" style="font-size:.9rem;margin:0">' + handTxt.empty + '</p>';
            return;
        }
        // Reconcile in place (move, don't rebuild): keep existing card elements
        // attached so only freshly-added cards replay their entrance animation.
        var desired = state.hand.map(elFor);
        Array.prototype.slice.call(handEl.childNodes).forEach(function (ch) {
            if (desired.indexOf(ch) === -1) handEl.removeChild(ch);   // drops the empty-state <p> too
        });
        desired.forEach(function (el, i) {
            el.style.animationDelay = (i * 45) + 'ms';
            if (handEl.children[i] !== el) handEl.insertBefore(el, handEl.children[i] || null);
        });
        renderSummary();
    }
    function reset() {
        var pool = shuffle(buildPool());
        var n = Math.min(HAND_SIZE, pool.length);
        state.phase   = 'setup';
        state.hand    = pool.slice(0, n);
        state.deck    = pool.slice(n);
        state.mana    = [];
        state.board   = [];
        state.discard = [];
        state.manaSel = {};
        renderHand();
        renderMana();
        updatePhaseUI();
        renderDeck();
        renderBoard();
        renderDiscard();
        started = true;
    }

    function selectedIds() { return Object.keys(state.manaSel); }
    function toggleManaSelect(card) {
        if (state.phase !== 'setup') return;
        if (state.manaSel[card.id]) {
            delete state.manaSel[card.id];
            card.el.classList.remove('pt-flipped');
        } else {
            if (selectedIds().length >= 3) return;   // max 3
            state.manaSel[card.id] = true;
            card.el.classList.add('pt-flipped');
        }
        updateCommitUI();
    }
    function updateCommitUI() {
        if (!commitBtn) return;
        if (state.phase === 'setup') {
            commitBtn.style.display = '';
            commitBtn.disabled = selectedIds().length !== 3;
        } else {
            commitBtn.style.display = 'none';
        }
    }
    function updatePhaseUI() {
        if (phaseHint) phaseHint.style.display = state.phase === 'setup' ? '' : 'none';
        document.getElementById('deck-hand-view').classList.toggle('pt-play', state.phase === 'play');
        updateCommitUI();
        renderDeck();
    }
    function renderMana() {
        if (manaCount) manaCount.textContent = state.mana.length;
    }
    function renderDeck() {
        if (deckCountEl) deckCountEl.textContent = state.deck.length;
        if (deckZoneEl) deckZoneEl.classList.toggle('pt-empty', state.deck.length === 0);
    }
    function drawFromDeck(n) {
        if (state.phase !== 'play') return;
        var k = Math.min(n, state.deck.length);
        for (var i = 0; i < k; i++) {
            var card = state.deck.shift();
            state.hand.push(card);
            var el = elFor(card);
            el.classList.add('pt-draw-anim');
        }
        renderHand();
        renderDeck();
    }
    function sendCardToMana(card) {
        if (state.phase !== 'play') return;
        if (state.hand.indexOf(card) === -1) return;   // already leaving the hand (guards double-click)
        card.el.classList.add('pt-flipped');
        card.el.classList.add('pt-to-mana');
        state.hand = state.hand.filter(function (c) { return c.id !== card.id; });
        state.mana.push(card);
        setTimeout(function () {
            if (card.el && card.el.parentNode) card.el.parentNode.removeChild(card.el);
            card.el.classList.remove('pt-to-mana');
            renderHand();
        }, 320);
        renderMana();
    }
    function commitInitialMana() {
        if (state.phase !== 'setup' || selectedIds().length !== 3) return;
        // animate out, then move to mana
        state.hand.filter(function (c) { return state.manaSel[c.id]; })
                  .forEach(function (c) { c.el.classList.add('pt-to-mana'); });
        var moving = state.hand.filter(function (c) { return state.manaSel[c.id]; });
        state.hand = state.hand.filter(function (c) { return !state.manaSel[c.id]; });
        state.mana = state.mana.concat(moving);
        state.manaSel = {};
        state.phase = 'play';
        // after the fly-out animation, re-render the hand (elements removed)
        setTimeout(function () {
            moving.forEach(function (c) { if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el); c.el.classList.remove('pt-to-mana','pt-flipped'); });
            renderHand();
        }, 320);
        renderMana();
        updatePhaseUI();
        renderDeck();
    }
    function openManaList() {
        if (typeof window.acOpenCardListModal === 'function') {
            window.acOpenCardListModal(handTxt.manaList, state.mana, null);
        }
    }

    var MOBILE_MQ = window.matchMedia ? window.matchMedia('(max-width: 720px)') : null;
    function isMobile() { return MOBILE_MQ ? MOBILE_MQ.matches : (window.innerWidth <= 720); }
    function openZoom(card) {
        var img = card.el ? card.el.querySelector('img') : null;
        if (window.acOpenCardZoom) window.acOpenCardZoom(card.ref, !!card.unique, handLang, img ? img.src : (card.img || ''));
    }
    var justDragged = false;

    handEl.addEventListener('click', function (e) {
        if (e.target.closest('.pt-loupe') || e.target.closest('.pt-tomana')) return;  // buttons handle their own click
        if (justDragged) { justDragged = false; return; }                             // ignore the click that ends a drag
        var wrap = e.target.closest('.pt-card');
        if (!wrap || !handEl.contains(wrap)) return;
        var card = state.hand.filter(function (c) { return c.id === wrap.dataset.id; })[0];
        if (!card) return;
        if (isMobile()) { openZoom(card); return; }   // mobile: tap = zoom (playground disabled)
        toggleManaSelect(card);                        // desktop setup: flip-select (no-op in play phase)
    });
    if (commitBtn) commitBtn.addEventListener('click', commitInitialMana);
    if (manaBadge) {
        manaBadge.addEventListener('click', openManaList);
        manaBadge.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openManaList(); } });
    }
    if (boardMoreEl) boardMoreEl.addEventListener('click', function (e) { e.preventDefault(); openBoardList(); });
    if (discardPile) document.getElementById('pt-discard').addEventListener('click', function (e) {
        if (e.target.closest('.pt-card')) return;
        openDiscardList();
    });
    if (drawBtn) drawBtn.addEventListener('click', reset);
    if (tabBtn)  tabBtn.addEventListener('click', function () { if (!started) reset(); });
    if (deckZoneEl) {
        deckZoneEl.addEventListener('click', function () { drawFromDeck(1); });
        deckZoneEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drawFromDeck(1); } });
    }

    // Custom pointer-events drag-and-drop (mouse + touch). Desktop, play phase only.
    function setupDrag() {
        var DRAG_THRESHOLD = 6;   // px of movement before a press becomes a drag
        var drag = null;          // { el, id, startX, startY, moved, dz }

        function dropzoneAt(x, y) {
            var zones = document.querySelectorAll('.pt-dropzone');
            for (var i = 0; i < zones.length; i++) {
                var z = zones[i];
                if (z.offsetParent === null) continue;          // skip hidden zones
                var r = z.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z;
            }
            return null;
        }
        function onMove(e) {
            if (!drag) return;
            var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
            if (!drag.moved) {
                if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
                drag.moved = true;
                drag.el.classList.add('pt-dragging');
            }
            e.preventDefault();
            drag.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
            var z = dropzoneAt(e.clientX, e.clientY);
            z = (z && z.dataset.zone) ? z : null;
            if (z !== drag.dz) {
                if (drag.dz) drag.dz.classList.remove('pt-drop-hover');
                drag.dz = z;
                if (drag.dz) drag.dz.classList.add('pt-drop-hover');
            }
        }
        function onUp(e) {
            if (!drag) return;
            var d = drag; drag = null;
            d.el.removeEventListener('pointermove', onMove);
            d.el.removeEventListener('pointerup', onUp);
            d.el.removeEventListener('pointercancel', onUp);
            try { d.el.releasePointerCapture(e.pointerId); } catch (_) {}
            d.el.classList.remove('pt-dragging');
            d.el.style.transform = '';
            if (d.dz) d.dz.classList.remove('pt-drop-hover');
            if (d.moved) {
                justDragged = true;                               // swallow the trailing click
                var target = dropzoneAt(e.clientX, e.clientY) || d.dz;   // zone under the release point
                if (target && target.dataset.zone) moveCard(d.id, target.dataset.zone);
            }
        }
        function onDown(e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;   // left button only
            if (isMobile() || state.phase !== 'play') return;          // desktop play-phase action only
            if (e.target.closest('.pt-loupe') || e.target.closest('.pt-tomana')) return;
            var el = e.target.closest('.pt-card');
            if (!el) return;
            drag = { el: el, id: el.dataset.id, startX: e.clientX, startY: e.clientY, moved: false, dz: null };
            try { el.setPointerCapture(e.pointerId); } catch (_) {}
            el.addEventListener('pointermove', onMove);
            el.addEventListener('pointerup', onUp);
            el.addEventListener('pointercancel', onUp);
        }
        function noNativeDrag(e) { e.preventDefault(); }   // kill the browser's native image/element drag
        handEl.addEventListener('pointerdown', onDown);
        handEl.addEventListener('dragstart', noNativeDrag);
        if (boardCardsEl) {
            boardCardsEl.addEventListener('pointerdown', onDown);
            boardCardsEl.addEventListener('dragstart', noNativeDrag);
        }
    }
    setupDrag();
}());
