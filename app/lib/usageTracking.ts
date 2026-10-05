import { supabase } from './supabase';

// Anonymous usage tracking: counts only, never names or player data.
// Everything here is best-effort and must never throw into or block the app, including offline.

const DEVICE_ID_KEY = 'qm_device_id';
const QUEUE_KEY = 'qm_usage_queue';
const LAST_OPEN_KEY = 'qm_last_open_day';
const MAX_QUEUED = 50;
const APP_VERSION = '1';
// The usage_events table rejects events older than 30 days; stay a day inside that limit
const MAX_EVENT_AGE_MS = 29 * 24 * 60 * 60 * 1000;

type UsageEvent = {
  device_id: string;
  event: 'app_open' | 'game_completed';
  occurred_at: string;
  players_total?: number;
  courts_total?: number;
  queues_total?: number;
  app_version: string;
};

// Queue entries carry a local-only id so sent events can be removed by identity.
// The id is never sent to the server.
type QueuedEvent = UsageEvent & { qid: string };

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false; // storage unavailable or full
  }
};

const getDeviceId = (): string | null => {
  const existing = safeGet(DEVICE_ID_KEY);
  if (existing) return existing;
  if (typeof crypto === 'undefined' || !crypto.randomUUID) return null;
  const id = crypto.randomUUID();
  safeSet(DEVICE_ID_KEY, id);
  return id;
};

const isFresh = (e: QueuedEvent): boolean => {
  const t = Date.parse(e.occurred_at);
  return !isNaN(t) && Date.now() - t <= MAX_EVENT_AGE_MS;
};

// Reads the queue, dropping malformed entries and events too old for the server to accept
const readQueue = (): QueuedEvent[] => {
  try {
    const raw = safeGet(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.qid === 'string' && isFresh(e));
  } catch {
    return [];
  }
};

const writeQueue = (events: QueuedEvent[]): boolean =>
  // Cap the queue so offline use can never grow storage without bound; drop the oldest
  safeSet(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUED)));

let flushing = false;

const flushQueue = async (): Promise<void> => {
  if (!supabase || flushing) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const pending = readQueue();
  if (pending.length === 0) return;

  flushing = true;
  try {
    const payload: UsageEvent[] = pending.map(({ qid: _qid, ...event }) => event);
    const { error, status } = await supabase.from('usage_events').insert(payload);
    // Success, or a 4xx rejection: either way retrying the same batch won't help, so drop it.
    // Network failures (status 0) and 5xx errors keep the events queued for the next attempt.
    if (!error || (status >= 400 && status < 500)) {
      const sent = new Set(pending.map((e) => e.qid));
      // Remove exactly the events that were sent, keeping anything queued meanwhile
      writeQueue(readQueue().filter((e) => !sent.has(e.qid)));
    }
  } catch {
    // offline or blocked: events stay queued for next time
  } finally {
    flushing = false;
  }
};

// Returns false if the event could not be stored
const enqueue = (event: UsageEvent): boolean => {
  const saved = writeQueue([...readQueue(), { ...event, qid: crypto.randomUUID() }]);
  if (saved) void flushQueue();
  return saved;
};

const today = (): string => new Date().toISOString().slice(0, 10);

/** Call once on app load: records at most one app_open per device per day. */
export const trackAppOpen = (): void => {
  try {
    const deviceId = getDeviceId();
    if (!deviceId) return;

    if (safeGet(LAST_OPEN_KEY) !== today()) {
      const saved = enqueue({
        device_id: deviceId,
        event: 'app_open',
        occurred_at: new Date().toISOString(),
        app_version: APP_VERSION,
      });
      // Only mark today as done once the event is safely stored; otherwise retry next load
      if (saved) safeSet(LAST_OPEN_KEY, today());
    } else {
      void flushQueue(); // send anything left over from an earlier offline session
    }
  } catch {
    // never let tracking affect the app
  }
};

/** Call when a game ends. Only counts are sent. */
export const trackGameCompleted = (counts: {
  players: number;
  courts: number;
  queues: number;
}): void => {
  try {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    enqueue({
      device_id: deviceId,
      event: 'game_completed',
      occurred_at: new Date().toISOString(),
      players_total: Math.min(Math.max(counts.players, 0), 500),
      courts_total: Math.min(Math.max(counts.courts, 0), 100),
      queues_total: Math.min(Math.max(counts.queues, 0), 100),
      app_version: APP_VERSION,
    });
  } catch {
    // never let tracking affect the app
  }
};

/** Send queued events when the connection returns. Returns a cleanup function. */
export const startUsageSync = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const onOnline = () => void flushQueue();
  window.addEventListener('online', onOnline);
  return () => window.removeEventListener('online', onOnline);
};
