import {
  Player,
  MatchHistoryEntry,
  MatchPlayerRef,
  createMatchPlayerRef,
} from "../../components/types/Player";

// Utility to format match duration (unchanged)
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

// FIXED: Correct team formation for badminton (unchanged)
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

// 🔄 UPDATED: Generate match history entries with MatchPlayerRef instead of strings
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
    let partner: MatchPlayerRef | undefined; // 🔄 Changed from string | undefined
    let opponents: MatchPlayerRef[] = []; // 🔄 Changed from string[]

    switch (matchType) {
      case "1v1":
        opponents = sortedPlayers
          .filter((p) => p.id !== player.id)
          .map((p) => createMatchPlayerRef(p)); // 🔄 Create MatchPlayerRef instead of using p.name
        break;

      case "2v1":
        if (index < 2) {
          const partnerPlayer = sortedPlayers.find(
            (p, i) => i < 2 && p.id !== player.id
          );
          if (partnerPlayer) {
            partner = createMatchPlayerRef(partnerPlayer); // 🔄 Create MatchPlayerRef instead of using .name
          }
          opponents = sortedPlayers
            .slice(2)
            .map((p) => createMatchPlayerRef(p)); // 🔄 Create MatchPlayerRef
        } else {
          opponents = sortedPlayers
            .slice(0, 2)
            .map((p) => createMatchPlayerRef(p)); // 🔄 Create MatchPlayerRef
        }
        break;

      case "2v2":
        if (index === 0 || index === 2) {
          // Team A: positions 0,2 partner together
          const partnerPlayer =
            index === 0 ? sortedPlayers[2] : sortedPlayers[0];
          if (partnerPlayer) {
            partner = createMatchPlayerRef(partnerPlayer); // 🔄 Create MatchPlayerRef instead of using .name
          }
          opponents = [sortedPlayers[1], sortedPlayers[3]]
            .filter(Boolean)
            .map((p) => createMatchPlayerRef(p)); // 🔄 Create MatchPlayerRef

          console.log(
            `🏸 TEAM A: ${player.name} (pos ${index}) partners with ${
              partner?.name
            }, vs [${opponents.map((o) => o.name).join(", ")}]`
          );
        } else {
          // Team B: positions 1,3 partner together
          const partnerPlayer =
            index === 1 ? sortedPlayers[3] : sortedPlayers[1];
          if (partnerPlayer) {
            partner = createMatchPlayerRef(partnerPlayer); // 🔄 Create MatchPlayerRef instead of using .name
          }
          opponents = [sortedPlayers[0], sortedPlayers[2]]
            .filter(Boolean)
            .map((p) => createMatchPlayerRef(p)); // 🔄 Create MatchPlayerRef

          console.log(
            `🏸 TEAM B: ${player.name} (pos ${index}) partners with ${
              partner?.name
            }, vs [${opponents.map((o) => o.name).join(", ")}]`
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

// Helper function to check if a date is today (unchanged)
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// 🆕 NEW: Enhanced utility functions using the MatchPlayerRef data

// Get detailed rivalry information
export const getRivalryStats = (
  playerMatchHistory: MatchHistoryEntry[],
  allPlayers: Player[]
): Array<{
  opponent: MatchPlayerRef;
  currentPlayer: Player | null;
  matchesAgainst: number;
  lastPlayed: number;
  winStreak?: number; // Could be added later with match results
}> => {
  const rivalryMap = new Map<
    string,
    {
      opponent: MatchPlayerRef;
      matches: MatchHistoryEntry[];
    }
  >();

  // Collect all matches against each opponent
  playerMatchHistory.forEach((match) => {
    match.opponents.forEach((opponent) => {
      if (!rivalryMap.has(opponent.id)) {
        rivalryMap.set(opponent.id, {
          opponent,
          matches: [],
        });
      }
      rivalryMap.get(opponent.id)!.matches.push(match);
    });
  });

  // Convert to sorted stats array
  return Array.from(rivalryMap.values())
    .map(({ opponent, matches }) => ({
      opponent,
      currentPlayer: allPlayers.find((p) => p.id === opponent.id) || null,
      matchesAgainst: matches.length,
      lastPlayed: Math.max(...matches.map((m) => m.endTime)),
    }))
    .sort((a, b) => b.matchesAgainst - a.matchesAgainst); // Most played against first
};

// Get partnership statistics
export const getPartnershipStats = (
  playerMatchHistory: MatchHistoryEntry[],
  allPlayers: Player[]
): Array<{
  partner: MatchPlayerRef;
  currentPlayer: Player | null;
  matchesWith: number;
  lastPlayed: number;
}> => {
  const partnershipMap = new Map<
    string,
    {
      partner: MatchPlayerRef;
      matches: MatchHistoryEntry[];
    }
  >();

  // Collect all matches with each partner
  playerMatchHistory.forEach((match) => {
    if (match.partner) {
      if (!partnershipMap.has(match.partner.id)) {
        partnershipMap.set(match.partner.id, {
          partner: match.partner,
          matches: [],
        });
      }
      partnershipMap.get(match.partner.id)!.matches.push(match);
    }
  });

  // Convert to sorted stats array
  return Array.from(partnershipMap.values())
    .map(({ partner, matches }) => ({
      partner,
      currentPlayer: allPlayers.find((p) => p.id === partner.id) || null,
      matchesWith: matches.length,
      lastPlayed: Math.max(...matches.map((m) => m.endTime)),
    }))
    .sort((a, b) => b.matchesWith - a.matchesWith); // Most played with first
};

// Check if two players have excessive partnership (2+ games together)
export const checkExcessivePartnership = (
  player1: Player,
  player2: Player
): boolean => {
  if (!player1.matchHistory || player1.matchHistory.length === 0) {
    return false;
  }

  // Count how many times player1 has partnered with player2
  const partnershipCount = player1.matchHistory.filter(
    (match) => match.partner?.id === player2.id
  ).length;

  console.log(
    `🔍 Partnership check: ${player1.name} & ${player2.name} = ${partnershipCount} games`
  );

  return partnershipCount >= 2;
};

// Check if two players have excessive opposition (2+ games against each other)
export const checkExcessiveOpposition = (
  player1: Player,
  player2: Player
): boolean => {
  if (!player1.matchHistory || player1.matchHistory.length === 0) {
    return false;
  }

  // Count how many times player1 has played against player2
  const oppositionCount = player1.matchHistory.filter((match) =>
    match.opponents.some((opponent) => opponent.id === player2.id)
  ).length;

  console.log(
    `🔍 Opposition check: ${player1.name} vs ${player2.name} = ${oppositionCount} games`
  );

  return oppositionCount >= 2;
};

// Get opposition count between two specific players
export const getOppositionCount = (
  player1: Player,
  player2: Player
): number => {
  if (!player1.matchHistory || player1.matchHistory.length === 0) {
    return 0;
  }

  return player1.matchHistory.filter((match) =>
    match.opponents.some((opponent) => opponent.id === player2.id)
  ).length;
};

// Check if any player in a group has excessive partnerships with others in the same group
export const checkGroupForExcessivePartnerships = (
  players: Player[]
): { player1: Player; player2: Player }[] => {
  const excessivePartnerships: { player1: Player; player2: Player }[] = [];

  // Check all pairs in the group
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const player1 = players[i];
      const player2 = players[j];

      // Check partnership in both directions (either could have the history)
      const hasExcessivePartnership =
        checkExcessivePartnership(player1, player2) ||
        checkExcessivePartnership(player2, player1);

      if (hasExcessivePartnership) {
        excessivePartnerships.push({ player1, player2 });
      }
    }
  }

  return excessivePartnerships;
};

//  Get partnership count between two specific players
export const getPartnershipCount = (
  player1: Player,
  player2: Player
): number => {
  if (!player1.matchHistory || player1.matchHistory.length === 0) {
    return 0;
  }

  return player1.matchHistory.filter(
    (match) => match.partner?.id === player2.id
  ).length;
};
