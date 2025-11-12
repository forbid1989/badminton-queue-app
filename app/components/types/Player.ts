export type PlayerStatus = `queue-${number}` | `court-${number}`;

// Skill levels from strongest to weakest
export type SkillLevel = "S" | "A" | "B" | "C" | "D" | "E" | "F";

// 🆕 Payment information for each player
export interface PaymentInfo {
  hasPaid: boolean; // Whether the player has paid
  isGuest: boolean; // Whether the player is a guest (affects fee calculation)
  amountOwed?: number; // Calculated amount owed (optional, can be calculated on-the-fly)
  paidAt?: number; // Timestamp when payment was made
  notes?: string; // Optional notes about payment
}

// 🆕 Simple player reference for match history
export interface MatchPlayerRef {
  id: string; // Player ID for lookups
  name: string; // Name at the time of the match (snapshot)
  skillLevel: SkillLevel; // Skill level at the time of the match (snapshot)
}

// 🔄 Updated MatchHistoryEntry interface to use MatchPlayerRef instead of strings
export interface MatchHistoryEntry {
  matchId: string; // Unique identifier for the match
  partner?: MatchPlayerRef; // Partner's info (undefined for 1v1)
  opponents: MatchPlayerRef[]; // Opponent info (1 for 1v1, 2 for 2v2)
  startTime: number; // Match start timestamp
  endTime: number; // Match end timestamp
  duration: number; // Match duration in seconds
  matchType: "1v1" | "2v1" | "2v2"; // Type of match
  courtName: string; // Which court the match was played on
}

export interface Player {
  id: string;
  name: string;
  gamesPlayed: number;
  status: PlayerStatus[];
  timeEntered: number;
  waitingSince?: number;
  matchHistory?: MatchHistoryEntry[];
  courtEnteredTime?: number;
  courtOrder: number | null;
  queueOrder: number | null;
  paymentInfo?: PaymentInfo;
  skillLevel: SkillLevel;
}

// Utility functions for skill levels
export const getSkillLevelColor = (level: SkillLevel): string => {
  switch (level) {
    case "S":
      return "#CC3E17"; // Darker red-orange for strongest
    case "A":
      return "#C7640A"; // Darker orange
    case "B":
      return "#B8860B"; // Dark goldenrod
    case "C":
      return "#228B22"; // Forest green
    case "D":
      return "#1565C0"; // Darker blue
    case "E":
      return "#6A1B99"; // Darker purple
    case "F":
      return "#5D5D5D"; // Darker gray for beginners
    default:
      return "#5D5D5D";
  }
};

export const getSkillLevelDescription = (level: SkillLevel): string => {
  switch (level) {
    case "S":
      return "Elite - Strongest players";
    case "A":
      return "Advanced - Very strong players";
    case "B":
      return "Intermediate+ - Good players";
    case "C":
      return "Intermediate - Solid players";
    case "D":
      return "Beginner+ - Developing players";
    case "E":
      return "Beginner - Learning players";
    case "F":
      return "New - Starting players";
    default:
      return "Unknown level";
  }
};

// Sort skill levels by strength (S is strongest)
export const skillLevelOrder: SkillLevel[] = [
  "S",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

export const compareSkillLevels = (a: SkillLevel, b: SkillLevel): number => {
  return skillLevelOrder.indexOf(a) - skillLevelOrder.indexOf(b);
};

// 🆕 Utility function to create MatchPlayerRef from Player
export const createMatchPlayerRef = (player: Player): MatchPlayerRef => ({
  id: player.id,
  name: player.name,
  skillLevel: player.skillLevel,
});

// 🆕 Utility function to get current Player from MatchPlayerRef (for enhanced features)
export const getPlayerFromRef = (
  playerRef: MatchPlayerRef,
  allPlayers: Player[]
): Player | null => {
  return allPlayers.find((p) => p.id === playerRef.id) || null;
};

// Enhanced match history utility functions
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

// 🔄 Updated getMatchDescription function to work with MatchPlayerRef
export const getMatchDescription = (
  entry: MatchHistoryEntry,
  playerName: string
): string => {
  const { partner, opponents, matchType } = entry;

  // Safety check for opponents array
  if (!opponents || opponents.length === 0) {
    return "Match data unavailable";
  }

  switch (matchType) {
    case "1v1":
      return `vs ${opponents[0]?.name || "Unknown"}`;
    case "2v1":
      if (partner) {
        return `${partner.name} & ${playerName} vs ${opponents[0]?.name || "Unknown"}`;
      } else {
        return `${playerName} vs ${opponents.filter((o) => o).map((o) => o.name).join(" & ")}`;
      }
    case "2v2":
      return `${partner?.name || "Unknown"} & ${playerName} vs ${opponents
        .filter((o) => o)
        .map((o) => o.name)
        .join(" & ")}`;
    default:
      return `with ${opponents.filter((o) => o).map((o) => o.name).join(", ")}`;
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
        teams: [players.slice(0, 2), players.slice(2, 4)],
      };
    default:
      return { matchType: "1v1", teams: [] };
  }
};

