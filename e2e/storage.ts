import type { Page } from '@playwright/test';

export const STATE_KEY = 'badminton-queue-state';
export const VERSION_KEY = 'badminton-queue-version';

/** A saved player, in the shape the app writes to localStorage. */
export const savedPlayer = (name: string, overrides: Record<string, unknown> = {}) => ({
  id: `id-${name}`,
  name,
  gamesPlayed: 0,
  status: [] as string[],
  timeEntered: Date.now(),
  courtOrder: null,
  queueOrder: null,
  skillLevel: 'C',
  ...overrides,
});

export const savedState = (players: unknown[], overrides: Record<string, unknown> = {}) => ({
  players,
  courts: { count: 2 },
  queue: { count: 1, playersByQueue: { 'queue-0': [] } },
  settings: {},
  version: '1.1',
  ...overrides,
});

/** Writes raw storage before the app first loads, once, so that reloads are not reset. */
export async function seedStorage(page: Page, entries: Record<string, string>) {
  await page.addInitScript((items) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', 'true');
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
  }, entries);
}

export const seedState = (page: Page, state: unknown, version = '1.1') =>
  seedStorage(page, { [STATE_KEY]: JSON.stringify(state), [VERSION_KEY]: version });

export const readState = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), STATE_KEY);
