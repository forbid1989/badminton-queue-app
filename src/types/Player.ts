export type PlayerStatus = `queue-${number}` | `court-${number}`;

// Note: Removed "rest", "queue", and "court" general types
// Only queue-* and court-* variants are retained to enforce specificity

export interface MatchHistoryEntry {
  opponents: string[]; // opponent player names or IDs
  timestamp: number; // time the game ended
}

export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;

  /**
   * status:
   * - [] → unqueued (Condition #1)
   * - ['queue-1'] → queued (Condition #2)
   * - ['queue-2'] → queue transfer (Condition #3)
   * - ['court-1'] → in court (Condition #4)
   * - ['court-1', 'queue-2'] → queued while still playing (Condition #6)
   *
   * - Disallowed:
   *   - ['court-1', 'court-2'] ❌
   *   - ['queue-1', 'queue-2'] ❌
   */
  status: PlayerStatus[]; // ✅ Now allows 0–2 items depending on valid state
  timeEntered: number;
  waitingSince?: number;
  matchHistory?: MatchHistoryEntry[];
  courtEnteredTime?: number; // ✨ NEW: Track when player entered current court for cooldown

  // ✨ NEW: Explicit ordering fields
  /**
   * Position within a court (0-3). null if not on any court.
   * Used to maintain consistent player positioning in court displays.
   */
  courtOrder: number | null;

  /**
   * Position within a queue (0-3). null if not in any queue.
   * Used to maintain consistent player positioning in queue displays.
   */
  queueOrder: number | null;
}
