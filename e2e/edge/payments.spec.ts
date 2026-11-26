import { test, expect, pastePlayers, card } from '../fixtures';
import { openPayments, openPlayerMenu, dragToSlot, expectZone } from '../session';
import { readState } from '../storage';
import type { Page } from '@playwright/test';

async function openWithThree(page: Page) {
  await page.goto('/');
  await pastePlayers(page, 'Alice\nBob\nCara');
  return openPayments(page);
}

type Dialog = Awaited<ReturnType<typeof openPayments>>;
const total = (dialog: Dialog, label: string) => dialog.getByText(label, { exact: true }).locator('..');

test('a blank fee counts as zero', async ({ page }) => {
  const dialog = await openWithThree(page);
  await dialog.getByLabel('Flat Fee per Player').fill('');

  await expect(total(dialog, 'Total Expected')).toContainText('₱0.00');
});

test('with no players there is nothing to mark', async ({ page }) => {
  await page.goto('/');
  const dialog = await openPayments(page);

  await expect(dialog.getByText('No players found. Add some players')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Mark All Paid' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Clear All Payments' })).toBeDisabled();
});

test('a search with no match says so', async ({ page }) => {
  const dialog = await openWithThree(page);
  await dialog.getByPlaceholder('Search players...').fill('zzz');

  await expect(dialog.getByText('No players found matching "zzz"')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Mark All Paid' })).toBeDisabled();
});

// Current behaviour: totals follow the search, but "Mark All Paid" includes hidden players
test('current behaviour: Mark All Paid during a search pays everyone', async ({ page }) => {
  const dialog = await openWithThree(page);
  const search = dialog.getByPlaceholder('Search players...');
  await search.fill('Alice');
  await expect(total(dialog, 'Total Expected')).toContainText('₱50.00');

  await dialog.getByRole('button', { name: 'Mark All Paid' }).click();
  await search.fill('');

  await expect(total(dialog, 'Total Paid')).toContainText('₱150.00');
});

test('saved fee settings survive a reload', async ({ page }) => {
  const dialog = await openWithThree(page);
  await dialog.getByLabel('Flat Fee per Player').fill('120');
  await dialog.getByRole('button', { name: 'Save Settings' }).click();
  await expect
    .poll(async () => (await readState(page))?.settings.paymentSettings.flatFee)
    .toBe(120);

  await page.reload();
  const reopened = await openPayments(page);

  await expect(reopened.getByLabel('Flat Fee per Player')).toHaveValue('120');
});

test('unsaved fee settings are discarded by a reload', async ({ page }) => {
  const dialog = await openWithThree(page);
  await dialog.getByLabel('Flat Fee per Player').fill('120');
  await expect.poll(async () => (await readState(page))?.players.length).toBe(3);

  await page.reload();
  const reopened = await openPayments(page);

  await expect(reopened.getByLabel('Flat Fee per Player')).toHaveValue('50');
});

test('marking a paid player unpaid returns them to the waiting list', async ({ page }) => {
  await page.goto('/');
  await pastePlayers(page, 'Alice');
  await dragToSlot(page, 'Alice', 'court-0', 0);
  const dialog = await openPayments(page);
  await dialog.getByRole('button', { name: 'Mark Paid' }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('tab', { name: 'Paid' }).click();

  const menu = await openPlayerMenu(page, 'all', 'Alice');
  await menu.getByRole('button', { name: 'Mark Unpaid' }).click();

  await expectZone(page, 'court-0', []);
  await page.getByRole('tab', { name: 'Waiting' }).click();
  await expect(card(page, 'all', 'Alice')).toBeVisible();
});
