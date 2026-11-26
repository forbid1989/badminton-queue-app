import {
  test,
  expect,
  addPlayer,
  pastePlayers,
  card,
  slot,
  zoneBox,
  gamesPlayed,
  waitForSaved,
  HYDRATION_ERROR,
} from './fixtures';
import { dragToSlot, endGame, openCourtMenu, openPlayerMenu, openPayments, dragOnto } from './session';
import { readState } from './storage';

// `test.fail` means "expected to fail". Once a bug is fixed, its test reports
// "expected to fail, but passed": then remove the `test.fail` line.

test('reloading with a player on court does not cause a hydration error', async ({ page }) => {
  // The server-rendered page has empty courts, but the client reads saved players from
  // localStorage before its first render (app/lib/store/InitialState.ts)
  test.fail();

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await addPlayer(page, 'Alice');
  await card(page, 'all', 'Alice').dragTo(slot(page, 'court-0', 0));
  await waitForSaved(page, 'Alice', 'court-0');
  await page.reload();
  await expect(card(page, 'court-0', 'Alice')).toBeVisible();

  expect(errors.filter((message) => HYDRATION_ERROR.test(message))).toEqual([]);
});

async function renameCourt(page: Parameters<typeof openCourtMenu>[0], court: string, number: string) {
  await openCourtMenu(page, court);
  const field = page.getByPlaceholder('Enter court number');
  await field.fill(number);
  await field.press('Enter');
  await page.keyboard.press('Escape');
}

test('a court cannot take a number another court shows', async ({ page }) => {
  // Default numbers are not stored, so the duplicate check does not see them
  test.fail();

  await page.goto('/');
  await renameCourt(page, 'court-0', '2');

  await expect(zoneBox(page, 'court-0')).toContainText('Court 1');
});

test('match history uses the court number shown at the time', async ({ page }) => {
  // endGame names the court from its position, ignoring the custom number
  test.fail();

  await page.goto('/');
  await pastePlayers(page, 'Alice\nBob');
  await renameCourt(page, 'court-0', '7');
  await dragToSlot(page, 'Alice', 'court-0', 0);
  await dragToSlot(page, 'Bob', 'court-0', 1);
  await endGame(page, 'court-0');

  await gamesPlayed(card(page, 'all', 'Alice')).click();

  await expect(page.getByRole('presentation').last()).toContainText('Court 7');
});

test('the app still loads when the browser blocks storage', async ({ page }) => {
  // Several effects read localStorage without catching errors, which crashes the page
  test.fail();

  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
    Storage.prototype.removeItem = blocked;
  });
  await page.goto('/');
  await addPlayer(page, 'Alice');

  await expect(card(page, 'all', 'Alice')).toBeVisible();
});

test('games played cannot be negative', async ({ page }) => {
  // The desktop field accepts any whole number
  test.fail();

  await page.goto('/');
  await addPlayer(page, 'Alice');
  const menu = await openPlayerMenu(page, 'all', 'Alice');
  await menu.getByLabel('Games Played').fill('-3');
  await menu.getByLabel('Games Played').blur();
  await expect.poll(() => gamesPlayed(card(page, 'all', 'Alice')).innerText()).not.toBe('0');

  await expect(gamesPlayed(card(page, 'all', 'Alice'))).not.toHaveText('-3');
});

test('a negative fee is not charged', async ({ page }) => {
  // Fee fields accept negative numbers
  test.fail();

  await page.goto('/');
  await addPlayer(page, 'Alice');
  const dialog = await openPayments(page);
  await dialog.getByLabel('Flat Fee per Player').fill('-50');

  await expect(dialog.getByRole('row').filter({ hasText: 'Alice' })).not.toContainText('-50');
});

test('player list sorting is remembered after a reload', async ({ page }) => {
  // saveToLocalStorage does not include settings.playerListSort
  test.fail();

  await page.goto('/');
  await addPlayer(page, 'Alice');
  await page.getByRole('button', { name: 'App Settings' }).click();
  // The first drop-down in the settings window is the second sort level's field
  await page.getByRole('combobox').first().click();
  const option = page.getByRole('option').last();
  const chosen = await option.innerText();
  await option.click();
  await expect.poll(async () => (await readState(page))?.players.length).toBe(1);

  await page.reload();
  await page.getByRole('button', { name: 'App Settings' }).click();

  await expect(page.getByRole('combobox').first()).toHaveText(chosen);
});

test('replacing a queued player keeps the newcomer on their court', async ({ page }) => {
  // replacePlayer copies the replaced player's assignments over the newcomer's own
  test.fail();

  await page.goto('/');
  await pastePlayers(page, 'Alice\nBob');
  await dragToSlot(page, 'Alice', 'court-0', 0);
  await dragToSlot(page, 'Bob', 'queue-0', 0);

  await dragOnto(
    card(page, 'all', 'Alice'),
    card(page, 'queue-0', 'Bob'),
    card(page, 'queue-0', 'Alice'),
  );

  await expect(card(page, 'court-0', 'Alice')).toBeVisible();
});

test('a replacement takes the position of the player replaced', async ({ page }) => {
  // The court's own drop handler also runs, moving the newcomer to the first free position
  test.fail();

  await page.goto('/');
  await pastePlayers(page, 'Alice\nEve');
  await dragToSlot(page, 'Alice', 'court-0', 2);

  await dragOnto(
    card(page, 'all', 'Eve'),
    card(page, 'court-0', 'Alice'),
    card(page, 'court-0', 'Eve'),
  );

  await expect(slot(page, 'court-0', 2).getByText('Eve', { exact: true })).toBeVisible();
});

test('a player swapped in from a queue takes the court position', async ({ page }) => {
  // Same cause as above: the swap is applied, then the court moves the player again
  test.fail();

  await page.goto('/');
  await pastePlayers(page, 'Alice\nBob');
  await dragToSlot(page, 'Alice', 'court-0', 2);
  await dragToSlot(page, 'Bob', 'queue-0', 3);

  await dragOnto(
    card(page, 'queue-0', 'Bob'),
    card(page, 'court-0', 'Alice'),
    card(page, 'court-0', 'Bob'),
  );

  await expect(slot(page, 'court-0', 2).getByText('Bob', { exact: true })).toBeVisible();
});
