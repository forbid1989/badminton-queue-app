import { ActionType } from "./Action";
import { Player } from "../../components/types/Player";
import { PlayerListSortConfig } from "../../components/types/Settings";
import { RootState } from "./rootState";

// Import all sub-reducers
import * as CourtReducer from "./reducers/courtReducer";
import * as QueueReducer from "./reducers/queueReducer";
import * as PlayerReducer from "./reducers/playerReducer";
import * as GameReducer from "./reducers/gameReducer";
import * as PaymentReducer from "./reducers/paymentReducer";
import * as SettingsReducer from "./reducers/settingsReducer";
import * as MovementReducer from "./reducers/movementReducer";

// Action type definition
type Action =
  | { type: "setCourtCount"; payload: number }
  | { type: "addPlayersFromText"; players: Player[] }
  | {
      type: "updatePlayerListSort";
      payload: { sortConfig: PlayerListSortConfig };
    }
  | { type: "clearAllPlayers" }
  | { type: "clearAllData" }
  | { type: "movePlayer"; payload: { id: string; from: string; to: string } }
  | {
      type: "swapPlayers";
      payload: { playerId1: string; playerId2: string; zone: string };
    }
  | {
      type: "swapPlayersCrossZone";
      payload: {
        playerId1: string;
        zone1: string;
        playerId2: string;
        zone2: string;
      };
    }
  | {
      type: "replacePlayer";
      payload: {
        sourcePlayerId: string;
        sourceZone: string;
        targetPlayerId: string;
        targetZone: string;
      };
    }
  | { type: "setGamesPlayed"; payload: { id: string; value: number } }
  | { type: "updatePlayerName"; payload: { id: string; newName: string } }
  | { type: "setPlayerTextInput"; text: string }
  | { type: "toggleTimers" }
  | { type: "setPriorityMode"; mode: "FIFO" | "LongestWaiting" }
  | { type: "removePlayer"; id: string }
  | { type: "transferQueueToCourt"; payload: { queueId: string } }
  | {
      type: "transferQueueToSpecificCourt";
      payload: { queueId: string; targetCourtId: string };
    }
  | { type: "endGame"; payload: { courtId: string } }
  | { type: "undoEndGame"; payload: { courtId: string } }
  | { type: "clearCourtUndo"; payload: { courtId: string } }
  | { type: "createQueue" }
  | { type: "removeQueue"; payload: { queueId: string } }
  | { type: "togglePlayerCooldowns" }
  | {
      type: "movePlayerToPosition";
      payload: {
        playerId: string;
        from: string;
        zone: string;
        position: number;
      };
    }
  | {
      type: "quickMovePlayer";
      payload: { id: string; from: string; to: string };
    }
  | { type: "updatePaymentSettings"; payload: any }
  | { type: "togglePlayerPayment"; payload: { playerId: string } }
  | { type: "togglePlayerGuest"; payload: { playerId: string } }
  | { type: "markAllPlayersPaid" }
  | { type: "clearAllPayments" }
  | { type: "markPlayerUnpaidAndMoveToWaiting"; payload: { playerId: string } }
  | {
      type: "updatePlayerSkillLevel";
      payload: { playerId: string; skillLevel: string };
    }
  | {
      type: "swapCourtPlayers";
      payload: { sourceCourtId: string; targetCourtId: string };
    }
  | {
      type: "transferQueueToSpecificCourtFromSubmenu";
      payload: { queueId: string; targetCourtId: string };
    }
  | {
      type: "removeSpecificCourt";
      payload: { courtId: string };
    }
  | {
      type: "updateCourtDisplayNumber";
      payload: { courtId: string; displayNumber: number };
    };

/**
 * Main reducer that delegates to specialized sub-reducers
 * Each case delegates to the appropriate sub-reducer for that domain
 */
