// Types for player list sorting configuration
export type SortableField = "timeEntered" | "gamesPlayed" | "skillLevel";

export interface PlayerListSortConfig {
  secondarySort: SortableField;
  secondaryDirection: "asc" | "desc";
  tertiarySort: SortableField;
  tertiaryDirection: "asc" | "desc";
}

// Update the existing settings interface
export interface Settings {
  priorityMode: "FIFO" | "LongestWaiting";
  colorCodedTimers: boolean;
  playerCooldowns: boolean;
  playerListSort: PlayerListSortConfig; // Add this new field
  paymentSettings: {
    feeStructure: "flat" | "per_game";
    flatFee: number;
    courtFee: number;
    perGameFee: number;
    guestFee: number;
    currency: string;
  };
}
