import { test, expect, addPlayer, card, slot, zoneBox } from './fixtures';

test('a player can be queued and then returned to the player list', async ({ page }) => {
  await page.goto('/');
  await addPlayer(page, 'Alice');

  await card(page, 'all', 'Alice').dragTo(slot(page, 'queue-0', 1));
  await expect(slot(page, 'queue-0', 1).getByText('Alice', { exact: true })).toBeVisible();

  await card(page, 'queue-0', 'Alice').dragTo(zoneBox(page, 'all'));

  await expect(card(page, 'queue-0', 'Alice')).toHaveCount(0);
  await expect(card(page, 'all', 'Alice')).toBeVisible();
});
