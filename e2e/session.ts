import type { Locator, Page } from '@playwright/test';
import { expect, pastePlayers, card, slot, zoneBox, gamesPlayed } from './fixtures';
import { PLAYER_LIST, PLAYERS, GROUPS } from './data/roster';

export const queues = (page: Page) =>
  page.locator('[data-droppable-zone^="queue-"]:not([data-position])');

export async function loadRoster(page: Page) {
  await page.goto('/');
  await pastePlayers(page, PLAYER_LIST);
  await expect(page.getByText(`Total Players: ${PLAYERS.length}`)).toBeVisible();
}

export async function dragToSlot(page: Page, name: string, zone: string, position: number) {
  await card(page, 'all', name).dragTo(slot(page, zone, position));
  await expect(card(page, zone, name)).toBeVisible();
}

/** Queues the first `groupCount` groups of four, in sign-up order. */
export async function fillQueues(page: Page, groupCount: number = GROUPS.length) {
  for (const [index, group] of GROUPS.slice(0, groupCount).entries()) {
    if (index > 0) await page.getByText('Add Queue', { exact: true }).click();
    await expect(queues(page)).toHaveCount(index + 1);
    for (const [position, name] of group.entries()) {
      await dragToSlot(page, name, `queue-${index}`, position);
    }
  }
}

/** Asserts exactly these players are in a court or queue, in position order. */
export async function expectZone(page: Page, zone: string, names: string[]) {
  await expect(page.locator(`[data-player-id][data-zone="${zone}"]`)).toHaveCount(names.length);
  for (const [position, name] of names.entries()) {
    await expect(slot(page, zone, position).getByText(name, { exact: true })).toBeVisible();
  }
}

export const transferButton = (page: Page, queue: string) =>
  zoneBox(page, queue).getByRole('button', { name: 'Transfer to Court' });

/** For when more than one court has room, so the app asks which one. */
export async function transferToChosenCourt(page: Page, queue: string, courtNumber: number) {
  await transferButton(page, queue).click();
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: `Court ${courtNumber}` }).click();
  await page.getByRole('button', { name: 'Transfer', exact: true }).click();
}

export const endGame = (page: Page, court: string) =>
  zoneBox(page, court).getByRole('button', { name: 'End Game' }).click();

export async function expectGames(page: Page, names: string[], games: number) {
  for (const name of names) {
    await expect(gamesPlayed(card(page, 'all', name))).toHaveText(String(games));
  }
}

export async function setCourtCount(page: Page, value: string) {
  await page.getByRole('button', { name: 'Court Settings' }).click();
  await page.getByLabel('Courts', { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Update' }).click();
}

export const courts = (page: Page) =>
  page.locator('[data-droppable-zone^="court-"]:not([data-position])');

export async function openCourtMenu(page: Page, court: string) {
  await zoneBox(page, court).getByRole('button', { name: 'Court options' }).click();
}

export const undoButton = (page: Page, court: string) =>
  zoneBox(page, court).getByRole('button', { name: 'Undo' });

/** Opens a player's menu, the last button on their card. */
export async function openPlayerMenu(page: Page, zone: string, name: string) {
  await card(page, zone, name).locator('button').last().click();
  const menu = page.getByRole('presentation').filter({ hasText: `Delete ${name}` });
  await expect(menu).toBeVisible();
  return menu;
}

export async function openPayments(page: Page) {
  await page.getByRole('button', { name: 'Payment Summary' }).click();
  return page.getByRole('presentation').filter({ hasText: 'Payment Management' });
}

/**
 * Drags onto an occupied spot. The browser sometimes never starts a drag that follows the previous
 * drop within milliseconds, so retry, but only while `done` is still missing: repeating a swap
 * that worked would undo it.
 */
export async function dragOnto(source: Locator, target: Locator, done: Locator) {
  await expect(async () => {
    if (!(await done.isVisible())) await source.dragTo(target);
    await expect(done).toBeVisible({ timeout: 1000 });
  }).toPass();
}

/**
 * For tests expecting a drag to change nothing: retries until the browser really starts the drag,
 * so the test cannot pass just because no drag happened.
 */
export async function attemptDrag(source: Locator, target: Locator) {
  const page = source.page();
  await page.evaluate(() => {
    document.addEventListener('dragstart', () => (document.body.dataset.e2eDragged = 'true'), {
      once: true,
    });
  });
  await expect(async () => {
    await source.dragTo(target);
    await expect(page.locator('body[data-e2e-dragged]')).toBeAttached({ timeout: 500 });
  }).toPass();
}

/** Plays one game between the first two named players on court 1. */
export async function playGame(page: Page, [first, second]: string[]) {
  await dragToSlot(page, first, 'court-0', 0);
  await dragToSlot(page, second, 'court-0', 1);
  await endGame(page, 'court-0');
  await expect(page.locator('[data-player-id][data-zone="court-0"]')).toHaveCount(0);
}
