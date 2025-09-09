// Add this helper function to detect partnerships when players are assigned to courts
// This can be added to a new file: utils/courtAssignmentUtils.ts

import { Player } from "../../components/types/Player";
import {
  checkExcessivePartnership,
  checkGroupForExcessivePartnerships,
} from "./matchHistoryUtils";

// 🆕 NEW: Check for excessive partnerships when assigning players to courts
export const validateCourtAssignment = (
  courtPlayers: Player[]
): {
  hasExcessivePartnerships: boolean;
  partnerships: { player1: Player; player2: Player; count: number }[];
  warnings: string[];
} => {
  const warnings: string[] = [];
  const partnerships: { player1: Player; player2: Player; count: number }[] =
    [];

  // Check all possible partnerships in the court
  for (let i = 0; i < courtPlayers.length; i++) {
    for (let j = i + 1; j < courtPlayers.length; j++) {
      const player1 = courtPlayers[i];
      const player2 = courtPlayers[j];

      // Get partnership count (check both directions)
      const count1 = (player1.matchHistory || []).filter(
        (match) => match.partner?.id === player2.id
      ).length;
      const count2 = (player2.matchHistory || []).filter(
        (match) => match.partner?.id === player1.id
      ).length;
      const maxCount = Math.max(count1, count2);

      if (maxCount >= 2) {
        partnerships.push({ player1, player2, count: maxCount });
        warnings.push(
          `${player1.name} & ${player2.name} have played together ${maxCount} times`
        );
      }
    }
  }

  return {
    hasExcessivePartnerships: partnerships.length > 0,
    partnerships,
    warnings,
  };
};

// 🆕 NEW: Analyze potential partnerships for badminton team formation
export const analyzeTeamPartnerships = (
  courtPlayers: Player[]
): {
  teamAPartnerships: { player1: Player; player2: Player; count: number }[];
  teamBPartnerships: { player1: Player; player2: Player; count: number }[];
  warnings: string[];
} => {
  const warnings: string[] = [];
  const teamAPartnerships: {
    player1: Player;
    player2: Player;
    count: number;
  }[] = [];
  const teamBPartnerships: {
    player1: Player;
    player2: Player;
    count: number;
  }[] = [];

  if (courtPlayers.length === 4) {
    // Badminton 2v2 formation: positions 0,2 vs 1,3
    const teamA = [courtPlayers[0], courtPlayers[2]]; // Team A partners
    const teamB = [courtPlayers[1], courtPlayers[3]]; // Team B partners

    // Check Team A partnership (positions 0 & 2)
    if (teamA.length === 2) {
      const [p1, p2] = teamA;
      const count1 = (p1.matchHistory || []).filter(
        (match) => match.partner?.id === p2.id
      ).length;
      const count2 = (p2.matchHistory || []).filter(
        (match) => match.partner?.id === p1.id
      ).length;
      const maxCount = Math.max(count1, count2);

      if (maxCount >= 2) {
        teamAPartnerships.push({ player1: p1, player2: p2, count: maxCount });
        warnings.push(
          `Team A: ${p1.name} & ${p2.name} have partnered ${maxCount} times`
        );
      }
    }

    // Check Team B partnership (positions 1 & 3)
    if (teamB.length === 2) {
      const [p1, p2] = teamB;
      const count1 = (p1.matchHistory || []).filter(
        (match) => match.partner?.id === p2.id
      ).length;
      const count2 = (p2.matchHistory || []).filter(
        (match) => match.partner?.id === p1.id
      ).length;
      const maxCount = Math.max(count1, count2);

      if (maxCount >= 2) {
        teamBPartnerships.push({ player1: p1, player2: p2, count: maxCount });
        warnings.push(
          `Team B: ${p1.name} & ${p2.name} have partnered ${maxCount} times`
        );
      }
    }
  }

  return {
    teamAPartnerships,
    teamBPartnerships,
    warnings,
  };
};

// 🆕 NEW: Get partnership suggestions to avoid excessive partnerships
export const getPartnershipSuggestions = (
  allPlayers: Player[],
  playersToAssign: Player[]
): {
  recommendations: string[];
  playersToAvoid: { player: Player; conflicts: Player[] }[];
} => {
  const recommendations: string[] = [];
  const playersToAvoid: { player: Player; conflicts: Player[] }[] = [];

  playersToAssign.forEach((player) => {
    const conflicts: Player[] = [];

    allPlayers.forEach((otherPlayer) => {
      if (player.id !== otherPlayer.id) {
        const hasExcessive =
          checkExcessivePartnership(player, otherPlayer) ||
          checkExcessivePartnership(otherPlayer, player);
        if (hasExcessive) {
          conflicts.push(otherPlayer);
        }
      }
    });

    if (conflicts.length > 0) {
      playersToAvoid.push({ player, conflicts });
      recommendations.push(
        `Avoid pairing ${player.name} with: ${conflicts
          .map((c) => c.name)
          .join(", ")}`
      );
    }
  });

  return {
    recommendations,
    playersToAvoid,
  };
};
