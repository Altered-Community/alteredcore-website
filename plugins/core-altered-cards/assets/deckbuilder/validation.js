/* Deckbuilder — validation.js
 * Sidebar list, format rules, validation modal.
 * Loaded as a classic script (shared global scope with sibling modules).
 */

    function updateDeckDisplay() {
        refreshAltArtOwnership();

        // Card count + gems
        var total = 0, gems = {};
        Object.keys(AlteredDB.rarities).forEach(function(k) { var g = AlteredDB.rarities[k].gem; if (g) gems[g] = 0; });
        Object.keys(deck.cards).forEach(function(ref) {
            var c = deck.cards[ref];
            total += c.qty;
            var r = c.rarity || rarityCode(ref);
            if (gems[r] !== undefined) gems[r] += c.qty;
        });
        elCardCount.textContent = total + ' ' + AlteredDB.txt.deck_cards;

        // Gem badges
        Object.keys(gems).forEach(function(r) {
            var el  = document.getElementById('db-gem-' + r);
            var cnt = document.getElementById('db-gem-' + r + '-count');
            if (!el || !cnt) return;
            if (gems[r] > 0) {
                el.classList.remove('d-none');
                cnt.textContent  = gems[r];
            } else {
                el.classList.add('d-none');
                cnt.textContent  = 0;
            }
        });

        // Validation — all rules come from AlteredDB.formats (altered.json)
        var fmtKey       = elDeckFormat ? elDeckFormat.value : (deck.format || 'standard');
        var rules        = AlteredDB.formats[fmtKey] || {};
        var ruleResults  = [];   // [{label, ok, current, limit}]
        var violatingRefs = {};  // {ref: "reason"} for per-card violations

        function addRule(label, ok, current, limit) {
            ruleResults.push({ label: label, ok: ok, current: current, limit: limit });
        }

        function isSetLegal(set) {
            var s = AlteredDB.sets[set];
            if (!s) return false;
            if (s.bgalegal === false && !rules.ignoreBgaIllegalSets) return false;
            return true;
        }

        var illegalSetRefs = [];
        Object.keys(deck.cards).forEach(function(ref) {
            var legal = isSetLegal(setFromRef(ref));
            deck.cards[ref].isSetIllegal = !legal;
            if (!legal) illegalSetRefs.push(ref);
        });
        var heroSetIllegal = deck.hero ? !isSetLegal(setFromRef(deck.hero.cardReference)) : false;
        var setsOk = illegalSetRefs.length === 0 && !heroSetIllegal;
        addRule(AlteredDB.txt.rule_set_legal, setsOk, setsOk ? null : (illegalSetRefs.length + (heroSetIllegal ? 1 : 0)), null);
        illegalSetRefs.forEach(function(ref) {
            violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_set_legal : AlteredDB.txt.rule_set_legal;
        });
        if (elHeroBanner) {
            var heroWarn = elHeroBanner.querySelector('.db-hero-set-warn');
            if (heroSetIllegal) {
                if (!heroWarn) {
                    heroWarn = document.createElement('span');
                    heroWarn.className = 'db-hero-set-warn';
                    heroWarn.style.cssText = 'margin-left:auto;flex-shrink:0;color:#ef4444;font-size:.9rem;cursor:help';
                    heroWarn.title = AlteredDB.txt.rule_set_legal;
                    heroWarn.innerHTML = '<i class="fa-solid fa-ban"></i>';
                    elHeroBanner.appendChild(heroWarn);
                }
            } else if (heroWarn) {
                heroWarn.remove();
            }

            var heroRef  = deck.hero ? deck.hero.cardReference : null;
            var heroOwned = heroRef ? altArtOwnCache[heroRef] : null;
            var heroArtWarn = elHeroBanner.querySelector('.db-hero-altart-warn');
            if (heroOwned != null && heroOwned < 1) {
                if (!heroArtWarn) {
                    heroArtWarn = document.createElement('span');
                    heroArtWarn.className = 'db-hero-altart-warn';
                    heroArtWarn.style.cssText = 'margin-left:auto;flex-shrink:0;color:#f59e0b;font-size:.9rem;cursor:help';
                    heroArtWarn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
                    elHeroBanner.appendChild(heroArtWarn);
                }
                heroArtWarn.title = AlteredDB.txt.alt_art_stock_warn.replace('%owned%', heroOwned).replace('%needed%', 1);
            } else if (heroArtWarn) {
                heroArtWarn.remove();
            }
        }

        if (rules.heroRequired) {
            addRule(AlteredDB.txt.rule_hero, !!deck.hero, null, null);
        }

        if (rules.minCards !== null && rules.minCards !== undefined)
            addRule(AlteredDB.txt.rule_min_cards, total >= rules.minCards, total, rules.minCards);
        if (rules.maxCards !== null && rules.maxCards !== undefined)
            addRule(AlteredDB.txt.rule_max_cards, total <= rules.maxCards, total, rules.maxCards);

        if (rules.maxRare !== null && rules.maxRare !== undefined)
            addRule(AlteredDB.txt.rule_max_rare, gems.R <= rules.maxRare, gems.R, rules.maxRare);
        if (rules.maxExalted !== null && rules.maxExalted !== undefined)
            addRule(AlteredDB.txt.rule_max_exalted, gems.E <= rules.maxExalted, gems.E, rules.maxExalted);

        var uLimit = getHeroUniqueLimit(rules);
        if (uLimit !== null)
            addRule(AlteredDB.txt.rule_max_unique, gems.U <= uLimit, gems.U, uLimit);

        if (rules.maxCopiesPerUnique !== null && rules.maxCopiesPerUnique !== undefined) {
            var uniqueRefOk = true;
            Object.keys(deck.cards).forEach(function(ref) {
                if (isUnique(ref) && deck.cards[ref].qty > rules.maxCopiesPerUnique) uniqueRefOk = false;
            });
            addRule(AlteredDB.txt.rule_unique_copies, uniqueRefOk, null, rules.maxCopiesPerUnique);
            if (!uniqueRefOk) {
                Object.keys(deck.cards).forEach(function(ref) {
                    if (isUnique(ref) && deck.cards[ref].qty > rules.maxCopiesPerUnique)
                        violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_unique_copies : AlteredDB.txt.rule_unique_copies;
                });
            }
        }

        if (rules.maxCopiesPerName !== null && rules.maxCopiesPerName !== undefined) {
            var nameQty = {};
            Object.keys(deck.cards).forEach(function(ref) {
                var key = canonicalName(deck.cards[ref]);
                if (key) nameQty[key] = (nameQty[key] || 0) + deck.cards[ref].qty;
            });
            var maxName = rules.maxCopiesPerName;
            var nameOk  = true;
            var badNames = {};
            Object.keys(nameQty).forEach(function(k) {
                if (nameQty[k] > maxName) { nameOk = false; badNames[k] = true; }
            });
            addRule(AlteredDB.txt.rule_copies, nameOk, null, maxName);
            if (!nameOk) {
                Object.keys(deck.cards).forEach(function(ref) {
                    if (badNames[canonicalName(deck.cards[ref])]) violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_copies : AlteredDB.txt.rule_copies;
                });
            }
        }

        if (rules.maxCopiesPerNameRarity !== null && rules.maxCopiesPerNameRarity !== undefined) {
            var nameRarityQty = {};
            Object.keys(deck.cards).forEach(function(ref) {
                var c   = deck.cards[ref];
                var key = canonicalName(c) + '|' + (c.rarity || rarityCode(ref));
                nameRarityQty[key] = (nameRarityQty[key] || 0) + c.qty;
            });
            var maxNR  = rules.maxCopiesPerNameRarity;
            var nrOk   = true;
            var badNRs = {};
            Object.keys(nameRarityQty).forEach(function(k) {
                if (nameRarityQty[k] > maxNR) { nrOk = false; badNRs[k] = true; }
            });
            addRule(AlteredDB.txt.rule_copies_rarity, nrOk, null, maxNR);
            if (!nrOk) {
                Object.keys(deck.cards).forEach(function(ref) {
                    var c   = deck.cards[ref];
                    var key = canonicalName(c) + '|' + (c.rarity || rarityCode(ref));
                    if (badNRs[key]) violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_copies_rarity : AlteredDB.txt.rule_copies_rarity;
                });
            }
        }

        if (rules.sameFaction) {
            var heroFaction  = deck.hero ? (deck.hero.factionCode || factionFromRef(deck.hero.cardReference)) : null;
            var allFactions  = {};
            Object.keys(deck.cards).forEach(function(ref) {
                var f = deck.cards[ref].factionCode || null; if (f) allFactions[f] = true;
            });
            if (heroFaction) allFactions[heroFaction] = true;
            var factionOk = Object.keys(allFactions).length <= 1;
            addRule(AlteredDB.txt.rule_same_faction, factionOk, null, null);
            if (!factionOk && heroFaction) {
                Object.keys(deck.cards).forEach(function(ref) {
                    var f = deck.cards[ref].factionCode || null;
                    if (f && f !== heroFaction) violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_same_faction : AlteredDB.txt.rule_same_faction;
                });
            }
        }

        if (rules.allowBanned === false) {
            var bannedRefs = [];
            Object.keys(deck.cards).forEach(function(ref) {
                if (deck.cards[ref].isBanned) bannedRefs.push(ref);
            });
            addRule(AlteredDB.txt.rule_no_banned, bannedRefs.length === 0, bannedRefs.length > 0 ? bannedRefs.length : null, null);
            bannedRefs.forEach(function(ref) {
                violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_no_banned : AlteredDB.txt.rule_no_banned;
            });
        }

        if (rules.allowSuspended === false) {
            var suspendedRefs = [];
            Object.keys(deck.cards).forEach(function(ref) {
                if (deck.cards[ref].isSuspended) suspendedRefs.push(ref);
            });
            addRule(AlteredDB.txt.rule_no_suspended, suspendedRefs.length === 0, suspendedRefs.length > 0 ? suspendedRefs.length : null, null);
            suspendedRefs.forEach(function(ref) {
                violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_no_suspended : AlteredDB.txt.rule_no_suspended;
            });
        }

        if (rules.requireUniqueLegality) {
            var illegalUniqueRefs = [];
            Object.keys(deck.cards).forEach(function(ref) {
                if (isUnique(ref) && deck.cards[ref].isFrontierIllegal) illegalUniqueRefs.push(ref);
            });
            addRule(AlteredDB.txt.rule_frontier_legal, illegalUniqueRefs.length === 0, illegalUniqueRefs.length > 0 ? illegalUniqueRefs.length : null, null);
            illegalUniqueRefs.forEach(function(ref) {
                violatingRefs[ref] = violatingRefs[ref] ? violatingRefs[ref] + '\n' + AlteredDB.txt.rule_frontier_legal : AlteredDB.txt.rule_frontier_legal;
            });
            checkFrontierLegality();
        }

        deck._valid = ruleResults.every(function(r) { return r.ok; });

        if (!deck._valid) {
            var badge = document.createElement('span');
            badge.className = 'badge';
            badge.style.cssText = 'background:#ef4444;color:#fff;font-size:.75rem;font-weight:600;padding:4px 9px;cursor:pointer';
            badge.innerHTML = escHtml(AlteredDB.txt.deck_invalid) + ' <i class="fa-solid fa-circle-info" style="font-size:.7rem"></i>';
            badge.onclick = function() { openValidationModal(ruleResults, fmtKey); };
            elValidation.innerHTML = '';
            elValidation.appendChild(badge);
        } else {
            var okBadge = document.createElement('span');
            okBadge.className = 'badge';
            okBadge.style.cssText = 'background:#22c55e;color:#fff;font-size:.75rem;font-weight:600;padding:4px 9px;cursor:pointer';
            okBadge.innerHTML = '<i class="fa-solid fa-check me-1"></i>' + escHtml(AlteredDB.txt.validation_ok) + ' <i class="fa-solid fa-circle-info" style="font-size:.7rem"></i>';
            okBadge.onclick = function() { openValidationModal(ruleResults, fmtKey); };
            elValidation.innerHTML = '';
            elValidation.appendChild(okBadge);
        }

        var grouped = {};
        TYPE_ORDER.forEach(function(t) { grouped[t] = []; });
        Object.keys(deck.cards).forEach(function(ref) {
            var c = deck.cards[ref];
            var t = c.type || 'OTHER';
            if (!grouped[t]) grouped[t] = [];
            grouped[t].push({ ref: ref, qty: c.qty, name: c.name, rarity: c.rarity || rarityCode(ref), mainCost: c.mainCost, faction: c.factionCode || null, isBanned: !!c.isBanned, isSuspended: !!c.isSuspended, isFrontierIllegal: !!c.isFrontierIllegal, isSetIllegal: !!c.isSetIllegal });
        });
        elCardList.innerHTML = '';
        TYPE_ORDER.forEach(function(type) {
            var group = grouped[type] || [];
            if (!group.length) return;
            group.sort(function(a,b) { return (a.mainCost||0) - (b.mainCost||0); });
            var typeLabel = (AlteredDB.txt.types || {})[type] || type;
            var hdr = document.createElement('div');
            hdr.style.cssText = 'font-size:.7rem;font-weight:700;color:var(--neutral-400);text-transform:uppercase;letter-spacing:.05em;padding:4px 0 2px';
            hdr.textContent = typeLabel + ' (' + group.reduce(function(s,c){ return s + c.qty; }, 0) + ')';
            elCardList.appendChild(hdr);
            group.forEach(function(c) {
                var item = document.createElement('div');
                item.className = 'deck-list-item';
                var rGem    = {C:'C',R:'R',U:'U',E:'E'}[c.rarity] || 'C';
                var faction = c.faction || null;
                var dName   = typeof c.name === 'object' ? (c.name[AlteredDB.lang] || c.name.en || '') : (c.name || '');
                item.innerHTML =
                    '<div class="deck-list-qty">'
                    + '<button onclick="removeCard(\'' + escAttr(c.ref) + '\')" title="-">−</button>'
                    + '<span class="qty-num">' + c.qty + '</span>'
                    + '<button onclick="addCard({cardReference:\'' + escAttr(c.ref) + '\',name:\'' + escAttr(c.name||'') + '\',cardTypeReference:\'' + escAttr(c.type||'OTHER') + '\',rarity:\'' + escAttr(c.rarity||'') + '\',factionCode:\'' + escAttr(c.faction||'') + '\',mainCost:' + (c.mainCost||0) + '})" title="+">+</button>'
                    + '</div>'
                    + (faction ? '<img src="' + AlteredDB.pluginAssetsUrl + '/faction/' + faction + '.png" alt="' + faction + '" class="deck-list-gem">' : '')
                    + '<img src="' + AlteredDB.pluginAssetsUrl + '/gems/' + rGem + '.png" alt="' + rGem + '" class="deck-list-gem">'
                    + '<span class="deck-list-name" title="' + escAttr(dName) + '" style="cursor:pointer" onclick="openDbCardModal(\'' + escAttr(c.ref) + '\')">'
                    + escHtml(dName)
                    + '</span>'
                    + (c.isBanned    && rules.allowBanned    === false ? '<span class="deck-list-banned"    title="' + escAttr(AlteredDB.txt.rule_no_banned)    + '"><i class="fa-solid fa-ban"></i></span>'          : '')
                    + (c.isSuspended && rules.allowSuspended === false ? '<span class="deck-list-suspended" title="' + escAttr(AlteredDB.txt.rule_no_suspended) + '"><i class="fa-solid fa-circle-pause"></i></span>' : '')
                    + (c.isFrontierIllegal && rules.requireUniqueLegality ? '<span class="deck-list-banned" title="' + escAttr(AlteredDB.txt.rule_frontier_legal) + '"><i class="fa-solid fa-map"></i></span>' : '')
                    + (c.isSetIllegal ? '<span class="deck-list-banned" title="' + escAttr(AlteredDB.txt.rule_set_legal) + '"><i class="fa-solid fa-layer-group"></i></span>' : '')
                    + (violatingRefs[c.ref] ? '<span class="deck-list-violation" title="' + escAttr(violatingRefs[c.ref]) + '">!</span>' : '')
                    + (AlteredDB.showStockWarn && AlteredDB.collectionMode && c.qty > (AlteredDB.collection[c.ref] || 0)
                        ? '<span class="deck-list-stockwarn" title="' + AlteredDB.txt.stock_warn + '"><i class="fa-solid fa-box-archive" style="font-size:.6rem"></i></span>'
                        : '')
                    + (altArtOwnCache[c.ref] != null && c.qty > altArtOwnCache[c.ref]
                        ? '<span class="deck-list-altartwarn" title="' + escAttr(AlteredDB.txt.alt_art_stock_warn.replace('%owned%', altArtOwnCache[c.ref]).replace('%needed%', c.qty)) + '"><i class="fa-solid fa-triangle-exclamation" style="font-size:.6rem"></i></span>'
                        : '');
                elCardList.appendChild(item);
            });
        });

        renderStatsPane();
        renderGridPane();
        renderHandPane();
    }

    function openValidationModal(results, fmtKey) {
        var fmtData = AlteredDB.formats[fmtKey] || {};
        var fmtName = fmtData[AlteredDB.uiLang] || fmtData.en || fmtKey;
        var titleEl = document.getElementById('db-rules-modal-title');
        var bodyEl  = document.getElementById('db-rules-modal-body');
        if (!titleEl || !bodyEl) return;

        titleEl.textContent = AlteredDB.txt.rules_modal_title + ' — ' + fmtName;

        var html = '<ul style="list-style:none;margin:0;padding:0">';
        results.forEach(function(r) {
            var icon   = r.ok
                ? '<i class="fa-solid fa-check" style="color:#22c55e;width:14px;flex-shrink:0"></i>'
                : '<i class="fa-solid fa-xmark" style="color:#ef4444;width:14px;flex-shrink:0"></i>';
            var detail = '';
            if (r.current !== null && r.limit !== null) {
                detail = '<span style="font-size:.75rem;color:var(--neutral-400);margin-left:auto;white-space:nowrap">'
                    + r.current + ' / ' + r.limit + '</span>';
            } else if (r.limit !== null) {
                detail = '<span style="font-size:.75rem;color:var(--neutral-400);margin-left:auto;white-space:nowrap">'
                    + '&le; ' + r.limit + '</span>';
            }
            html += '<li style="display:flex;align-items:center;gap:8px;padding:7px 16px;border-bottom:1px solid var(--sand-200)">'
                + icon
                + '<span style="font-size:.84rem' + (r.ok ? '' : ';color:#ef4444') + '">' + escHtml(r.label) + '</span>'
                + detail
                + '</li>';
        });
        html += '</ul>';
        bodyEl.innerHTML = html;

        var el = document.getElementById('db-rules-modal');
        var m  = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
        m.show();
    }
