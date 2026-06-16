<?php
/**
 * Shared card zoom lightbox. Defines window.acOpenCardZoom(ref, unique, lang, imgSrc).
 * Expects $txt['detail_label'], BASE_URL and $lang in scope.
 * Unique cards render via <altered-card>, so the renderer must be loaded (deck.php loads it
 * conditionally; the deck builder loads it on demand via ensureRenderer()).
 * Included by the deck detail page (deck.php) and the deck builder (deckbuilder.php).
 */
?>
<div id="card-modal" class="ac-lightbox-overlay" style="display:none">
    <div id="card-modal-inner" class="ac-lightbox-inner" onclick="event.stopPropagation()"></div>
</div>
<script>
(function () {
    var modal = document.getElementById('card-modal');
    var inner = document.getElementById('card-modal-inner');
    var detailLabel = <?= json_encode($txt['detail_label']) ?>;
    var cardDetailBase = <?= json_encode(BASE_URL . '/pages/card') ?>;
    var cardDetailLang = <?= json_encode($lang) ?>;

    function closeModal() {
        modal.style.display = 'none'; inner.innerHTML = '';
        document.body.style.overflow = '';
    }
    function openModal(ref, unique, lang, imgSrc) {
        inner.innerHTML = '';
        var cardEl;
        if (unique) {
            cardEl = document.createElement('altered-card');
            cardEl.setAttribute('ref', ref); cardEl.setAttribute('locale', lang);
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;border-radius:12px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        } else {
            cardEl = document.createElement('img');
            cardEl.src = imgSrc || ''; cardEl.alt = '';
            cardEl.style.cssText = 'display:block;width:100%;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.6);cursor:pointer';
        }
        cardEl.addEventListener('click', closeModal);
        inner.appendChild(cardEl);
        var detailBtn = document.createElement('a');
        detailBtn.href = cardDetailBase + '?ref=' + encodeURIComponent(ref) + '&card_lang=' + cardDetailLang;
        detailBtn.innerHTML = '<i class="fa-solid fa-circle-info me-1"></i>' + detailLabel;
        detailBtn.className = 'btn btn-sm btn-primary-altered';
        detailBtn.style.cssText = 'display:block;width:100%;margin-top:8px;text-decoration:none';
        inner.appendChild(detailBtn);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    window.acOpenCardZoom = function (ref, unique, lang, imgSrc) { openModal(ref, unique, lang, imgSrc); };

    modal.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
}());
</script>
