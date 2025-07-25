import { Player } from "../types/Player";

const InitialState = {
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

export default InitialState;
