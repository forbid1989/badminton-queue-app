import { test, expect, addPlayer, card, slot, waitForSaved } from './fixtures';

test('a player dragged to a court stays there after reload', async ({ page }) => {
  await page.goto('/');
  await addPlayer(page, 'Alice');

  await card(page, 'all', 'Alice').dragTo(slot(page, 'court-0', 0));

  await expect(slot(page, 'court-0', 0).getByText('Alice', { exact: true })).toBeVisible();

  await waitForSaved(page, 'Alice', 'court-0');
  await page.reload();

  await expect(slot(page, 'court-0', 0).getByText('Alice', { exact: true })).toBeVisible();
});
