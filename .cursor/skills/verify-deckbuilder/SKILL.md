---
name: verify-deckbuilder
description: Drive the production Altered deckbuilder (core-altered-cards plugin on the Aspire website at localhost:18181) as a user would — launch/doctor the shared stack, Playwright the live UI, capture proof. Use when verifying deckbuilder behavior, not the obsolete altered-deckbuilder-poc-v2.
---

# Verify the production deckbuilder

This skill is for agents. The product is the website plugin `core-altered-cards` (`plugins/core-altered-cards/pages/deckbuilder.php`), hosted by the Aspire stack at `http://localhost:18181`. It is **not** `altered-deckbuilder-poc-v2`.

Read `features/README.md` before driving. The **default proven scenario** is `frontier-save` (login → New Deck → hero → **Frontier** → 2–3 cards → Save → My decks list). Isolated features are optional. Use real user paths (browser), not AJAX save endpoints as a shortcut.

## Interview facts (do not invent a second surface)

- **Surface:** web UI. Routes: `/pages/deckbuilder` (builder + new-deck wizard), `/pages/decks` (list / edit / import), `/pages/deck` (detail), `/pages/login` → Keycloak.
- **Run:** shared Aspire stack from `/home/ubuntu/altered`. Start with `/home/ubuntu/altered/scripts/cloud-start.sh` (nested Docker then `aspire run`). Cards catalog is production `https://cards.alteredcore.org`. Test users: `alice` / `bob`, password `TestPassword1234`.
- **Drive:** Playwright Chromium against the live site. Helper: `bin/verify-deckbuilder`.
- **Observe:** screenshots + HTML snapshots + console log. Side effects: URL `?id=`, `#db-card-count`, `#db-save-ok`, decks list, guest `localStorage`.
- **Isolate:** one Aspire instance owns `:18181`. Never start a second stack. Isolate with a unique Playwright `user-data-dir` (`VERIFY_RUN_ID`). Do not drive a browser profile you did not create.

Helpers live next to this file. From the website checkout:

```bash
SKILL=".cursor/skills/verify-deckbuilder"
"$SKILL/bin/verify-deckbuilder" doctor
"$SKILL/bin/verify-deckbuilder" launch
"$SKILL/bin/verify-deckbuilder" drive --evidence "$EVIDENCE_DIR"
"$SKILL/bin/verify-deckbuilder" drive frontier-save --evidence "$EVIDENCE_DIR"
"$SKILL/bin/verify-deckbuilder" cleanup
```

## Launch

Ready when `GET http://localhost:18181/pages/deckbuilder` returns HTTP 200 and the HTML contains `id="db-new-modal"` or `id="db-tab-search"`.

If the site is down, start the stack **once** (do not `aspire run` if Aspire is already holding the port):

```bash
/home/ubuntu/altered/scripts/cloud-start.sh
```

Wait until the website answers (often several minutes on a cold Docker pull). Teardown of Aspire is **not** part of verification cleanup — leave the shared stack running.

Browser isolation (created by `drive`):

- `VERIFY_RUN_ID` — default `$$-timestamp`
- profile dir: `/tmp/verify-deckbuilder-$VERIFY_RUN_ID`
- headed vs headless: `VERIFY_HEADED=1` for a visible window
- `VERIFY_SLOWMO` — milliseconds between Playwright actions (use `400` when recording a headed video)

## Doctor

Read-only. Fail if any check fails.

```bash
.cursor/skills/verify-deckbuilder/bin/verify-deckbuilder doctor
```

Checks:

1. `http://localhost:18181/pages/deckbuilder` → 200 and production markers (`id="db-new-modal"`, `id="db-search"`, `AlteredDB`, not a POC shell).
2. `https://cards.alteredcore.org/api/cards?itemsPerPage=1` → 200 JSON with `member`.
3. `http://auth.altered.local.gd:18080` answers (Keycloak).
4. Optional: `http://localhost:8001` (Decks API) answers.

