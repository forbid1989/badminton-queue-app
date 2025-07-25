import { Player } from "../types/Player";
import { loadFromLocalStorage } from '../utils/localStorage';

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
    count: 1, // 🆕 Changed from 2 to 1 - queues are now independent of court count
    playersByQueue: {
      "queue-0": [] as Player[],
      // Removed "queue-1" - we'll create dynamically as needed
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
  },
};

// Helper function to rebuild court mappings from players
function generateCourtMappings(players: Player[], courtCount: number): Record<string, Player[]> {
  const mappings: Record<string, Player[]> = {};

  // Initialize empty courts
  for (let i = 0; i < courtCount; i++) {
    mappings[`court-${i}`] = [];
  }

  // Populate courts with players
  players.forEach(player => {
    const courtId = player.status?.find(s => s.startsWith('court-'));
    if (courtId && mappings[courtId]) {
      mappings[courtId].push(player);
    }
  });

  return mappings;
}

// Helper function to rebuild queue mappings from players
function generateQueueMappings(players: Player[], queueCount: number): Record<string, Player[]> {
  const mappings: Record<string, Player[]> = {};

  // Initialize empty queues
  for (let i = 0; i < queueCount; i++) {
    mappings[`queue-${i}`] = [];
  }

  // Populate queues with players
  players.forEach(player => {
    const queueId = player.status?.find(s => s.startsWith('queue-'));
    if (queueId && mappings[queueId]) {
      mappings[queueId].push(player);
    }
  });

  return mappings;
}

// Load from localStorage and merge with base state
const loadedState = loadFromLocalStorage();

const InitialState = {
  ...baseInitialState,
  ...(loadedState || {}),
  // Always rebuild these from the players array
  courts: {
    ...baseInitialState.courts,
    ...(loadedState?.courts || {}),
    playersByCourt: generateCourtMappings(
      loadedState?.players || [],
      loadedState?.courts?.count || 2
    ),
  },
  queue: {
    ...baseInitialState.queue,
    ...(loadedState?.queue || {}),
    playersByQueue: generateQueueMappings(
      loadedState?.players || [],
      loadedState?.queue?.count || 1
    ),
  },
};

export default InitialState;