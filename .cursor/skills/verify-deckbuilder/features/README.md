# Deckbuilder verification map

This directory is the maintained source for verifying user-facing behavior of the **production** deckbuilder (`core-altered-cards` on the Aspire website). Read this index before driving, then use the matching feature file.

Do not use `altered-deckbuilder-poc-v2`.

## Baseline preconditions

- Website at `http://localhost:18181` (doctor green).
- Cards API `https://cards.alteredcore.org` reachable.
- Unique Playwright profile: `/tmp/verify-deckbuilder-$VERIFY_RUN_ID`.
- Never drive a browser or Aspire instance this run did not health-check.
- Guest mode is on (`$guestModeEnabled = true`). Unauthenticated `/pages/deckbuilder` opens the new-deck wizard.
- Logged-in tests use Keycloak users `alice` or `bob` / `TestPassword1234`.
- Name verification decks with a `verify-` prefix and the run id so they are obvious in `/pages/decks`.
- **Default proven scenario** is [Frontier save](./frontier-save.md) (`drive` with no feature id, or `drive frontier-save`): login → New Deck → hero → **Frontier** → 2–3 cards → Save → `/pages/decks` list hit. Isolated features below are optional slices, not the baseline.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Prefer `#id`, `data-faction`, `data-pane`, accessible names, and visible button text (`Create deck`, `Choose this hero`, `Save deck`).
- Run browser actions through `bin/verify-deckbuilder drive <feature-id>`.
- Restore mutated decks only when the recipe says to; keep proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof: screenshot with Deck Builder chrome visible plus an HTML snapshot that includes `#db-hero-banner` / `#db-new-hero-name` / `#db-card-count`.
- Mutation proof: a second user-facing view (URL `?id=`, decks list, or reload) for logged-in saves.
- Record the feature ID on every artifact.
- Unreachable path → report the route attempted and the unmet precondition. Do not call a different entry point “verified” for it.

## Feature entry contract

Each feature file: H1, one paragraph, then exactly `Sub-features`, `How to get to it (user POV)`, `Driving it with Playwright`, `Gotchas`.

## Features

- [Frontier save](./frontier-save.md) — **default.** Login, wizard, Frontier, add 2–3 cards, save, confirm My decks.
- [Create a deck](./create-deck.md) — wizard: hero, name, format, Create deck.
- [Search and add cards](./search-add-cards.md) — filters, search, `+` on a card, sidebar count.
- [Save a deck](./save-deck.md) — Save deck / autosave, guest local vs server.
- [Browse and edit decks](./browse-decks.md) — `/pages/decks`, open builder with `?id=`.
- [View deck, stats, starting hand](./view-stats-hand.md) — Search / View Deck / Starting hand tabs and Cards / Stats.
