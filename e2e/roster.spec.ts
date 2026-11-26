import { test, expect, pastePlayers, card } from './fixtures';
import { SIGN_UP_MESSAGE, HEADER_LINES, PLAYERS, GUESTS } from './data/roster';
import { loadRoster } from './session';

test('the numbered list creates one card per filled slot', async ({ page }) => {
  expect(PLAYERS).toHaveLength(22);
  await loadRoster(page);

  // Names keep their brackets and dashes, and "Carl" stays separate from "Carl - QM"
  for (const name of PLAYERS) {
    await expect(card(page, 'all', name)).toHaveCount(1);
  }
  // Empty slots "23." and "24." add nobody
  await expect(page.locator('[data-player-id][data-zone="all"]')).toHaveCount(22);
});

test('guest annotations do not create extra players', async ({ page }) => {
  expect(GUESTS).toHaveLength(5);
  await loadRoster(page);

  await expect(card(page, 'all', 'Gabs (Chris+2)')).toHaveCount(1);
  await expect(card(page, 'all', 'Gabs (Chris+2) 2')).toHaveCount(0);
});

// Current behaviour, recorded so that any change to it is noticed
test('header lines in a full sign-up message are added as players', async ({ page }) => {
  await page.goto('/');
  await pastePlayers(page, SIGN_UP_MESSAGE);

  await expect(page.getByText(`Total Players: ${PLAYERS.length + HEADER_LINES.length}`)).toBeVisible();
  for (const line of HEADER_LINES) {
    await expect(card(page, 'all', line)).toHaveCount(1);
  }
});

test('the list can be searched', async ({ page }) => {
  await loadRoster(page);
  await page.getByPlaceholder('Search in all...').fill('carl');

  await expect(page.locator('[data-player-id][data-zone="all"]')).toHaveCount(3);
  for (const name of ['Carl', 'Carl - QM', 'Aldritch (Carl QM+1)']) {
    await expect(card(page, 'all', name)).toBeVisible();
  }
});
