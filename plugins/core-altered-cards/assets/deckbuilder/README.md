# Deckbuilder JS modules

Classic scripts (not ES modules) so they share one global scope — the same
contract as the previous single IIFE, without a PHP concatenator (plugin
`.php` files are denied by Apache).

Load order is defined in `pages/deckbuilder.php`:

1. `state.js` — deck object, dirty/autosave, DOM refs, wizard flags
2. `cards.js` — ref helpers, browser card renderer
3. `hero.js` — setHero / add-remove copies
4. `alt-art.js` — ownership illustrations
5. `validation.js` — format rules + sidebar list
6. `panes.js` — stats / grid / starting hand
7. `hero-picker.js` — hero modal + Cards API fetch
8. `wizard.js` — new-deck dialog
9. `save.js` — save, guest storage, load, Frontier check
10. `token-arts.js` — token illustration picker
11. `lightbox.js` — card lightbox + qty + art swap
12. `ui.js` — tabs and boot
13. `status-strip.js` — sticky status strip, add toast with undo, Deck tab badge (styles in `status-strip.css`)
14. `search-bind.js` — CardSearch wiring (after `card-search.js`)
15. `hand-i18n.js` — playtest strings (after hand-odds scripts)

UI feedback events on `document`: `db:card-delta` (`{ref, name, qty, change}`),
`db:deck-updated`, `db:save-state` (`{state: 'dirty'|'saving'|'saved'|'error'}`).
