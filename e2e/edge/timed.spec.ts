import type { Page } from '@playwright/test';
import { test, expect, pastePlayers, card, slot } from '../fixtures';
import { dragToSlot, attemptDrag, playGame, expectZone } from '../session';
import { seedStorage } from '../storage';

// A controllable clock: time passes normally, and `fastForward` jumps ahead
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

async function openWith(page: Page, names: string[]) {
  await page.goto('/');
  await pastePlayers(page, names.join('\n'));
}

test.describe('player cooldowns', () => {
  async function putOnCourtWithCooldowns(page: Page) {
    await openWith(page, ['Alice', 'Bob']);
    await page.getByRole('button', { name: 'App Settings' }).click();
    await page.getByRole('switch').or(page.getByRole('checkbox')).first().check();
    await page.keyboard.press('Escape');
    await dragToSlot(page, 'Alice', 'court-0', 0);
  }

  test('a player who just went on court cannot be queued from the list', async ({ page }) => {
    await putOnCourtWithCooldowns(page);
    const listCard = card(page, 'all', 'Alice');

    await expect(listCard.getByTitle(/On cooldown/)).toBeVisible();
    await expect(listCard).not.toHaveAttribute('draggable', 'true');
    await listCard.dragTo(slot(page, 'queue-0', 0));
    await expectZone(page, 'queue-0', []);
  });

  test('the cooldown ends after 15 minutes', async ({ page }) => {
    await putOnCourtWithCooldowns(page);
    await expect(card(page, 'all', 'Alice').getByTitle(/On cooldown/)).toBeVisible();

    await page.clock.fastForward('14:00');
    await expect(card(page, 'all', 'Alice').getByTitle(/On cooldown/)).toBeVisible();

    await page.clock.fastForward('01:30');
    await expect(card(page, 'all', 'Alice').getByTitle(/On cooldown/)).toHaveCount(0);
    await dragToSlot(page, 'Alice', 'queue-0', 0);
  });

  test('with cooldowns off, a player on court can be queued at once', async ({ page }) => {
    await openWith(page, ['Alice']);
    await dragToSlot(page, 'Alice', 'court-0', 0);

    await dragToSlot(page, 'Alice', 'queue-0', 0);
  });
});

test.describe('popups for new visitors', () => {
  test.use({ hidePopups: false });

  const announcement = (page: Page) =>
    page.getByRole('dialog').filter({ hasText: 'Queue Maestro is turning 1' });
  const tutorial = (page: Page) => page.getByText('Quick Tutorial');

  /** Loads the app and waits until it responds, so its timers are running. */
  async function visit(page: Page) {
    await page.goto('/');
    await expect(page.getByText('Total Players: 0')).toBeVisible();
  }

  test('the announcement appears once and stays dismissed', async ({ page }) => {
    await visit(page);
    await page.clock.fastForward(4000);
    await announcement(page).getByRole('button', { name: 'Maybe later' }).click();
    await expect(announcement(page)).toBeHidden();

    await page.reload();
    await expect(page.getByText('Total Players: 0')).toBeVisible();
    await page.clock.fastForward(10_000);

    await expect(announcement(page)).toHaveCount(0);
  });

  test('the announcement can open the feedback form', async ({ page }) => {
    await visit(page);
    await page.clock.fastForward(4000);
    await announcement(page).getByRole('button', { name: 'Share feedback' }).click();

    await expect(page.getByRole('dialog', { name: 'Share your feedback' })).toBeVisible();
  });

  test('no announcement interrupts a session in progress', async ({ page }) => {
    await openWith(page, ['Alice']);
    await dragToSlot(page, 'Alice', 'court-0', 0);
    await page.clock.fastForward(10_000);

    await expect(announcement(page)).toHaveCount(0);
  });

  test('the drag tutorial appears with two unassigned players, only once', async ({ page }) => {
    await seedStorage(page, { announcement2026Seen: 'true' });
    await openWith(page, ['Alice', 'Bob']);
    await page.clock.fastForward(3000);
    await expect(tutorial(page)).toBeVisible();

    // Clicking outside the tutorial closes it
    await page.mouse.click(5, 5);
    await expect(tutorial(page)).toBeHidden();
    await page.reload();
    await expect(page.getByText('Total Players: 2')).toBeVisible();
    await page.clock.fastForward(5000);

    await expect(tutorial(page)).toHaveCount(0);
  });
});

test.describe('feedback prompt', () => {
  const prompt = (page: Page) => page.getByRole('status').filter({ hasText: 'Help shape Queue Maestro' });
  const saved = (page: Page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('qm_fb_prompt') ?? 'null'));

  async function playTwoGames(page: Page) {
    await openWith(page, ['Alice', 'Bob']);
    await playGame(page, ['Alice', 'Bob']);
    await playGame(page, ['Alice', 'Bob']);
    await page.clock.fastForward(2000);
  }

  test('does not appear after only one game', async ({ page }) => {
    await openWith(page, ['Alice', 'Bob']);
    await playGame(page, ['Alice', 'Bob']);
    await page.clock.fastForward(5000);

    await expect(prompt(page)).toHaveCount(0);
  });

  test('"Later" hides it and counts one dismissal', async ({ page }) => {
    await playTwoGames(page);
    await prompt(page).getByRole('button', { name: 'Later' }).click();

    await expect(prompt(page)).toBeHidden();
    expect(await saved(page)).toMatchObject({ dismissals: 1, timeouts: 0 });
  });

  test('hides itself after 12 seconds and counts a timeout', async ({ page }) => {
    await playTwoGames(page);
    await expect(prompt(page)).toBeVisible();

    await page.clock.fastForward(13_000);

    await expect(prompt(page)).toBeHidden();
    expect(await saved(page)).toMatchObject({ dismissals: 0, timeouts: 1 });
  });

  for (const [label, state] of [
    ['feedback was already sent', { submitted: true }],
    ['it was dismissed three times', { dismissals: 3 }],
    ['it timed out five times', { timeouts: 5 }],
    ['it is snoozed', { snoozedUntil: 4_000_000_000_000 }],
  ] as const) {
    test(`stays away when ${label}`, async ({ page }) => {
      await seedStorage(page, { qm_fb_prompt: JSON.stringify(state) });
      await playTwoGames(page);
      await page.clock.fastForward(5000);

      await expect(prompt(page)).toHaveCount(0);
    });
  }
});
