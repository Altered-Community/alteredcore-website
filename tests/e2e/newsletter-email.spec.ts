import { test, expect, login, evidence } from './fixtures';

// The signed-in user's e-mail address is never readable on screen (a creator filming the site leaked theirs through
// the prefilled newsletter field): masked, the full address only in a tooltip on hover or focus.

const EMAIL = 'alice@example.test';

/** Text of the page without the tooltips: what a viewer of the screen can read. */
async function visibleText(page: import('./fixtures').Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement;
    body.querySelectorAll('.ac-tooltip, script, style').forEach((el) => el.remove());
    return body.textContent ?? '';
  });
}

test('the homepage newsletter field is empty, and the account address subscribes without being shown', async ({ page }, testInfo) => {
  await login(page, 'alice', '/');
  const field = page.locator('input[name="nl_email"]');
  await expect(field).toHaveValue('');
  await field.scrollIntoViewIfNeeded();
  await evidence(page, testInfo, 'home-newsletter');
  expect(await visibleText(page)).not.toContain(EMAIL);

  await page.locator('button[name="nl_use_account"]').click();
  await expect(page.getByRole('alert')).toContainText(/Subscription confirmed|already subscribed|Inscription confirmée|déjà inscrite/);
});

test('the account menu and page show the address masked, in full in a tooltip', async ({ page }, testInfo) => {
  await login(page, 'alice', '/pages/account');
  expect(await visibleText(page)).not.toContain(EMAIL);

  const masked = page.locator('.ac-masked').filter({ visible: true }).first();
  await expect(masked).toContainText('a•••@example.test');
  const tooltip = masked.locator('.ac-tooltip');
  await expect(tooltip).toBeHidden();
  await masked.focus();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText(EMAIL);
  await evidence(page, testInfo, 'account-page');

  await page.locator('#azAccountBtn').click();
  const menuMasked = page.locator('#azAccountMenu .ac-masked');
  await expect(menuMasked).toContainText('a•••@example.test');
  await menuMasked.focus();
  await expect(menuMasked.locator('.ac-tooltip')).toBeVisible();
  await evidence(page, testInfo, 'account-menu');
});
