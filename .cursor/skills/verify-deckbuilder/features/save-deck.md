# Save a deck

Save a deck persists the current list: locally for guests (one deck), on the decks API for signed-in users.

## Sub-features

- `save-click` uses `#db-save-btn` (`Save deck`).
- `save-ok` shows `#db-save-ok` (`Deck saved!` or `Deck saved locally!`).
- `save-guest` writes the guest local deck (banner `#guest-banner` visible).
- `save-auth` requires Keycloak session; URL keeps or gains `id=`.
- `autosave` `#db-autosave-status` may show `Autosaved` ~5s after edits once the wizard is closed.

## How to get to it (user POV)

- In the builder sidebar, choose `Save deck`.
- Stay on the page after edits and wait for autosave (logged-in or guest after create).
- Sign in from `#guest-banner a.db-guest-link` (`Log in`) to move from local to server saves.

## Driving it with Playwright

Preconditions:

- A deck identity exists (hero + name) from [Create a deck](./create-deck.md).
- For server save: signed in as `alice` or `bob`.

- **Guest save.** Confirm `#guest-banner`. Click `#db-save-btn`. `#db-save-ok` contains `Deck saved locally!`. Reload `/pages/deckbuilder` in the **same** profile: wizard does not open; hero is restored.
- **Auth save.** After Keycloak login, click `#db-save-btn`. `#db-save-ok` contains `Deck saved!`. URL has `id=`. Open `/pages/decks`, type the name in `#my-deck-search`, the card appears.
- **Error.** If `#db-save-error` shows, capture `#db-save-error-msg` and do not call save verified. `#db-save-retry` is the user retry.
- **Proof.** Screenshot of `#db-save-ok` plus either guest restore or decks-list hit. Do not treat a 200 on `POST /pages/deckbuilder?ajax=1` alone as proof.

## Gotchas

- Guests are limited to one local deck. A second create in the same profile overwrites.
- Autosave is skipped while the creation wizard is open.
- `leave the page` with dirty state opens `#db-unsaved-modal` (`Unsaved changes`).
- Keycloak lives on `auth.altered.local.gd:18080`. Hosts must resolve that name.
