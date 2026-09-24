<?php
// global loading spinner
// Usage (JS): window.acSpinner.show('Message…')  /  window.acSpinner.hide()
?>
<div id="ac-spinner" role="status" aria-live="polite"
     style="display:none;position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.45);align-items:center;justify-content:center">
    <div style="background:var(--sand-50,#fafaf7);border:2px solid var(--sand-200,#e8e4da);border-radius:12px;padding:20px 28px;display:flex;flex-direction:column;gap:10px;min-width:240px;box-shadow:0 4px 24px rgba(0,0,0,.18)">
        <div style="display:flex;align-items:center;gap:14px">
            <div class="spinner-border" aria-hidden="true"
                 style="width:1.5rem;height:1.5rem;border-width:3px;color:var(--primary-400,#6366f1);flex-shrink:0"></div>
            <span id="ac-spinner-label"
                  style="font-size:.92rem;font-weight:600;color:var(--neutral-700,#374151)"></span>
        </div>
        <div id="ac-progress-wrap" style="display:none">
            <div style="background:var(--sand-200,#e8e4da);border-radius:99px;height:6px;overflow:hidden">
                <div id="ac-progress-bar"
                     style="height:100%;background:var(--primary-400,#C9A84C);border-radius:99px;width:0%;transition:width .3s ease"></div>
            </div>
        </div>
    </div>
</div>
<script>
// Usage: window.acSpinner.show('msg')  /  .progress(pct, 'msg')  /  .hide()
window.acSpinner = {
    show: function (msg) {
        var el  = document.getElementById('ac-spinner');
        var lbl = document.getElementById('ac-spinner-label');
        if (lbl && msg !== undefined) lbl.textContent = msg || '';
        if (el)  el.style.display = 'flex';
    },
    progress: function (pct, msg) {
        var wrap = document.getElementById('ac-progress-wrap');
        var bar  = document.getElementById('ac-progress-bar');
        if (wrap) wrap.style.display = '';
        if (bar)  bar.style.width = Math.min(100, Math.max(0, pct || 0)) + '%';
        this.show(msg);
    },
    hide: function () {
        var el   = document.getElementById('ac-spinner');
        var wrap = document.getElementById('ac-progress-wrap');
        var bar  = document.getElementById('ac-progress-bar');
        if (bar)  bar.style.width = '0%';
        if (wrap) wrap.style.display = 'none';
        if (el)   el.style.display  = 'none';
    }
};
</script>
<script>
(function () {
    // Workaround for cards.alteredcore.org sometimes omitting `set` on a card
    // object (seen on cards from a just-released set). The third-party
    // Altered-Card-Renderer (<altered-card>, used for boosters/uniques) builds
    // its CDN image URLs from card.set.reference, so a missing set turns into a
    // broken ".../cards/assets//REF.webp" URL. Until the API always returns it,
    // derive it here from the card's own reference (ALT_<SET>_...).
    if (window._acCardsApiSetFallbackPatched) return;
    window._acCardsApiSetFallbackPatched = true;
    var nativeFetch = window.fetch;
    if (typeof nativeFetch !== 'function') return;
    window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (!/^https:\/\/cards\.alteredcore\.org\/api\/cards\b/.test(url)) {
            return nativeFetch(input, init);
        }
        return nativeFetch(input, init).then(function (res) {
            if (!res.ok) return res;
            return res.clone().json().then(function (data) {
                var fillSet = function (card) {
                    if (card && (!card.set || !card.set.reference) && card.reference) {
                        var setRef = card.reference.split('_')[1];
                        if (setRef) card.set = Object.assign({}, card.set, { reference: setRef });
                    }
                };
                var list = Array.isArray(data) ? data : (data && Array.isArray(data.member) ? data.member : [data]);
                list.forEach(fillSet);
                return new Response(JSON.stringify(data), {
                    status: res.status,
                    statusText: res.statusText,
                    headers: res.headers,
                });
            }).catch(function () { return res; });
        });
    };
})();
</script>
<?php
require_once __DIR__ . '/shortcodes.php';
require themeFile('footer.php');
