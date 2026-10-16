// Rules and storage for the temporary "share your feedback" prompt.
// Kept separate from the app's saved game state, and every storage access is best-effort.

// Kill switch: set to false to turn off the prompt, the header button and the footer entries
export const FEEDBACK_CAMPAIGN_ACTIVE = true;

export const MIN_GAMES_BEFORE_PROMPT = 2;
// Explicitly pressing "Later" is a clear signal: snooze for a week and count it
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_DISMISSALS = 3;
// The card timing out is a weak signal (the organizer may simply be busy): snooze briefly and
// count it separately, with a higher cap, so it can't permanently opt anyone out too quickly
export const TIMEOUT_SNOOZE_MS = 2 * 24 * 60 * 60 * 1000;
export const MAX_TIMEOUTS = 5;

const STORAGE_KEY = 'qm_fb_prompt';

export type FeedbackPromptState = {
  submitted: boolean;
  dismissals: number; // explicit "Later" presses
  timeouts: number; // card hid itself without any interaction
  snoozedUntil: number; // epoch ms, 0 when not snoozed
};

export const DEFAULT_PROMPT_STATE: FeedbackPromptState = {
  submitted: false,
  dismissals: 0,
  timeouts: 0,
  snoozedUntil: 0,
};

export function shouldShowFeedbackPrompt(input: {
  campaignActive: boolean;
  state: FeedbackPromptState;
  gamesEndedThisSession: number;
  shownThisSession: boolean;
  now: number;
}): boolean {
  const { campaignActive, state, gamesEndedThisSession, shownThisSession, now } = input;
  return (
    campaignActive &&
    !state.submitted &&
    state.dismissals < MAX_DISMISSALS &&
    state.timeouts < MAX_TIMEOUTS &&
    now >= state.snoozedUntil &&
    gamesEndedThisSession >= MIN_GAMES_BEFORE_PROMPT &&
    !shownThisSession
  );
}

// Corrupted or hand-edited storage must never let the prompt exceed its limits
const cleanCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function readPromptState(): FeedbackPromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROMPT_STATE };
    const parsed = JSON.parse(raw);
    return {
      submitted: parsed?.submitted === true,
      dismissals: cleanCount(parsed?.dismissals),
      timeouts: cleanCount(parsed?.timeouts),
      snoozedUntil: cleanCount(parsed?.snoozedUntil),
    };
  } catch {
    return { ...DEFAULT_PROMPT_STATE };
  }
}

function writePromptState(state: FeedbackPromptState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: the prompt may reappear next visit, which is harmless
  }
}

/** The user pressed "Later": snooze for a week and count it. */
export function recordPromptDismissed(now: number = Date.now()): void {
  const state = readPromptState();
  writePromptState({
    ...state,
    dismissals: state.dismissals + 1,
    snoozedUntil: now + SNOOZE_MS,
  });
}

/** The card hid itself with no interaction: snooze briefly, counted separately. */
export function recordPromptTimedOut(now: number = Date.now()): void {
  const state = readPromptState();
  writePromptState({
    ...state,
    timeouts: state.timeouts + 1,
    snoozedUntil: now + TIMEOUT_SNOOZE_MS,
  });
}

/** The user opened the form from the card (even if they don't submit): snooze, no penalty. */
export function recordPromptOpened(now: number = Date.now()): void {
  writePromptState({ ...readPromptState(), snoozedUntil: now + SNOOZE_MS });
}

/** Feedback was sent: never prompt again. */
export function recordFeedbackSubmitted(): void {
  writePromptState({ ...readPromptState(), submitted: true });
}
