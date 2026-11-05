/* Deck contest vote: the tier list. Tiles move by drag and drop, or by tap (select a tile, then a tier). */
(function () {
    'use strict';

    // acIcon() comes from a deferred script of the shell: wait for it.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    function init() {
    var app  = document.getElementById('dcv-app');
    var data = document.getElementById('dcv-data');
    if (!app || !data) return;
    var cfg = JSON.parse(data.textContent);
    var T = cfg.txt;
    var open = cfg.state === 'open';

    var decks = {};
    cfg.decks.forEach(function (d) { decks[d.id] = d; });
    var votes = {};
    Object.keys(cfg.votes).forEach(function (id) { if (decks[id]) votes[id] = cfg.votes[id]; });

    var selected = null;
    var tiles = {};
    var zones = {};

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }
    function icon(name) {
        return typeof window.acIcon === 'function' ? window.acIcon(name) : '';
    }
    // Pictures come from the CDN, like the tournament reports: hero art by reference, other cards by language and set.
    function heroImg(d) {
        if (!d.hero_ref) return '';
        var p = d.hero_ref.split('_');
        // Always the standard art: alt arts (A), promos (P) and box toppers (EOLETOP) point to the standard card (B) of their set.
        if (p[2] === 'A' || p[2] === 'P') p[2] = 'B';
        if (p[1] === 'BISE') p[1] = 'CORE';
        if (/TOP$/.test(p[1])) p[1] = p[1].replace(/TOP$/, '');
        return cfg.cdn + '/cards/hero/' + encodeURIComponent(p.join('_')) + '_1.webp';
    }
    function cardImg(ref) {
        return cfg.cdn + '/cards/' + encodeURIComponent(cfg.lang) + '/' + encodeURIComponent(ref.split('_')[1] || 'CORE') + '/' + encodeURIComponent(ref) + '.webp';
    }
    // Uniques have no static picture: the card renderer draws them from their reference.
    var RENDERER = 'https://cdn.jsdelivr.net/gh/PolluxTroy0/Altered-Card-Renderer@main/altered-card-renderer-minified.js';
    function isUnique(ref) {
        var p = ref.split('_');
        return !!p[5] && p[5].charAt(0) === 'U';
    }
    function loadRenderer() {
        if (document.querySelector('script[data-dcv-renderer]')) return;
        var s = document.createElement('script');
        s.src = RENDERER;
        s.dataset.dcvRenderer = '1';
        document.head.appendChild(s);
    }
    function vote(id) {
        return votes[id] || (votes[id] = { tier: null });
    }
    function badges(d) {
        return [d.difficulty].concat(d.archetypes).map(function (k) { return cfg.emoji[k] || ''; }).join('');
    }
    function label(d) {
        return d.hero + ' · ' + d.author + ' · ' + (T.difficulty[d.difficulty] || d.difficulty) + ' · ' + d.archetypes.join('/');
    }

    /* ── Tiles ─────────────────────────────────────────────────────────────── */

    function buildTile(d) {
        var tile = el('div', 'dcv-tile dcv-tile--' + String(d.faction).toLowerCase());
        tile.dataset.deck = d.id;
        tile.draggable = open;
        tile.innerHTML =
            '<button type="button" class="dcv-tile__main" aria-pressed="false" aria-label="' + esc(label(d)) + '" title="' + esc(label(d)) + '">' +
                (d.hero_ref ? '<img src="' + esc(heroImg(d)) + '" alt="" draggable="false">' : '<span class="dcv-tile__noimg">' + esc(d.hero) + '</span>') +
                '<span class="dcv-tile__emoji" aria-hidden="true">' + badges(d) + '</span>' +
                '<span class="dcv-tile__builder">' + esc(d.author) + '</span>' +
            '</button>' +
            '<button type="button" class="dcv-tile__info ac-icon-button ac-icon-button--sm" aria-label="' + esc(T.details + ' — ' + d.hero) + '">' + icon('layout-list') + '</button>';
        tiles[d.id] = tile;
        return tile;
    }

    function refreshTile(id) {
        var v = vote(id), tile = tiles[id];
        tile.querySelector('.dcv-tile__main').setAttribute('aria-pressed', selected === id ? 'true' : 'false');
        tile.classList.toggle('is-selected', selected === id);
    }

    /** Puts a tile in its zone, keeping the contest order inside the zone. */
    function placeTile(id) {
        var tier = vote(id).tier;
        var zone = zones[tier == null ? 'pool' : tier];
        var tile = tiles[id];
        var order = cfg.decks.map(function (d) { return d.id; });
        var before = null;
        Array.prototype.some.call(zone.children, function (c) {
            if (c !== tile && order.indexOf(c.dataset.deck) > order.indexOf(id)) { before = c; return true; }
            return false;
        });
        zone.insertBefore(tile, before);
        refreshTile(id);
        applyFilter();
    }

    /* ── Saving ────────────────────────────────────────────────────────────── */

    var status = null;
    function say(text, error) {
        status.textContent = text;
        status.classList.toggle('dcv-status--error', !!error);
    }
    function placedCount() {
        return Object.keys(votes).filter(function (id) { return votes[id].tier != null; }).length;
    }
    function save(id) {
        var v = vote(id);
        fetch(cfg.api, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': cfg.csrf },
            body: JSON.stringify({ deck: id, tier: v.tier })
        }).then(function (r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        }).then(function (j) {
            say(T.saved.replace('%d', j.placed));
        }).catch(function () {
            say(T.save_error, true);
        });
    }

    function move(id, tier) {
        if (!open) return;
        var v = vote(id);
        if (v.tier === tier) { select(null); return; }
        v.tier = tier;
        select(null);
        placeTile(id);
        save(id);
    }

    /* ── Selection (tap) and drag and drop ─────────────────────────────────── */

    function select(id) {
        var previous = selected;
        selected = id;
        app.classList.toggle('has-selection', id != null);
        if (previous) refreshTile(previous);
        if (id) refreshTile(id);
    }

    function zoneTier(zone) {
        var t = zone.dataset.tier;
        return t === '' ? null : parseInt(t, 10);
    }

    app.addEventListener('click', function (e) {
        var tile = e.target.closest('.dcv-tile');
        if (tile) {
            var id = tile.dataset.deck;
            if (e.target.closest('.dcv-tile__info')) { showDeck(id); return; }
            if (open) select(selected === id ? null : id);
            else showDeck(id);
            return;
        }
        var target = e.target.closest('[data-tier]');
        if (target && selected && open) {
            var zone = target.classList.contains('dcv-drop') ? target : target.closest('.dcv-tier, .dcv-poolbox').querySelector('.dcv-drop');
            move(selected, zoneTier(zone));
        }
    });

    var dragging = null;
    app.addEventListener('dragstart', function (e) {
        var tile = e.target.closest && e.target.closest('.dcv-tile');
        if (!tile || !open) return;
        dragging = tile.dataset.deck;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragging);
        tile.classList.add('is-dragging');
    });
    app.addEventListener('dragend', function () {
        if (dragging && tiles[dragging]) tiles[dragging].classList.remove('is-dragging');
        dragging = null;
        Object.keys(zones).forEach(function (k) { zones[k].classList.remove('is-over'); });
    });
    app.addEventListener('dragover', function (e) {
        var zone = e.target.closest && e.target.closest('.dcv-drop');
        if (!zone || !dragging) return;
        e.preventDefault();
        zone.classList.add('is-over');
    });
    app.addEventListener('dragleave', function (e) {
        var zone = e.target.closest && e.target.closest('.dcv-drop');
        if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('is-over');
    });
    app.addEventListener('drop', function (e) {
        var zone = e.target.closest && e.target.closest('.dcv-drop');
        if (!zone || !dragging) return;
        e.preventDefault();
        zone.classList.remove('is-over');
        move(dragging, zoneTier(zone));
    });

    /* ── Faction filter of the pool ────────────────────────────────────────── */

    var factionFilter = '';
    function applyFilter() {
        Array.prototype.forEach.call(zones.pool.children, function (tile) {
            tile.hidden = factionFilter !== '' && decks[tile.dataset.deck].faction !== factionFilter;
        });
    }

    /* ── Decklist dialog ───────────────────────────────────────────────────── */

    var dialog = document.getElementById('dcv-dialog');
    function showDeck(id) {
        var d = decks[id];
        document.getElementById('dcv-dialog-title').textContent = d.hero + ' — ' + d.faction;
        var hasUnique = false;
        var html = '<div class="dcv-sheet">';
        html += '<div class="dcv-sheet__head">';
        if (d.hero_ref) html += '<img class="dcv-sheet__hero" src="' + esc(heroImg(d)) + '" alt="' + esc(d.hero) + '">';
        html += '<div class="dcv-sheet__meta">';
        html += '<p class="dcv-sheet__author">' + esc(T.by) + ' <strong>' + esc(d.author) + '</strong></p>';
        html += '<p><span class="dcv-chip">' + (cfg.emoji[d.difficulty] || '') + ' ' + esc(T.difficulty[d.difficulty] || d.difficulty) + '</span> ' +
            d.archetypes.map(function (a) { return '<span class="dcv-chip">' + (cfg.emoji[a] || '') + ' ' + esc(a) + '</span>'; }).join(' ') + '</p>';
        html += '<p><a href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + icon('external-link') + ' ' + esc(T.open_deck) + '</a></p>';
        html += '</div></div>';

        if (!d.cards.length) {
            html += '<p class="ac-text-muted">' + esc(T.no_decklist) + '</p>';
        } else {
            var order = ['CHARACTER', 'SPELL', 'LANDMARK_PERMANENT', 'EXPEDITION_PERMANENT'];
            var groups = {};
            d.cards.forEach(function (c) { (groups[c.type] = groups[c.type] || []).push(c); });
            Object.keys(groups).sort(function (a, b) {
                var ia = order.indexOf(a), ib = order.indexOf(b);
                return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
            }).forEach(function (type) {
                var count = groups[type].reduce(function (n, c) { return n + c.qty; }, 0);
                html += '<h3 class="dcv-sheet__type">' + esc(T.types[type] || type) + ' <span class="ac-text-muted">' + count + '</span></h3><div class="dcv-cards">';
                groups[type].forEach(function (c) {
                    var unique = isUnique(c.ref);
                    if (unique) hasUnique = true;
                    html += '<figure class="dcv-card dcv-card--' + esc(c.rarity.toLowerCase()) + '" title="' + esc(c.name) + '">' +
                        (unique ? '<altered-card ref="' + esc(c.ref) + '" locale="' + esc(cfg.lang) + '"></altered-card>'
                                : '<img src="' + esc(cardImg(c.ref)) + '" alt="' + esc(c.name) + '" loading="lazy">') +
                        (c.qty > 1 ? '<figcaption class="dcv-card__qty">×' + c.qty + '</figcaption>' : '') + '</figure>';
                });
                html += '</div>';
            });
        }
        if (d.explanation.trim()) {
            html += '<details class="dcv-sheet__why"><summary>' + esc(T.why) + '</summary><div>' + esc(d.explanation) + '</div></details>';
        }
        html += '</div>';
        document.getElementById('dcv-dialog-body').innerHTML = html;
        if (hasUnique) loadRenderer();
        dialog.showModal();
    }
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog || e.target.closest('[data-dcv-close]')) dialog.close();
    });
    dialog.addEventListener('close', hideZoom);

    /* ── Zoom: a large copy of a tile's hero or of a decklist card, on hover (mouse) or click (decklist cards) ── */

    var zoom = el('div', 'dcv-zoom');
    zoom.hidden = true;
    var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    function zoomContent(target) {
        var wrap = el('div', 'dcv-zoom__card');
        var tile = target.closest('.dcv-tile');
        if (tile) {
            var d = decks[tile.dataset.deck];
            if (!d.hero_ref) return null;
            var img = el('img');
            img.src = heroImg(d);
            img.alt = '';
            wrap.appendChild(img);
            wrap.appendChild(el('p', 'dcv-zoom__caption', esc(label(d))));
            return wrap;
        }
        var unique = target.querySelector('altered-card');
        var pic = target.querySelector('img');
        if (!unique && !pic) return null;
        wrap.classList.add('dcv-zoom__card--ratio');
        wrap.appendChild(unique ? unique.cloneNode(false) : el('img'));
        if (pic) { wrap.firstChild.src = pic.src; wrap.firstChild.alt = pic.alt; }
        return wrap;
    }
    function showZoom(target, x, y, pinned) {
        var content = zoomContent(target);
        if (!content) return;
        zoom.className = 'dcv-zoom' + (pinned ? ' dcv-zoom--pinned' : '');
        zoom.replaceChildren(content);
        (dialog.open ? dialog : document.body).appendChild(zoom);
        zoom.hidden = false;
        if (pinned) { zoom.style.left = zoom.style.top = ''; return; }
        moveZoom(x, y);
    }
    function moveZoom(x, y) {
        if (zoom.hidden || zoom.classList.contains('dcv-zoom--pinned')) return;
        var w = zoom.offsetWidth, h = zoom.offsetHeight;
        var left = x + 24 + w > window.innerWidth - 8 ? x - 24 - w : x + 24;
        zoom.style.left = Math.max(8, left) + 'px';
        zoom.style.top = Math.min(Math.max(8, y - h / 2), Math.max(8, window.innerHeight - h - 8)) + 'px';
    }
    function hideZoom() {
        zoom.hidden = true;
    }
    var HOVER_TARGET = '.dcv-tile__main, .dcv-card';
    if (canHover) {
        document.addEventListener('mouseover', function (e) {
            var t = e.target.closest && e.target.closest(HOVER_TARGET);
            if (!t || dragging || zoom.classList.contains('dcv-zoom--pinned') && !zoom.hidden) return;
            showZoom(t, e.clientX, e.clientY, false);
        });
        document.addEventListener('mousemove', function (e) { moveZoom(e.clientX, e.clientY); });
        document.addEventListener('mouseout', function (e) {
            var t = e.target.closest && e.target.closest(HOVER_TARGET);
            if (t && !t.contains(e.relatedTarget)) hideZoom();
        });
        app.addEventListener('dragstart', hideZoom);
    }
    // A click on a decklist card pins its large copy (the way to read it on a phone); any click then closes it.
    dialog.addEventListener('click', function (e) {
        if (!zoom.hidden && zoom.classList.contains('dcv-zoom--pinned')) { hideZoom(); return; }
        var card = e.target.closest('.dcv-card');
        if (card) showZoom(card, 0, 0, true);
    }, true);

    /* ── Layout ────────────────────────────────────────────────────────────── */

    var board = el('div', 'dcv-board');
    cfg.tiers.forEach(function (t) {
        var row = el('div', 'dcv-tier dcv-tier--' + t.letter.toLowerCase());
        var head = el('button', 'dcv-tier__label', '<strong>' + esc(t.letter) + '</strong><span>' + esc(t.label) + '</span>');
        head.type = 'button';
        head.dataset.tier = t.points;
        head.setAttribute('aria-label', t.letter + ' — ' + t.label + '. ' + T.place_here);
        var drop = el('div', 'dcv-drop');
        drop.dataset.tier = t.points;
        row.appendChild(head);
        row.appendChild(drop);
        board.appendChild(row);
        zones[t.points] = drop;
    });
    app.appendChild(board);

    var poolBox = el('section', 'dcv-poolbox');
    poolBox.innerHTML = '<div class="dcv-poolbox__head"><h2 class="ac-section-title">' + esc(T.pool) + '</h2><p class="ac-text-small ac-text-muted">' + esc(T.pool_hint) + '</p></div>';
    var chips = el('div', 'dcv-filter');
    chips.setAttribute('role', 'group');
    var factions = [];
    cfg.decks.forEach(function (d) { if (factions.indexOf(d.faction) < 0) factions.push(d.faction); });
    [''].concat(factions).forEach(function (f) {
        var chip = el('button', 'ac-chip', esc(f || T.all));
        chip.type = 'button';
        chip.setAttribute('aria-pressed', f === '' ? 'true' : 'false');
        chip.addEventListener('click', function () {
            factionFilter = f;
            Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
            applyFilter();
        });
        chips.appendChild(chip);
    });
    poolBox.appendChild(chips);
    var pool = el('div', 'dcv-drop dcv-drop--pool');
    pool.dataset.tier = '';
    poolBox.appendChild(pool);
    zones.pool = pool;
    app.appendChild(poolBox);

    status = el('p', 'dcv-status ac-text-small');
    status.setAttribute('role', 'status');
    status.textContent = T.saved.replace('%d', cfg.placed);
    app.appendChild(status);

    cfg.decks.forEach(function (d) {
        zones.pool.appendChild(buildTile(d));
        placeTile(d.id);
    });
    }
})();
