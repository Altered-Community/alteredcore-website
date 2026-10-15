// Alt Art Shop — grid rendering, filters and the purchase confirmation.
//
// Everything drawn here comes from one server response: this file never computes a price, an owned
// count or a balance of its own, so the grid cannot disagree with the data it is quoting. Both list
// endpoints answer the same shape (see ../includes/shop-list.php), which is what lets the preview
// page run this file unchanged.
//
// Nothing is spent. "Buy" opens the confirmation dialog and "Confirm payment" closes it and says
// purchases are not available yet — there is no buy route to call, because the purchase is settled
// by external endpoints.
(() => {
    const cfg = window.OWN_SHOP || {};
    const gridEl = document.getElementById('own-shop-grid');
    if (!gridEl) return; // other pages of this plugin share this asset

    const statusEl = document.getElementById('own-shop-status');
    const loadMoreWrap = document.getElementById('own-shop-loadmore');
    const loadMoreBtn = document.getElementById('own-shop-loadmore-btn');
    const searchEl = document.getElementById('own-shop-q');
    const balanceEl = document.getElementById('own-shop-balance');
    const balanceValueEl = document.getElementById('own-shop-balance-value');

    const dialog = document.getElementById('own-shop-buy');
    const confirmBtn = document.getElementById('own-shop-buy-confirm');

    const t = (key, fallback) => (cfg.txt && cfg.txt[key]) || fallback;

    // faction/rarity/type are multi-select Sets; an empty Set is "no opinion on this group", which
    // is what the server reads as no filter. q stays a single string.
    const state = {
        q: '',
        faction: new Set(),
        rarity: new Set(),
        type: new Set(),
        skip: 0,
        hasMore: false,
        loading: false,
        // null means "this site cannot say", which is not the same as zero. Nothing is rendered from
        // it until a response supplies a number.
        balance: null,
    };

    // Every item currently rendered, by reference. The dialog is one element for the whole grid, so
    // it needs the item back when a Buy button is pressed — reading it out of the DOM instead would
    // mean re-parsing what this file just wrote.
    const itemsByReference = new Map();

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const num = (n) => Number(n || 0).toLocaleString(document.documentElement.lang || 'en');

    // ---- Notices above the grid ----------------------------------------------------------------
    // One slot, always replaced: a stale message next to a fresh filter result would be worse than
    // no message at all.
    function status(kind, text) {
        if (!statusEl || !text) return;
        const icon = kind === 'warning' ? 'triangle-alert' : 'info';
        statusEl.innerHTML = '<div class="ac-notice ac-notice--' + kind + '" role="'
            + (kind === 'error' ? 'alert' : 'status') + '">'
            + (window.acIcon ? window.acIcon(icon) : '')
            + '<div>' + esc(text) + '</div></div>';
    }
    const clearStatus = () => { if (statusEl) statusEl.innerHTML = ''; };

    // ---- Rendering -----------------------------------------------------------------------------
    // The server already localised the rarity names and ships them with the page, so the tag and
    // the grid agree on wording without a second dictionary here.
    function rarityLabel(rarity) {
        const dict = (cfg.txt && cfg.txt.rarity) || {};
        return dict[rarity] || rarity;
    }

    // A price the table has no row for is shown as such, never as another print's price: a wrong
    // number here is read as a real offer. See ownShopPriceInTable().
    function priceLabel(item) {
        if (item.price === null || item.price === undefined) return t('price_unknown', 'Price unavailable');
        return num(item.price);
    }

    function tileHtml(item) {
        const meta = rarityLabel(item.rarity) + (item.faction ? ' · ' + item.faction : '');

        // The currency mark sits on the same line as the figure it belongs to. The icon URL comes
        // from the server (window.OWN_SHOP.currencyIcon) so a sub-path install does not point at a
        // path that does not exist; a missing one drops the image rather than the price.
        const icon = cfg.currencyIcon
            ? '<img class="own-shop-tile__cost-icon" src="' + esc(cfg.currencyIcon) + '" alt="" width="20" height="20">'
            : '';

        return '<article class="ac-card ac-card--flush ac-card--sm own-shop-tile" data-reference="' + esc(item.reference) + '">'
            + '<div class="own-shop-tile__media">'
            + '<img class="own-shop-tile__img" src="' + esc(item.image) + '" alt="' + esc(item.name) + '"'
            + ' loading="lazy" decoding="async" width="200" height="280">'
            + '<span class="ac-tag own-shop-tile__rarity">' + esc(rarityLabel(item.rarity)) + '</span>'
            + '</div>'
            + '<div class="own-shop-tile__body">'
            + '<h3 class="own-shop-tile__name" title="' + esc(item.name) + '">' + esc(item.name) + '</h3>'
            + '<p class="own-shop-tile__meta">' + esc(meta) + '</p>'
            + '<div class="own-shop-tile__footer">'
            + '<p class="own-shop-tile__cost">' + icon
            + '<span class="own-shop-tile__price' + (item.price === null || item.price === undefined ? ' is-unknown' : '') + '">'
            + esc(priceLabel(item)) + '</span>'
            + '</p>'
            + '<button type="button" class="ac-button ac-button--sm ac-button--full own-shop-tile__buy" data-own-shop-buy>'
            + (window.acIcon ? window.acIcon('shopping-cart') : '') + esc(t('buy', 'Buy')) + '</button>'
            + '</div></div></article>';
    }

    function render(items, append) {
        const html = items.map(tileHtml).join('');
        if (append) {
            gridEl.insertAdjacentHTML('beforeend', html);
        } else {
            itemsByReference.clear();
            gridEl.innerHTML = html;
        }
        items.forEach((item) => itemsByReference.set(item.reference, item));

        if (items.length === 0 && (!append || !state.hasMore)
            && !gridEl.querySelector('.own-shop-tile')) {
            // Empty because the filter matched nothing, or because everything left in the catalogue
            // is already owned — including the case where the walk past empty pages came back with
            // nothing. Both are the same thing to the player: there is nothing here to buy. Guarded
            // on having no tiles, so a page that legitimately ends on nothing does not wipe the
            // results already on screen.
            const filtered = state.q !== '' || state.faction.size > 0 || state.rarity.size > 0 || state.type.size > 0;
            const msg = filtered
                ? t('empty', 'No alt art matches these filters.')
                : t('noAltArts', 'Every alt art in this catalogue is already in your collection.');
            gridEl.innerHTML = '<div class="ac-empty">' + (window.acIcon ? window.acIcon('store') : '')
                + '<p class="ac-empty__title">' + esc(msg) + '</p></div>';
        }
        if (loadMoreWrap) loadMoreWrap.hidden = !state.hasMore;
        gridEl.setAttribute('aria-busy', 'false');
    }

    // ---- Balance -------------------------------------------------------------------------------
    // Shown only when the server sent one. A known zero is shown as zero; an unknown balance leaves
    // the chip hidden, because an empty chip would read as "you have nothing" and a 0 would be a
    // claim this site cannot make.
    function setBalance(value) {
        const known = value !== null && value !== undefined && Number.isFinite(Number(value));
        state.balance = known ? Math.max(0, Number(value)) : null;
        if (!balanceEl || !balanceValueEl) return;
        balanceEl.hidden = !known;
        if (known) balanceValueEl.textContent = num(state.balance);
    }

    // ---- Purchase confirmation -----------------------------------------------------------------
    function openBuyDialog(item) {
        if (!dialog) return;

        const price = item.price === null || item.price === undefined ? null : Number(item.price);
        const set = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        const img = document.getElementById('own-shop-buy-img');
        if (img) {
            img.src = item.image || '';
            img.alt = item.name || '';
        }
        set('own-shop-buy-name', item.name || '');
        set('own-shop-buy-meta', rarityLabel(item.rarity) + (item.faction ? ' · ' + item.faction : ''));
        set('own-shop-buy-price', priceLabel(item));
        set('own-shop-buy-balance', state.balance === null ? '—' : num(state.balance));
        // The balance after the purchase is only meaningful when both numbers are known; showing
        // "1000 - 5000" as a negative would be a figure the shop has no right to state.
        set('own-shop-buy-after', price !== null && state.balance !== null
            ? num(state.balance - price)
            : '—');

        if (confirmBtn) confirmBtn.disabled = price === null;
        dialog.showModal();
    }

    // ---- Data ----------------------------------------------------------------------------------
    async function load(append) {
        if (state.loading) return;
        state.loading = true;
        if (!append) {
            state.skip = 0;
            gridEl.setAttribute('aria-busy', 'true');
        }

        // Repeated keys for the multi-select groups; the endpoint reads faction[]/rarity[]/type[].
        const params = new URLSearchParams();
        if (state.q !== '') params.set('q', state.q);
        state.faction.forEach((v) => params.append('faction[]', v));
        state.rarity.forEach((v) => params.append('rarity[]', v));
        state.type.forEach((v) => params.append('type[]', v));
        params.set('skip', String(state.skip));

        try {
            const res = await fetch(cfg.listUrl + '?' + params.toString(), {
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // A service that is unreachable or not configured leaves an empty list that is not
                // an answer. Say which, rather than rendering "no alt art" as if it were true.
                gridEl.setAttribute('aria-busy', 'false');
                if (loadMoreWrap) loadMoreWrap.hidden = true;
                if (!append) gridEl.innerHTML = '';
                const missing = data.error === 'preview_unavailable';
                status('error', missing
                    ? t('previewMissing', 'The shop preview is not installed on this server.')
                    : data.error === 'not_configured'
                        ? t('notConfigured', 'The shop is not available on this server.')
                        : t('loadError', 'Could not load the shop.'));
                return;
            }

            const items = data.items || [];
            state.hasMore = !!data.hasMore;
            // skipNext, not items.length: the source pages by family while the grid shows
            // printings, so counting items here would skip or repeat families.
            state.skip = typeof data.skipNext === 'number' ? data.skipNext : state.skip;
            setBalance(data.balance);

            render(items, append);
            if (!append) clearStatus();
        } catch (e) {
            gridEl.setAttribute('aria-busy', 'false');
            if (loadMoreWrap) loadMoreWrap.hidden = true;
            if (!append) gridEl.innerHTML = '';
            status('error', t('networkError', 'Network error.'));
        } finally {
            state.loading = false;
        }
    }

    // ---- Events --------------------------------------------------------------------------------
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => load(true));
    }

    // Delegated: the tiles are replaced on every filter change, so a listener per button would have
    // to be rebound each time.
    gridEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-own-shop-buy]');
        if (!btn) return;
        const tile = btn.closest('.own-shop-tile');
        const item = tile ? itemsByReference.get(tile.dataset.reference) : null;
        if (item) openBuyDialog(item);
    });

    if (dialog) {
        dialog.querySelectorAll('[data-own-shop-close]').forEach((el) => {
            el.addEventListener('click', () => dialog.close());
        });
        // Clicking the backdrop lands on the dialog element itself, not on its content.
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.close();
        });
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                dialog.close();
                status('warning', t('not_available', 'Purchases are not available yet. Nothing was spent.'));
            });
        }
    }

    // Typing filters after a pause: one request per phrase instead of one per keystroke.
    if (searchEl) {
        let timer = null;
        searchEl.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                state.q = searchEl.value.trim();
                load(false);
            }, 250);
        });
    }

    // Multi-select: each chip toggles its value in the group's set, and the "All" chip (the one with an
// empty value) clears the set. The pressed look is computed from the set rather than toggled in
// place, so removing the last selection brings "All" back without a special case.
    document.querySelectorAll('.own-shop-filters__group').forEach((group) => {
        const key = group.dataset.filter;
        const set = state[key];
        if (!key || !(set instanceof Set)) return;

        const chips = Array.from(group.querySelectorAll('.ac-chip'));
        const allChip = chips.find((c) => (c.dataset.value || '') === '') || null;

        const sync = () => {
            chips.forEach((c) => {
                const on = c === allChip ? set.size === 0 : set.has(c.dataset.value || '');
                c.classList.toggle('is-on', on);
                c.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        };

        group.addEventListener('click', (e) => {
            const chip = e.target.closest('.ac-chip');
            if (!chip || !group.contains(chip)) return;

            if (chip === allChip) {
                set.clear();
            } else {
                const value = chip.dataset.value || '';
                if (value === '') return;
                if (set.has(value)) set.delete(value); else set.add(value);
            }
            sync();
            load(false);
        });

        sync();
    });

    load(false);
})();
