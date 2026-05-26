import { test, expect } from '@playwright/test';

// Each Playwright test runs in a fresh, isolated browser context, so
// localStorage starts empty without any manual clearing. Lessons pick a random
// variant per play, so tests that assert on specific passage text force a
// variant via the ?v=<variantId> query param.

test('home loads with the bloom and tutorial seed visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Tend your garden of reasoning/i })).toBeVisible();
  // The tutorial is the seed at the center of the bloom.
  await expect(page.getByRole('link', { name: /Start the tutorial/i })).toBeVisible();
});

test('full play flow: mark, review, set confidence, submit, see results', async ({ page }) => {
  await page.goto('/play/tutorial-1?v=tutorial-1-v1');

  // Mark the ad hominem sentence.
  await page.getByRole('button', { name: /Of course Dana would say that/i }).click();
  await page.getByRole('button', { name: /Ad Hominem/i }).first().click();
  await page.getByRole('button', { name: 'Apply' }).click();

  // The inline badge appears.
  await expect(page.getByText('Ad Hominem').first()).toBeVisible();

  // Go to review and set high confidence.
  await page.getByRole('button', { name: /Review/ }).click();
  await expect(page.getByRole('heading', { name: 'Review your marks' })).toBeVisible();
  await page.getByRole('button', { name: 'High' }).click();

  // Submit and land on results.
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page).toHaveURL(/\/results\/tutorial-1$/);
  await expect(page.getByText('100%')).toBeVisible();
  await expect(page.getByText('Excellent')).toBeVisible();
});

test('progress persists after reload', async ({ page }) => {
  await page.goto('/play/tutorial-1?v=tutorial-1-v1');
  await page.getByRole('button', { name: /Of course Dana would say that/i }).click();
  await page.getByRole('button', { name: /Ad Hominem/i }).first().click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('button', { name: /Review/ }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page).toHaveURL(/\/results\/tutorial-1$/);

  // Back home, the seed now offers a replay (tutorial recorded as complete).
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByRole('link', { name: /Replay the tutorial/i })).toBeVisible();

  // Reload — completion survives (localStorage).
  await page.reload();
  await expect(page.getByRole('link', { name: /Replay the tutorial/i })).toBeVisible();
});

test('each replay can serve a different variant', async ({ page }) => {
  await page.goto('/play/tutorial-1?v=tutorial-1-v2');
  await expect(page.getByText(/Raj laid out a detailed plan/i)).toBeVisible();

  await page.goto('/play/tutorial-1?v=tutorial-1-v3');
  await expect(page.getByText(/Mia presented research/i)).toBeVisible();
});

test('re-entering a lesson serves a different variant', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Start the tutorial/i }).click();
  const first = await page.locator('article').first().innerText();

  await page.getByRole('button', { name: /Exit/ }).click();
  await page.getByRole('link', { name: /Start the tutorial/i }).click();
  const second = await page.locator('article').first().innerText();

  expect(second).not.toBe(first);
});

test('the guide drawer opens during play', async ({ page }) => {
  await page.goto('/play/tutorial-1');
  await page.getByRole('button', { name: 'Guide' }).click();
  await expect(page.getByRole('dialog', { name: /Fallacy guide/i })).toBeVisible();
  await expect(page.getByText(/picking an entry here does not answer/i)).toBeVisible();
});

test('submitting nothing on a no-fallacy boss scores 100%', async ({ page }) => {
  await page.goto('/play/boss-no-fallacy?v=boss-no-fallacy-v1');

  // Boss intro screen, then start.
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: /Review/ }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page).toHaveURL(/\/results\/boss-no-fallacy$/);
  await expect(page.getByText('100%')).toBeVisible();
});
