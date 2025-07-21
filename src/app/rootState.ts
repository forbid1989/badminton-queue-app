import { Player } from "../types/Player";

// ✅ Only valid formats are allowed; no "rest", "queue", or "court" alone
export type PlayerStatus = `queue-${number}` | `court-${number}`;

// ✅ Root state structure
export type RootState = {
  // 🏸 Court state
  courts: {
    count: number;
    playersByCourt: Record<string, Player[]>;
  };

  // ⏳ Players in queue
  queue: {
    count: number;
    playersByQueue: Record<string, Player[]>;
  };

  // ✅ Flat registry of all players (source of truth)
  players: Player[];

  // 📝 Raw textarea input
  playerTextInput: string;

  // ⏱ Toggle timers
  showTimers: boolean;

  // ⚙️ App settings
  settings: {
    priorityMode: string; // "FIFO" | "LongestWaiting"
    colorCodedTimers: boolean;
  };
};
