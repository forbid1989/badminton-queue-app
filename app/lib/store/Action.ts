import { Player } from "../../components/types/Player";
import { PlayerListSortConfig } from "../../components/types/Settings";

const ActionType = {
  SET_COURT_COUNT: "setCourtCount",
  ADD_PLAYERS_FROM_TEXT: "addPlayersFromText",
  CLEAR_ALL_PLAYERS: "clearAllPlayers",
  CLEAR_ALL_DATA: "clearAllData",
  MOVE_PLAYER: "movePlayer",
  MOVE_PLAYER_TO_POSITION: "movePlayerToPosition",
  QUICK_MOVE_PLAYER: "quickMovePlayer",
  SWAP_PLAYERS: "swapPlayers",
  SWAP_PLAYERS_CROSS_ZONE: "swapPlayersCrossZone",
  REPLACE_PLAYER: "replacePlayer",
  SET_GAMES_PLAYED: "setGamesPlayed",
  SET_PLAYER_TEXT_INPUT: "setPlayerTextInput",
  TOGGLE_TIMERS: "toggleTimers",
  SET_PRIORITY_MODE: "setPriorityMode",
  TOGGLE_PLAYER_COOLDOWNS: "togglePlayerCooldowns",
  REMOVE_PLAYER: "removePlayer",
  TRANSFER_QUEUE_TO_COURT: "transferQueueToCourt",
  END_GAME: "endGame",
  UPDATE_PLAYER_NAME: "updatePlayerName",
  RENAME_PLAYER: "renamePlayer",
  CREATE_QUEUE: "createQueue",
  REMOVE_QUEUE: "removeQueue",
  UPDATE_PAYMENT_SETTINGS: "updatePaymentSettings",
  TOGGLE_PLAYER_PAYMENT: "togglePlayerPayment",
  TOGGLE_PLAYER_GUEST: "togglePlayerGuest",
  MARK_ALL_PLAYERS_PAID: "markAllPlayersPaid",
  CLEAR_ALL_PAYMENTS: "clearAllPayments",
  UPDATE_PLAYER_SKILL_LEVEL: "updatePlayerSkillLevel",
  VALIDATE_COURT_PARTNERSHIPS: "validateCourtPartnerships",
  SHOW_PARTNERSHIP_WARNING: "showPartnershipWarning",
  CLEAR_PARTNERSHIP_WARNINGS: "clearPartnershipWarnings",
  UPDATE_PLAYER_LIST_SORT: "updatePlayerListSort",
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

  // 🆕 New action for position-specific moves
  movePlayerToPosition(
    playerId: string,
    from: string,
    zone: string,
    position: number
  ) {
    return {
      type: ActionType.MOVE_PLAYER_TO_POSITION,
      payload: { playerId, from, zone, position },
    };
  },

  // 🆕 New action for quick add button and regular zone drops with auto-positioning
  quickMovePlayer(id: string, from: string, to: string) {
    return {
      type: ActionType.QUICK_MOVE_PLAYER,
      payload: { id, from, to },
    };
  },

  // 🆕 New action to swap two players' positions
  swapPlayers(playerId1: string, playerId2: string, zone: string) {
    return {
      type: ActionType.SWAP_PLAYERS,
      payload: { playerId1, playerId2, zone },
    };
  },

  swapPlayersCrossZone(
    playerId1: string,
    zone1: string,
    playerId2: string,
    zone2: string
  ) {
    return {
      type: ActionType.SWAP_PLAYERS_CROSS_ZONE,
      payload: { playerId1, zone1, playerId2, zone2 },
    };
  },

  // 🆕 NEW: Action for replacing a player (from player list to court/queue)
  replacePlayer(
    sourcePlayerId: string,
    sourceZone: string,
    targetPlayerId: string,
    targetZone: string
  ) {
    return {
      type: ActionType.REPLACE_PLAYER,
      payload: { sourcePlayerId, sourceZone, targetPlayerId, targetZone },
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

  togglePlayerCooldowns() {
    return {
      type: ActionType.TOGGLE_PLAYER_COOLDOWNS,
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

  updatePaymentSettings(settings: any) {
    return {
      type: ActionType.UPDATE_PAYMENT_SETTINGS,
      payload: settings,
    };
  },

  togglePlayerPayment(playerId: string) {
    return {
      type: ActionType.TOGGLE_PLAYER_PAYMENT,
      payload: { playerId },
    };
  },

  togglePlayerGuest(playerId: string) {
    return {
      type: ActionType.TOGGLE_PLAYER_GUEST,
      payload: { playerId },
    };
  },

  markAllPlayersPaid() {
    return {
      type: ActionType.MARK_ALL_PLAYERS_PAID,
    };
  },

  clearAllPayments() {
    return {
      type: ActionType.CLEAR_ALL_PAYMENTS,
    };
  },

  updatePlayerSkillLevel(playerId: string, skillLevel: string) {
    return {
      type: ActionType.UPDATE_PLAYER_SKILL_LEVEL,
      payload: { playerId, skillLevel },
    };
  },

  // 🆕 NEW: Validate partnerships on a specific court
  validateCourtPartnerships(courtId: string) {
    return {
      type: ActionType.VALIDATE_COURT_PARTNERSHIPS,
      payload: { courtId },
    };
  },

  showPartnershipWarning(
    courtId: string,
    partnerships: Array<{ player1: string; player2: string; count: number }>
  ) {
    return {
      type: ActionType.SHOW_PARTNERSHIP_WARNING,
      payload: { courtId, partnerships },
    };
  },

  clearPartnershipWarnings() {
    return {
      type: ActionType.CLEAR_PARTNERSHIP_WARNINGS,
    };
  },

  updatePlayerListSort(sortConfig: PlayerListSortConfig) {
    return {
      type: ActionType.UPDATE_PLAYER_LIST_SORT,
      payload: { sortConfig },
    };
  },
};

export { ActionType, Action };
