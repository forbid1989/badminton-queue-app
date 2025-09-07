// src/utils/matchHistoryUtils.ts

import { Player, MatchHistoryEntry } from "../../components/types/Player";

// Utility to format match duration
export const formatMatchDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

// Utility to get match description for display
export const getMatchDescription = (
  entry: MatchHistoryEntry,
  playerName: string
): string => {
  const { partner, opponents, matchType } = entry;

  switch (matchType) {
    case "1v1":
      return `vs ${opponents[0]}`;
    case "2v1":
      if (partner) {
        return `${partner} & ${playerName} vs ${opponents[0]}`;
      } else {
        return `${playerName} vs ${opponents.join(" & ")}`;
      }
    case "2v2":
      return `${partner} & ${playerName} vs ${opponents.join(" & ")}`;
    default:
      return `with ${opponents.join(", ")}`;
  }
};

// FIXED: Correct team formation for badminton
export const analyzeMatch = (
  players: Player[]
): {
  matchType: "1v1" | "2v1" | "2v2";
  teams: Player[][];
} => {
  const playerCount = players.length;

  switch (playerCount) {
    case 2:
      return {
        matchType: "1v1",
        teams: [players.slice(0, 1), players.slice(1, 2)],
      };
    case 3:
      return {
        matchType: "2v1",
        teams: [players.slice(0, 2), players.slice(2, 3)],
      };
    case 4:
      return {
        matchType: "2v2",
        // CORRECT: P1&P3 vs P2&P4 (diagonal partners)
        teams: [
          [players[0], players[2]], // Team A: positions 0,2
          [players[1], players[3]], // Team B: positions 1,3
        ],
      };
    default:
      return { matchType: "1v1", teams: [] };
  }
};

// FIXED: Generate match history entries with ID-based lookup instead of index mapping
export const generateMatchHistoryEntries = (
  players: Player[],
  courtName: string,
  startTime: number,
  endTime: number
): MatchHistoryEntry[] => {
  // Sort players by courtOrder to ensure consistent positioning
  const sortedPlayers = [...players].sort((a, b) => {
    const orderA = a.courtOrder ?? 999;
    const orderB = b.courtOrder ?? 999;
    return orderA - orderB;
  });

  console.log(
    `🔍 MATCH HISTORY: Sorted players by courtOrder:`,
    sortedPlayers.map((p) => `${p.name} (order: ${p.courtOrder})`)
  );

  const { matchType } = analyzeMatch(sortedPlayers);
  const duration = Math.floor((endTime - startTime) / 1000);
  const matchId = `match_${startTime}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Create a map of playerID -> match entry instead of relying on array indices
  const entriesMap = new Map<string, MatchHistoryEntry>();

  sortedPlayers.forEach((player, index) => {
    let partner: string | undefined;
    let opponents: string[] = [];

    switch (matchType) {
      case "1v1":
        opponents = sortedPlayers
          .filter((p) => p.id !== player.id)
          .map((p) => p.name);
        break;

      case "2v1":
        if (index < 2) {
          partner = sortedPlayers.find(
            (p, i) => i < 2 && p.id !== player.id
          )?.name;
          opponents = sortedPlayers.slice(2).map((p) => p.name);
        } else {
          opponents = sortedPlayers.slice(0, 2).map((p) => p.name);
        }
        break;

      case "2v2":
        if (index === 0 || index === 2) {
          // Team A: positions 0,2 partner together
          partner =
            index === 0 ? sortedPlayers[2]?.name : sortedPlayers[0]?.name;
          opponents = [sortedPlayers[1]?.name, sortedPlayers[3]?.name].filter(
            Boolean
          );

          console.log(
            `🏸 TEAM A: ${
              player.name
            } (pos ${index}) partners with ${partner}, vs [${opponents.join(
              ", "
            )}]`
          );
        } else {
          // Team B: positions 1,3 partner together
          partner =
            index === 1 ? sortedPlayers[3]?.name : sortedPlayers[1]?.name;
          opponents = [sortedPlayers[0]?.name, sortedPlayers[2]?.name].filter(
            Boolean
          );

          console.log(
            `🏸 TEAM B: ${
              player.name
            } (pos ${index}) partners with ${partner}, vs [${opponents.join(
              ", "
            )}]`
          );
        }
        break;
    }

    const entry: MatchHistoryEntry = {
      matchId,
      partner,
      opponents,
      startTime,
      endTime,
      duration,
      matchType,
      courtName,
    };

    entriesMap.set(player.id, entry);
  });

  // Return entries in original player order for backward compatibility
  return players.map((player) => entriesMap.get(player.id)!).filter(Boolean);
};

// Helper function to check if a date is today
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};
