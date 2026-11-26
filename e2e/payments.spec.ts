import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { PLAYERS, GUESTS, GROUPS } from './data/roster';
import { loadRoster, fillQueues, transferToChosenCourt, endGame } from './session';

async function openPayments(page: Page) {
  await page.getByRole('button', { name: 'Payment Summary' }).click();
  return page.getByRole('presentation').filter({ hasText: 'Payment Management' });
}

type Dialog = Awaited<ReturnType<typeof openPayments>>;

const total = (dialog: Dialog, label: 'Total Paid' | 'Total Unpaid' | 'Total Expected') =>
  dialog.getByText(label, { exact: true }).locator('..');

const row = (dialog: Dialog, name: string) =>
  dialog.getByRole('row').filter({ has: dialog.page().getByText(name, { exact: true }) });

// Default fees: flat 50 per player, plus 25 for each guest
test('charges the flat fee, plus the guest fee for guests', async ({ page }) => {
  await loadRoster(page);
  const dialog = await openPayments(page);
  await expect(total(dialog, 'Total Expected')).toContainText('₱1100.00');

  for (const name of GUESTS) {
    await row(dialog, name).locator('input[type="checkbox"]').check();
  }

  await expect(row(dialog, GUESTS[0])).toContainText('₱75.00');
  await expect(total(dialog, 'Total Expected')).toContainText('₱1225.00');
});

test('per game fees follow the number of games played', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page, 1);
  await transferToChosenCourt(page, 'queue-0', 1);
  await endGame(page, 'court-0');

  const dialog = await openPayments(page);
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Per Game' }).click();

  // Court fee 20, plus 15 per game
  await expect(row(dialog, GROUPS[0][0])).toContainText('₱35.00');
  await expect(row(dialog, PLAYERS[4])).toContainText('₱20.00');
  await expect(total(dialog, 'Total Expected')).toContainText('₱500.00');
});

test('paid players move to the Paid tab', async ({ page }) => {
  await loadRoster(page);
  const dialog = await openPayments(page);

  await row(dialog, PLAYERS[0]).getByRole('button', { name: 'Mark Paid' }).click();
  await expect(total(dialog, 'Total Paid')).toContainText('₱50.00');
  await expect(total(dialog, 'Total Unpaid')).toContainText('₱1050.00');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  const cards = page.locator('[data-player-id][data-zone="all"]');
  await expect(cards).toHaveCount(PLAYERS.length - 1);
  await page.getByRole('tab', { name: 'Paid' }).click();
  await expect(cards).toHaveCount(1);
});

test('everyone can be marked paid and then cleared', async ({ page }) => {
  await loadRoster(page);
  const dialog = await openPayments(page);

  await dialog.getByRole('button', { name: 'Mark All Paid' }).click();
  await expect(total(dialog, 'Total Paid')).toContainText('₱1100.00');
  await expect(total(dialog, 'Total Unpaid')).toContainText('₱0.00');

  await dialog.getByRole('button', { name: 'Clear All Payments' }).click();
  await expect(total(dialog, 'Total Paid')).toContainText('₱0.00');
});
