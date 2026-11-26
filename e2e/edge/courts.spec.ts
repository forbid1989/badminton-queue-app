import type { Page } from '@playwright/test';
import { test, expect, pastePlayers, card, slot, zoneBox, gamesPlayed } from '../fixtures';
import { GROUPS, PLAYERS } from '../data/roster';
import {
  loadRoster,
  fillQueues,
  queues,
  courts,
  dragToSlot,
  expectZone,
  expectGames,
  transferButton,
  transferToChosenCourt,
  endGame,
  undoButton,
  setCourtCount,
  openCourtMenu,
} from '../session';

const PAIR = ['Alice', 'Bob'];

/** Alice and Bob play one game on court 1, so Undo is offered there. */
async function finishGame(page: Page, others: string[] = []) {
  await page.goto('/');
  await pastePlayers(page, [...PAIR, ...others].join('\n'));
  await dragToSlot(page, 'Alice', 'court-0', 0);
  await dragToSlot(page, 'Bob', 'court-0', 1);
  await endGame(page, 'court-0');
  await expect(undoButton(page, 'court-0')).toBeVisible();
}

async function renameCourt(page: Page, court: string, number: string) {
  await openCourtMenu(page, court);
  const field = page.getByPlaceholder('Enter court number');
  await field.fill(number);
  await field.press('Enter');
}

test.describe('ending and undoing games', () => {
  test('End Game is not offered for an empty court or a lone player', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    const end = zoneBox(page, 'court-0').getByRole('button', { name: 'End Game' });
    await expect(end).toHaveCount(0);

    await dragToSlot(page, 'Alice', 'court-0', 0);
    await expect(end).toHaveCount(0);

    await dragToSlot(page, 'Bob', 'court-0', 1);
    await expect(end).toBeVisible();
  });

  test('Undo is withdrawn when someone new takes the court', async ({ page }) => {
    await finishGame(page, ['Cara']);
    await dragToSlot(page, 'Cara', 'court-0', 0);

    await expect(undoButton(page, 'court-0')).toHaveCount(0);
  });

  test('Undo on one court leaves a game on another court alone', async ({ page }) => {
    await finishGame(page, ['Cara', 'Dan']);
    await dragToSlot(page, 'Cara', 'court-1', 0);
    await dragToSlot(page, 'Dan', 'court-1', 1);

    await undoButton(page, 'court-0').click();

    await expectZone(page, 'court-0', PAIR);
    await expectZone(page, 'court-1', ['Cara', 'Dan']);
    await expectGames(page, [...PAIR, 'Cara', 'Dan'], 0);
  });

  test('Undo is withdrawn once a finished player is playing on another court', async ({ page }) => {
    await finishGame(page);
    await dragToSlot(page, 'Alice', 'court-1', 0);

    await expect(undoButton(page, 'court-0')).toHaveCount(0);
    await expectZone(page, 'court-1', ['Alice']);
    await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('1');
  });

  test('Undo is withdrawn when a waiting queue takes the finished players to another court', async ({ page }) => {
    await loadRoster(page);
    await fillQueues(page, 1);
    await transferToChosenCourt(page, 'queue-0', 1);
    // The same four queue up again while still playing, then finish and move to court 2
    await page.getByText('Add Queue', { exact: true }).click();
    for (const [position, name] of GROUPS[0].entries()) {
      await dragToSlot(page, name, 'queue-0', position);
    }
    await endGame(page, 'court-0');
    await transferToChosenCourt(page, 'queue-0', 2);
    await expectZone(page, 'court-1', GROUPS[0]);

    await expect(undoButton(page, 'court-0')).toHaveCount(0);
    await expectGames(page, GROUPS[0], 1);
  });

  test('Undo returns players to the right court after a lower court is deleted', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    await dragToSlot(page, 'Alice', 'court-1', 0);
    await dragToSlot(page, 'Bob', 'court-1', 1);
    await endGame(page, 'court-1');
    await openCourtMenu(page, 'court-0');
    await page.getByRole('button', { name: 'Delete Court' }).click();
    await expect(courts(page)).toHaveCount(1);

    await undoButton(page, 'court-0').click();

    await expectZone(page, 'court-0', PAIR);
    await expectGames(page, PAIR, 0);
  });

  test('Undo keeps a place in the queue taken after the game', async ({ page }) => {
    await finishGame(page);
    await dragToSlot(page, 'Alice', 'queue-0', 2);

    await undoButton(page, 'court-0').click();

    await expectZone(page, 'court-0', PAIR);
    await expect(slot(page, 'queue-0', 2).getByText('Alice', { exact: true })).toBeVisible();
    await expectGames(page, PAIR, 0);
  });

  test('Undo does not move players into a different queue after queues are renumbered', async ({ page }) => {
    await loadRoster(page);
    await fillQueues(page, 3);
    await transferToChosenCourt(page, 'queue-0', 1);
    // Group 1 plays, and its first player is also waiting in what is now the second queue
    await slot(page, 'queue-1', 0).getByRole('button', { name: /^Return / }).click();
    await card(page, 'all', GROUPS[0][0]).dragTo(slot(page, 'queue-1', 0));
    await expect(card(page, 'queue-1', GROUPS[0][0])).toBeVisible();
    await endGame(page, 'court-0');

    // Removing the first queue renumbers the one the player is waiting in
    await zoneBox(page, 'queue-0').getByRole('button', { name: 'Remove this queue' }).click();
    await expect(card(page, 'queue-0', GROUPS[0][0])).toBeVisible();
    await undoButton(page, 'court-0').click();

    await expectZone(page, 'court-0', GROUPS[0]);
    await expect(queues(page)).toHaveCount(1);
    await expect(slot(page, 'queue-0', 0).getByText(GROUPS[0][0], { exact: true })).toBeVisible();
  });

  test('old Undo does not come back when a removed court is added again', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    await dragToSlot(page, 'Alice', 'court-1', 0);
    await dragToSlot(page, 'Bob', 'court-1', 1);
    await endGame(page, 'court-1');
    await expect(undoButton(page, 'court-1')).toBeVisible();

    await setCourtCount(page, '1');
    await expect(courts(page)).toHaveCount(1);
    await setCourtCount(page, '2');

    await expect(courts(page)).toHaveCount(2);
    await expect(undoButton(page, 'court-1')).toHaveCount(0);
  });
});