export default function reducer(state: RootState, action: Action): RootState {
  switch (action.type) {
    // Court-related actions
    case ActionType.SET_COURT_COUNT:
      return CourtReducer.setCourtCount(state, action.payload);

    case ActionType.SWAP_COURT_PLAYERS:
      return CourtReducer.swapCourtPlayers(
        state,
        action.payload.sourceCourtId,
        action.payload.targetCourtId
      );

    case ActionType.REMOVE_SPECIFIC_COURT:
      return CourtReducer.removeSpecificCourt(state, action.payload.courtId);

    case ActionType.UPDATE_COURT_DISPLAY_NUMBER:
      return CourtReducer.updateCourtDisplayNumber(
        state,
        action.payload.courtId,
        action.payload.displayNumber
      );

    // Queue-related actions
    case ActionType.CREATE_QUEUE:
      return QueueReducer.createQueue(state);

    case ActionType.REMOVE_QUEUE:
      return QueueReducer.removeQueue(state, action.payload.queueId);

    case ActionType.TRANSFER_QUEUE_TO_COURT:
      return QueueReducer.transferQueueToCourt(state, action.payload.queueId);

    case ActionType.TRANSFER_QUEUE_TO_SPECIFIC_COURT:
      return QueueReducer.transferQueueToSpecificCourt(
        state,
        action.payload.queueId,
        action.payload.targetCourtId
      );

    case ActionType.TRANSFER_QUEUE_TO_SPECIFIC_COURT_FROM_SUBMENU:
      return QueueReducer.transferQueueToSpecificCourtFromSubmenu(
        state,
        action.payload.queueId,
        action.payload.targetCourtId
      );

    // Player-related actions
    case ActionType.ADD_PLAYERS_FROM_TEXT:
      return PlayerReducer.addPlayersFromText(state, action.players);

    case ActionType.CLEAR_ALL_PLAYERS:
      return PlayerReducer.clearAllPlayers(state);

    case ActionType.CLEAR_ALL_DATA:
      return PlayerReducer.clearAllData();

    case ActionType.REMOVE_PLAYER:
      return PlayerReducer.removePlayer(state, action.id);

    case ActionType.UPDATE_PLAYER_NAME:
      return PlayerReducer.updatePlayerName(
        state,
        action.payload.id,
        action.payload.newName
      );

    case ActionType.UPDATE_PLAYER_SKILL_LEVEL:
      return PlayerReducer.updatePlayerSkillLevel(
        state,
        action.payload.playerId,
        action.payload.skillLevel
      );

    // Game lifecycle actions
    case ActionType.END_GAME:
      return GameReducer.endGame(state, action.payload.courtId);

    case ActionType.UNDO_END_GAME:
      return GameReducer.undoEndGame(state, action.payload.courtId);

    case ActionType.CLEAR_COURT_UNDO:
      return GameReducer.clearCourtUndo(state, action.payload.courtId);

    case ActionType.SET_GAMES_PLAYED:
      return GameReducer.setGamesPlayed(
        state,
        action.payload.id,
        action.payload.value
      );

    // Payment-related actions
    case ActionType.UPDATE_PAYMENT_SETTINGS:
      return PaymentReducer.updatePaymentSettings(state, action.payload);

    case ActionType.TOGGLE_PLAYER_PAYMENT:
      return PaymentReducer.togglePlayerPayment(state, action.payload.playerId);

    case ActionType.TOGGLE_PLAYER_GUEST:
      return PaymentReducer.togglePlayerGuest(state, action.payload.playerId);

    case ActionType.MARK_ALL_PLAYERS_PAID:
      return PaymentReducer.markAllPlayersPaid(state);

    case ActionType.CLEAR_ALL_PAYMENTS:
      return PaymentReducer.clearAllPayments(state);

    case ActionType.MARK_PLAYER_UNPAID_AND_MOVE_TO_WAITING:
      return PaymentReducer.markPlayerUnpaidAndMoveToWaiting(
        state,
        action.payload.playerId
      );

    // Settings actions
    case ActionType.SET_PLAYER_TEXT_INPUT:
      return SettingsReducer.setPlayerTextInput(state, action.text);

    case ActionType.TOGGLE_TIMERS:
      return SettingsReducer.toggleTimers(state);

    case ActionType.TOGGLE_PLAYER_COOLDOWNS:
      return SettingsReducer.togglePlayerCooldowns(state);

    case ActionType.SET_PRIORITY_MODE:
      return SettingsReducer.setPriorityMode(state, action.mode);

    case ActionType.UPDATE_PLAYER_LIST_SORT:
      return SettingsReducer.updatePlayerListSort(
        state,
        action.payload.sortConfig
      );

    // Movement/drag-and-drop actions
    case ActionType.MOVE_PLAYER_TO_POSITION:
      return MovementReducer.movePlayerToPosition(
        state,
        action.payload.playerId,
        action.payload.from,
        action.payload.zone,
        action.payload.position
      );

    case ActionType.MOVE_PLAYER:
      return MovementReducer.movePlayer(
        state,
        action.payload.id,
        action.payload.from,
        action.payload.to
      );

    case ActionType.QUICK_MOVE_PLAYER:
      return MovementReducer.quickMovePlayer(
        state,
        action.payload.id,
        action.payload.from,
        action.payload.to
      );

    case ActionType.SWAP_PLAYERS:
      return MovementReducer.swapPlayers(
        state,
        action.payload.playerId1,
        action.payload.playerId2,
        action.payload.zone
      );

    case ActionType.SWAP_PLAYERS_CROSS_ZONE:
      return MovementReducer.swapPlayersCrossZone(
        state,
        action.payload.playerId1,
        action.payload.zone1,
        action.payload.playerId2,
        action.payload.zone2
      );

    case ActionType.REPLACE_PLAYER:
      return MovementReducer.replacePlayer(
        state,
        action.payload.sourcePlayerId,
        action.payload.sourceZone,
        action.payload.targetPlayerId,
        action.payload.targetZone
      );

    default:
      return state;
  }
}
