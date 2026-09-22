# Search and add cards

Search and add cards lets a user filter the catalog, add copies with `+`, and see them in the deck sidebar with an updated count.

## Sub-features

- `search-query` types a name into `#db-search` and applies filters.
- `search-results` shows cards in `#db-grid`.
- `add-copy` increments a non-hero card via the `+` control on `.db-card-wrap`.
- `remove-copy` decrements via `−` or the sidebar `deck-list-qty` buttons.
- `count-updates` `#db-card-count` matches copies added.

## How to get to it (user POV)

- Complete [Create a deck](./create-deck.md) so the wizard is closed and a hero is set (faction filter follows the hero).
- Stay on the Search toggle (`.db-search-tab[data-pane="search"]`, pane `#db-search-pane-search`).

## Driving it with Playwright

Preconditions:

- Builder visible, wizard closed, `#db-hero-banner` shows a hero (not the empty `Select a hero` slot).
- `#db-search-pane-search` is displayed.

- **Search.** Fill `#db-search` with a common character name (e.g. `Kojo` for Axiom). Click `#db-apply-btn` if results do not refresh from debounce.
- **See grid.** Wait for `#db-grid .db-card-wrap` (or `.cards-grid-db` children). `#db-count` is not empty.
- **Add.** On the first non-hero wrap, click `button.btn-primary-altered` inside `.db-card-btn-group` (title `+`). Sidebar `#db-card-list` gains a `.deck-list-item`. `#db-card-count` is not `0 cards`.
- **Remove.** Click the matching `−` control. Count decreases.
- **Proof.** Screenshot of grid + sidebar together (`search-add-cards-after.png`) showing at least one `.deck-list-item` and a non-zero `#db-card-count`.

## Gotchas

- Hero tiles in search use `.db-card-add-overlay` (`Change hero`), not `+`. Do not treat that as an add.
- Token-type cards have no add/remove controls.
- Copy limits depend on format (`maxCopiesPerRef`, rarity). A silent no-op on `+` is often a rule, not a driver bug — read `#db-validation`.
- Faction is pinned to the hero. Searching a card of another faction yields empty results.
- Default types in deck mode exclude Hero/Token from the main search targets.