// 🔄 Updated generateMatchHistoryEntries to create MatchPlayerRef objects
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
    let partner: MatchPlayerRef | undefined;
    let opponents: MatchPlayerRef[] = [];

    // Determine partner and opponents based on match type and player position
    switch (matchType) {
      case "1v1":
        opponents = players
          .filter((p) => p.id !== player.id)
          .map((p) => createMatchPlayerRef(p));
        break;

      case "2v1":
        if (index < 2) {
          // Player is in the team of 2
          const partnerPlayer = players.find(
            (p, i) => i < 2 && p.id !== player.id
          );
          if (partnerPlayer) {
            partner = createMatchPlayerRef(partnerPlayer);
          }
          opponents = players.slice(2).map((p) => createMatchPlayerRef(p));
        } else {
          // Player is the solo player
          opponents = players.slice(0, 2).map((p) => createMatchPlayerRef(p));
        }
        break;

      case "2v2":
        if (index < 2) {
          // Player is in team 1
          const partnerPlayer = players.find(
            (p, i) => i < 2 && p.id !== player.id
          );
          if (partnerPlayer) {
            partner = createMatchPlayerRef(partnerPlayer);
          }
          opponents = players.slice(2, 4).map((p) => createMatchPlayerRef(p));
        } else {
          // Player is in team 2
          const partnerPlayer = players.find(
            (p, i) => i >= 2 && p.id !== player.id
          );
          if (partnerPlayer) {
            partner = createMatchPlayerRef(partnerPlayer);
          }
          opponents = players.slice(0, 2).map((p) => createMatchPlayerRef(p));
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

// 🆕 Enhanced match analysis with skill level data
export const analyzeMatchSkills = (
  entry: MatchHistoryEntry
): {
  averageSkillLevel: number;
  skillRange: string;
  teamBalance: "balanced" | "unbalanced";
} => {
  const allPlayers = [
    ...(entry.partner ? [entry.partner] : []),
    ...entry.opponents,
  ];
  const skillLevels = allPlayers.map((p) =>
    skillLevelOrder.indexOf(p.skillLevel)
  );

  const avgSkill =
    skillLevels.reduce((sum, level) => sum + level, 0) / skillLevels.length;
  const minSkill = Math.min(...skillLevels);
  const maxSkill = Math.max(...skillLevels);

  return {
    averageSkillLevel: avgSkill,
    skillRange: `${skillLevelOrder[minSkill]} - ${skillLevelOrder[maxSkill]}`,
    teamBalance: maxSkill - minSkill <= 2 ? "balanced" : "unbalanced",
  };
};

// 🆕 Get match rivalry stats (how many times played against specific players)
export const getMatchRivalries = (
  playerMatchHistory: MatchHistoryEntry[],
  targetPlayerId: string
): number => {
  return playerMatchHistory.filter((match) =>
    match.opponents.some((opponent) => opponent.id === targetPlayerId)
  ).length;
};

// 🆕 Get partnership stats
export const getPartnershipStats = (
  playerMatchHistory: MatchHistoryEntry[],
  partnerPlayerId: string
): number => {
  return playerMatchHistory.filter(
    (match) => match.partner?.id === partnerPlayerId
  ).length;
};
