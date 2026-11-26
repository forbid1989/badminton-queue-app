import type { Page } from '@playwright/test';
import { test, expect, pastePlayers, card, slot } from '../fixtures';
import { dragToSlot, dragOnto, attemptDrag, expectZone, transferButton, openPayments } from '../session';

async function addFive(page: Page) {
  await page.goto('/');
  await pastePlayers(page, 'Alice\nBob\nCara\nDan\nEve');
}

const inSlot = (page: Page, zone: string, position: number, name: string) =>
  expect(slot(page, zone, position).getByText(name, { exact: true })).toBeVisible();

test('dropping one court player on another swaps their positions', async ({ page }) => {
  await addFive(page);
  await dragToSlot(page, 'Alice', 'court-0', 0);
  await dragToSlot(page, 'Bob', 'court-0', 1);

  await dragOnto(
    card(page, 'court-0', 'Alice'),
    card(page, 'court-0', 'Bob'),
    slot(page, 'court-0', 1).getByText('Alice', { exact: true }),
  );

  await inSlot(page, 'court-0', 0, 'Bob');
  await inSlot(page, 'court-0', 1, 'Alice');
});

test('dropping a queued player on a court player exchanges them', async ({ page }) => {
  await addFive(page);
  await dragToSlot(page, 'Alice', 'court-0', 2);
  await dragToSlot(page, 'Bob', 'queue-0', 3);

  await dragOnto(
    card(page, 'queue-0', 'Bob'),
    card(page, 'court-0', 'Alice'),
    card(page, 'court-0', 'Bob'),
  );

  // Which position Bob lands in is covered in known-bugs.spec.ts
  await inSlot(page, 'queue-0', 3, 'Alice');
});

test('dropping a waiting player on a court player replaces them', async ({ page }) => {
  await addFive(page);
  await dragToSlot(page, 'Alice', 'court-0', 2);

  await dragOnto(
    card(page, 'all', 'Eve'),
    card(page, 'court-0', 'Alice'),
    card(page, 'court-0', 'Eve'),
  );

  // Which position Eve lands in is covered in known-bugs.spec.ts
  await expect(card(page, 'court-0', 'Alice')).toHaveCount(0);
  await expect(card(page, 'all', 'Alice')).toBeVisible();
});

test('dropping a player back on their own position changes nothing', async ({ page }) => {
  await addFive(page);
  await dragToSlot(page, 'Alice', 'court-0', 1);

  await attemptDrag(card(page, 'court-0', 'Alice'), slot(page, 'court-0', 1));

  await inSlot(page, 'court-0', 1, 'Alice');
  await expect(page.locator('[data-player-id][data-zone="court-0"]')).toHaveCount(1);
});

test('dropping outside any court or queue changes nothing', async ({ page }) => {
  await addFive(page);
  await dragToSlot(page, 'Alice', 'court-0', 1);

  await attemptDrag(card(page, 'court-0', 'Alice'), page.getByText('Queue Maestro', { exact: true }));

  await inSlot(page, 'court-0', 1, 'Alice');
});

test('a queue too big for every court cannot transfer', async ({ page }) => {
  await page.goto('/');
  await pastePlayers(page, 'A\nB\nC\nD\nE\nF\nG');
  await dragToSlot(page, 'A', 'court-0', 0);
  await dragToSlot(page, 'B', 'court-0', 1);
  await dragToSlot(page, 'C', 'court-1', 0);
  await dragToSlot(page, 'D', 'court-1', 1);
  await dragToSlot(page, 'E', 'queue-0', 0);
  await dragToSlot(page, 'F', 'queue-0', 1);
  await expect(transferButton(page, 'queue-0')).toBeEnabled();

  await dragToSlot(page, 'G', 'queue-0', 2);

  await expect(transferButton(page, 'queue-0')).toBeDisabled();
});

test('a player who has paid cannot be dragged off the court', async ({ page }) => {
  await addFive(page);
  await dragToSlot(page, 'Alice', 'court-0', 0);
  const payments = await openPayments(page);
  await payments
    .getByRole('row')
    .filter({ has: page.getByText('Alice', { exact: true }) })
    .getByRole('button', { name: 'Mark Paid' })
    .click();
  await payments.getByRole('button', { name: 'Close', exact: true }).click();

  await expect(card(page, 'court-0', 'Alice')).not.toHaveAttribute('draggable', 'true');
  await card(page, 'court-0', 'Alice').dragTo(slot(page, 'queue-0', 0));

  await inSlot(page, 'court-0', 0, 'Alice');
  await expectZone(page, 'queue-0', []);
});
