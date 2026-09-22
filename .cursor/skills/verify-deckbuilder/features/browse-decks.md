# Browse and edit decks

Browse and edit decks lets a user find lists on `/pages/decks` and reopen one in the builder with `?id=`.

## Sub-features

- `list-open` loads `/pages/decks`.
- `list-search` filters own decks with `#my-deck-search` (logged in).
- `list-new` follows New Deck to `/pages/deckbuilder`.
- `list-edit` opens `/pages/deckbuilder?id={deck_id}`.
- `guest-list` shows the local deck in `#guest-deck-grid` or `#guest-no-deck`.

## How to get to it (user POV)

- Open `http://localhost:18181/pages/decks`.
- Choose New Deck / guest create.
- On a deck you own, choose Edit (internal builder when `$showEditBtn` is true).

## Driving it with Playwright

Preconditions:

- Doctor green.
- Logged-in path: Keycloak session. Guest path: same profile that saved a local deck.

- **Open list.** Go to `/pages/decks`. Page title/nav refers to Decks.
- **Guest.** If logged out, guest banner is visible. Either `#guest-no-deck` or `#guest-deck-grid` has a card.
- **New.** Click the create control (`a[href$="/pages/deckbuilder"]`). Land on the wizard or builder.
- **Edit (auth).** After [Save a deck](./save-deck.md), find the `verify-` name. Follow the edit link to `/pages/deckbuilder?id=`. `#db-deck-name` matches; wizard is not shown.
- **Proof.** Screenshot of the list with the named deck, then the builder URL with `id=`.

## Gotchas

- Public browse vs My decks are different ajax endpoints (`/pages/decks?ajax=my` vs `ajax=public`). Search `#my-deck-search` only filters owned decks.
- Community deckbuilder links are not this plugin — ignore `deckbuilder_url` rows.
- Edit URL is `/pages/deckbuilder?id=` plus optional `theme=`.
