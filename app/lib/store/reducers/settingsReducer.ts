import { RootState } from "../rootState";
import { PlayerListSortConfig } from "../../../components/types/Settings";

/**
 * Settings-related reducer actions
 * Handles: SET_PLAYER_TEXT_INPUT, TOGGLE_TIMERS, TOGGLE_PLAYER_COOLDOWNS,
 * SET_PRIORITY_MODE, UPDATE_PLAYER_LIST_SORT
 */

export function setPlayerTextInput(state: RootState, text: string): RootState {
  return {
    ...state,
    playerTextInput: text,
  };
}

export function toggleTimers(state: RootState): RootState {
  return {
    ...state,
    showTimers: !state.showTimers,
  };
}

export function togglePlayerCooldowns(state: RootState): RootState {
  return {
    ...state,
    settings: {
      ...state.settings,
      playerCooldowns: !state.settings.playerCooldowns,
    },
  };
}

export function setPriorityMode(
  state: RootState,
  mode: "FIFO" | "LongestWaiting"
): RootState {
  return {
    ...state,
    settings: {
      ...state.settings,
      priorityMode: mode,
    },
  };
}

export function updatePlayerListSort(
  state: RootState,
  sortConfig: PlayerListSortConfig
): RootState {
  return {
    ...state,
    settings: {
      ...state.settings,
      playerListSort: sortConfig,
    },
  };
}