Never drive if doctor fails.

## Drive

Playwright via `helpers/playwright-drive.mjs`. Prefer IDs and roles from this plugin:

| Handle | What |
| --- | --- |
| `#db-new-modal` | New-deck wizard (opens on `/pages/deckbuilder` with no `?id=` and no guest restore) |
| `#db-new-hero` | Opens hero picker |
| `#db-hero-banner` | Applied hero (label node is replaced by `setHero()`) |
| `.db-faction-btn[data-faction]` | Faction chips (default Axiom `AX`) |
| `#db-new-name` | Deck name |
| `input[name="db-new-format"]` | Format radios (`value="frontier"` for Frontier) |
| `label.db-new-format .db-new-format-name` | Visible format name (`Frontier`, not Next Frontier) |
| `#db-new-submit` | Create deck |
| `#db-search`, `#db-apply-btn`, `#db-grid` | Card search |
| `.db-card-wrap .db-card-btn-group .btn-primary-altered` | Add copy (`+`) |
| `#db-card-list`, `#db-card-count`, `#db-validation` | Deck sidebar |
| `#db-save-btn`, `#db-save-ok`, `#db-autosave-status` | Save |
| `#guest-banner` | Guest mode |
| `/pages/login` → `/auth/keycloak-login` | `#username`, `#password`, submit |
| `/pages/decks` | `#my-deck-search`, `#my-deck-grid .my-deck-item`, `.news-card-title`, `.deck-card-link-overlay` |

Login (when a feature needs a server deck):

1. Open `http://localhost:18181/pages/login`.
2. Follow `a[href*="keycloak-login"]`.
3. Fill `#username` / `#password`, submit.
4. Wait until the site cookie session is set (URL back on `:18181`).

Proof standards:

- Exercise the real UI path. Do not POST `/pages/deckbuilder?ajax=1` as the proof of create/save.
- Capture the user action **and** the resulting state (wizard Frontier → adds → `#db-save-ok` → list hit).
- After create, URL should include `id=` for logged-in users; guests stay without `id=` and persist in `localStorage`.
- Default `frontier-save` **must** use Keycloak (`alice` / `TestPassword1234`) so `/pages/decks` My decks can show the saved list.
- After `setHero()`, assert `#db-hero-banner` (not `#db-hero-label`).
- Mocks only at the cards CDN boundary if it is already down — prefer live `cards.alteredcore.org`.

## Evidence

Default directory (named, survives cleanup):

```text
/cursor/stores/bc-75040492-8fc0-4c5d-b162-04dfa8f083d2/media/
```

Override with `--evidence` / `VERIFY_EVIDENCE_DIR`.

Minimum per drive:

- `*-before.png` — page at the start of the feature
- `*-after.png` — observable end state
- `*-after.html` — HTML snapshot of the builder (hero name, deck name, card count)
- `drive.log` and `<feature-id>-drive.log` — commands, URLs, assertions

Record the feature ID from `features/` on every artifact filename.

## Cleanup

```bash
.cursor/skills/verify-deckbuilder/bin/verify-deckbuilder cleanup
```

Removes Playwright profiles under `/tmp/verify-deckbuilder-*` that this run created (`VERIFY_RUN_ID` or all verify profiles if `VERIFY_CLEAN_ALL_PROFILES=1`). Does **not** kill Aspire, Docker, or dockerd. Does **not** delete evidence.

After cleanup, confirm evidence files still exist at the named directory.

## Helpers

| Command | Effect |
| --- | --- |
| `bin/verify-deckbuilder doctor` | Read-only health |
| `bin/verify-deckbuilder launch` | Wait for site; print start command if down |
| `bin/verify-deckbuilder drive [feature-id] [--evidence DIR] [--user alice]` | Playwright. Default feature is `frontier-save` |
| `bin/verify-deckbuilder cleanup` | Remove this run's browser profile |

Scripts are executable. `drive` installs Chromium via `npx playwright install chromium` if missing.
