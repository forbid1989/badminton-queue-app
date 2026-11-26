import { test, expect, addPlayer, pastePlayers, card } from './fixtures';

test('adds a single player', async ({ page }) => {
  await page.goto('/');
  await addPlayer(page, 'Alice');

  await expect(card(page, 'all', 'Alice')).toBeVisible();
  await expect(page.getByText('Total Players: 1')).toBeVisible();
});

test('adds players from a pasted numbered list', async ({ page }) => {
  await page.goto('/');
  await pastePlayers(page, '1. Alice\n2. Bob\n\n3. Cara +2');

  // "Cara +2" becomes two numbered players
  for (const name of ['Alice', 'Bob', 'Cara 1', 'Cara 2']) {
    await expect(card(page, 'all', name)).toBeVisible();
  }
  await expect(page.getByText('Total Players: 4')).toBeVisible();
});
