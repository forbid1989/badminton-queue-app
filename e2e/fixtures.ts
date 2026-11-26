import { test as base, expect, type Locator, type Page } from '@playwright/test';

// Known bug, tracked in known-bugs.spec.ts. Matches the dev and production messages.
export const HYDRATION_ERROR = /Hydration failed|Minified React error #418/;

type Options = {
  /** Set to false in tests that are about the announcement, tutorial or quick tip. */
  hidePopups: boolean;
};

export const test = base.extend<Options>({
  hidePopups: [true, { option: true }],

  page: async ({ page, hidePopups }, use) => {
    await mockSupabase(page);
    await page.route(/googlesyndication|doubleclick/, (route) => route.abort());
    // These popups open on timers and would cover the UI partway through a test
    if (hidePopups) {
      await page.addInitScript(() => {
        try {
          localStorage.setItem('announcement2026Seen', 'true');
          localStorage.setItem('dragTutorialSeen', 'true');
          localStorage.setItem('dragHintsSeen', 'true');
        } catch {
          // some tests block or fill storage on purpose
        }
      });
    }

    // The Next.js dev badge covers part of the mobile footer. It only exists under `next dev`.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = 'nextjs-portal { display: none !important; }';
        document.head.appendChild(style);
      });
    });

    // Any uncaught page error fails the test, except the known hydration bug
    const errors: Error[] = [];
    page.on('pageerror', (error) => {
      if (!HYDRATION_ERROR.test(error.message)) errors.push(error);
    });
    await use(page);
    expect(errors, 'uncaught errors on the page').toEqual([]);
  },
});

export type SupabaseRequest = { table: string; body: any };

/**
 * Answers every request to the fake backend with `status`. Call again to change the answer.
 * Returns the writes received. A status of 0 simulates a network failure.
 */
export async function mockSupabase(page: Page, status = 201, delayMs = 0) {
  const requests: SupabaseRequest[] = [];
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  };
  await page.route('http://supabase.test/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    requests.push({
      table: new URL(request.url()).pathname.split('/').pop()!,
      body: request.postDataJSON(),
    });
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (status === 0) return route.abort();
    await route.fulfill({
      status,
      headers: cors,
      contentType: 'application/json',
      body: status >= 400 ? JSON.stringify({ message: 'test failure' }) : '',
    });
  });
  return requests;
}

/** A player card in a zone: "all" (player list), "court-0", "queue-0", ... */
export const card = (page: Page, zone: string, name: string): Locator =>
  page
    .locator(`[data-player-id][data-zone="${zone}"]`)
    .filter({ has: page.getByText(name, { exact: true }) });

/** One of the four positions (0-3) on a court or in a queue. */
export const slot = (page: Page, zone: string, position: number): Locator =>
  page.locator(`[data-droppable-zone="${zone}"][data-position="${position}"]`);

/** The whole court or queue box, including its header buttons. */
export const zoneBox = (page: Page, zone: string): Locator =>
  page.locator(`[data-droppable-zone="${zone}"]:not([data-position])`);

export const gamesPlayed = (playerCard: Locator): Locator =>
  playerCard.getByTitle('Click to view match history');

const openAddPlayers = async (page: Page): Promise<Locator> => {
  // The desktop header or mobile footer icon. An empty player list has a second
  // "Add Players" button, so the accessible name alone is ambiguous.
  const opener = page.locator(
    'button[title="Add Players"], #mobile-footer button[aria-label="Add Players"]',
  );
  // Clicks made before React hydrates are lost, so retry until the form opens
  const form = page.getByRole('presentation').filter({ hasText: 'Quick Add Single Player' });
  await expect(async () => {
    await opener.click({ timeout: 1000 });
    await expect(form).toBeVisible({ timeout: 1000 });
  }).toPass();
  return form;
};

export async function addPlayer(page: Page, name: string) {
  const form = await openAddPlayers(page);
  await form.getByLabel('Player Name', { exact: true }).fill(name);
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(form).toBeHidden();
}

/** Uses the paste box, so `text` can hold one name per line. */
export async function pastePlayers(page: Page, text: string) {
  const form = await openAddPlayers(page);
  await form.getByLabel('Paste Player Names List Here').fill(text);
  await form.getByRole('button', { name: 'Add Players' }).click();
  await expect(form).toBeHidden();
}

/** Saves are debounced, so wait for storage to reflect a change before reloading. */
export async function waitForSaved(page: Page, name: string, status: string) {
  await expect
    .poll(() =>
      page.evaluate((playerName) => {
        const saved = JSON.parse(localStorage.getItem('badminton-queue-state') ?? '{}');
        return saved.players?.find((p: { name: string }) => p.name === playerName)?.status;
      }, name),
    )
    .toContain(status);
}

export { expect };
