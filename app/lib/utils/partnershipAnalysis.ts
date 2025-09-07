import { Player, MatchHistoryEntry } from "../../components/types/Player";

export interface PartnershipFrequency {
  playerId: string;
  playerName: string;
  partnershipCount: number;
  opponentCount: number;
  recentMatches: MatchHistoryEntry[];
}

export interface PartnershipAnalysis {
  hasExcessivePartnerships: boolean;
  hasExcessiveOpponents: boolean;
  partnerships: PartnershipFrequency[];
  opponents: PartnershipFrequency[];
  warnings: string[];
}

/**
 * Analyze partnership and opponent frequency between two players
 */
export const analyzePlayerRelationship = (
  player1: Player,
  player2: Player,
  maxPartnershipCount: number = 2,
  maxOpponentCount: number = 2
): PartnershipAnalysis => {
  const player1Partnerships = new Map<string, PartnershipFrequency>();
  const player1Opponents = new Map<string, PartnershipFrequency>();

  // Analyze player1's match history
  if (player1.matchHistory) {
    player1.matchHistory.forEach((match) => {
      // Check if player2 was a partner
      if (match.partner === player2.name) {
        const existing = player1Partnerships.get(player2.id) || {
          playerId: player2.id,
          playerName: player2.name,
          partnershipCount: 0,
          opponentCount: 0,
          recentMatches: [],
        };
        existing.partnershipCount++;
        existing.recentMatches.push(match);
        player1Partnerships.set(player2.id, existing);
      }

      // Check if player2 was an opponent
      if (match.opponents.includes(player2.name)) {
        const existing = player1Opponents.get(player2.id) || {
          playerId: player2.id,
          playerName: player2.name,
          partnershipCount: 0,
          opponentCount: 0,
          recentMatches: [],
        };
        existing.opponentCount++;
        existing.recentMatches.push(match);
        player1Opponents.set(player2.id, existing);
      }
    });
  }

  const partnerships = Array.from(player1Partnerships.values());
  const opponents = Array.from(player1Opponents.values());

  const hasExcessivePartnerships = partnerships.some(
    (p) => p.partnershipCount > maxPartnershipCount
  );
  const hasExcessiveOpponents = opponents.some(
    (o) => o.opponentCount > maxOpponentCount
  );

  const warnings: string[] = [];

  partnerships.forEach((partnership) => {
    if (partnership.partnershipCount > maxPartnershipCount) {
      warnings.push(
        `${player1.name} and ${partnership.playerName} have been partners ${partnership.partnershipCount} times (limit: ${maxPartnershipCount})`
      );
    }
  });

  opponents.forEach((opponent) => {
    if (opponent.opponentCount > maxOpponentCount) {
      warnings.push(
        `${player1.name} and ${opponent.playerName} have been opponents ${opponent.opponentCount} times (limit: ${maxOpponentCount})`
      );
    }
  });

  return {
    hasExcessivePartnerships,
    hasExcessiveOpponents,
    partnerships,
    opponents,
    warnings,
  };
};

/**
 * Analyze potential partnerships in a court/queue configuration
 */
export const analyzeCourtConfiguration = (
  players: Player[],
  maxPartnershipCount: number = 2,
  maxOpponentCount: number = 2
): {
  hasWarnings: boolean;
  warnings: string[];
  partnershipWarnings: PartnershipAnalysis[];
} => {
  const warnings: string[] = [];
  const partnershipWarnings: PartnershipAnalysis[] = [];

  if (players.length < 2) {
    return { hasWarnings: false, warnings: [], partnershipWarnings: [] };
  }

  // Determine team formations based on player count
  let teams: Player[][] = [];

  if (players.length === 2) {
    // 1v1 - they are opponents
    teams = [[players[0]], [players[1]]];
  } else if (players.length === 3) {
    // 2v1 - first two are partners, third is solo
    teams = [[players[0], players[1]], [players[2]]];
  } else if (players.length === 4) {
    // 2v2 - P1&P3 vs P2&P4 (based on your court position logic)
    teams = [
      [players[0], players[2]],
      [players[1], players[3]],
    ];
  }

  // Check partnerships within teams
  teams.forEach((team, teamIndex) => {
    if (team.length === 2) {
      const [player1, player2] = team;
      const analysis = analyzePlayerRelationship(
        player1,
        player2,
        maxPartnershipCount,
        maxOpponentCount
      );

      if (analysis.hasExcessivePartnerships) {
        partnershipWarnings.push(analysis);
        warnings.push(...analysis.warnings);
      }
    }
  });

  // Check opponents between teams
  if (teams.length === 2) {
    teams[0].forEach((player1) => {
      teams[1].forEach((player2) => {
        const analysis = analyzePlayerRelationship(
          player1,
          player2,
          maxPartnershipCount,
          maxOpponentCount
        );

        if (analysis.hasExcessiveOpponents) {
          partnershipWarnings.push(analysis);
          warnings.push(...analysis.warnings);
        }
      });
    });
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings: [...new Set(warnings)], // Remove duplicates
    partnershipWarnings,
  };
};

/**
 * Get warning level based on frequency
 */
export const getWarningLevel = (
  partnershipCount: number,
  opponentCount: number,
  maxPartnership: number = 2,
  maxOpponent: number = 2
): "none" | "warning" | "critical" => {
  if (
    partnershipCount > maxPartnership + 1 ||
    opponentCount > maxOpponent + 1
  ) {
    return "critical";
  }
  if (partnershipCount > maxPartnership || opponentCount > maxOpponent) {
    return "warning";
  }
  return "none";
};
