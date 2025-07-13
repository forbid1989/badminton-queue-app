import { Player } from "../types/Player";

const InitialState = {
  // 🏸 Courts setup
  courts: {
    count: 2,
    playersByCourt: {
      "court-0": [],
      "court-1": [],
    },
  },

  // ⏳ Players in the queue
  queue: {
    count: 2, // or same as courts.count
    playersByQueue: {
      "queue-0": [],
      "queue-1": [],
    },
  },

  // 😌 Players who are resting or not in queue
  unqueued: {
    players: [] as Player[],
  },

  // 📝 Raw text input from PlayerParserForm
  playerTextInput: "",

  // ⏱️ Whether timers are shown
  showTimers: true,

  // ⚙️ App settings
  settings: {
    priorityMode: "FIFO", // or 'LongestWaiting'
    colorCodedTimers: true,
  },
};

export default InitialState;
