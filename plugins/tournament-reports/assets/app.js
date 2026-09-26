(function () {
    'use strict';

    /* ── References ─────────────────────────────────────────────────────── */
    var lightboxEl    = document.getElementById('tr-lightbox');
    var lightboxInner = document.getElementById('tr-lightbox-inner');
    var chartModalEl   = document.getElementById('tr-chart-modal');
    var chartModalBody = document.getElementById('tr-chart-modal-body');

    var currentData   = null;
    var currentView   = {};
    var currentVariant = {};   // pid -> index of the deck variant currently shown
    var currentOpenDeck = null;
    var currentOpenDeckPlayerId = null;
    var isGameApi     = (typeof TR_IS_GAMEAPI !== 'undefined') && !!TR_IS_GAMEAPI;
    var standings     = (typeof TR_STANDINGS !== 'undefined' && TR_STANDINGS) ? TR_STANDINGS : [];
    var filteredStandings = standings;
    var standingsMap  = {};
    standings.forEach(function (s) { standingsMap[s.id] = s; });
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
            var heroObj = heroCard(deck);
            var faction = deck.faction;
            var fSrc = factionImgUrl(faction);
            document.querySelectorAll('.tr-player-link[data-player-id="' + CSS.escape(pid) + '"]').forEach(function (btn) {
                var row = btn.closest('tr');
                if (!row) return;
                var td = row.querySelector('.tr-rank-hero-cell');
                if (!td) return;
                td.innerHTML = (heroObj && heroObj.reference)
                    ? renderRankHeroBanner(heroObj.reference, faction, hero)
                    : ' <span class="tr-rank-hero">' + (fSrc ? '<img class="tr-rank-hero-faction" src="' + esc(fSrc) + '" alt=""> ' : '') + esc(hero) + '</span>';
                if (heroObj && heroObj.reference) {
                    row.classList.add('tr-rank-row-hero');
                    row.setAttribute('style', rankRowBackground(heroObj.reference, faction));
                }
            });
        });
        // Re-render the currently open panel too, so its hero banner picks
        // up the resolved name instead of staying on the raw reference from
        // before the Cards API batch came back.
        if (currentOpenDeckPlayerId) {
            openPlayerPanel(currentOpenDeckPlayerId);
        }
        // Same for the hero chart's and hero filter's labels — both show
        // resolved card names, which aren't known until this batch resolves.
        if (isGameApi) {
            renderHeroChart();
            populateFilterOptions();
        }
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

    // Faction-colored gradient over the hero card art, shared by the full
    // deck-panel banner and the compact one in the standings row.
    function heroBannerGradient(faction) {
        var color = factionColor(faction);
        return color
            ? 'linear-gradient(to right,' + color + ' 5%,' + color + '00 100%),'
            : 'linear-gradient(to right,rgba(0,0,0,.55),rgba(0,0,0,.05)),';
    }

    function heroBannerBackground(ref, faction) {
        return 'background-image:' + heroBannerGradient(faction) + 'url(' + esc(heroCardImgUrl(ref)) + ');background-size:cover;background-position:left top;';
    }

    // Same gradient + card art, but stretched over the whole standings row
    // (painted on the <tr> itself, so every column sits on the art). The
    // gradient is sized to the full row width, the art covers it so it isn't
    // distorted by the row's aspect ratio.
    function rankRowBackground(ref, faction) {
        return 'background-image:' + heroBannerGradient(faction) + 'url(' + esc(heroCardImgUrl(ref)) + ');background-size:100%,cover;background-position-y:25%;';
    }

    // Faction-colored banner backed by the hero card image, like deck.php's
    // deck-hdr-banner. Clicking it opens the card lightbox.
    function renderHeroBanner(heroCard, deck) {
        if (!heroCard || !heroCard.reference) return '';
        var ref = heroCard.reference;
        var faction = deck && deck.faction;
        var uniq = isUnique(ref);
        var hero = resolveCardName(ref);

        var html = '<div class="tr-panel-hero-banner" data-ref="' + esc(ref) + '" data-lang="' + esc(TR_LANG) + '" data-unique="' + (uniq ? '1' : '0') + '" role="button" tabindex="0" aria-label="' + esc(hero) + '"';
        html += ' style="' + heroBannerBackground(ref, faction) + '"';
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

    // Compact version of the same banner for the standings table's Hero
    // column — just the faction icon + name, laid over the art that the
    // <tr> itself carries (see rankRowBackground()). The whole row already
    // opens the player's deck panel, so this isn't a separate click target
    // (no lightbox, unlike the deck-panel banner).
    function renderRankHeroBanner(ref, faction, hero) {
        if (!ref) return '';
        var html = '<div class="tr-rank-hero-banner">';
        if (faction) {
            html += '<img src="' + esc(factionImgUrl(faction)) + '" class="tr-rank-hero-banner-faction" alt="' + esc(faction) + '">';
        }
        html += '<span class="tr-rank-hero-banner-name">' + esc(hero) + '</span>';
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

    /* ── Standings ─────────────────────────────────────────────────────── */
    // wins/games played/losses desc is the only ranking now — no manual
    // reordering, no separate "Pos." column (it implied an order that could
    // be dragged, which is no longer true).
    function rankRowHtml(s) {
        var hasDeck = s.id && playerDecks[s.id];
        var deck = hasDeck ? playerDecks[s.id] : null;
        var multipleDecks = !!(deck && deck.decks && deck.decks.length > 1);
        var hasDecklist = hasDeck && (deck.deck || []).length > 1;
        var noData = !deck || !deck.deck || deck.deck.length === 0;
        // Prefer the card-name-resolved hero once the Cards API batch has
        // loaded; fall back to GameApi's own already-resolved hero/faction
        // (s.hero/s.faction) otherwise — those are always available even
        // before card names resolve, or when there's no deck to decode.
        var hero = (deck && heroName(deck)) || s.hero || '';
        var faction = s.faction || (deck && deck.faction) || '';
        var fSrc = factionImgUrl(faction);
        var heroObj = deck ? heroCard(deck) : null;
        var badge = '';
        if (deck) {
            if (multipleDecks) {
                badge = ' <span class="tr-badge tr-badge-multi" title="' + esc(TR_TXT.multiple_decks) + '">' + esc(TR_TXT.multiple_decks) + '</span>';
            } else if (noData) {
                badge = ' <span class="tr-badge tr-badge-nodata" title="' + esc(TR_TXT.no_data) + '">' + esc(TR_TXT.no_data) + '</span>';
            }
        }
        var clickable = isGameApi ? !!hero || hasDecklist : hasDecklist;
        var heroRef = (heroObj && heroObj.reference) || '';
        var html = '<tr class="tr-rank-row' + (clickable ? ' tr-rank-row-clickable' : '') + (heroRef ? ' tr-rank-row-hero' : '') + '"'
            + (heroRef ? ' style="' + rankRowBackground(heroRef, faction) + '"' : '')
            + ' data-faction="' + esc(faction || '') + '" data-hero="' + esc(hero || '') + '" data-name="' + esc((s.name || '').toLowerCase()) + '"' + (clickable ? ' data-player-id="' + esc(s.id) + '"' : '') + '>';
        html += '<td>' + (clickable
            ? '<button type="button" class="tr-player-link" data-player-id="' + esc(s.id) + '">' + esc(s.name) + '</button>'
            : esc(s.name));
        html += badge;
        html += '</td>';
        html += '<td class="tr-rank-hero-cell">';
        if (heroRef) {
            html += renderRankHeroBanner(heroRef, faction, hero);
        } else if (hero) {
            html += ' <span class="tr-rank-hero">';
            if (fSrc) html += '<img class="tr-rank-hero-faction" src="' + esc(fSrc) + '" alt=""> ';
            html += esc(hero) + '</span>';
        }
        html += '</td>';
        html += '<td class="tr-rank-wl">' + esc(s.wins + '-' + s.losses) + '</td>';
        html += '</tr>';
        return html;
    }

    function standingsHeaderHtml() {
        return '<th>' + esc(TR_TXT.ranking_player || 'Player') + '</th>'
            + '<th>' + esc(TR_TXT.hero_label || 'Hero') + '</th>'
            + '<th class="tr-rank-wl">' + esc(TR_TXT.wl_header || 'W-L') + '</th>';
    }

    // Standings, computed server-side from wins/games played/losses (see
    // trStandingsFromGameApiPlayers()) — this is the only ranking now,
    // filterable client-side, never reordered.
    function renderStandings() {
        var html = '<div class="tr-ranking-card tr-standings-card">';
        html += '<div class="tr-ranking-header"><span class="tr-ranking-title">' + esc(TR_TXT.standings_title || 'Standings') + '</span></div>';
        html += '<table class="tr-ranking-table"><thead><tr>' + standingsHeaderHtml() + '</tr></thead><tbody>';
        filteredStandings.forEach(function (s) {
            html += rankRowHtml(s);
        });
        html += '</tbody></table></div>';
        return html;
    }

    function renderRankings() {
        var el = document.getElementById('tr-ranking-section');
        if (!el) return;
        el.innerHTML = renderStandings();
    }

    /* ── Deck view (rendered into the side panel) ─────────────────────────── */
    // Builds the decklist markup for one player — variant switcher, view
    // toggle, hero banner, cards — and sets currentOpenDeck/currentView as a
    // side effect. Returns {html, title} for openPlayerPanel() to place in
    // the panel body.
    function buildDeckViewHtml(playerId, viewIdPrefix) {
        var pd = playerDecks[playerId];
        if (!pd) return null;

        var viewId = viewIdPrefix + '_' + playerId;
        currentView[viewId] = currentView[viewId] || 'images';
        if (typeof currentVariant[playerId] !== 'number') currentVariant[playerId] = 0;

        var variants = (pd.decks && pd.decks.length) ? pd.decks : [{ deck: pd.deck || [], faction: pd.faction }];
        var vi = currentVariant[playerId];
        if (!variants[vi]) vi = 0;
        var deck = variants[vi];
        var hero = heroName(deck);
        var heroCardObj = heroCard(deck);

        var html = '<div class="tr-panel-decklist">';

        if (variants.length > 1) {
            html += '<div class="tr-deck-variants">';
            variants.forEach(function (v, i) {
                html += '<button type="button" class="tr-deck-variant-btn' + (i === vi ? ' active' : '') + '" data-pid="' + esc(playerId) + '" data-variant="' + i + '" title="' + esc(TR_TXT.variant_deck.replace('%d', i + 1)) + '">' + esc(TR_TXT.variant_deck.replace('%d', i + 1)) + '</button>';
            });
            html += '</div>';
        }

        html += '<div class="tr-view-toggle">';
        if (TR_LOGGED_IN) {
            html += '<button type="button" class="tr-view-export" id="tr-deck-duplicate" title="' + esc(TR_TXT.duplicate_btn || 'Duplicate') + '"><i class="fa-solid fa-copy"></i> ' + esc(TR_TXT.duplicate_btn || 'Duplicate') + '</button>';
        }
        html += '<button type="button" class="tr-view-export" id="tr-player-panel-export" title="' + esc(TR_TXT.copy_btn || 'Copy decklist') + '"><i class="fa-solid fa-clipboard-list"></i> ' + esc(TR_TXT.copy_btn || 'Copy decklist') + '</button>';
        html += '<button type="button" class="tr-view-btn' + (currentView[viewId] === 'list' ? ' active' : '') + '" data-view="list" data-pid="' + esc(viewId) + '"><i class="fa-solid fa-list"></i> ' + esc(TR_TXT.view_list) + '</button>';
        html += '<button type="button" class="tr-view-btn' + (currentView[viewId] === 'images' ? ' active' : '') + '" data-view="images" data-pid="' + esc(viewId) + '"><i class="fa-solid fa-grip"></i> ' + esc(TR_TXT.view_images) + '</button>';
        html += '</div>';

        // Hero shown as a banner, the rest of the deck in the grid/list.
        html += renderHeroBanner(heroCardObj, deck);
        var rest = (deck.deck || []).filter(function (c) { return c !== heroCardObj; });
        html += renderDeckList(rest, viewId);
        html += renderDeckCards(rest, viewId);

        html += '</div>';

        currentOpenDeck = deck;
        currentOpenDeckPlayerId = playerId;

        return { html: html, title: (hero ? hero + ' - ' : '') + pd.name, viewId: viewId };
    }

    /* ── Side panel — a fixed column pinned to the right of the page on wide
       screens (so it never covers the standings table), and a classic
       off-canvas modal with a dimming backdrop on narrow ones. ───────────── */
    function isPanelPinned() {
        return window.matchMedia('(min-width: 992px)').matches;
    }

    function markActiveRow(playerId) {
        document.querySelectorAll('.tr-rank-row').forEach(function (row) {
            row.classList.remove('tr-rank-row-active');
        });
        var row = document.querySelector('.tr-rank-row[data-player-id="' + CSS.escape(playerId) + '"]');
        if (row) row.classList.add('tr-rank-row-active');
    }

    function openPlayerPanel(playerId) {
        var built = buildDeckViewHtml(playerId, 'panel');
        if (!built) return;

        var panel    = document.getElementById('tr-player-panel');
        var body     = document.getElementById('tr-player-panel-body');
        var title    = document.getElementById('tr-player-panel-title');
        var backdrop = document.getElementById('tr-player-panel-backdrop');
        var pinned   = isPanelPinned();

        title.textContent = built.title;
        body.innerHTML = built.html;
        syncView(built.viewId);
        backdrop.style.display = pinned ? 'none' : 'block';
        panel.classList.add('tr-panel-open');
        document.body.classList.toggle('tr-panel-pinned-open', pinned);
        document.body.style.overflow = pinned ? '' : 'hidden';
        markActiveRow(playerId);
    }

    function closePlayerPanel() {
        var panel = document.getElementById('tr-player-panel');
        var backdrop = document.getElementById('tr-player-panel-backdrop');
        panel.classList.remove('tr-panel-open');
        backdrop.style.display = 'none';
        document.body.classList.remove('tr-panel-pinned-open');
        document.body.style.overflow = '';
        currentOpenDeck = null;
        currentOpenDeckPlayerId = null;
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
            btn.innerHTML = '<i class="fa-solid fa-clipboard-list"></i> ' + esc(copyLabel);
            btn.title = copyLabel;
        }
        function success() {
            if (!btn) return;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> ' + esc(copiedLabel);
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

    /* ── Standings row → show that player's deck in the side panel ───────── */
    function showPlayerDeck(playerId) {
        openPlayerPanel(playerId);
    }

    document.addEventListener('click', function (e) {
        var row = e.target.closest('.tr-rank-row[data-player-id]');
        if (!row) return;
        showPlayerDeck(row.dataset.playerId);
    });

    /* ── Deck variant switch (multiple decklists) ───────────────────────── */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.tr-deck-variant-btn');
        if (!btn) return;
        currentVariant[btn.dataset.pid] = parseInt(btn.dataset.variant, 10);
        showPlayerDeck(btn.dataset.pid);
    });

    /* ── Panel close ────────────────────────────────────────────────────── */
    document.getElementById('tr-player-panel-close').addEventListener('click', closePlayerPanel);
    document.getElementById('tr-player-panel-backdrop').addEventListener('click', closePlayerPanel);
    document.addEventListener('click', function (e) {
        if (e.target.closest('#tr-player-panel-export')) copyDecklist();
    });

    /* ── Duplicate deck onto the logged-in user's own account — same
       interaction as core-altered-cards' deck.php "Dupliquer" button. ────── */
    function duplicateCurrentDeck() {
        if (!currentOpenDeck || !currentOpenDeckPlayerId) return;
        var cards = currentOpenDeck.deck || [];
        if (!cards.length) return;

        var defaultName = (standingsMap[currentOpenDeckPlayerId] ? standingsMap[currentOpenDeckPlayerId].name : '') + ' - ' + (TR_TOURNAMENT_NAME || '');
        var name = window.prompt(TR_TXT.duplicate_prompt || 'Deck name', defaultName.trim());
        if (name === null) return;

        var btn = document.getElementById('tr-deck-duplicate');
        var originalHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }

        var body = 'csrf_token=' + encodeURIComponent(TR_CSRF)
            + '&name=' + encodeURIComponent(name)
            + '&cards=' + encodeURIComponent(JSON.stringify(cards));

        fetch(TR_BASE + '/pages/tournament?id=' + encodeURIComponent(TR_TOURNAMENT_ID) + '&ajax=duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                // Navigate straight to the new deck by id, same as core-altered-cards'
                // own "Dupliquer" button — the "My decks" list can lag behind a
                // just-created deck, so fetching it directly by id is the only
                // reliably immediate way to show the result.
                if (res && res.ok && res.id) {
                    window.location.href = TR_BASE + '/pages/deck?id=' + encodeURIComponent(res.id);
                    return;
                }
                if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
                window.alert((TR_TXT.duplicate_err || 'Could not duplicate this deck: %s').replace('%s', (res && res.error) || ''));
            })
            .catch(function () {
                if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
                window.alert(TR_TXT.duplicate_err || 'Could not duplicate this deck.');
            });
    }

    document.addEventListener('click', function (e) {
        if (e.target.closest('#tr-deck-duplicate')) duplicateCurrentDeck();
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

    if (chartModalEl) {
        var chartModalCloseBtn = document.getElementById('tr-chart-modal-close');
        chartModalEl.addEventListener('click', function (e) {
            if (e.target === chartModalEl) closeChartModal();
        });
        if (chartModalCloseBtn) chartModalCloseBtn.addEventListener('click', closeChartModal);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && chartModalEl.style.display !== 'none') closeChartModal();
        });
    }

    /* ── Faction / hero distribution charts (GameApi tournaments only) ────
       One vote per player, straight from the standings' own faction/hero
       fields (already resolved server-side by GameApi — no deck decoding
       needed for this). Plain conic-gradient donuts + a legend list: the
       legend carries color+icon+label+count so identity is never
       color-alone (this site's faction palette isn't fully CVD-safe by
       hue alone — see the icon+label pairing here and everywhere else
       faction color is used on this site). ──────────────────────────────── */
    var CHART_OTHER_COLOR = '#9ca3af';

    // Lighten (positive percent) or darken (negative) a hex color toward
    // white/black — used to give each hero a shade of its own faction's
    // color instead of an unrelated hue, per the user's request.
    function shadeColor(hex, percent) {
        var num = parseInt(hex.replace('#', ''), 16);
        var target = percent < 0 ? 0 : 255;
        var p = Math.abs(percent) / 100;
        var r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
        r = Math.round((target - r) * p) + r;
        g = Math.round((target - g) * p) + g;
        b = Math.round((target - b) * p) + b;
        return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
    }

    // Every hero belongs to exactly one faction — use whichever player row
    // names it first.
    function heroFactionMap() {
        var map = {};
        standings.forEach(function (s) {
            if (s.hero && s.faction && !map[s.hero]) map[s.hero] = s.faction;
        });
        return map;
    }

    function computeDistribution(key) {
        var counts = {};
        var total = 0;
        standings.forEach(function (s) {
            var v = (s[key] || '').trim();
            if (!v) return;
            counts[v] = (counts[v] || 0) + 1;
            total++;
        });
        var entries = Object.keys(counts).map(function (k) { return { key: k, count: counts[k] }; });
        entries.sort(function (a, b) { return b.count - a.count; });
        return { entries: entries, total: total };
    }

    function donutBackground(segments) {
        var acc = 0;
        var stops = [];
        segments.forEach(function (seg) {
            var start = acc;
            acc += seg.pct;
            stops.push(seg.color + ' ' + start + '% ' + acc + '%');
        });
        return 'conic-gradient(' + stops.join(', ') + ')';
    }

    // `segments` drives the donut itself (every slice, so the pie always
    // reflects true proportions); `opts.legendSegments` lets the legend list
    // show only a subset of those, with an ellipsis row standing in for the
    // rest instead of lumping them into a grey "Other" slice.
    function renderDonutHtml(segments, title, opts) {
        opts = opts || {};
        var legendSegments = opts.legendSegments || segments;
        var chartClass = 'tr-chart' + (opts.chartClass ? ' ' + opts.chartClass : '');
        var legendClass = 'tr-chart-legend' + (opts.legendClass ? ' ' + opts.legendClass : '');
        var html = '<div class="' + chartClass + '"><div class="tr-chart-title">' + esc(title) + '</div>';
        html += '<div class="tr-chart-body">';
        html += '<div class="tr-donut" style="background:' + donutBackground(segments) + '"><div class="tr-donut-hole"></div></div>';
        html += '<ul class="' + legendClass + '">';
        legendSegments.forEach(function (s) {
            html += '<li><span class="tr-chart-swatch" style="background:' + esc(s.color) + '"></span>';
            if (s.icon) html += '<img class="tr-chart-icon" src="' + esc(s.icon) + '" alt="">';
            html += '<span class="tr-chart-label">' + esc(s.label) + '</span>';
            html += '<span class="tr-chart-count">' + s.count + ' (' + s.pct + '%)</span></li>';
        });
        if (opts.legendEllipsis) html += '<li class="tr-chart-legend-ellipsis" aria-hidden="true">&hellip;</li>';
        html += '</ul></div>';
        if (opts.footer) html += opts.footer;
        html += '</div>';
        return html;
    }

    // Full-breakdown popin, reached from a chart's "Details" button — same
    // segments as the compact chart, just without the top-N cutoff / "Other"
    // bucket, laid out in two columns since the full hero list runs long.
    function openChartModal(segments, title) {
        if (!chartModalEl || !chartModalBody) return;
        chartModalBody.innerHTML = renderDonutHtml(segments, title, {
            chartClass: 'tr-chart--wide',
            legendClass: 'tr-chart-legend--cols2'
        });
        chartModalEl.style.display = 'flex';
    }

    function closeChartModal() {
        if (!chartModalEl) return;
        chartModalEl.style.display = 'none';
        if (chartModalBody) chartModalBody.innerHTML = '';
    }

    function renderFactionChart() {
        var el = document.getElementById('tr-chart-faction');
        if (!el) return;
        var dist = computeDistribution('faction');
        if (!dist.total) { el.innerHTML = ''; return; }
        var segments = dist.entries.map(function (e) {
            return {
                color: factionColor(e.key) || CHART_OTHER_COLOR,
                pct: Math.round(e.count / dist.total * 1000) / 10,
                label: factionLabel(e.key), count: e.count, icon: factionImgUrl(e.key)
            };
        });
        el.innerHTML = renderDonutHtml(segments, TR_TXT.chart_faction_title || 'Factions');
    }

    // Heroes sharing a faction get progressively lighter/darker shades of
    // that faction's own color, instead of an unrelated hue per hero — so
    // the family is visible at a glance while the legend's resolved name
    // (not the color) is what actually identifies each slice.
    var HERO_SHADE_STEPS = [0, -25, 25, -45, 45, -60];

    var HERO_TOP_COUNT = 6;

    // Colors are assigned across the *full* sorted list (not just the top N)
    // so a hero keeps the same shade whether it shows in the compact chart
    // or in the "all heroes" detail popin.
    function buildHeroSegments(entries, total) {
        var heroFactions = heroFactionMap();
        var seenPerFaction = {};
        return entries.map(function (e) {
            var faction = heroFactions[e.key] || '';
            var base = factionColor(faction) || CHART_OTHER_COLOR;
            var seen = seenPerFaction[faction] || 0;
            seenPerFaction[faction] = seen + 1;
            var color = seen === 0 ? base : shadeColor(base, HERO_SHADE_STEPS[seen % HERO_SHADE_STEPS.length]);
            return { color: color, pct: Math.round(e.count / total * 1000) / 10, label: resolveCardName(e.key), count: e.count };
        });
    }

    function renderHeroChart() {
        var el = document.getElementById('tr-chart-hero');
        if (!el) return;
        var dist = computeDistribution('hero');
        if (!dist.total) { el.innerHTML = ''; return; }
        var allSegments = buildHeroSegments(dist.entries, dist.total);
        var top  = allSegments.slice(0, HERO_TOP_COUNT);
        var rest = allSegments.slice(HERO_TOP_COUNT);
        var title = TR_TXT.chart_hero_title || 'Heroes';
        var footer = rest.length
            ? '<button type="button" class="btn btn-sm btn-outline-secondary tr-chart-detail-btn">' + esc(TR_TXT.chart_detail_btn || 'Details') + '</button>'
            : '';
        el.innerHTML = renderDonutHtml(allSegments, title, {
            legendSegments: top,
            legendEllipsis: rest.length > 0,
            footer: footer
        });
        var btn = el.querySelector('.tr-chart-detail-btn');
        var modalTitle = TR_TXT.chart_hero_modal_title || title;
        if (btn) btn.addEventListener('click', function () { openChartModal(allSegments, modalTitle); });
    }

    /* ── Filters (GameApi tournaments only) ───────────────────────────────── */
    function populateFilterOptions() {
        var factionSel = document.getElementById('tr-filter-faction');
        var heroSel    = document.getElementById('tr-filter-hero');
        if (!factionSel || !heroSel) return;

        // Idempotent (drops everything but the first "All ..." option) so
        // this can be re-run from refreshDeckNames() once card names
        // resolve, to upgrade hero labels from raw refs to real names —
        // preserving whatever was selected, if anything.
        var prevFaction = factionSel.value;
        var prevHero    = heroSel.value;
        [factionSel, heroSel].forEach(function (sel) {
            while (sel.options.length > 1) sel.remove(1);
        });

        var factions = {}, heroes = {};
        standings.forEach(function (s) {
            if (s.faction) factions[s.faction] = true;
            if (s.hero) heroes[s.hero] = true;
        });
        Object.keys(factions).sort().forEach(function (f) {
            var opt = document.createElement('option');
            opt.value = f; opt.textContent = factionLabel(f);
            factionSel.appendChild(opt);
        });
        Object.keys(heroes).sort(function (a, b) {
            return resolveCardName(a).localeCompare(resolveCardName(b));
        }).forEach(function (h) {
            var opt = document.createElement('option');
            opt.value = h; opt.textContent = resolveCardName(h);
            heroSel.appendChild(opt);
        });

        factionSel.value = prevFaction;
        heroSel.value = prevHero;
    }

    function applyFilters() {
        var factionSel = document.getElementById('tr-filter-faction');
        var heroSel    = document.getElementById('tr-filter-hero');
        var searchEl   = document.getElementById('tr-filter-search');
        var faction = factionSel ? factionSel.value : '';
        var hero    = heroSel ? heroSel.value : '';
        var search  = searchEl ? searchEl.value.trim().toLowerCase() : '';

        filteredStandings = standings.filter(function (s) {
            if (faction && s.faction !== faction) return false;
            if (hero && s.hero !== hero) return false;
            if (search && (s.name || '').toLowerCase().indexOf(search) === -1) return false;
            return true;
        });
        renderRankings();
    }

    document.addEventListener('input', function (e) {
        if (e.target.id === 'tr-filter-search') applyFilters();
    });
    document.addEventListener('change', function (e) {
        if (e.target.id === 'tr-filter-faction' || e.target.id === 'tr-filter-hero') applyFilters();
    });

    /* ── Init ───────────────────────────────────────────────────────────── */
    if (typeof TR_TOURNAMENT_DATA !== 'undefined' && TR_TOURNAMENT_DATA) {
        renderTournament(TR_TOURNAMENT_DATA);
    }

    if (isGameApi) {
        renderFactionChart();
        renderHeroChart();
        populateFilterOptions();
    }
})();
