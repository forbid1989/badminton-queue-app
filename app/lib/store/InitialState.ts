import { Player } from "../../components/types/Player";
import { loadFromLocalStorage } from "../utils/localStorage";
import { SortableField } from "../../components/types/Settings";

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

  // 🆕 Initialize empty undo games storage
  undoableGames: {},

  // ⚙️ App settings
  settings: {
    priorityMode: "FIFO" as "FIFO" | "LongestWaiting",
    colorCodedTimers: true,
    playerCooldowns: false,
    // 🆕 Add default player list sorting configuration
    playerListSort: {
      secondarySort: "gamesPlayed" as SortableField,
      secondaryDirection: "asc" as "asc" | "desc",
      tertiarySort: "timeEntered" as SortableField,
      tertiaryDirection: "asc" as "asc" | "desc",
    },
    paymentSettings: {
      feeStructure: "flat" as "flat" | "per_game",
      flatFee: 50,
      courtFee: 20,
      perGameFee: 15,
      guestFee: 25,
      currency: "PHP",
    },
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

// Helper function to validate player order fields and fix corruption
function validatePlayerOrderFields(players: Player[]): Player[] {
  console.log("🔍 Validating player order fields for corruption...");

  let fixedCount = 0;
  const validatedPlayers = players.map((player) => {
    let needsFix = false;
    let updatedPlayer = { ...player };

    // Check if player has court status but null courtOrder
    const courtId = player.status?.find((s) => s.startsWith("court-"));
    if (courtId && player.courtOrder === null) {
      console.warn(
        `⚠️ Player ${player.name} in ${courtId} has null courtOrder - will be reassigned`
      );
      needsFix = true;
      // Keep null for now - will be fixed by rebuildZoneMappings
    }

    // Check if player has queue status but null queueOrder
    const queueId = player.status?.find((s) => s.startsWith("queue-"));
    if (queueId && player.queueOrder === null) {
      console.warn(
        `⚠️ Player ${player.name} in ${queueId} has null queueOrder - will be reassigned`
      );
      needsFix = true;
      // Keep null for now - will be fixed by rebuildZoneMappings
    }

    // Check if player has courtOrder but no court status (corruption)
    if (!courtId && player.courtOrder !== null) {
      console.warn(
        `⚠️ Player ${player.name} has courtOrder ${player.courtOrder} but no court status - clearing`
      );
      updatedPlayer.courtOrder = null;
      needsFix = true;
    }

    // Check if player has queueOrder but no queue status (corruption)
    if (!queueId && player.queueOrder !== null) {
      console.warn(
        `⚠️ Player ${player.name} has queueOrder ${player.queueOrder} but no queue status - clearing`
      );
      updatedPlayer.queueOrder = null;
      needsFix = true;
    }

    if (needsFix) {
      fixedCount++;
    }

    return updatedPlayer;
  });

  if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} corrupted player order fields`);
  } else {
    console.log("✅ All player order fields are valid");
  }

  return validatedPlayers;
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

// Create initial state function that handles server/client differences
const createInitialState = () => {
  // 🚨 SERVER-SIDE GUARD: If running on server, return base state only
  if (typeof window === "undefined") {
    return baseInitialState;
  }

  // CLIENT-SIDE: Load from localStorage and merge
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

  // Validate and fix any corrupted order fields
  const validatedPlayers = validatePlayerOrderFields(playersWithOrderFields);

  // Rebuild mappings with the newly assigned order fields
  const finalCourtMappings = generateCourtMappings(
    validatedPlayers,
    loadedState?.courts?.count || 2
  );

  const finalQueueMappings = generateQueueMappings(
    validatedPlayers,
    loadedState?.queue?.playersByQueue || { "queue-0": [] }
  );

  return {
    ...baseInitialState,
    ...(loadedState || {}),
    // Use validated players with order fields
    players: validatedPlayers,
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
};

const InitialState = createInitialState();

export default InitialState;
