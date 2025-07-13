import { Player } from "../types/Player";

export type PlayerStatus = string;

export type RootState = {
  // 🏸 Court state
  courts: {
    count: number;
    playersByCourt: Record<string, Player[]>; // NEW
  };

  // ⏳ Players in queue
  queue: {
    count: number;
    playersByQueue: Record<string, Player[]>;
  };

  // 😌 Unqueued/resting players
  unqueued: {
    players: Player[];
  };

  // 📝 Raw textarea input
  playerTextInput: string;

  // ⏱ Toggle
  showTimers: boolean;

  // ⚙️ Settings
  settings: {
    priorityMode: string;
    colorCodedTimers: boolean;
  };
};
