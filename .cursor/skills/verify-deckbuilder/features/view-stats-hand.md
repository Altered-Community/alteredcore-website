# View deck, stats, starting hand

View deck, stats, and starting hand let a user inspect the current list as a grid, see format stats, and sandbox an opening hand — without changing persistence by themselves.

## Sub-features

- `tab-search` returns to card search (`.db-search-tab[data-pane="search"]`).
- `tab-grid` opens View Deck (`data-pane="view"`, `#db-search-pane-view`, `#db-deckgrid-content`).
- `tab-hand` opens Starting hand (`data-pane="hand"`).
- `tab-stats` in the sidebar (`.db-deck-tab[data-pane="stats"]`) shows curves in `#db-deck-pane-stats`.
- `grid-toggle` switches `#db-grid-toggle-grid` / `#db-grid-toggle-list`.

## How to get to it (user POV)

- In the builder, use the left toggles: Search, View Deck, Starting hand.
- In the right panel, use Cards vs Stats.
- On small viewports, use the Search / Deck tab panes (`#db-tab-search`, `#db-tab-deck`).

## Driving it with Playwright

Preconditions:

- Deck has a hero and at least one added card so panes are not empty (`No cards in the deck.` is a valid empty proof if you are checking empty state).

- **View Deck.** Click `.db-search-tab[data-pane="view"]`. `#db-search-pane-view` is visible; `#db-deckgrid-content` is not empty when the sidebar has cards.
- **List vs grid.** Click `#db-grid-toggle-list` then `#db-grid-toggle-grid`. Active class moves.
- **Stats.** Click `.db-deck-tab[data-pane="stats"]`. `#db-deck-pane-stats` is displayed; `#db-deck-pane-cards` is hidden. Cost curve headings match `Hand cost curve` / `Reserve cost curve` (EN).
- **Starting hand.** Click `.db-search-tab[data-pane="hand"]`. `#db-search-pane-hand` is visible.
- **Proof.** Screenshot of View Deck with cards visible, or Stats with a non-empty pane. Toggle back to Search so later features start from baseline.

## Gotchas

- View Deck / Starting hand panes start `display:none`. Assert computed style, not merely presence in the DOM.
- Stats on an empty deck still renders; do not require a valid format badge (`#db-validation`) unless testing validation.
- Starting-hand sandbox can mutate tester state; call it after add-cards, and do not use it as save proof.