test.describe('number of courts', () => {
  for (const value of ['0', '-2', '']) {
    test(`ignores a court count of "${value}"`, async ({ page }) => {
      await page.goto('/');
      await setCourtCount(page, value);

      await page.keyboard.press('Escape');
      await expect(courts(page)).toHaveCount(2);
    });
  }

  // Current behaviour: the fraction is dropped
  test('rounds a decimal court count down', async ({ page }) => {
    await page.goto('/');
    await setCourtCount(page, '3.9');

    await expect(courts(page)).toHaveCount(3);
  });

  test('removing occupied courts returns their players to the list', async ({ page }) => {
    await loadRoster(page);
    await fillQueues(page, 2);
    await transferToChosenCourt(page, 'queue-0', 2);

    await setCourtCount(page, '1');

    await expect(courts(page)).toHaveCount(1);
    await expect(page.locator('[data-player-id][data-zone^="court-"]')).toHaveCount(0);
    await expect(page.getByText(`Total Players: ${PLAYERS.length}`)).toBeVisible();
    await expectZone(page, 'queue-0', GROUPS[1]);
  });

  test('deleting a middle court keeps the games on the others', async ({ page }) => {
    await loadRoster(page);
    await setCourtCount(page, '3');
    await fillQueues(page, 3);
    for (const court of [1, 2, 3]) {
      if (court < 3) await transferToChosenCourt(page, 'queue-0', court);
      else await transferButton(page, 'queue-0').click();
    }

    await openCourtMenu(page, 'court-1');
    await page.getByRole('button', { name: 'Delete Court' }).click();

    await expect(courts(page)).toHaveCount(2);
    await expectZone(page, 'court-0', GROUPS[0]);
    await expectZone(page, 'court-1', GROUPS[2]);
    // The remaining courts keep the numbers painted on the floor
    await expect(zoneBox(page, 'court-1')).toContainText('Court 3');
  });

  test('the last court cannot be deleted', async ({ page }) => {
    await page.goto('/');
    await setCourtCount(page, '1');

    await expect(courts(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Court options' })).toHaveCount(0);
  });

  test('swapping courts exchanges the players and keeps positions', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    await dragToSlot(page, 'Alice', 'court-0', 3);
    await dragToSlot(page, 'Bob', 'court-1', 1);

    await openCourtMenu(page, 'court-0');
    await page.getByRole('button', { name: 'Swap Court Players' }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Court 2' }).click();
    await page.getByRole('button', { name: 'Swap', exact: true }).click();

    await expect(slot(page, 'court-1', 3).getByText('Alice', { exact: true })).toBeAttached();
    await expect(slot(page, 'court-0', 1).getByText('Bob', { exact: true })).toBeAttached();
  });
});

test.describe('court numbers', () => {
  test('a court can be renamed', async ({ page }) => {
    await page.goto('/');
    await renameCourt(page, 'court-0', '7');

    await expect(zoneBox(page, 'court-0')).toContainText('Court 7');
  });

  test('zero is rejected', async ({ page }) => {
    await page.goto('/');
    await renameCourt(page, 'court-0', '0');

    await expect(page.getByText('Please enter a positive number')).toBeVisible();
    await expect(zoneBox(page, 'court-0')).toContainText('Court 1');
  });
});
