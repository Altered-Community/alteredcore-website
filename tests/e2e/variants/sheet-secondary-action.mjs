// Secondary action of the overlay footers on mobile (PR 124): hidden before, stacked under the primary one now
// (plugins/rebuilder/app/src/embed/embed.scss), side by side as the alternative that was looked at.
//   node tests/e2e/preview-variants.mjs tests/e2e/variants/sheet-secondary-action.mjs
const SHEET = '.ac-overlay--sheet .ac-overlay-footer';

/** Opens the Re:Builder overlay behind `button` and waits for it. */
const open = (button) => async (page) => {
  await page.getByRole('button', { name: button }).first().click();
  await page.getByRole('dialog').waitFor();
};

export default {
  user: 'alice',
  beta: true,
  viewports: ['mobile'],
  variants: {
    'Empilé (règle)': '',
    'Masqué (avant)': `${SHEET} .secondary-action { display: none; }`,
    'Côte à côte': `${SHEET} { flex-direction: row; }
      ${SHEET} > * { flex: 1 1 0; width: auto; }
      ${SHEET} .secondary-action { order: 0; }`,
  },
  scenes: [
    { name: 'filters', url: '/pages/decks?lang=fr', run: open(/^Filtres/) },
    { name: 'import', url: '/pages/decks?lang=fr', run: open('Importer un deck') },
  ],
};
