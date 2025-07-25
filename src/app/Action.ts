import { Player } from "../types/Player";

const ActionType = {
  SET_COURT_COUNT: "setCourtCount",
  ADD_PLAYERS_FROM_TEXT: "addPlayersFromText",
  CLEAR_ALL_PLAYERS: "clearAllPlayers",
  CLEAR_ALL_DATA: "clearAllData", // 🆕 New action for clearing everything including localStorage
  MOVE_PLAYER: "movePlayer",
  SET_GAMES_PLAYED: "setGamesPlayed",
  SET_PLAYER_TEXT_INPUT: "setPlayerTextInput",
  TOGGLE_TIMERS: "toggleTimers",
  SET_PRIORITY_MODE: "setPriorityMode",
  REMOVE_PLAYER: "removePlayer",
  TRANSFER_QUEUE_TO_COURT: "transferQueueToCourt",
  END_GAME: "endGame",
  UPDATE_PLAYER_NAME: "updatePlayerName",
  RENAME_PLAYER: "renamePlayer",
  CREATE_QUEUE: "createQueue", // 🆕 New action
  REMOVE_QUEUE: "removeQueue", // 🆕 New action
} as const;

// 🧠 Action creators
const Action = {
  setCourtCount(count: number) {
    return {
      type: ActionType.SET_COURT_COUNT,
      payload: count,
    };
  },

  addPlayersFromText(parsedPlayers: Player[]) {
    return {
      type: ActionType.ADD_PLAYERS_FROM_TEXT,
      players: parsedPlayers,
    };
  },

  clearAllPlayers() {
    return {
      type: ActionType.CLEAR_ALL_PLAYERS,
    };
  },

  // 🆕 New action to clear everything including localStorage
  clearAllData() {
    return {
      type: ActionType.CLEAR_ALL_DATA,
    };
  },

  movePlayer(id: string, from: string, to: string) {
    return {
      type: ActionType.MOVE_PLAYER,
      payload: { id, from, to },
    };
  },

  setGamesPlayed(id: string, value: number = 1) {
    return {
      type: ActionType.SET_GAMES_PLAYED,
      payload: { id, value },
    };
  },

  setPlayerTextInput(text: string) {
    return {
      type: ActionType.SET_PLAYER_TEXT_INPUT,
      text,
    };
  },

  toggleTimers() {
    return {
      type: ActionType.TOGGLE_TIMERS,
    };
  },

  setPriorityMode(mode: "FIFO" | "LongestWaiting") {
    return {
      type: ActionType.SET_PRIORITY_MODE,
      mode,
    };
  },

  removePlayer(id: string) {
    return {
      type: ActionType.REMOVE_PLAYER,
      id,
    };
  },

  transferQueueToCourt(queueId: string) {
    return {
      type: ActionType.TRANSFER_QUEUE_TO_COURT,
      payload: { queueId },
    };
  },

  endGame(courtId: string) {
    return {
      type: ActionType.END_GAME,
      payload: { courtId },
    };
  },

  updatePlayerName(id: string, newName: string) {
    return {
      type: ActionType.UPDATE_PLAYER_NAME,
      payload: { id, newName },
    };
  },

  // 🆕 New actions for dynamic queues
  createQueue() {
    return {
      type: ActionType.CREATE_QUEUE,
    };
  },

  removeQueue(queueId: string) {
    return {
      type: ActionType.REMOVE_QUEUE,
      payload: { queueId },
    };
  },
};

export { ActionType, Action };