export type PlayerStatus =
  | "rest"
  | "queue"
  | "court"
  | `queue-${number}`
  | `court-${number}`;

export interface MatchHistoryEntry {
  opponents: string[]; // opponent player names or IDs
  timestamp: number; // time the game ended
}

export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;
  status: [PlayerStatus, ...PlayerStatus[]];
  timeEntered: number;
  waitingSince?: number;
  matchHistory?: MatchHistoryEntry[];
}
