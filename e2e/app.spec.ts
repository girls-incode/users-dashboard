import { test, expect, Page } from '@playwright/test';
import { MockResult } from '../src/app/mock-data';

/**
 * Covers AppComponent's main behaviours end to end: initial load, grouping, search, expand/
 * collapse with lazy-loaded details, pagination, and the error state. Each test intercepts
 * randomuser.me and serves the repo's own `MockResult` fixture (100 deterministic users) rather
 * than hitting the real API — see playwright.config.ts for why.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/randomuser.me/api**', route => route.fulfill({ json: MockResult }));
});

/** Navigates to the app and waits for the (mocked, successful) list to render. */
async function loadApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('app-user-item').first()).toBeVisible();
}

test('loads and renders the grouped user list', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.loading-spinner')).toBeHidden();
  await expect(page.locator('app-user-item').first()).toBeVisible();
  await expect(page.getByText(`Users: ${MockResult.results.length}`)).toBeVisible();
});

test('switches grouping and reflects the active state', async ({ page }) => {
  await loadApp(page);

  const nameButton = page.getByRole('button', { name: 'Name' });
  const ageButton = page.getByRole('button', { name: 'Age' });

  // 'name' is the default grouping.
  await expect(nameButton).toHaveAttribute('aria-pressed', 'true');

  await ageButton.click();

  await expect(ageButton).toHaveAttribute('aria-pressed', 'true');
  await expect(nameButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.group-header__title').first()).toBeVisible();
});

test('search: below 3 characters does nothing, 3+ filters, clearing restores the full list', async ({ page }) => {
  await loadApp(page);

  const search = page.getByLabel('Search users by name');

  // Below the 3-character minimum: no filtering happens yet.
  await search.fill('ab');
  await expect(page.locator('app-user-item').first()).toBeVisible();

  // A query that can't match any real name in the fixture.
  await search.fill('qzxqzxqzx');
  await expect(page.getByText('No matching users found.')).toBeVisible();
  await expect(page.locator('app-user-item')).toHaveCount(0);

  await search.fill('');
  await expect(page.locator('app-user-item').first()).toBeVisible();
});

test('expands a user row to lazily load its details, then collapses it', async ({ page }) => {
  await loadApp(page);

  const firstRow = page.locator('.user-item').first();
  await expect(page.locator('app-user-details-card')).toHaveCount(0);

  await firstRow.click();

  const detailsCard = page.locator('app-user-details-card').first();
  await expect(detailsCard).toBeVisible();
  await expect(detailsCard.getByText('Age')).toBeVisible();
  await expect(detailsCard.getByText('Gender')).toBeVisible();
  await expect(detailsCard.getByText('Username')).toBeVisible();
  await expect(detailsCard.getByText('Phone')).toBeVisible();

  await firstRow.click();
  await expect(page.locator('app-user-details-card')).toHaveCount(0);
});

test('pagination advances the page and enables Previous', async ({ page }) => {
  await loadApp(page);

  const previousButton = page.getByRole('button', { name: 'Previous' });
  const nextButton = page.getByRole('button', { name: 'Next' });

  await expect(previousButton).toBeDisabled();
  await expect(page.getByText('Page 1')).toBeVisible();

  await nextButton.click();

  await expect(page.getByText('Page 2')).toBeVisible();
  await expect(previousButton).toBeEnabled();
});

test('shows an error state when the API request fails', async ({ page }) => {
  // Registered after beforeEach's success mock, on the same pattern — Playwright checks the most
  // recently registered route first, so this fully shadows it without needing to unroute() first.
  await page.route('**/randomuser.me/api**', route => route.fulfill({ status: 500, body: 'server error' }));

  await page.goto('/');

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('app-user-item')).toHaveCount(0);
});
