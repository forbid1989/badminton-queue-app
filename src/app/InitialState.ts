import { Player } from "../types/Player";
import { loadFromLocalStorage } from "../utils/localStorage";

// Base initial state
const baseInitialState = {
  // 🏸 Courts setup
  courts: {
    count: 2,
    playersByCourt: {
      "court-0": [] as Player[],
      "court-1": [] as Player[],
    },
  },

  // ⏳ Players in the queue - START WITH JUST 1 QUEUE
  queue: {
    count: 1,
    playersByQueue: {
      "queue-0": [] as Player[],
    },
  },

  // 🧠 Central player registry (authoritative source)
  players: [] as Player[],

  // 📝 Raw text input from PlayerParserForm
  playerTextInput: "",

  // ⏱️ Whether timers are shown on cards
  showTimers: true,

  // ⚙️ App settings
  settings: {
    priorityMode: "FIFO", // or 'LongestWaiting'
    colorCodedTimers: true,
    playerCooldowns: false, // ✨ NEW: Default to disabled
  },
};

// Helper function to migrate players to include order fields
function migratePlayersWithOrderFields(players: Player[]): Player[] {
  return players.map((player) => {
    // If player already has order fields, keep them
    if (
      typeof player.courtOrder !== "undefined" &&
      typeof player.queueOrder !== "undefined"
    ) {
      return player;
    }

    // Migrate old players by adding order fields
    return {
      ...player,
      courtOrder: player.courtOrder ?? null,
      queueOrder: player.queueOrder ?? null,
    };
  });
}

// Helper function to assign order fields based on zone position
function assignOrderFieldsFromZonePosition(
  players: Player[],
  playersByCourt: Record<string, Player[]>,
  playersByQueue: Record<string, Player[]>
): Player[] {
  return players.map((player) => {
    let newCourtOrder = player.courtOrder;
    let newQueueOrder = player.queueOrder;

    // Find which court this player is in and assign order based on position
    const courtId = player.status.find((s) => s.startsWith("court-"));
    if (courtId && playersByCourt[courtId]) {
      const courtPlayers = playersByCourt[courtId];
      const position = courtPlayers.findIndex((p) => p.id === player.id);
      if (position >= 0) {
        newCourtOrder = position;
      }
    }

    // Find which queue this player is in and assign order based on position
    const queueId = player.status.find((s) => s.startsWith("queue-"));
    if (queueId && playersByQueue[queueId]) {
      const queuePlayers = playersByQueue[queueId];
      const position = queuePlayers.findIndex((p) => p.id === player.id);
      if (position >= 0) {
        newQueueOrder = position;
      }
    }

    return {
      ...player,
      courtOrder: newCourtOrder,
      queueOrder: newQueueOrder,
    };
  });
}

// Helper function to rebuild court mappings from players (existing logic)
function generateCourtMappings(
  players: Player[],
  courtCount: number
): Record<string, Player[]> {
  const mappings: Record<string, Player[]> = {};

  // Initialize empty courts
  for (let i = 0; i < courtCount; i++) {
    mappings[`court-${i}`] = [];
  }

  // Populate courts with players - maintain proper order using courtOrder
  players.forEach((player) => {
    const courtId = player.status?.find((s) => s.startsWith("court-"));
    if (courtId && mappings[courtId] && player.courtOrder !== null) {
      mappings[courtId].push(player);
    }
  });

  // Sort by courtOrder
  Object.keys(mappings).forEach((courtId) => {
    mappings[courtId].sort((a, b) => (a.courtOrder || 0) - (b.courtOrder || 0));
  });

  return mappings;
}

// Helper function to rebuild queue mappings from players (existing logic)
function generateQueueMappings(
  players: Player[],
  savedQueueStructure: Record<string, Player[]>
): Record<string, Player[]> {
  const mappings: Record<string, Player[]> = {};

  // Use the saved queue structure to preserve queue IDs
  const queueIds = Object.keys(savedQueueStructure);

  // If no saved queues, create default queue
  if (queueIds.length === 0) {
    mappings["queue-0"] = [];
  } else {
    // Initialize all saved queue IDs
    queueIds.forEach((queueId) => {
      mappings[queueId] = [];
    });
  }

  // Populate queues with players - maintain proper order using queueOrder
  players.forEach((player) => {
    const queueId = player.status?.find((s) => s.startsWith("queue-"));
    if (queueId && mappings[queueId] && player.queueOrder !== null) {
      mappings[queueId].push(player);
    }
  });

  // Sort by queueOrder
  Object.keys(mappings).forEach((queueId) => {
    mappings[queueId].sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0));
  });

  return mappings;
}

// Load from localStorage and merge with base state
const loadedState = loadFromLocalStorage();

// Migrate players to include order fields
const migratedPlayers = loadedState?.players
  ? migratePlayersWithOrderFields(loadedState.players)
  : [];

// Generate initial mappings (this will be overridden by assignOrderFieldsFromZonePosition)
const initialCourtMappings = generateCourtMappings(
  migratedPlayers,
  loadedState?.courts?.count || 2
);

const initialQueueMappings = generateQueueMappings(
  migratedPlayers,
  loadedState?.queue?.playersByQueue || { "queue-0": [] }
);

// Assign order fields based on the loaded zone positions
const playersWithOrderFields = assignOrderFieldsFromZonePosition(
  migratedPlayers,
  initialCourtMappings,
  initialQueueMappings
);

// Rebuild mappings with the newly assigned order fields
const finalCourtMappings = generateCourtMappings(
  playersWithOrderFields,
  loadedState?.courts?.count || 2
);

const finalQueueMappings = generateQueueMappings(
  playersWithOrderFields,
  loadedState?.queue?.playersByQueue || { "queue-0": [] }
);

const InitialState = {
  ...baseInitialState,
  ...(loadedState || {}),
  // Use migrated players with order fields
  players: playersWithOrderFields,
  // Always rebuild these from the players array with order fields
  courts: {
    ...baseInitialState.courts,
    ...(loadedState?.courts || {}),
    playersByCourt: finalCourtMappings,
  },
  queue: {
    ...baseInitialState.queue,
    ...(loadedState?.queue || {}),
    playersByQueue: finalQueueMappings,
  },
};

export default InitialState;
