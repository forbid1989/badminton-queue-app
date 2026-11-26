import type { Page } from '@playwright/test';
import { test, expect, addPlayer, pastePlayers, card, slot, gamesPlayed } from '../fixtures';
import { dragToSlot, endGame, openPlayerMenu, expectZone } from '../session';
import { readState } from '../storage';

const listCards = (page: Page) => page.locator('[data-player-id][data-zone="all"]');

async function openForm(page: Page) {
  await page.goto('/');
  await expect(async () => {
    await page.locator('button[title="Add Players"]').click({ timeout: 1000 });
    await expect(page.getByText('Quick Add Single Player')).toBeVisible({ timeout: 1000 });
  }).toPass();
  return {
    single: page.getByLabel('Player Name', { exact: true }),
    list: page.getByLabel('Paste Player Names List Here'),
    add: page.getByRole('button', { name: 'Add', exact: true }),
    addList: page.getByRole('presentation').getByRole('button', { name: 'Add Players' }),
    cancel: page.getByRole('button', { name: 'Cancel' }),
  };
}

test.describe('nothing to add', () => {
  test('both add buttons stay disabled for blank or space-only input', async ({ page }) => {
    const form = await openForm(page);
    await expect(form.add).toBeDisabled();
    await expect(form.addList).toBeDisabled();

    await form.single.fill('   ');
    await form.list.fill('  \n \n\t');

    await expect(form.add).toBeDisabled();
    await expect(form.addList).toBeDisabled();
  });

  test('a numbered list with every slot empty adds nobody', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, '1.\n2. \n3.');

    await expect(page.getByText('Total Players: 0')).toBeVisible();
  });

  test('Cancel adds nobody and forgets the pasted text', async ({ page }) => {
    const form = await openForm(page);
    await form.list.fill('Alice\nBob');
    await form.cancel.click();
    await expect(page.getByText('Total Players: 0')).toBeVisible();

    await page.locator('button[title="Add Players"]').click();
    await expect(form.list).toHaveValue('');
  });
});

test.describe('unusual names', () => {
  for (const [label, text, names] of [
    ['Windows line breaks', 'Alice\r\nBob\r\n', ['Alice', 'Bob']],
    ['accents, scripts and emoji', 'José Peña\n王小明\nBee 🏸', ['José Peña', '王小明', 'Bee 🏸']],
    ['text that looks like HTML', '<b>Al</b> & "Bo"', ['<b>Al</b> & "Bo"']],
    ['a count in brackets', 'Alice (3)', ['Alice 1', 'Alice 2', 'Alice 3']],
  ] as const) {
    test(`accepts ${label}`, async ({ page }) => {
      await page.goto('/');
      await pastePlayers(page, text);

      await expect(listCards(page)).toHaveCount(names.length);
      for (const name of names) await expect(card(page, 'all', name)).toBeVisible();
    });
  }

  test('current behaviour: "+0" adds nobody and "+1" adds one player', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'Alice +0\nBob +1');

    await expect(listCards(page)).toHaveCount(1);
    await expect(card(page, 'all', 'Bob')).toBeVisible();
  });

  test('current behaviour: "1)" numbering stays part of the name', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, '1) Alice');

    await expect(card(page, 'all', '1) Alice')).toBeVisible();
  });

  test('allows two players with the same name', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'John\nJohn');

    await expect(card(page, 'all', 'John')).toHaveCount(2);
  });

  test('a very long name does not hide the card menu', async ({ page }) => {
    const name = 'Maximiliano'.repeat(20);
    await page.goto('/');
    await addPlayer(page, name);

    const menu = await openPlayerMenu(page, 'all', name);
    await expect(menu).toBeVisible();
  });
});

test.describe('editing a player', () => {
  test('renaming updates the card and the saved data', async ({ page }) => {
    await page.goto('/');
    await addPlayer(page, 'Alice');
    const menu = await openPlayerMenu(page, 'all', 'Alice');
    const field = menu.getByPlaceholder('Enter player name');
    await field.fill('Alicia');
    await field.press('Enter');
    await page.keyboard.press('Escape');

    await expect(card(page, 'all', 'Alicia')).toBeVisible();
    await expect.poll(async () => (await readState(page))?.players[0].name).toBe('Alicia');
  });

  test('a blank new name is ignored', async ({ page }) => {
    await page.goto('/');
    await addPlayer(page, 'Alice');
    const menu = await openPlayerMenu(page, 'all', 'Alice');
    const field = menu.getByPlaceholder('Enter player name');
    await field.fill('   ');
    await field.press('Enter');
    await page.keyboard.press('Escape');

    await expect(card(page, 'all', 'Alice')).toBeVisible();
  });

  test('games played can be corrected, and letters are ignored', async ({ page }) => {
    await page.goto('/');
    await addPlayer(page, 'Alice');
    const menu = await openPlayerMenu(page, 'all', 'Alice');
    const field = menu.getByLabel('Games Played');

    await field.fill('4');
    await field.blur();
    await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('4');

    await field.fill('abc');
    await field.blur();
    await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('4');
  });

  test('visiting the games field after a game does not undo the count', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    await dragToSlot(page, 'Alice', 'court-0', 0);
    await dragToSlot(page, 'Bob', 'court-0', 1);
    await endGame(page, 'court-0');
    await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('1');

    const menu = await openPlayerMenu(page, 'all', 'Alice');
    const field = menu.getByLabel('Games Played');
    await expect(field).toHaveValue('1');
    await field.focus();
    await field.blur();

    await expect(gamesPlayed(card(page, 'all', 'Alice'))).toHaveText('1');
  });
});

test.describe('deleting a player', () => {
  test('Cancel keeps the player', async ({ page }) => {
    await page.goto('/');
    await addPlayer(page, 'Alice');
    const menu = await openPlayerMenu(page, 'all', 'Alice');
    await menu.getByRole('button', { name: 'Delete Alice' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

    await expect(card(page, 'all', 'Alice')).toBeVisible();
  });

  test('deleting a player on court frees their position', async ({ page }) => {
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    await dragToSlot(page, 'Alice', 'court-0', 0);
    await dragToSlot(page, 'Bob', 'court-0', 1);

    const menu = await openPlayerMenu(page, 'all', 'Alice');
    await menu.getByRole('button', { name: 'Delete Alice' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete Alice' }).click();

    await expect(page.getByText('Total Players: 1')).toBeVisible();
    await expect(slot(page, 'court-0', 0).locator('[data-player-id]')).toHaveCount(0);
    await expect(slot(page, 'court-0', 1).getByText('Bob', { exact: true })).toBeVisible();
    await expectZone(page, 'court-1', []);
  });
});
