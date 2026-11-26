import type { Page } from '@playwright/test';
import { test, expect, pastePlayers, card, slot, zoneBox, gamesPlayed } from './fixtures';

// Positions 0 and 3, so that undo has to restore exact positions, not just fill from the start
async function startGame(page: Page) {
  await page.goto('/');
  await pastePlayers(page, 'Alice\nBob');
  await card(page, 'all', 'Alice').dragTo(slot(page, 'court-0', 0));
  await expect(card(page, 'court-0', 'Alice')).toBeVisible();
  await card(page, 'all', 'Bob').dragTo(slot(page, 'court-0', 3));
  await expect(card(page, 'court-0', 'Bob')).toBeVisible();
}

test('ending a game empties the court and counts the game', async ({ page }) => {
  await startGame(page);
  await zoneBox(page, 'court-0').getByRole('button', { name: 'End Game' }).click();

  await expect(page.locator('[data-player-id][data-zone="court-0"]')).toHaveCount(0);
  await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('1');
  await expect(gamesPlayed(card(page, 'all', 'Bob'))).toHaveText('1');
});

test('undo restores positions and the games count', async ({ page }) => {
  await startGame(page);
  const court = zoneBox(page, 'court-0');
  await court.getByRole('button', { name: 'End Game' }).click();
  await court.getByRole('button', { name: 'Undo' }).click();

  await expect(slot(page, 'court-0', 0).getByText('Alice', { exact: true })).toBeVisible();
  await expect(slot(page, 'court-0', 3).getByText('Bob', { exact: true })).toBeVisible();
  await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('0');
  await expect(gamesPlayed(card(page, 'all', 'Bob'))).toHaveText('0');
});
