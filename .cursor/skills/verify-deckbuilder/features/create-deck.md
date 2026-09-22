# Create a deck

Create a deck lets a user pick a hero, name the list, choose a format, and land in the builder with that identity applied — without a deck existing until they confirm.

## Sub-features

- `create-open` opens the new-deck wizard from `/pages/deckbuilder` with no `?id=`.
- `create-hero` opens the hero picker, selects a faction tile, confirms a hero.
- `create-meta` sets name and format (and visibility when logged in).
- `create-submit` creates the deck and closes the wizard.
- `create-cancel` abandons the wizard and returns to `/pages/decks`.

## How to get to it (user POV)

- Open `http://localhost:18181/pages/deckbuilder` (guest or logged-in, no `?id=`, no restored guest deck).
- From `/pages/decks`, choose New Deck / the guest create button (links to `/pages/deckbuilder`).

## Driving it with Playwright

Preconditions:

- Doctor is green.
- Fresh Playwright profile (no guest `localStorage` deck).
- Cards API reachable so `#db-hero-grid` can populate.

- **Open wizard.** Go to `/pages/deckbuilder`. `#db-new-modal` is `display:flex` and heading text is `New Deck`.
- **Pick hero.** Click `#db-new-hero`. `#db-hero-modal` is visible. Click `.db-faction-btn[data-faction="AX"]` if needed. Wait for `#db-hero-grid .db-hero-tile` (network to `cards.alteredcore.org`). Click the first tile, then `#db-hero-confirm` (`Choose this hero`). Modal hides; `#db-new-hero-name` is no longer `Select a hero`.
- **Name.** Fill `#db-new-name` with `verify-create-$VERIFY_RUN_ID`.
- **Format (this isolated feature).** Check `label.db-new-format` whose `.db-new-format-name` starts with `Standard All Uniques`. Do not use `/Standard/i` — `Standard No Unique` is `value="nuc"`. The **default proven path** instead checks `input[name="db-new-format"][value="frontier"]` — see [Frontier save](./frontier-save.md). Dismiss CookieYes (`.cky-btn-accept` / Accept) if it covers the page.
- **Create.** Click `#db-new-submit` (`Create deck`). `#db-new-modal` hides. `#db-hero-banner` shows the chosen hero name (the original `#db-hero-label` node is replaced by `setHero()`). `#db-deck-name` matches the typed name.
- **Logged-in extra.** URL contains `id=`. Optional: open `/pages/decks` and find the name in the list.
- **Cancel path (optional).** Reload `/pages/deckbuilder` in a fresh profile, open wizard, click the × (`.db-hero-close-btn` on `#db-new-modal`) or Cancel. Location is `/pages/decks`.
- **Proof.** Screenshot `#db-new-modal` filled (`create-deck-wizard.png`) and the builder after submit (`create-deck-after.png`). HTML snapshot must include the hero name and deck name.

## Gotchas

- A restored guest deck in `localStorage` skips the wizard (`newDeckFlow` is true only when there is no `?id=` **and** no restored hero). Use a fresh profile.
- Hero grid is empty until `https://cards.alteredcore.org/api/cards` returns. Wait on `.db-hero-tile`, not a fixed sleep.
- Autosave is disabled while `_wizardOpen` is true. Do not treat a missing `#db-autosave-status` during the wizard as a save failure.
- `#db-new-submit` stays in the wizard and shows `#db-new-error` if hero, name, or format is missing (`Choose a hero.` / `Give your deck a name.` / `Pick a format.`).
- Default faction in the picker is Axiom (`AX`). Other factions require clicking `.db-faction-btn[data-faction]`.
- A first-visit CookieYes modal (often in a `cdn-cookieyes.com` iframe) intercepts clicks. Accept it (button `Accept` / `.cky-btn-accept`) before asserting screenshots.
- After a hero is applied, `#db-hero-label` is gone: `setHero()` replaces `#db-hero-banner` innerHTML with faction art + `.deck-card-text-white`. Assert on `#db-hero-banner` text.
