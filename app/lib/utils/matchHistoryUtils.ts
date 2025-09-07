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

// Utility to determine match type and organize players
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
        teams: [
          [players[0], players[2]],
          [players[1], players[3]],
        ],
      };
    default:
      return { matchType: "1v1", teams: [] };
  }
};

// Generate match history entries for all players
export const generateMatchHistoryEntries = (
  players: Player[],
  courtName: string,
  startTime: number,
  endTime: number
): MatchHistoryEntry[] => {
  const { matchType, teams } = analyzeMatch(players);
  const duration = Math.floor((endTime - startTime) / 1000);
  const matchId = `match_${startTime}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  return players.map((player, index) => {
    let partner: string | undefined;
    let opponents: string[] = [];

    // Determine partner and opponents based on match type and player position
    switch (matchType) {
      case "1v1":
        opponents = players
          .filter((p) => p.id !== player.id)
          .map((p) => p.name);
        break;

      case "2v1":
        if (index < 2) {
          // Player is in the team of 2
          partner = players.find((p, i) => i < 2 && p.id !== player.id)?.name;
          opponents = players.slice(2).map((p) => p.name);
        } else {
          // Player is the solo player
          opponents = players.slice(0, 2).map((p) => p.name);
        }
        break;

      case "2v2":
        // FIXED: Updated logic for P1&P3 vs P2&P4 formation
        if (index === 0 || index === 2) {
          // Player is in team 1 (P1 or P3)
          partner = index === 0 ? players[2]?.name : players[0]?.name; // P1 partners with P3
          opponents = [players[1]?.name, players[3]?.name].filter(Boolean); // vs P2&P4
        } else {
          // Player is in team 2 (P2 or P4)
          partner = index === 1 ? players[3]?.name : players[1]?.name; // P2 partners with P4
          opponents = [players[0]?.name, players[2]?.name].filter(Boolean); // vs P1&P3
        }
        break;
    }

    return {
      matchId,
      partner,
      opponents,
      startTime,
      endTime,
      duration,
      matchType,
      courtName,
    };
  });
};

// Helper function to check if a date is today
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};
