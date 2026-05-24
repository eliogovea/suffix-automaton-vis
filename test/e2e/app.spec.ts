import {expect, test} from '@playwright/test';

test('builds and plays the default abba automaton', async ({page}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', {name: 'Suffix Automaton'})).toBeVisible();
  await expect(page.locator('svg.graph-svg')).toBeVisible();
  await expect(page.locator('g.node')).not.toHaveCount(0);
  await expect(page.locator('#progress-text')).toHaveText('52 / 52', {timeout: 10000});

  await expect(page.locator('g.node')).toHaveCount(6);
  await expect(page.locator('path.link--transition')).not.toHaveCount(0);
  await expect(page.locator('path.link--suffix-link')).not.toHaveCount(0);

  await page.locator('g.node').first().click();
  await expect(page.getByText('Selected State')).toBeVisible();
  await expect(page.locator('#state-details')).toContainText('ID');
});

test('rebuilds from input and keeps controls responsive', async ({page}) => {
  await page.goto('/');

  await page.getByLabel('Word').fill('banana');
  await page.getByRole('button', {name: 'Build'}).click();

  await expect(page.locator('#status-text')).toContainText('banana');
  await expect(page.locator('#progress-text')).not.toHaveText('0 / 0');

  await page.getByRole('button', {name: 'Pause'}).click();
  await expect(page.getByRole('button', {name: 'Play'})).toBeVisible();
});
