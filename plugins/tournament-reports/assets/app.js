(function () {
    'use strict';

    /* ── References ─────────────────────────────────────────────────────── */
    var lightboxEl    = document.getElementById('tr-lightbox');
    var lightboxInner = document.getElementById('tr-lightbox-inner');

    var currentData   = null;
    var currentView   = {};
    var currentVariant = {};   // pid -> index of the deck variant currently shown
    var currentOpenDeck = null;
    var rankings      = TR_EXISTING_RANKINGS || [];
    var playerDecks   = {};
    var cardNames     = {};          // ref -> translated name
    var heroRefs      = {};          // ref -> true (card is a hero)
    var cardNamesLoading = {};       // ref -> true (in-flight)
    var pendingRefs   = {};          // ref -> true (name still being resolved)
    var rendererLoaded = false;
    var rendererLoading = false;
    var RENDERER_SRC  = 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js';

    /* ── Helpers ────────────────────────────────────────────────────────── */
    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function cardImgUrl(ref, lang) {
        var p   = ref.split('_');
        var set = p[1] || 'CORE';
        return TR_CDN + '/cards/' + encodeURIComponent(lang) + '/' + encodeURIComponent(set) + '/' + encodeURIComponent(ref) + '.webp';
    }

    // Hero cover art lives under /cards/hero/{normalized}_1.webp.
    // Mirrors normalizeCardRef in core-altered-cards/includes/functions.php.
    function heroCardImgUrl(ref) {
        var p = ref.split('_');
        if (p[2] === 'P')    p[2] = 'B';
        if (p[1] === 'BISE') p[1] = 'CORE';
        return TR_CDN + '/cards/hero/' + encodeURIComponent(p.join('_')) + '_1.webp';
    }

    function factionImgUrl(f) {
        if (!f) return '';
        return TR_BASE + '/plugins/core-altered-cards/assets/faction/' + encodeURIComponent(f) + '.png';
    }

    function isUnique(ref) {
        var p = ref.split('_');
        return p[5] && p[5].charAt(0) === 'U';
    }

    function factionLabel(f) {
        var map = {
            'YZ': 'Yzmir', 'BR': 'Bravos', 'OR': 'Ordis',
            'LY': 'Lyra', 'MU': 'Muna', 'AX': 'Axiom'
        };
        return map[f] || f || '';
    }

    function factionColor(f) {
        var map = {
            'YZ': '#764891', 'BR': '#c32637', 'OR': '#0f6593',
            'LY': '#cf4171', 'MU': '#3d6b42', 'AX': '#8c432a'
        };
        return map[f] || '';
    }

    function formatDate(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso);
            return d.toLocaleDateString(TR_UI_LANG === 'fr' ? 'fr-FR' : 'en-GB', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch(_) { return iso; }
    }

    function extractPlayers(games) {
        var seen = {};
        var list = [];
        (games || []).forEach(function (g) {
            (g.endGamePlayers || []).forEach(function (p) {
                if (!seen[p.id]) {
                    seen[p.id] = true;
                    list.push({ id: p.id, name: p.name, faction: p.faction });
                }
            });
        });
        return list;
    }

    /* ── Card name resolution via Cards API ───────────────────────────────── */
    function resolveCardName(ref) {
        // Prefer an already-loaded translated name.
        if (cardNames[ref]) return cardNames[ref];
        return ref;
    }

    // The hero is the card whose type is HERO (API-provided); fall back to the
    // first deck card when the type is not known yet.
    function heroName(deck) {
        var cards = (deck && deck.deck) || [];
        if (!cards.length) return '';
        for (var i = 0; i < cards.length; i++) {
            if (heroRefs[cards[i].reference]) {
                return resolveCardName(cards[i].reference);
            }
        }
        return resolveCardName(cards[0].reference);
    }

    // The hero card object from a deck, or the first card as a fallback.
    function heroCard(deck) {
        var cards = (deck && deck.deck) || [];
        if (!cards.length) return null;
        for (var i = 0; i < cards.length; i++) {
            if (heroRefs[cards[i].reference]) return cards[i];
        }
        return cards[0];
    }

    function collectRefs(cards) {
        var refs = [];
        (cards || []).forEach(function (c) {
            if (c.reference && !cardNames[c.reference] && refs.indexOf(c.reference) === -1) {
                refs.push(c.reference);
            }
        });
        return refs;
    }

    function fetchCardNames(cards) {
        if (!TR_CARDS_API_URL) { updateNamesLoader(); return; }
        var refs = collectRefs(cards);
        if (!refs.length) { updateNamesLoader(); return; }

        var toFetch = refs.filter(function (r) { return !cardNamesLoading[r]; });
        if (!toFetch.length) { updateNamesLoader(); return; }
        toFetch.forEach(function (r) {
            cardNamesLoading[r] = true;
            pendingRefs[r] = true;
        });
        updateNamesLoader();

        var chunks = [];
        for (var i = 0; i < toFetch.length; i += 200) {
            chunks.push(toFetch.slice(i, i + 200));
        }

        chunks.forEach(function (chunk) {
            fetch(TR_CARDS_API_URL + '/api/cards/batch?locale=' + encodeURIComponent(TR_LANG), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ references: chunk })
            })
            .then(function (r) { return r.json(); })
            .then(function (list) {
                list = Array.isArray(list) ? list : (list && Array.isArray(list.member) ? list.member : []);
                list.forEach(function (card) {
                    if (!card || !card.reference) return;
                    cardNamesLoading[card.reference] = false;
                    delete pendingRefs[card.reference];
                    var nm = card.name;
                    var name;
                    if (nm && typeof nm === 'object' && !Array.isArray(nm)) {
                        name = nm[TR_LANG] || nm.en || '';
                    } else {
                        name = String(nm || '');
                    }
                    if (name) cardNames[card.reference] = name;
                    var cardType = card.cardType && card.cardType.reference;
                    if (cardType === 'HERO') heroRefs[card.reference] = true;
                });
                refreshDeckNames();
                updateNamesLoader();
            })
            .catch(function () {
                chunk.forEach(function (r) {
                    cardNamesLoading[r] = false;
                    delete pendingRefs[r];
                });
                updateNamesLoader();
            });
        });
    }

    function updateNamesLoader() {
        var loadingEl = document.getElementById('tr-page-loader');
        if (!loadingEl) return;
        var hasPending = false;
        for (var r in pendingRefs) { if (pendingRefs.hasOwnProperty(r)) { hasPending = true; break; } }
        loadingEl.style.display = hasPending ? '' : 'none';

        var contentEl = document.getElementById('tr-page-content');
        if (contentEl) contentEl.style.display = hasPending ? 'none' : '';
    }

    function refreshDeckNames() {
        document.querySelectorAll('.tr-decklist-table tbody tr').forEach(function (tr) {
            var ref = tr.dataset.ref;
            if (!ref || !cardNames[ref]) return;
            var td = tr.querySelector('.tr-deck-name');
            if (td) td.textContent = cardNames[ref];
        });
        Object.keys(playerDecks).forEach(function (pid) {
            var deck = playerDecks[pid];
            var hero = heroName(deck);
            if (!hero) return;
            var fSrc = factionImgUrl(deck.faction);
            document.querySelectorAll('.tr-player-link[data-player-id="' + CSS.escape(pid) + '"]').forEach(function (btn) {
                var row = btn.closest('tr');
                if (!row) return;
                var badge = row.querySelector('.tr-rank-hero');
                if (badge) {
                    badge.innerHTML = (fSrc ? '<img class="tr-rank-hero-faction" src="' + esc(fSrc) + '" alt=""> ' : '') + esc(hero);
                }
            });
        });
    }

    /* ── Load altered-card renderer on demand ────────────────────────────── */
    function loadRenderer(callback) {
        if (rendererLoaded) { callback(); return; }
        if (rendererLoading) {
            var wait = setInterval(function () {
                if (rendererLoaded) { clearInterval(wait); callback(); }
            }, 50);
            return;
        }
        rendererLoading = true;
        var s = document.createElement('script');
        s.src = RENDERER_SRC;
        s.onload = function () { rendererLoaded = true; rendererLoading = false; callback(); };
        document.head.appendChild(s);
    }

    /* ── Build player decks lookup from games ───────────────────────────── */
    function buildPlayerDecks(games) {
        var playerDecks = {};
        (games || []).forEach(function (g) {
            (g.endGamePlayers || []).forEach(function (p) {
                if (!playerDecks[p.id]) {
                    playerDecks[p.id] = {
                        name: p.name, faction: p.faction,
                        playedCards: p.playedCards || [],
                        decks: [],          // distinct non-empty deck variants
                        hasEmptyDeck: false
                    };
                }
                var pd = playerDecks[p.id];
                var deck = p.deck || [];
                if (!deck.length) { pd.hasEmptyDeck = true; return; }

                // Group distinct decklists: same set of card references = same deck.
                var sig = deck.map(function (c) { return c.reference; }).sort().join('|');
                var variant = null;
                for (var i = 0; i < pd.decks.length; i++) {
                    if (pd.decks[i].signature === sig) { variant = pd.decks[i]; break; }
                }
                if (!variant) {
                    variant = { signature: sig, deck: deck.slice(), faction: p.faction, games: [] };
                    pd.decks.push(variant);
                }
                variant.games.push(g.tableId || null);
                if (!pd.faction && p.faction) pd.faction = p.faction;
            });
        });
        Object.keys(playerDecks).forEach(function (pid) {
            var pd = playerDecks[pid];
            // Primary "deck" = first non-empty variant (keeps legacy consumers working).
            var primary = pd.decks[0] || { deck: [], faction: pd.faction };
            pd.deck = primary.deck;
            pd.faction = pd.faction || primary.faction;
        });
        return playerDecks;
    }

    /* ── Preload standard card images during page load ─────────────────── */
    function preloadCardImages() {
        var urls = [];
        Object.keys(playerDecks).forEach(function (pid) {
            playerAllDeckLists(pid).forEach(function (deck) {
                (deck || []).forEach(function (c) {
                    var ref = c.reference;
                    if (!ref) return;
                    var url = cardImgUrl(ref, TR_LANG);
                    if (urls.indexOf(url) === -1) urls.push(url);
                });
            });
        });
        urls.forEach(function (url) {
            var img = new Image();
            img.src = url;
        });
    }

    // All distinct decklist arrays for a player (falls back to the merged one).
    function playerAllDeckLists(pid) {
        var pd = playerDecks[pid];
        if (!pd) return [];
        return (pd.decks && pd.decks.length)
            ? pd.decks.map(function (v) { return v.deck; })
            : [pd.deck || []];
    }

    /* ── Render tournament ──────────────────────────────────────────────── */
    function renderTournament(data) {
        currentData = data;
        playerDecks = buildPlayerDecks(data.games || []);

        preloadCardImages();

        document.getElementById('tr-tournament-name').textContent = data.tournamentName || ('Tournament #' + data.tournamentId);

        var games = data.games || [];
        if (games.length) {
            var fmt = games[0].format;
            if (fmt) {
                document.getElementById('tr-tournament-format').innerHTML = '<i class="fa-solid fa-shield me-1"></i>' + esc(fmt);
            }
            var dates = games.map(function(g) { return g.receivedAt; }).filter(Boolean).sort();
            if (dates.length) {
                document.getElementById('tr-tournament-date').innerHTML = '<i class="fa-regular fa-calendar me-1"></i>' + esc(formatDate(dates[0]));
            }
        }

        if (TR_LOCALIZATION) {
            document.getElementById('tr-tournament-loc').innerHTML = '<i class="fa-solid fa-location-dot me-1"></i>' + esc(TR_LOCALIZATION);
        }

        var playerCount = Object.keys(playerDecks).length;
        if (playerCount) {
            document.getElementById('tr-tournament-players').innerHTML = '<i class="fa-solid fa-users me-1"></i>' + esc(TR_TXT.players_count.replace('%d', playerCount));
        }

        // Prefetch all translated card names up front.
        var allDeckCards = [];
        Object.keys(playerDecks).forEach(function (pid) {
            playerAllDeckLists(pid).forEach(function (deck) {
                allDeckCards = allDeckCards.concat(deck || []);
            });
        });
        fetchCardNames(allDeckCards);

        renderRankings();
        updateNamesLoader();
    }

    /* ── Deck rendering helpers ──────────────────────────────────────────── */
    function renderDeckCards(cards, pid) {
        if (!cards || !cards.length) return '';
        var hasUnique = false;
        cards.forEach(function (c) { if (isUnique(c.reference)) hasUnique = true; });

        var html = '<div class="tr-decklist-cards tr-decklist-cards--' + esc(pid) + '">';
        cards.forEach(function (c) {
            var ref = c.reference;
            var qty = c.quantity || 1;
            var uniq = isUnique(ref);
            html += '<div class="tr-card-wrap" data-ref="' + esc(ref) + '" data-lang="' + esc(TR_LANG) + '" data-unique="' + (uniq ? '1' : '0') + '">';
            html += '<span class="tr-card-qty">\u00d7' + qty + '</span>';
            if (uniq) {
                html += '<altered-card ref="' + esc(ref) + '" locale="' + esc(TR_LANG) + '"></altered-card>';
            } else {
                html += '<img src="' + esc(cardImgUrl(ref, TR_LANG)) + '" alt="' + esc(ref) + '" loading="lazy">';
            }
            html += '</div>';
        });
        html += '</div>';

        if (hasUnique && !rendererLoaded && !rendererLoading) {
            loadRenderer(function () {});
        }

        return html;
    }

    function renderDeckList(cards, pid) {
        if (!cards || !cards.length) return '';
        var html = '<div class="tr-decklist-table--' + esc(pid) + '" style="display:none"><table class="tr-decklist-table">';
        html += '<thead><tr><th>' + esc(TR_TXT.qty) + '</th><th>' + esc(TR_TXT.card) + '</th></tr></thead><tbody>';
        cards.forEach(function (c) {
            var ref = c.reference;
            var qty = c.quantity || 1;
            html += '<tr data-ref="' + esc(ref) + '">';
            html += '<td style="white-space:nowrap;font-weight:700">\u00d7' + qty + '</td>';
            html += '<td class="tr-deck-name">' + esc(resolveCardName(ref)) + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }

    // Faction-colored banner backed by the hero card image, like deck.php's
    // deck-hdr-banner. Clicking it opens the card lightbox.
    function renderHeroBanner(heroCard, deck) {
        if (!heroCard || !heroCard.reference) return '';
        var ref = heroCard.reference;
        var faction = deck && deck.faction;
        var color = factionColor(faction);
        var imgUrl = heroCardImgUrl(ref);
        var uniq = isUnique(ref);
        var hero = resolveCardName(ref);

        var html = '<div class="tr-panel-hero-banner" data-ref="' + esc(ref) + '" data-lang="' + esc(TR_LANG) + '" data-unique="' + (uniq ? '1' : '0') + '" role="button" tabindex="0" aria-label="' + esc(hero) + '"';
        var gradient = color
            ? 'linear-gradient(to right,' + color + ' 35%,' + color + '00 100%),'
            : 'linear-gradient(to right,rgba(0,0,0,.55),rgba(0,0,0,.05)),';
        html += ' style="background-image:' + gradient + 'url(' + esc(imgUrl) + ');background-size:cover;background-position:left top;"';
        html += '>';
        html += '<div class="tr-panel-hero-info">';
        if (faction) {
            html += '<img src="' + esc(factionImgUrl(faction)) + '" class="tr-panel-hero-faction" alt="' + esc(faction) + '">';
        }
        html += '<div class="tr-panel-hero-titles">';
        html += '<div class="tr-panel-hero-name">' + esc(hero) + '</div>';
        html += '<div class="tr-panel-hero-label">' + esc(TR_TXT.hero_label || 'Hero') + '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function syncView(pid) {
        var mode = currentView[pid] || 'images';
        var cardsEl = document.querySelector('.tr-decklist-cards--' + CSS.escape(pid));
        var listEl  = document.querySelector('.tr-decklist-table--' + CSS.escape(pid));
        if (cardsEl) cardsEl.style.display = mode === 'images' ? '' : 'none';
        if (listEl)  listEl.style.display  = mode === 'list' ? '' : 'none';
    }

    /* ── Rankings ──────────────────────────────────────────────────────── */
    function renderRankings() {
        var el = document.getElementById('tr-ranking-section');

        if (!rankings.length) {
            el.innerHTML = '<div class="tr-empty-state"><i class="fa-solid fa-trophy"></i><p>' + esc(TR_TXT.ranking_empty) + '</p></div>';
            return;
        }

        var html = '';
        rankings.forEach(function (r) {
            html += renderRankingCard(r);
        });
        el.innerHTML = html;
    }

    function renderRankingCard(r) {
        var html = '<div class="tr-ranking-card" data-ranking-id="' + r.id + '">';
        html += '<div class="tr-ranking-header">';
        html += '<span class="tr-ranking-title">' + esc(r.tournament_name || ('Ranking #' + r.id)) + '</span>';
        html += '</div>';

        if (r.players && r.players.length) {
            html += '<table class="tr-ranking-table"><thead><tr>';
            html += '<th style="width:50px">' + esc(TR_TXT.ranking_position) + '</th>';
            html += '<th>' + esc(TR_TXT.ranking_player) + '</th>';
            html += '</tr></thead><tbody>';
            r.players.forEach(function (p, i) {
                var posClass = '';
                if (i === 0) posClass = ' tr-ranking-pos-1';
                else if (i === 1) posClass = ' tr-ranking-pos-2';
                else if (i === 2) posClass = ' tr-ranking-pos-3';
                var hasDeck = p.player_id && playerDecks[p.player_id];
                var deck = hasDeck ? playerDecks[p.player_id] : null;
                var multipleDecks = !!(deck && deck.decks && deck.decks.length > 1);
                // Only open the side panel when there is a real decklist
                // (more than just the hero card).
                var hasDecklist = hasDeck && (deck.deck || []).length > 1;
                var noData = !deck || !deck.deck || deck.deck.length === 0;
                var hero = deck ? heroName(deck) : '';
                var fSrc = deck ? factionImgUrl(deck.faction) : '';
                var badge = '';
                if (deck) {
                    if (multipleDecks) {
                        badge = ' <span class="tr-badge tr-badge-multi" title="' + esc(TR_TXT.multiple_decks) + '">' + esc(TR_TXT.multiple_decks) + '</span>';
                    } else if (noData) {
                        badge = ' <span class="tr-badge tr-badge-nodata" title="' + esc(TR_TXT.no_data) + '">' + esc(TR_TXT.no_data) + '</span>';
                    }
                }
                html += '<tr class="tr-rank-row">';
                html += '<td class="tr-ranking-pos' + posClass + '">';
                html += '<span class="tr-rank-position">' + (i + 1) + '</span>';
                html += '</td>';
                html += '<td >' + (hasDecklist
                    ? '<button type="button" class="tr-player-link" data-player-id="' + esc(p.player_id) + '">' + esc(p.player_name) + '</button>'
                    : esc(p.player_name));
                html += badge;
                html += '</td>';
                html += '<td>'
                if (hero) {
                    html += ' <span class="tr-rank-hero">';
                    if (fSrc) html += '<img class="tr-rank-hero-faction" src="' + esc(fSrc) + '" alt=""> ';
                    html += esc(hero) + '</span>';
                }
                html += '</td>';
                html += '</tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<div class="text-muted small">' + esc(TR_TXT.ranking_no_players) + '</div>';
        }

        html += '</div>';
        return html;
    }

    /* ── Side panel ─────────────────────────────────────────────────────── */
    function openPlayerPanel(playerId) {
        var pd = playerDecks[playerId];
        if (!pd) return;

        var panel   = document.getElementById('tr-player-panel');
        var body    = document.getElementById('tr-player-panel-body');
        var title   = document.getElementById('tr-player-panel-title');
        var backdrop = document.getElementById('tr-player-panel-backdrop');
        var viewId  = 'panel_' + playerId;
        currentView[viewId] = currentView[viewId] || 'images';
        if (typeof currentVariant[playerId] !== 'number') currentVariant[playerId] = 0;

        var variants = (pd.decks && pd.decks.length) ? pd.decks : [{ deck: pd.deck || [], faction: pd.faction }];
        var vi = currentVariant[playerId];
        if (!variants[vi]) vi = 0;
        var deck = variants[vi];
        var hero = heroName(deck);
        var heroCardObj = heroCard(deck);

        title.textContent = (hero ? hero + " - " : "") + pd.name;

        var html = '<div class="tr-panel-decklist">';

        if (variants.length > 1) {
            html += '<div class="tr-deck-variants">';
            variants.forEach(function (v, i) {
                html += '<button type="button" class="tr-deck-variant-btn' + (i === vi ? ' active' : '') + '" data-pid="' + esc(playerId) + '" data-variant="' + i + '" title="' + esc(TR_TXT.variant_deck.replace('%d', i + 1)) + '">' + esc(TR_TXT.variant_deck.replace('%d', i + 1)) + '</button>';
            });
            html += '</div>';
        }

        html += '<div class="tr-view-toggle">';
        html += '<button type="button" class="tr-view-export" id="tr-player-panel-export" title="' + esc(TR_TXT.copy_btn || 'Copy decklist') + '"><i class="fa-solid fa-clipboard-list"></i></button>';
        html += '<button type="button" class="tr-view-btn' + (currentView[viewId] === 'list' ? ' active' : '') + '" data-view="list" data-pid="' + esc(viewId) + '"><i class="fa-solid fa-list"></i> ' + esc(TR_TXT.view_list) + '</button>';
        html += '<button type="button" class="tr-view-btn' + (currentView[viewId] === 'images' ? ' active' : '') + '" data-view="images" data-pid="' + esc(viewId) + '"><i class="fa-solid fa-grip"></i> ' + esc(TR_TXT.view_images) + '</button>';
        html += '</div>';

        // Hero shown as a banner, the rest of the deck in the grid/list.
        html += renderHeroBanner(heroCardObj, deck);
        var rest = (deck.deck || []).filter(function (c) { return c !== heroCardObj; });
        html += renderDeckList(rest, viewId);
        html += renderDeckCards(rest, viewId);

        html += '</div>';
        body.innerHTML = html;

        syncView(viewId);
        backdrop.style.display = 'block';
        panel.classList.add('tr-panel-open');
        document.body.style.overflow = 'hidden';
        currentOpenDeck = deck;
    }

    function closePlayerPanel() {
        var panel = document.getElementById('tr-player-panel');
        var backdrop = document.getElementById('tr-player-panel-backdrop');
        panel.classList.remove('tr-panel-open');
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
        currentOpenDeck = null;
    }

    /* ── Export / copy decklist ─────────────────────────────────────────── */
    // Build a plain-text decklist that mirrors the deck.php copy format:
    // the hero (qty 1) first, then "<qty> <reference>" per card.
    function buildDecklistText(deck) {
        var cards = (deck && deck.deck) || [];
        if (!cards.length) return '';
        var hero = heroCard(deck);
        var lines = [];
        if (hero) lines.push('1 ' + hero.reference);
        cards.forEach(function (c) {
            if (c === hero) return;
            var qty = c.quantity || 1;
            lines.push(qty + ' ' + c.reference);
        });
        return lines.join('\n');
    }

    function copyDecklist() {
        if (!currentOpenDeck) return;
        var text = buildDecklistText(currentOpenDeck);
        if (!text) return;
        var btn = document.getElementById('tr-player-panel-export');
        var copyLabel = TR_TXT.copy_btn || 'Copy decklist';
        var copiedLabel = TR_TXT.copy_ok || 'Copied!';
        function restore() {
            if (!btn) return;
            btn.innerHTML = '<i class="fa-solid fa-clipboard-list"></i>';
            btn.title = copyLabel;
        }
        function success() {
            if (!btn) return;
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            btn.title = copiedLabel;
            setTimeout(restore, 2000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(success).catch(function () { fallback(); });
        } else {
            fallback();
        }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            success();
        }
    }

    /* ── View toggle (images/list) ──────────────────────────────────────── */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tr-view-btn');
        if (!btn) return;
        var pid  = btn.dataset.pid;
        var mode = btn.dataset.view;
        currentView[pid] = mode;
        btn.closest('.tr-view-toggle').querySelectorAll('.tr-view-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        syncView(pid);
    });

    /* ── Player name → open side panel ──────────────────────────────────── */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tr-player-link');
        if (!btn) return;
        e.preventDefault();
        openPlayerPanel(btn.dataset.playerId);
    });

    /* ── Deck variant switch (multiple decklists) ───────────────────────── */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tr-deck-variant-btn');
        if (!btn) return;
        currentVariant[btn.dataset.pid] = parseInt(btn.dataset.variant, 10);
        openPlayerPanel(btn.dataset.pid);
    });

    /* ── Panel close ────────────────────────────────────────────────────── */
    document.getElementById('tr-player-panel-close').addEventListener('click', closePlayerPanel);
    document.getElementById('tr-player-panel-backdrop').addEventListener('click', closePlayerPanel);
    document.addEventListener('click', function (e) {
        if (e.target.closest('#tr-player-panel-export')) copyDecklist();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.getElementById('tr-player-panel').classList.contains('tr-panel-open')) {
            closePlayerPanel();
        }
    });

    /* ── Card hover zoom in panel ────────────────────────────────────────── */
    var zoomEl = document.getElementById('tr-panel-zoom');

    function showZoom(ref) {
        if (!ref) return;
        var lang  = TR_LANG;
        var uniq  = isUnique(ref);
        var inner = '';
        if (uniq) {
            inner = '<altered-card ref="' + esc(ref) + '" locale="' + esc(lang) + '" style="width:100%;border-radius:8px;overflow:hidden"></altered-card>';
        } else {
            inner = '<img src="' + esc(cardImgUrl(ref, lang)) + '" alt="' + esc(ref) + '">';
        }
        zoomEl.innerHTML = inner;
        zoomEl.classList.add('tr-panel-zoom-visible');
        if (uniq && !rendererLoaded) loadRenderer(function () {});
    }

    function hideZoom() {
        zoomEl.classList.remove('tr-panel-zoom-visible');
        zoomEl.innerHTML = '';
    }

    document.getElementById('tr-player-panel-body').addEventListener('mouseover', function (e) {
        var cardWrap = e.target.closest('.tr-card-wrap');
        if (cardWrap) {
            showZoom(cardWrap.dataset.ref);
            return;
        }
        var listRow = e.target.closest('.tr-decklist-table tbody tr');
        if (listRow && listRow.dataset.ref) {
            showZoom(listRow.dataset.ref);
        }
    });

    document.getElementById('tr-player-panel-body').addEventListener('mouseout', function (e) {
        var cardWrap = e.target.closest('.tr-card-wrap');
        if (cardWrap) { hideZoom(); return; }
        var listRow = e.target.closest('.tr-decklist-table tbody tr');
        if (listRow) { hideZoom(); }
    });

    /* ── Card detail link helper ─────────────────────────────────────────── */
    function cardDetailUrl(ref, lang) {
        var url = TR_BASE + '/pages/card?ref=' + encodeURIComponent(ref) + '&card_lang=' + encodeURIComponent(lang || TR_LANG);
        if (typeof TR_TOURNAMENT_ID !== 'undefined' && TR_TOURNAMENT_ID) {
            url += '&tournament=' + encodeURIComponent(TR_TOURNAMENT_ID);
        }
        return url;
    }

    /* ── Lightbox ───────────────────────────────────────────────────────── */
    function openLightbox(ref, lang, uniq) {
        function showLightbox() {
            var inner;
            if (uniq) {
                inner = '<altered-card ref="' + esc(ref) + '" locale="' + esc(lang) + '" style="max-width:420px;width:88vw;border-radius:10px;overflow:hidden"></altered-card>';
            } else {
                inner = '<img src="' + esc(cardImgUrl(ref, lang)) + '" style="max-width:420px;width:88vw;border-radius:10px">';
            }
            inner += '<a href="' + esc(cardDetailUrl(ref, lang)) + '" class="btn btn-sm btn-primary-altered" style="display:block;width:100%;margin-top:8px;text-decoration:none"><i class="fa-solid fa-circle-info me-1"></i>' + esc(TR_TXT.detail_label || 'View detail') + '</a>';
            lightboxInner.innerHTML = inner;
            lightboxEl.style.display = 'flex';
        }

        if (uniq && !rendererLoaded) {
            loadRenderer(showLightbox);
        } else {
            showLightbox();
        }
    }

    document.addEventListener('click', function (e) {
        var cardWrap = e.target.closest('.tr-card-wrap');
        var banner = e.target.closest('.tr-panel-hero-banner');
        var hit = cardWrap || banner;
        if (!hit) return;
        openLightbox(hit.dataset.ref, hit.dataset.lang || TR_LANG, hit.dataset.unique === '1');
    });
    document.addEventListener('keydown', function (e) {
        var t = e.target;
        if (!t || t.closest('.tr-panel-hero-banner')) {
            var banner = t.closest && t.closest('.tr-panel-hero-banner');
            if (banner && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                openLightbox(banner.dataset.ref, banner.dataset.lang || TR_LANG, banner.dataset.unique === '1');
            }
        }
    });
    lightboxEl.addEventListener('click', function (e) {
        if (e.target === lightboxEl || e.target === lightboxInner) {
            lightboxEl.style.display = 'none';
            lightboxInner.innerHTML = '';
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lightboxEl.style.display !== 'none') {
            lightboxEl.style.display = 'none';
            lightboxInner.innerHTML = '';
        }
    });

    /* ── Init ───────────────────────────────────────────────────────────── */
    if (typeof TR_TOURNAMENT_DATA !== 'undefined' && TR_TOURNAMENT_DATA) {
        renderTournament(TR_TOURNAMENT_DATA);
    }
})();
