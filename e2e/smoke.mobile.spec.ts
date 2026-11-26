import { test, expect, addPlayer, pastePlayers, card, zoneBox } from './fixtures';
import { PLAYER_LIST, PLAYERS } from './data/roster';

test('adds a player and switches tabs on a phone', async ({ page }) => {
  await page.goto('/');
  await addPlayer(page, 'Alice');
  await expect(card(page, 'all', 'Alice')).toBeVisible();

  const court = zoneBox(page, 'court-0');
  const queue = zoneBox(page, 'queue-0');

  await page.getByRole('tab', { name: 'Queues' }).click();
  await expect(queue).toBeVisible();
  await expect(court).toBeHidden();

  await page.getByRole('tab', { name: 'Courts' }).click();
  await expect(court).toBeVisible();
  await expect(queue).toBeHidden();

  // The player list also has an "All" tab, so match the dashboard tab by its visible text
  await page.getByRole('tab').filter({ hasText: /^All$/ }).first().click();
  await expect(court).toBeVisible();
  await expect(queue).toBeVisible();
});

test('loads the full roster on a phone', async ({ page }) => {
  await page.goto('/');
  await pastePlayers(page, PLAYER_LIST);

  await expect(page.locator('[data-player-id][data-zone="all"]')).toHaveCount(PLAYERS.length);
  await expect(card(page, 'all', 'Aldritch (Carl QM+1)')).toBeAttached();
});
