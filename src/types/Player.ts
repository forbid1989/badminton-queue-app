export type PlayerStatus = "court" | "queue" | "rest";

export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;
  status: PlayerStatus;
  timeEntered: number;
  waitingSince?: number;
}
