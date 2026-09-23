/* Deckbuilder — lightbox.js
 * Card lightbox, qty stepper, illustration picker.
 * Loaded as a classic script (shared global scope with sibling modules).
 */
    // card lightbox
    var dbCardModal      = document.getElementById('db-card-modal');
    var dbCardModalInner = document.getElementById('db-card-modal-inner');
    function closeDbCardModal() {
        dbCardModal.style.display = 'none';
        if (dbCardModalInner._ownEnhance) { dbCardModalInner._ownEnhance.destroy(); dbCardModalInner._ownEnhance = null; }
        dbCardModalInner.innerHTML = '';
        document.body.style.overflow = '';
    }
    var detailLabel = AlteredDB.txt.detail_label;
    var cardDetailBase = AlteredDB.cardDetailBase;
    var cardDetailLang = AlteredDB.lang;
    window.openDbCardModal = function(ref) {
        dbCardModalInner.innerHTML = '';
        var cardEl;
        if (isUnique(ref)) {
            ensureRenderer();
            cardEl = document.createElement('altered-card');
            cardEl.setAttribute('ref', ref);
            cardEl.setAttribute('locale', AlteredDB.uniqueLocale);
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        } else {
            cardEl = document.createElement('img');
            cardEl.src = cdnUrl(ref);
            cardEl.alt = ref;
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        }
        cardEl.addEventListener('click', closeDbCardModal);
        if (window.OWN_CARD_MODAL_ENHANCE) {
            dbCardModalInner._ownEnhance = window.OWN_CARD_MODAL_ENHANCE.enhance(dbCardModalInner, cardEl, ref, isUnique(ref), AlteredDB.ownAltArt);
        } else {
            dbCardModalInner.appendChild(cardEl);
        }
        dbCardModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
    dbCardModal.addEventListener('click', closeDbCardModal);

    // deck quantity stepper (modal)
    function buildDbQtyControls(ref, cardData) {
        function addPayload() {
            if (cardData) return cardData;
            var c = deck.cards[ref];
            return c ? {
                cardReference: ref, name: c.name, cardTypeReference: c.type, rarity: c.rarity,
                factionCode: c.factionCode || null,
                mainCost: c.mainCost || 0, recallCost: c.recallCost || 0,
                oceanPower: c.oceanPower || 0, mountainPower: c.mountainPower || 0, forestPower: c.forestPower || 0,
                isBanned: !!c.isBanned, isSuspended: !!c.isSuspended,
            } : { cardReference: ref };
        }
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px;background:rgba(0,0,0,.32);border-radius:8px;padding:5px 10px';
        var lbl = document.createElement('span');
        lbl.style.cssText = 'color:rgba(255,255,255,.7);font-size:.76rem;white-space:nowrap';
        lbl.innerHTML = '<i class="fa-solid fa-layer-group" style="margin-right:3px"></i>' + AlteredDB.txt.tab_deck;
        var ctrl = document.createElement('div');
        ctrl.style.cssText = 'display:flex;align-items:center;gap:6px';
        var btnM = document.createElement('button');
        btnM.type = 'button'; btnM.className = 'btn btn-sm btn-outline-secondary';
        btnM.style.cssText = 'padding:1px 8px;font-size:.9rem'; btnM.textContent = '−';
        var qtyEl = document.createElement('span');
        qtyEl.style.cssText = 'color:#fff;font-weight:700;font-size:.9rem;min-width:22px;text-align:center';
        var btnP = document.createElement('button');
        btnP.type = 'button'; btnP.className = 'btn btn-sm btn-outline-secondary';
        btnP.style.cssText = 'padding:1px 8px;font-size:.9rem'; btnP.textContent = '+';
        ctrl.appendChild(btnM); ctrl.appendChild(qtyEl); ctrl.appendChild(btnP);
        row.appendChild(lbl); row.appendChild(ctrl);
        function refresh() {
            var q = deck.cards[ref] ? deck.cards[ref].qty : 0;
            qtyEl.textContent = q;
            btnM.disabled = q === 0;
        }
        btnM.addEventListener('click', function () { removeCard(ref); refresh(); });
        btnP.addEventListener('click', function () { addCard(addPayload()); refresh(); });
        refresh();
        return row;
    }

    // patch openDbCardModal: add deck quantity controls then detail button
    var _origOpenDbCardModal = window.openDbCardModal;
    window.openDbCardModal = function (ref, cardData) {
        _origOpenDbCardModal(ref);
        dbCardModalInner.appendChild(buildDbQtyControls(ref, cardData));
        var detailBtn = document.createElement('a');
        detailBtn.href = cardDetailBase + '?ref=' + encodeURIComponent(ref) + '&card_lang=' + cardDetailLang;
        detailBtn.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i>' + detailLabel;
        detailBtn.className = 'btn btn-sm btn-primary-altered';
        detailBtn.style.cssText = 'display:block;width:100%;margin-top:8px;text-decoration:none';
        dbCardModalInner.appendChild(detailBtn);
    };

    // patch openDbCardModal a second time: illustration picker, only for a card
    // already in the deck (not the browse-grid preview, which passes a cardData
    // payload for a card that hasn't been added yet -- picking an art for it before
    // it exists as a deck line isn't meaningful).
    var _origOpenDbCardModal2 = window.openDbCardModal;
    window.openDbCardModal = function (ref, cardData) {
        _origOpenDbCardModal2(ref, cardData);
        if (cardData || !deck.cards[ref] || !AlteredDB.altArtsUrl || AlteredDB.altArtGlobalMode) return;

        var chooseBtn = document.createElement('button');
        chooseBtn.type = 'button';
        chooseBtn.className = 'btn btn-sm btn-outline-secondary';
        chooseBtn.style.cssText = 'display:block;width:100%;margin-top:8px';
        chooseBtn.innerHTML = '<i class="fa-solid fa-images me-1"></i>' + AlteredDB.txt.choose_illustration;
        dbCardModalInner.appendChild(chooseBtn);

        var panel = document.createElement('div');
        panel.style.cssText = 'margin-top:10px;display:none';
        dbCardModalInner.appendChild(panel);

        chooseBtn.addEventListener('click', function () {
            chooseBtn.disabled = true;
            panel.style.display = '';
            panel.innerHTML = '<div style="color:#fff;font-size:.8rem;text-align:center">' + AlteredDB.txt.loading + '</div>';

            fetchAltArtData([ref]).then(function (data) {
                chooseBtn.disabled = false;
                var group = data && data.groups[ref];
                var key = group && (group.familyId + ':' + group.faction + ':' + group.rarity);
                var opt = key && data.options[key];

                if (!opt || !opt.options || !opt.options.length) {
                    panel.innerHTML = '<div style="color:#fff;font-size:.8rem;text-align:center">'
                        + AlteredDB.txt.no_other_illustration + '</div>';
                    return;
                }

                panel.innerHTML = '';
                var grid = document.createElement('div');
                grid.id = 'db-art-grid';

                var confirmBtn = document.createElement('button');
                confirmBtn.type = 'button';
                confirmBtn.className = 'btn btn-sm btn-primary-altered';
                confirmBtn.style.cssText = 'display:block;width:100%;margin-top:8px';
                confirmBtn.disabled = true;
                confirmBtn.textContent = AlteredDB.txt.illustration_confirm;

                // Unowned illustrations stay selectable here (unlike the Alt Arts BGA
                // preference page): the deckbuilder deliberately never blocks a choice
                // on ownership -- BGA replaces it with the base art at play time if the
                // player still doesn't own enough copies when the deck is fetched.
                var selected = ref;
                opt.options.forEach(function (o) {
                    var tile = document.createElement('div');
                    tile.className = 'db-hero-tile' + (o.reference === ref ? ' selected' : '')
                        + (o.ownedQuantity === 0 ? ' db-art-tile--unowned' : '');
                    var img = document.createElement('img');
                    img.src = cdnUrl(o.reference);
                    img.alt = '';
                    tile.appendChild(img);
                    tile.addEventListener('click', function () {
                        selected = o.reference;
                        grid.querySelectorAll('.db-hero-tile').forEach(function (t) { t.classList.remove('selected'); });
                        tile.classList.add('selected');
                        confirmBtn.disabled = selected === ref;
                    });
                    grid.appendChild(tile);
                });

                panel.appendChild(grid);
                panel.appendChild(confirmBtn);

                confirmBtn.addEventListener('click', function () {
                    if (selected === ref) return;
                    markDirty();
                    var qty = deck.cards[ref].qty;
                    var template = deck.cards[ref];
                    delete deck.cards[ref];
                    if (deck.cards[selected]) {
                        deck.cards[selected].qty += qty;
                    } else {
                        deck.cards[selected] = Object.assign({}, template, { qty: qty });
                    }
                    updateDeckDisplay();
                    closeDbCardModal();
                });
            });
        });
    };

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Through dbHeroClose, not a bare hide: it is what brings the creation
            // dialog back underneath and releases the scroll lock.
            var m = document.getElementById('db-hero-modal');
            if (m && m.style.display !== 'none') { dbHeroClose(); return; }
            if (dbCardModal && dbCardModal.style.display !== 'none') closeDbCardModal();
        }
    });

