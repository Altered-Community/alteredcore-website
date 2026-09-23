/* Deckbuilder — hero-picker.js
 * Hero modal, printing helpers, Cards API fetch.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    var elHeroConfirm = document.getElementById('db-hero-confirm');
    var elHeroAltArts = document.getElementById('db-hero-altarts-toggle');

    window.dbHeroClose = function() {
        document.getElementById('db-hero-modal').style.display = 'none';
        if (_wizardOpen) elNewModal.style.display = 'flex';
        else             dbLockScroll(false);
    };
    window.dbHeroBackdrop = function() { dbHeroClose(); };

    function dbWizardLeave() {
        markClean();
        window.location.href = AlteredDB.decksUrl;
    }

    function heroPrintClass(ref) {
        var p = ref.split('_');
        return ((AlteredDB.subSets || []).indexOf(p[1] || '') !== -1 ? 2 : 0)
             + (p[2] === 'B' ? 0 : 1);
    }

    function heroPrinting(ref) {
        var p = ref ? ref.split('_') : [];
        return p[2] || '';
    }

    function heroPrintingLabel(printing) {
        if (printing === 'A') return 'Alt art';
        if (printing === 'B') return 'Standard';
        if (printing === 'P') return 'Promo';
        return 'Standard';
    }

    function heroSetRank(ref) {
        var sets = AlteredDB.heroSets || [];
        var idx  = sets.indexOf(ref.split('_')[1] || '');
        return idx === -1 ? sets.length : idx;
    }

    function heroPrintBgaOk(ref) {
        var setCode = ref.split('_')[1] || '';
        return (AlteredDB.setsBga || {})[setCode] !== false;
    }

    function heroPrintOkIn(ref, fmtKey) {
        if (!heroPrintBgaOk(ref)) return false;
        var banned = ((AlteredDB.formats[fmtKey] || {}).bannedSets) || [];
        return banned.indexOf(ref.split('_')[1] || '') === -1;
    }

    var _bgaFormats = Object.keys(AlteredDB.formats).filter(function(k) {
        var f = AlteredDB.formats[k];
        return f.bgalegal && !f.hidden;
    });

    function heroBgaState(prints) {
        var n = _bgaFormats.filter(function(k) {
            return prints.some(function(pr) { return heroPrintOkIn(pr.ref, k); });
        }).length;
        return n === 0 ? 'ko' : (n === _bgaFormats.length ? 'ok' : 'partial');
    }

    function groupContainsPrints(group, ref) {
        return group.prints.some(function(pr) { return pr.ref === ref; });
    }

    function heroPickSelect(group, tile) {
        _heroPick = {
            key:      group.key,
            name:     group.name,
            faction:  group.faction,
            bgaState: group.bgaState,
            prints:   group.prints,
            ref:      (deck.hero && group.prints.some(function(pr) { return pr.ref === deck.hero.cardReference; }))
                      ? deck.hero.cardReference : group.prints[0].ref,
        };
        document.querySelectorAll('#db-hero-grid .db-hero-tile.selected').forEach(function(el) {
            el.classList.remove('selected');
        });
        if (tile) tile.classList.add('selected');
        if (elHeroConfirm) elHeroConfirm.disabled = false;

        if (tile && window.requestAnimationFrame) {
            requestAnimationFrame(function() {
                tile.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        }
    }

    if (elHeroConfirm) {
        elHeroConfirm.addEventListener('click', function() {
            if (!_heroPick) return;
            _heroPrints = _heroPick.prints;
            setHero({ cardReference: _heroPick.ref, name: _heroPick.name,
                      factionCode: _heroPick.faction, bgaState: _heroPick.bgaState });
            document.getElementById('db-hero-modal').style.display = 'none';
            if (_wizardOpen) { dbNewRenderHero(); elNewModal.style.display = 'flex'; }
            else             { dbLockScroll(false); }
        });
    }

    if (elHeroAltArts) {
        elHeroAltArts.addEventListener('change', function() {
            if (heroCurrFaction) dbLoadHeroes(heroCurrFaction);
        });
    }

    window.dbSelectHero = function() {
        document.getElementById('db-hero-modal').style.display = 'flex';
        dbLockScroll(true);
        var wanted = (deck.hero && deck.hero.factionCode) || AlteredDB.heroDefaultFaction;
        if (wanted !== heroCurrFaction || !document.getElementById('db-hero-grid').children.length) {
            dbLoadHeroes(wanted);
        }
    };
    window.dbLoadHeroes = function(faction) {
        heroCurrFaction = faction;
        var grid    = document.getElementById('db-hero-grid');
        var loading = document.getElementById('db-hero-loading');
        grid.innerHTML    = '';
        loading.style.display = 'block';
        _heroPick = null;
        if (elHeroConfirm) elHeroConfirm.disabled = true;

        document.querySelectorAll('#db-hero-factions [data-faction]').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.faction === faction);
        });

        var altArtsOn = !!(elHeroAltArts && elHeroAltArts.checked);
        var activeVariations = altArtsOn
            ? AlteredDB.allVariations
            : AlteredDB.heroVariations.slice();

        var heroParts = [
            'itemsPerPage=' + AlteredDB.cardsApiMaxPerPage,
            'locale=' + encodeURIComponent(AlteredDB.lang),
        ];
        AlteredDB.heroTypes.forEach(function(t)      { heroParts.push('cardType[]='       + encodeURIComponent(t)); });
        AlteredDB.heroRarities.forEach(function(r)   { heroParts.push('rarity[]='         + encodeURIComponent(r)); });
        var heroSets = altArtsOn
            ? AlteredDB.heroSets.concat(AlteredDB.heroSets.reduce(function(extra, s) {
                  (AlteredDB.setChildren[s] || []).forEach(function(c) { if (extra.indexOf(c) === -1) extra.push(c); });
                  return extra;
              }, []))
            : AlteredDB.heroSets;
        heroSets.forEach(function(s)                 { heroParts.push('set.reference[]='  + encodeURIComponent(s)); });
        activeVariations.forEach(function(v)         { heroParts.push('variation[]='      + encodeURIComponent(v)); });
        if (AlteredDB.heroSort1) {
            var _s1 = AlteredDB.heroSort1;
            if (_s1 === 'random') { heroParts.push('random=true'); }
            else if (_s1 === 'set_date_desc') { heroParts.push('order[set.date]=desc'); }
            else if (_s1 === 'set_date_asc')  { heroParts.push('order[set.date]=asc'); }
            else if (_s1 === 'collector_asc') { heroParts.push('order[collectorNumberFormatedId]=asc'); }
        }
        if (faction) heroParts.push('faction.code[]=' + encodeURIComponent(faction));

        function fetchHeroPage(page, accumulated) {
            var p = heroParts.concat(['page=' + page]);
            return fetch('https://cards.alteredcore.org/api/cards?' + p.join('&'))
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (AlteredDB.debug) console.log('[deckbuilder] hero cards API response (page ' + page + '):', data);
                    var all = accumulated.concat(data.member || []);
                    return page < (data.lastPage || 1) ? fetchHeroPage(page + 1, all) : all;
                });
        }

        fetchHeroPage(1, [])
            .then(function(allCards) {
                loading.style.display = 'none';
                if (!allCards || !allCards.length) {
                    grid.innerHTML = '<div style="color:var(--neutral-400);padding:10px;text-align:center;grid-column:1/-1">—</div>';
                    return;
                }
                var groups = {};
                var setLabels = {};
                Object.keys(AlteredDB.sets || {}).forEach(function(k) {
                    var s = AlteredDB.sets[k];
                    setLabels[k] = (s && s[AlteredDB.lang]) || (s && s.en) || k;
                });
                allCards.forEach(function(card) {
                    var ref = card.reference || '';
                    if (!ref) return;
                    var setColon   = ref.split('_')[1] || '';
                    var printing   = altArtsOn ? heroPrinting(ref) : '';
                    var finalPrint = '';
                    if (altArtsOn) finalPrint = printing === 'B' ? 'B' : (setColon + '|' + printing);
                    var key = heroStableKey(ref) + (finalPrint ? '|' + finalPrint : '');
                    if (!groups[key]) {
                        var setName = setLabels[setColon] || (card.set && card.set.name) || setColon;
                        groups[key] = {
                            key:       key,
                            name:      cardName(card),
                            faction:   (card.faction && card.faction.code) || factionFromRef(ref),
                            printing:  printing,
                            setName:   setName,
                            prints:    [],
                        };
                    }
                    var known = groups[key].prints.some(function(pr) { return pr.ref === ref; });
                    if (!known) groups[key].prints.push({ ref: ref, variation: card.variation || '' });
                });

                var list = Object.keys(groups).map(function(k) { return groups[k]; });
                if (!list.length) {
                    grid.innerHTML = '<div style="color:var(--neutral-400);padding:10px;text-align:center;grid-column:1/-1">—</div>';
                    return;
                }
                list.forEach(function(g) {
                    g.prints.sort(function(a, b) {
                        var byClass = heroPrintClass(a.ref) - heroPrintClass(b.ref);
                        if (byClass !== 0) return byClass;
                        var bySet = heroSetRank(a.ref) - heroSetRank(b.ref);
                        return AlteredDB.heroDuplicateOrder === 'desc' ? -bySet : bySet;
                    });
                    g.bgaState = heroBgaState(g.prints);
                });
                list.sort(function(a, b) { return a.name.localeCompare(b.name, AlteredDB.lang) || (a.key < b.key ? -1 : 1); });

                list.forEach(function(g) {
                    var tile = document.createElement('div');
                    tile.className = 'db-hero-tile';
                    tile.dataset.key = g.key;

                    var img = document.createElement('img');
                    img.src = cdnUrl(g.prints[0].ref);
                    img.alt = g.name;
                    img.loading = 'lazy';
                    tile.appendChild(img);

                    var cap = document.createElement('div');
                    cap.className = 'db-hero-tile-name';
                    cap.title = g.name;
                    cap.textContent = g.name;
                    tile.appendChild(cap);

                    if (altArtsOn) {
                        var vTag = document.createElement('div');
                        vTag.className = 'db-hero-tile-variation';
                        vTag.textContent = g.printing === 'B'
                            ? 'Standard'
                            : heroPrintingLabel(g.printing) + ' · ' + g.setName;
                        tile.appendChild(vTag);
                    }

                    if (g.bgaState !== 'ok') {
                        var ko = g.bgaState === 'ko';
                        var warn = document.createElement('div');
                        warn.className = 'db-bga-pill db-hero-tile-bga ' + (ko ? 'ko' : 'partial');
                        warn.textContent = ko ? AlteredDB.txt.bga_hero_ko : AlteredDB.txt.bga_hero_partial;
                        warn.title = ko ? AlteredDB.txt.bga_hero_title : AlteredDB.txt.bga_partial_title;
                        tile.appendChild(warn);
                    }

                    tile.addEventListener('click', function() { heroPickSelect(g, tile); });
                    grid.appendChild(tile);

                    if (deck.hero && groupContainsPrints(g, deck.hero.cardReference)) heroPickSelect(g, tile);
                });
            })
            .catch(function(err) {
                loading.style.display = 'none';
                console.error('Hero load error:', err);
                grid.innerHTML = '<div style="color:red;padding:10px;grid-column:1/-1">' + (err && err.message ? err.message : 'Load error') + '</div>';
            });
    };
