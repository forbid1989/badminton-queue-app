import { MatchHistoryEntry, Player } from "../../components/types/Player";

// ✅ Only valid formats are allowed; no "rest", "queue", or "court" alone
export type PlayerStatus = `queue-${number}` | `court-${number}`;

// 🆕 Payment settings interface
export interface PaymentSettings {
  feeStructure: "flat" | "per_game"; // Flat fee or per-game calculation
  flatFee: number; // Flat fee per player
  courtFee: number; // Court fee (used in per-game structure)
  perGameFee: number; // Fee per game played
  guestFee: number; // Additional fee for guests
  currency: string; // Currency symbol/code
}

export interface PlayerListSortConfig {
  secondarySort: "timeEntered" | "gamesPlayed" | "skillLevel";
  secondaryDirection: "asc" | "desc";
  tertiarySort: "timeEntered" | "gamesPlayed" | "skillLevel";
  tertiaryDirection: "asc" | "desc";
}

export interface UndoGameData {
  courtId: string;
  endedAt: number; // Timestamp when the game was ended
  playersData: {
    id: string;
    name: string;
    previousGamesPlayed: number;
    previousStatus: PlayerStatus[];
    previousTimeEntered: number;
    courtOrder: number | null;
    courtEnteredTime?: number;
    addedMatchHistoryEntry: MatchHistoryEntry;
  }[];
}

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

  undoableGames: Record<string, UndoGameData>; // courtId -> undo data

  // ⚙️ App settings
  settings: {
    priorityMode: string; // "FIFO" | "LongestWaiting"
    colorCodedTimers: boolean;
    playerCooldowns: boolean; // ✨ NEW: Enable/disable player cooldowns
    paymentSettings?: PaymentSettings; // 🆕 Payment settings
    playerListSort?: PlayerListSortConfig;
  };
};
