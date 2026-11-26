import { test, expect, card, slot, zoneBox, waitForSaved } from './fixtures';
import { PLAYERS, GROUPS } from './data/roster';
import {
  loadRoster,
  fillQueues,
  queues,
  dragToSlot,
  attemptDrag,
  expectZone,
  expectGames,
  transferButton,
  transferToChosenCourt,
  endGame,
} from './session';

test('queues all 22 players into six queues', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page);

  await expect(queues(page)).toHaveCount(6);
  for (const [index, group] of GROUPS.entries()) {
    await expectZone(page, `queue-${index}`, group);
  }

  await page.getByRole('tab', { name: 'Waiting' }).click();
  await expect(page.locator('[data-player-id][data-zone="all"]')).toHaveCount(0);
});

test('a full queue accepts no fifth player', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page, 1);

  await attemptDrag(card(page, 'all', PLAYERS[4]), zoneBox(page, 'queue-0'));

  await expectZone(page, 'queue-0', GROUPS[0]);
});

test('dropping a third player on the only queue adds a new queue', async ({ page }) => {
  await loadRoster(page);
  await dragToSlot(page, PLAYERS[0], 'queue-0', 0);
  await dragToSlot(page, PLAYERS[1], 'queue-0', 1);

  // Dropping on the queue's edge, not on a position, triggers the automatic queue
  await card(page, 'all', PLAYERS[2]).dragTo(zoneBox(page, 'queue-0'), {
    targetPosition: { x: 8, y: 8 },
  });

  await expect(card(page, 'queue-0', PLAYERS[2])).toBeVisible();
  await expect(queues(page)).toHaveCount(2);
});

test('queues move onto courts in order and the rest move up', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page, 3);

  // Two courts are free, so the first transfer asks which one
  await transferToChosenCourt(page, 'queue-0', 1);
  await expectZone(page, 'court-0', GROUPS[0]);
  await expect(queues(page)).toHaveCount(2);
  await expectZone(page, 'queue-0', GROUPS[1]);
  await expectZone(page, 'queue-1', GROUPS[2]);

  // Only one court is free, so this one transfers straight away
  await transferButton(page, 'queue-0').click();
  await expectZone(page, 'court-1', GROUPS[1]);
  await expectZone(page, 'queue-0', GROUPS[2]);

  await expect(transferButton(page, 'queue-0')).toBeDisabled();
  await expect(transferButton(page, 'queue-0')).toHaveAttribute('title', 'All courts are full');
});

test('rotates the whole roster through two courts', async ({ page }) => {
  test.slow();
  await loadRoster(page);
  await fillQueues(page);
  await transferToChosenCourt(page, 'queue-0', 1);
  await transferButton(page, 'queue-0').click();

  // Each finished game frees one court for the next queue
  for (const [index, group] of GROUPS.slice(2).entries()) {
    const court = `court-${index % 2}`;
    await endGame(page, court);
    await expectZone(page, court, []);
    await transferButton(page, 'queue-0').click();
    await expectZone(page, court, group);
  }

  await expect(queues(page)).toHaveCount(0);
  await endGame(page, 'court-0');
  await endGame(page, 'court-1');

  await expectGames(page, PLAYERS, 1);
});

test('finished players can rejoin at the back of the queue', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page, 2);
  await transferToChosenCourt(page, 'queue-0', 1);
  await endGame(page, 'court-0');
  await expectGames(page, GROUPS[0], 1);

  await page.getByText('Add Queue', { exact: true }).click();
  for (const [position, name] of GROUPS[0].entries()) {
    await dragToSlot(page, name, 'queue-1', position);
  }

  await expectZone(page, 'queue-0', GROUPS[1]);
  await expectZone(page, 'queue-1', GROUPS[0]);
});

test('a player on court can be queued, but that queue cannot transfer yet', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page, 1);
  await transferToChosenCourt(page, 'queue-0', 1);

  await page.getByText('Add Queue', { exact: true }).click();
  await dragToSlot(page, PLAYERS[0], 'queue-0', 0);

  await expect(transferButton(page, 'queue-0')).toBeDisabled();
  await expect(transferButton(page, 'queue-0')).toHaveAttribute('title', 'Players already on court');

  await endGame(page, 'court-0');
  await expect(transferButton(page, 'queue-0')).toBeEnabled();
});

test('removing a queue keeps its players and renumbers the others', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page, 3);

  await zoneBox(page, 'queue-1').getByRole('button', { name: 'Remove this queue' }).click();

  await expect(queues(page)).toHaveCount(2);
  await expectZone(page, 'queue-0', GROUPS[0]);
  await expectZone(page, 'queue-1', GROUPS[2]);
  await expect(page.getByText(`Total Players: ${PLAYERS.length}`)).toBeVisible();
  await expect(card(page, 'all', GROUPS[1][0])).toBeVisible();
});

test('courts and queues survive a reload mid-session', async ({ page }) => {
  await loadRoster(page);
  await fillQueues(page, 3);
  await transferToChosenCourt(page, 'queue-0', 2);
  await waitForSaved(page, GROUPS[0][3], 'court-1');

  await page.reload();

  await expectZone(page, 'court-1', GROUPS[0]);
  await expectZone(page, 'queue-0', GROUPS[1]);
  await expectZone(page, 'queue-1', GROUPS[2]);
  await expect(slot(page, 'court-0', 0)).toBeVisible();
  await expectZone(page, 'court-0', []);
});
