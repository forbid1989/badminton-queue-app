// Rules and storage for the temporary "share your feedback" prompt.
// Kept separate from the app's saved game state, and every storage access is best-effort.

// Kill switch: set to false to turn off the prompt, the header button and the footer entries
export const FEEDBACK_CAMPAIGN_ACTIVE = true;

export const MIN_GAMES_BEFORE_PROMPT = 2;
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_DISMISSALS = 3;

const STORAGE_KEY = 'qm_fb_prompt';

export type FeedbackPromptState = {
  submitted: boolean;
  dismissals: number;
  snoozedUntil: number; // epoch ms, 0 when not snoozed
};

export const DEFAULT_PROMPT_STATE: FeedbackPromptState = {
  submitted: false,
  dismissals: 0,
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
    now >= state.snoozedUntil &&
    gamesEndedThisSession >= MIN_GAMES_BEFORE_PROMPT &&
    !shownThisSession
  );
}

export function readPromptState(): FeedbackPromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROMPT_STATE };
    const parsed = JSON.parse(raw);
    return {
      submitted: parsed?.submitted === true,
      dismissals: Number.isFinite(parsed?.dismissals) ? parsed.dismissals : 0,
      snoozedUntil: Number.isFinite(parsed?.snoozedUntil) ? parsed.snoozedUntil : 0,
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

/** The user dismissed the prompt or it timed out: snooze it and count it. */
export function recordPromptDismissed(now: number = Date.now()): void {
  const state = readPromptState();
  writePromptState({
    ...state,
    dismissals: state.dismissals + 1,
    snoozedUntil: now + SNOOZE_MS,
  });
}

/** Feedback was sent: never prompt again. */
export function recordFeedbackSubmitted(): void {
  writePromptState({ ...readPromptState(), submitted: true });
}
