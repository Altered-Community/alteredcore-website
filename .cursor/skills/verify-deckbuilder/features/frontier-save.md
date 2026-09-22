# Frontier save (default proven path)

Frontier save is the baseline user path: create a deck, pick a hero, choose **Frontier**, add a few cards, save, then confirm the list on `/pages/decks`.

## Sub-features

- `wizard-open` opens `#db-new-modal` on `/pages/deckbuilder` with no `?id=`.
- `pick-hero` confirms a hero from `#db-hero-grid`.
- `pick-frontier` checks `input[name="db-new-format"][value="frontier"]` (label `.db-new-format-name` text `Frontier`).
- `add-copies` clicks `+` on 2–3 non-hero cards in `#db-grid`.
- `save-auth` clicks `#db-save-btn` while signed in; `#db-save-ok` shows `Deck saved!`.
- `list-hit` opens `/pages/decks`, types the name in `#my-deck-search`, finds `.my-deck-item`.

## How to get to it (user POV)

- Sign in (`alice` / `TestPassword1234` via `/pages/login` → Keycloak) because My decks (`#my-deck-grid`) is logged-in only.
- Open `/pages/deckbuilder` (or New Deck from `/pages/decks`).
- Choose a hero, name the deck, pick Frontier, Create deck.
- Add 2–3 cards with `+`, then Save deck.
- Open Decks and search for the name.

## Driving it with Playwright

Preconditions:

- Doctor green. Fresh Playwright profile. Cards API reachable.
- Authenticate as `alice` (or `--user bob`) before the wizard. Guests cannot appear in `#my-deck-grid`.

- **Login.** `/pages/login` → `a[href*="keycloak-login"]` → `#username` / `#password` → submit. Wait until the host is `localhost:18181`.
- **Open wizard.** `/pages/deckbuilder`. `#db-new-modal` is visible (`display` not `none`). Accept CookieYes (`.cky-btn-accept`).
- **Hero.** `#db-new-hero` → `.db-faction-btn[data-faction="AX"]` if needed → first `#db-hero-grid .db-hero-tile` → `#db-hero-confirm`. `#db-new-hero-name` is not `Select a hero`.
- **Name.** `#db-new-name` = `verify-frontier-$VERIFY_RUN_ID`.
- **Format.** Check `input[name="db-new-format"][value="frontier"]`. Fallback: `label.db-new-format` whose `.db-new-format-name` is exactly `Frontier` (not Next Frontier). Do not match `/Standard/i`.
- **Create.** `#db-new-submit`. Wizard hides. `#db-hero-banner` has the hero. `#db-deck-name` matches. Logged-in URL includes `id=`.
- **Add 2–3 cards.** Search pane `.db-search-tab[data-pane="search"]`. Wait for `#db-grid .db-card-wrap`. Click `button.btn-primary-altered` inside `.db-card-btn-group` on the first 2–3 wraps **without** `.db-card-add-overlay` (that overlay is Change hero). `#db-card-list .deck-list-item` count ≥ 2. `#db-card-count` is not `0 cards`.
- **Save.** `#db-save-btn`. `#db-save-ok` visible with `Deck saved!` (not only `Deck saved locally!`). If `#db-save-error` shows, fail.
- **List.** Go to `/pages/decks` (My decks tab). Type the name in `#my-deck-search` (input debounce ~350ms reloads ajax). Wait for `#my-deck-grid .my-deck-item` whose `.news-card-title` or `.deck-card-link-overlay[aria-label]` contains the name. Prefer `data-format="frontier"` on that item.
- **Proof.** Screenshots: wizard with Frontier selected, builder after adds, `#db-save-ok`, decks list hit. HTML snapshot of the list. Do not POST `?ajax=1` as the proof.

## Gotchas

- Format radio **value** is the formats-API key `frontier`. Visible English/French name is `Frontier`. `Next Frontier` is a different search-filter chip (`data-value="next_frontier"`), not this wizard radio.
- Owned list cards are `.my-deck-item` (no `data-name`). Public cards use `.pub-deck-item[data-name]`. Search `#my-deck-search` only filters My decks.
- Hero tiles in the grid use Change hero, not `+`.
- CookieYes can cover Create deck / Save. Dismiss before clicks.
- `#db-unsaved-modal` appears if you leave dirty; save first.
- After `setHero()`, assert `#db-hero-banner`, not `#db-hero-label`.
