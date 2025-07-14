import { Player } from "../types/Player";
import { v4 as uuidv4 } from "uuid";

export function parsePlayerList(text: string): Player[] {
  const lines = text
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*\d+\.\s*/, "") // Remove leading numbers like "1. "
        .trim()
    )
    .filter((line) => line !== "");

  const players: Player[] = [];

  for (const line of lines) {
    const match = line.match(/^(.*?)\s*(?:\+(\d+)|\((\d+)\))?$/);
    if (match) {
      const baseName = match[1].trim();
      const count = parseInt(match[2] || match[3] || "1", 10);

      for (let i = 0; i < count; i++) {
        players.push({
          id: uuidv4(),
          name: count > 1 ? `${baseName} ${i + 1}` : baseName,
          gamesPlayed: 0,
          status: "rest",
          timeEntered: Date.now(),
          waitingSince: undefined,
        });
      }
    }
  }
  return players;
}
