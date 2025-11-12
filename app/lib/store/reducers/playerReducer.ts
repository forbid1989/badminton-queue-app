import {
  Player,
  PlayerStatus,
  SkillLevel,
} from "../../../components/types/Player";
import { RootState } from "../rootState";
import { rebuildZoneMappings } from "../helpers/zoneHelpers";
import { clearLocalStorage } from "../../utils/localStorage";

/**
 * Player-related reducer actions
 * Handles: ADD_PLAYERS_FROM_TEXT, CLEAR_ALL_PLAYERS, CLEAR_ALL_DATA,
 * REMOVE_PLAYER, UPDATE_PLAYER_NAME, UPDATE_PLAYER_SKILL_LEVEL
 */

export function addPlayersFromText(
  state: RootState,
  players: Player[]
): RootState {
  const newPlayers = players.map((player) => ({
    ...player,
    status: [] as PlayerStatus[], // Start as unqueued
    courtOrder: null, // Ensure new players have null orders
    queueOrder: null,
  }));

  return {
    ...state,
    players: [...state.players, ...newPlayers],
  };
}

export function clearAllPlayers(state: RootState): RootState {
  // 1. Reset all players to unqueued state
  const clearedPlayers: Player[] = state.players.map((p: Player) => ({
    ...p,
    status: [],
    timeEntered: Date.now(),
    courtOrder: null, // Clear order fields
    queueOrder: null,
  }));

  // 2. Reconstruct empty courts and queues
  const clearedCourts: Record<string, Player[]> = {};
  Object.keys(state.courts.playersByCourt).forEach((key) => {
    clearedCourts[key] = [];
  });

  const clearedQueues: Record<string, Player[]> = {};
  Object.keys(state.queue.playersByQueue).forEach((key) => {
    clearedQueues[key] = [];
  });

  return {
    ...state,
    players: clearedPlayers,
    courts: {
      ...state.courts,
      playersByCourt: clearedCourts,
    },
    queue: {
      ...state.queue,
      playersByQueue: clearedQueues,
    },
  };
}

export function clearAllData(): RootState {
  // Clear localStorage
  clearLocalStorage();

  // Reset to initial state
  return {
    courts: {
      count: 2,
      playersByCourt: {
        "court-0": [],
        "court-1": [],
      },
    },
    queue: {
      count: 1,
      playersByQueue: {
        "queue-0": [],
      },
    },
    players: [],
    playerTextInput: "",
    showTimers: true,
    undoableGames: {},
    settings: {
      priorityMode: "FIFO",
      colorCodedTimers: true,
      playerCooldowns: false,
      playerListSort: {
        secondarySort: "gamesPlayed",
        secondaryDirection: "asc",
        tertiarySort: "timeEntered",
        tertiaryDirection: "asc",
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
}

export function removePlayer(state: RootState, id: string): RootState {
  const idToRemove = id;

  // Step 1: Remove player from global list
  const updatedPlayers = state.players.filter(
    (p: Player) => p.id !== idToRemove
  );

  // Rebuild using order fields
  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  return {
    ...state,
    players: updatedPlayers,
    courts: {
      ...state.courts,
      playersByCourt,
    },
    queue: {
      ...state.queue,
      playersByQueue,
    },
  };
}

export function updatePlayerName(
  state: RootState,
  id: string,
  newName: string
): RootState {
  const updatedPlayers = state.players.map((p: Player) =>
    p.id === id ? { ...p, name: newName } : p
  );

  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  return {
    ...state,
    players: updatedPlayers,
    courts: {
      ...state.courts,
      playersByCourt,
    },
    queue: {
      ...state.queue,
      playersByQueue,
    },
  };
}

export function updatePlayerSkillLevel(
  state: RootState,
  playerId: string,
  skillLevel: string
): RootState {
  const updatedPlayers = state.players.map((player: Player) =>
    player.id === playerId
      ? { ...player, skillLevel: skillLevel as SkillLevel }
      : player
  );

  // Rebuild zone mappings
  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  return {
    ...state,
    players: updatedPlayers,
    courts: {
      ...state.courts,
      playersByCourt,
    },
    queue: {
      ...state.queue,
      playersByQueue,
    },
  };
}
