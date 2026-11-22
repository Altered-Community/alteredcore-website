/** Scrolls the nearest horizontal scroller so `el` is fully visible, without moving any vertical scroller. */
export function scrollIntoViewInline(el: HTMLElement): void {
  const scroller = el.parentElement;
  if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
  const pad = parseFloat(getComputedStyle(scroller).scrollPaddingInlineStart) || 0;
  const s = scroller.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.left < s.left + pad) scroller.scrollBy({ left: r.left - s.left - pad });
  else if (r.right > s.right - pad) scroller.scrollBy({ left: r.right - s.right + pad });
}
