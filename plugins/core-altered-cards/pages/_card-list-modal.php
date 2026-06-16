<?php
/**
 * Shared playtest card-list modal (mana / board / discard lists).
 * Defines window.acOpenCardListModal(titleText, cards, perCardAction).
 * Self-contained; reads the global handLang at call time (guarded).
 * Included by the deck detail page (deck.php) and the deck builder (deckbuilder.php).
 */
?>
<div id="pt-list-modal" class="ac-lightbox-overlay" style="display:none">
  <div class="ac-list-panel" onclick="event.stopPropagation()">
    <div class="ac-list-head"><span id="pt-list-title"></span>
      <button type="button" class="btn-close" id="pt-list-close" aria-label="Close"></button></div>
    <div id="pt-list-body" class="ac-list-body"></div>
  </div>
</div>
<script>
(function () {
  var modal = document.getElementById('pt-list-modal');
  var title = document.getElementById('pt-list-title');
  var body  = document.getElementById('pt-list-body');
  function close() { modal.style.display = 'none'; body.innerHTML = ''; document.body.style.overflow = ''; }
  window.acOpenCardListModal = function (titleText, cards, perCardAction) {
    title.textContent = titleText + ' (' + cards.length + ')';
    body.innerHTML = '';
    cards.forEach(function (c) {
      var row = document.createElement('div'); row.className = 'ac-list-row';
      var thumb;
      if (c.unique) {
        thumb = document.createElement('altered-card'); thumb.className = 'ac-list-thumb';
        thumb.setAttribute('ref', c.ref); thumb.setAttribute('locale', (typeof handLang !== 'undefined' ? handLang : 'en'));
      } else {
        thumb = document.createElement('img'); thumb.className = 'ac-list-thumb'; thumb.src = c.img || ''; thumb.alt = c.name || c.ref; thumb.loading = 'lazy';
      }
      var nm = document.createElement('span'); nm.className = 'ac-list-name'; nm.textContent = c.name || c.ref;
      row.appendChild(thumb); row.appendChild(nm);
      if (perCardAction) {
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-sm btn-primary-altered';
        btn.textContent = perCardAction.label;
        btn.addEventListener('click', function () { perCardAction.fn(c); close(); });
        row.appendChild(btn);
      }
      body.appendChild(row);
    });
    modal.style.display = 'flex'; document.body.style.overflow = 'hidden';
  };
  document.getElementById('pt-list-close').addEventListener('click', close);
  modal.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
}());
</script>
