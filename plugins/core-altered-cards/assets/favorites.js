// Standalone favorite-star helper for pages OUTSIDE the card-search engine
// (card.php detail view, deck.php card grid). Config is read from window.AC_FAV:
//   { enabled, data:{ref:true}, csrf, toggleUrl, label }
//
// Usage: var star = window.acFavButton({ ref, faction, rarity, set }); wrap.appendChild(star);
// The star persists the toggle to our DB via the favorites-toggle endpoint, and keeps
// every star of the same card (data-ref) in sync on the page.
(function () {
    var CFG = window.AC_FAV || {};

    function applyState(btn, isFav) {
        btn.classList.toggle('is-fav', !!isFav);
        var icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-solid', !!isFav);
            icon.classList.toggle('fa-regular', !isFav);
        }
    }

    function toggle(btn) {
        if (!CFG.enabled || !CFG.toggleUrl) return;
        var ref = btn.dataset.ref;
        if (!ref || btn.disabled) return;
        btn.disabled = true;
        var body = new URLSearchParams();
        body.append('csrf_token', CFG.csrf || '');
        body.append('card_ref',   ref);
        body.append('faction',    btn.dataset.faction || '');
        body.append('rarity',     btn.dataset.rarity  || '');
        body.append('card_set',   btn.dataset.set     || '');
        fetch(CFG.toggleUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    body.toString(),
        })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            btn.disabled = false;
            if (!data || !data.ok) return;
            CFG.data = CFG.data || {};
            if (data.favorited) CFG.data[ref] = true;
            else                delete CFG.data[ref];
            document.querySelectorAll('[data-fav-toggle][data-ref="' + ref + '"]').forEach(function (b) {
                applyState(b, data.favorited);
            });
        })
        .catch(function () { btn.disabled = false; });
    }

    // Build a favorite-star button element (or null when favorites are disabled).
    window.acFavButton = function (meta) {
        if (!CFG.enabled || !meta || !meta.ref) return null;
        var ref   = meta.ref;
        var isFav = !!(CFG.data && CFG.data[ref]);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'card-fav-btn' + (isFav ? ' is-fav' : '');
        b.setAttribute('data-fav-toggle', '');
        b.dataset.ref     = ref;
        b.dataset.faction = meta.faction || '';
        b.dataset.rarity  = meta.rarity  || '';
        // Set falls back to the reference's set segment (reliable) when not provided.
        b.dataset.set     = meta.set || (ref.split('_')[1] || '');
        b.title = CFG.label || 'Favori';
        b.innerHTML = '<i class="' + (isFav ? 'fa-solid' : 'fa-regular') + ' fa-star"></i>';
        // Direct listener + stopPropagation so the star never triggers the card's own click.
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(b); });
        return b;
    };
})();
