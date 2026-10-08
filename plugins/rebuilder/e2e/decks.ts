// Decks of the signed-in account for the Re:Builder e2e tests and tests/e2e/loading-timeline.ts (Node runs this file
// with type stripping: type-only imports, explicit extensions).
import type { Page } from '@playwright/test';

/** Creates a deck of the signed-in account through the site's relay, from an SPA page (9 cards: not legal, the API says
 * why), plus `extra` references. */
export async function createServerDeck(page: Page, name: string, extra: string[] = []): Promise<string> {
  return page.evaluate(async ([deckName, more]) => {
    const host = (window as unknown as { AlteredCore: { csrf: string; services: { decks: string } } }).AlteredCore;
    const res = await fetch(`${host.services.decks}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': host.csrf },
      body: JSON.stringify({
        name: deckName,
        description: 'Première ligne\nDeuxième ligne',
        format: 'standard',
        isPublic: false,
        deckCards: [
          { cardReference: 'ALT_CORE_B_AX_01_C', quantity: 1 },
          { cardReference: 'ALT_CORE_B_AX_08_C', quantity: 3 },
          { cardReference: 'ALT_CORE_B_AX_09_C', quantity: 3 },
          { cardReference: 'ALT_CORE_B_AX_10_C', quantity: 3 },
          ...more.map((cardReference) => ({ cardReference, quantity: 1 })),
        ],
      }),
    });
    if (res.status !== 201) throw new Error(`deck creation: HTTP ${res.status}`);
    return ((await res.json()) as { id: string }).id;
  }, [name, extra] as const);
}
