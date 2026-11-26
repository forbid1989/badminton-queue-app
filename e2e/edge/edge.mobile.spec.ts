import type { Page } from '@playwright/test';
import { test, expect, addPlayer, pastePlayers, card, zoneBox } from '../fixtures';
import { seedState, savedPlayer, savedState } from '../storage';

const queued = ['Alice', 'Bob'].map((name, position) =>
  savedPlayer(name, { status: ['queue-0'], queueOrder: position }),
);

// Phones are seeded from storage, because the drag used on desktop is a mouse gesture
async function openWithQueue(page: Page) {
  await seedState(page, savedState(queued));
  await page.goto('/');
  await page.getByRole('tab', { name: 'Queues' }).click();
  await expect(card(page, 'queue-0', 'Alice')).toBeVisible();
}

test('choosing a court opens a window and moves the queue', async ({ page }) => {
  await openWithQueue(page);
  await zoneBox(page, 'queue-0').getByRole('button', { name: 'Transfer to Court' }).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Court 2' }).click();
  await page.getByRole('button', { name: 'Transfer', exact: true }).click();
  await page.getByRole('tab', { name: 'Courts' }).click();

  await expect(card(page, 'court-1', 'Alice')).toBeVisible();
  await expect(card(page, 'court-1', 'Bob')).toBeVisible();
});

test('closing the court window leaves the queue alone', async ({ page }) => {
  await openWithQueue(page);
  await zoneBox(page, 'queue-0').getByRole('button', { name: 'Transfer to Court' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(card(page, 'queue-0', 'Alice')).toBeVisible();
});

test('empty courts offer no End Game button', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Courts' }).click();

  await expect(zoneBox(page, 'court-0')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End Game' })).toHaveCount(0);
});

test('blank input cannot be added', async ({ page }) => {
  await page.goto('/');
  await addPlayer(page, 'Alice');
  await page.locator('#mobile-footer').getByRole('button', { name: 'Add Players' }).click();
  await page.getByLabel('Player Name', { exact: true }).fill('   ');

  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
});

test('a very long name does not make the page scroll sideways', async ({ page }) => {
  await page.goto('/');
  await pastePlayers(page, 'Maximiliano'.repeat(20));

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
