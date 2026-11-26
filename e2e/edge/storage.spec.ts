import type { Page } from '@playwright/test';
import { test, expect, addPlayer, card, gamesPlayed, waitForSaved } from '../fixtures';
import { seedState, seedStorage, savedPlayer, savedState, readState, STATE_KEY, VERSION_KEY } from '../storage';
import { loadRoster, fillQueues, transferToChosenCourt, endGame, expectZone } from '../session';
import { GROUPS } from '../data/roster';

const listCards = (page: Page) => page.locator('[data-player-id][data-zone="all"]');

async function askToClearData(page: Page) {
  await page.getByRole('button', { name: 'App Settings' }).click();
  await page.getByRole('button', { name: 'Clear All Data' }).click();
  return page.getByRole('dialog').filter({ hasText: 'Clear All Data?' });
}

test.describe('damaged or old saved data', () => {
  for (const [label, raw] of [
    ['text that is not JSON', '{not json'],
    ['a half-written save', '{"players":[{"id":"a","na'],
    ['the wrong shape', '{"players":"nobody","version":"1.1"}'],
  ]) {
    test(`starts empty and stays usable after ${label}`, async ({ page }) => {
      await seedStorage(page, { [STATE_KEY]: raw, [VERSION_KEY]: '1.1' });
      await page.goto('/');

      await expect(page.getByText('Total Players: 0')).toBeVisible();
      await addPlayer(page, 'Alice');
      await expect(card(page, 'all', 'Alice')).toBeVisible();
    });
  }

  test('clears data saved by an unknown version', async ({ page }) => {
    await seedState(page, savedState([savedPlayer('Alice')]), '9.9');
    await page.goto('/');

    await expect(page.getByText('Total Players: 0')).toBeVisible();
    expect(await readState(page).then((s) => s?.players ?? [])).toEqual([]);
  });

  test('keeps players saved by version 1.0, with old match history', async ({ page }) => {
    const history = [{ matchId: 'm1', partner: 'Bob', opponents: ['Cara', 'Dan'], duration: 600, startTime: 1, endTime: 2, courtName: 'Court 1' }];
    await seedState(page, savedState([savedPlayer('Alice', { gamesPlayed: 1, matchHistory: history })]), '1.0');
    await page.goto('/');

    await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('1');
    await expect
      .poll(async () => (await readState(page)).players[0].matchHistory[0].partner.name)
      .toBe('Bob');
  });

  test('drops a record that repeats a player ID', async ({ page }) => {
    await seedState(page, savedState([savedPlayer('Alice'), savedPlayer('Alice')]));
    await page.goto('/');

    await expect(listCards(page)).toHaveCount(1);
  });

  test('keeps two different players who share a name', async ({ page }) => {
    const history = [{ matchId: 'm1', opponents: [], duration: 600, startTime: 1, endTime: 2, courtName: 'Court 1' }];
    await seedState(
      page,
      savedState([
        savedPlayer('John', { id: 'john-1', gamesPlayed: 1, matchHistory: history }),
        savedPlayer('John', { id: 'john-2' }),
      ]),
    );
    await page.goto('/');

    await expect(listCards(page)).toHaveCount(2);
  });
});

test.describe('storage that cannot be used', () => {
  test('works for the session when storage is full', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('full', 'QuotaExceededError');
      };
    });
    await page.goto('/');
    await addPlayer(page, 'Alice');

    await expect(card(page, 'all', 'Alice')).toBeVisible();
  });
});

test.describe('clearing and reloading', () => {
  test('cancelling Clear All Data keeps everything', async ({ page }) => {
    await loadRoster(page);
    const confirm = await askToClearData(page);
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByText('Total Players: 22')).toBeVisible();
  });

  test('confirming Clear All Data empties the session, also after reload', async ({ page }) => {
    await loadRoster(page);
    await fillQueues(page, 1);
    const confirm = await askToClearData(page);
    await confirm.getByRole('button', { name: 'Clear Data' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Total Players: 0')).toBeVisible();

    await expect.poll(async () => (await readState(page))?.players.length).toBe(0);
    await page.reload();
    await expect(page.getByText('Total Players: 0')).toBeVisible();
    await expect(listCards(page)).toHaveCount(0);
  });

  // Current behaviour: Undo is held in memory only
  test('Undo is no longer offered after a reload', async ({ page }) => {
    await loadRoster(page);
    await fillQueues(page, 1);
    await transferToChosenCourt(page, 'queue-0', 1);
    await endGame(page, 'court-0');
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
    await expect.poll(async () => (await readState(page))?.players[0]?.gamesPlayed).toBe(1);

    await page.reload();

    await expect(gamesPlayed(card(page, 'all', GROUPS[0][0]))).toHaveText('1');
    await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
    await expectZone(page, 'court-0', []);
  });

  test('a change made just before closing is saved after the one second delay', async ({ page }) => {
    await page.goto('/');
    await addPlayer(page, 'Alice');

    await expect.poll(async () => (await readState(page))?.players.length).toBe(1);
  });
});
