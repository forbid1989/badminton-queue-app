import type { Page } from '@playwright/test';
import { test, expect, pastePlayers, mockSupabase } from '../fixtures';
import { playGame } from '../session';

async function openForm(page: Page) {
  await page.goto('/');
  const form = page.getByRole('dialog', { name: 'Share your feedback' });
  await expect(async () => {
    await page.getByRole('button', { name: 'Share feedback' }).click({ timeout: 1000 });
    await expect(form).toBeVisible({ timeout: 1000 });
  }).toPass();
  return form;
}

async function fillRequired(page: Page) {
  const form = page.getByRole('dialog', { name: 'Share your feedback' });
  await form.getByRole('radio', { name: 'Player', exact: true }).check();
  await form.getByRole('checkbox', { name: 'Badminton' }).check();
  await form.getByRole('combobox', { name: /Where is your group based/ }).click();
  await page.getByRole('option', { name: 'Visayas' }).click();
  await form.getByRole('combobox', { name: /Who mostly plays/ }).click();
  await page.getByRole('option', { name: 'Mixed' }).click();
  await form.getByRole('checkbox', { name: 'Leaderboards' }).check();
  await form.getByRole('radio', { name: 'No', exact: true }).check();
}

const send = (page: Page) => page.getByRole('button', { name: 'Send', exact: true });
const message = (page: Page) => page.getByLabel('Comments, ideas or bugs (optional)');
const feedbackSent = (requests: { table: string }[]) => requests.filter((r) => r.table === 'feedback');

test.describe('validation', () => {
  test('Send stays disabled until the required answers are given', async ({ page }) => {
    await openForm(page);
    await expect(send(page)).toBeDisabled();

    await fillRequired(page);

    await expect(send(page)).toBeEnabled();
  });

  test('choosing "Maybe" makes the price required', async ({ page }) => {
    const form = await openForm(page);
    await fillRequired(page);
    await form.getByRole('radio', { name: 'Maybe' }).check();
    await expect(send(page)).toBeDisabled();

    await form.getByRole('combobox', { name: /Monthly price/ }).click();
    await page.getByRole('option', { name: 'Under ₱100' }).click();

    await expect(send(page)).toBeEnabled();
  });

  test('a short comment blocks sending', async ({ page }) => {
    await openForm(page);
    await fillRequired(page);
    await message(page).fill('too short');

    await expect(page.getByText('Please write at least 10 characters')).toBeVisible();
    await expect(send(page)).toBeDisabled();
  });

  test('a comment is cut off at 2000 characters', async ({ page }) => {
    await openForm(page);
    await message(page).fill('a'.repeat(2100));

    await expect(message(page)).toHaveValue('a'.repeat(2000));
  });

  test('no more than three features can be chosen', async ({ page }) => {
    const form = await openForm(page);
    for (const name of ['Auto-queueing', 'Leaderboards', 'MMR / skill rankings']) {
      await form.getByRole('checkbox', { name }).check();
    }

    await expect(form.getByRole('checkbox', { name: /Match requests/ })).toBeDisabled();
  });
});

test.describe('sending', () => {
  test('sends the answers once and thanks the user', async ({ page }) => {
    const requests = await mockSupabase(page, 201, 500);
    await openForm(page);
    await fillRequired(page);

    await send(page).click();
    await expect(page.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await expect(page.getByText('Thank you! Your feedback was sent.')).toBeVisible();
    expect(feedbackSent(requests)).toHaveLength(1);
    expect(feedbackSent(requests)[0]).toMatchObject({
      body: { role: 'player', region: 'visayas', would_pay: 'no', price_choice: null },
    });
  });

  for (const [label, status] of [
    ['the server fails', 500],
    ['the server rejects it', 400],
    ['the network drops', 0],
  ] as const) {
    test(`keeps what was typed when ${label}`, async ({ page }) => {
      await mockSupabase(page, status);
      await openForm(page);
      await fillRequired(page);
      await message(page).fill('Please add leaderboards soon');

      await send(page).click();

      await expect(page.getByText('Could not send feedback')).toBeVisible();
      await expect(message(page)).toHaveValue('Please add leaderboards soon');
      await expect(send(page)).toBeEnabled();
    });
  }

  test('sends nothing while offline, and keeps what was typed', async ({ page, context }) => {
    const requests = await mockSupabase(page);
    await openForm(page);
    await fillRequired(page);
    await message(page).fill('Written without a connection');
    await context.setOffline(true);

    await send(page).click();

    await expect(page.getByText("You're offline")).toBeVisible();
    await expect(message(page)).toHaveValue('Written without a connection');
    expect(feedbackSent(requests)).toHaveLength(0);
  });

  test('a filled hidden field is treated as a bot: nothing is sent', async ({ page }) => {
    const requests = await mockSupabase(page);
    const form = await openForm(page);
    await fillRequired(page);
    await page.locator('input[name="website"]').fill('http://spam.example', { force: true });

    await send(page).click();

    await expect(form).toBeHidden();
    expect(feedbackSent(requests)).toHaveLength(0);
  });
});

test.describe('anonymous usage counts', () => {
  const queued = (page: Page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem('qm_usage_queue') ?? '[]').map((e: { event: string }) => e.event));

  test('are kept while offline and sent when the connection returns', async ({ page, context }) => {
    const requests = await mockSupabase(page);
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    await expect.poll(() => queued(page)).toEqual([]);
    await context.setOffline(true);

    await playGame(page, ['Alice', 'Bob']);
    expect(await queued(page)).toEqual(['game_completed']);

    await context.setOffline(false);
    await expect.poll(() => queued(page)).toEqual([]);
    const sent = requests.filter((r) => r.table === 'usage_events').flatMap((r) => r.body);
    expect(sent.map((e) => e.event)).toContain('game_completed');
    expect(JSON.stringify(sent)).not.toContain('Alice');
  });

  test('are kept after a server error', async ({ page }) => {
    await mockSupabase(page, 500);
    await page.goto('/');
    await pastePlayers(page, 'Alice\nBob');
    await playGame(page, ['Alice', 'Bob']);

    await expect.poll(() => queued(page)).toContain('game_completed');
  });
});
