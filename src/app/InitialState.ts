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

  // ⏳ Players in the queue
  queue: {
    count: 2, // Match this with courts.count if needed
    playersByQueue: {
      "queue-0": [] as Player[],
      "queue-1": [] as Player[],
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
