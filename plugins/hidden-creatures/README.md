# Hidden Creatures

Illustrations hidden on some pages of the site. Each one falls slowly through the page, drifting and turning; a click
makes it jump and spin, swaps its image and shows a toast « Trouvé : <name> ! 2/7 », with the spot's contest code
when it has one (Gleam « Secret Code » action), and a « Copier » button.

Turn the hunt on or off in Admin → Plugins, then give the « hidden-creatures » section to the admin groups that run it
(Admin → Groups). Pages without a spot load nothing.

## Creatures and spots: in the admin, not in the code

The repository is public: where the creatures hide, their images and the codes are entered in Admin → Hidden
creatures (tables `plugin_hc_creatures`, `plugin_hc_spots`), never committed.

- **Creature**: an id, a name (FR, EN), two images picked in the media library, idle and clicked (square, transparent
  background). Saved as 400 px WebP copies in `uploads/hidden-creatures/` when GD can write WebP; the picked image as
  it is otherwise. No image: the component's cotton ball.
- **Spot**: an id, its creature, its pages, its trigger, its code. The counter's total is the number of spots. Finds
  are recorded by spot id: keep it once players have found the spot.

Pages are page slugs: `index` for the home page, the slug of `/pages/<slug>` otherwise (`news-detail`, `decks`…); `*`
for every page (a link of the menu: the two scripts, about 20 KB, then load everywhere).

Triggers:

- **load**: on the page from the start, somewhere in its height, falling through it in a loop.
- **scroll-end**: crosses the screen once when the visitor reaches the bottom of the page (the end of a news).
- **event:<name>**: crosses the screen once when the page runs
  `window.dispatchEvent(new CustomEvent('ac-hidden-spot', { detail: '<name>' }))`. Sent today: `test-hand` (Re:Builder,
  « Main de départ » tab: `features/deck/test-hand/test-hand.ts`), `tournament-heroes` (tournament-reports, the heroes
  chart's « Détail »: `assets/app.js`). For another action, send a new name from that page's code; the line is public,
  keep its comment neutral.
- **link:<url>**: after a click on a link whose address starts with `<url>`. A link to a new tab: the creature crosses
  the page the visitor left, right away. Same tab: it waits (`localStorage`) for the visitor's return to the site, back
  button or any later page.

## Finds and the contest

- **Signed-in player**: the click is recorded server side (`papi/find.php`, table `plugin_hc_finds`). The count is the
  account's, on any device.
- **Anonymous visitor**: the count is this browser's (`localStorage`, key `acHiddenCreatures`); the toast asks them to
  sign in for the find to count. Finds made before signing in are not carried over.
- **A find only counts after the page was shown**: rendering a page marks its spots seen in the PHP session
  (`assets/global_head.php`), and `papi/find.php` refuses a spot the session has not seen (409). It does not prove the
  click itself (a technical player can call the API once on the page), nor, for a spot on every page, that a link was
  clicked. Codes can be shared.
- **Checking a winner** (Admin → Hidden creatures): enter the email of the Gleam entry, the screen lists that account's
  finds with their dates. The same screen lists the players who found everything, and how many found each spot. The
  email is the site account's (`users.email`, kept when `STORE_KC_USER_DATA` is on); otherwise search by username.

## Files

| File | Role |
| --- | --- |
| `assets/global_head.php` | In every page's `<head>`: marks this page's spots seen, gives them to the scripts below, or nothing. |
| `assets/hidden-creatures.js` | Releases the creatures of the page at their trigger, reports a click, shows the toast. |
| `assets/cotton-fall.js` | The `<cotton-fall>` web component (animation, Shadow DOM), with a few changes marked « AlteredCore » in its header. |
| `papi/find.php` | `POST /papi/hidden-creatures/find {spot}`: records a signed-in player's find, replies with the code and the finds. |
| `admin/hunt.php` | Admin: creatures, spots, finds per spot, players who found everything, one player's finds. |
| `inc/functions.php` | Shared helpers (`hc*`): creatures and spots from the database, images, finds. |
| `sql/install.sql` | Tables `creatures`, `spots`, `finds`, created empty at the first activation. |
| `e2e/` | Playwright spec and its test spots (`fixtures.php`, run by the stack's entrypoint when the plugin is active). |

## Tests

`e2e/hidden-creatures.spec.ts` runs against test spots of its own (`fixtures.php`: news and privacy pages, a link to
example.test, Re:Builder's `test-hand` event), on a stack started with the plugin active:
`AC_ACTIVATE_PLUGINS="core-altered-cards rebuilder ownership hidden-creatures"`. It skips itself otherwise; the CI's
stack leaves the plugin off, a creature falling over the other specs would catch their clicks.

## Tuning

Size, speeds, drift, hit area: attributes of `<cotton-fall>` set in `hidden-creatures.js` (`size`: 200 px, 30 % of the
width on a phone; `fall-seconds`, `drift-amplitude`, `hit-radius`…), or the constants at the top of `cotton-fall.js`.
With `prefers-reduced-motion`, a creature stands still (a once-only one leaves after 10 s); a click still counts.
