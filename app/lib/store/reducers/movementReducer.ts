import { Player, PlayerStatus } from "../../../components/types/Player";
import { RootState } from "../rootState";
import {
  rebuildZoneMappings,
  clearOrderFromPlayer,
  getNextAvailablePosition,
  returnPlayerToList,
} from "../helpers/zoneHelpers";
import { clearUndoDataForChangedCourts } from "../helpers/gameHelpers";
import { logPartnershipWarnings } from "../helpers/partnershipHelpers";
import { shouldAutoCreateQueue, getNextQueueId } from "../helpers/queueHelpers";

/**
 * Movement/drag-and-drop reducer actions
 * Handles: MOVE_PLAYER_TO_POSITION, MOVE_PLAYER, QUICK_MOVE_PLAYER,
 * SWAP_PLAYERS, SWAP_PLAYERS_CROSS_ZONE, REPLACE_PLAYER
 */

export function movePlayerToPosition(
  state: RootState,
  playerId: string,
  from: string,
  zone: string,
  position: number
): RootState {
  console.log(
    `🎯 MOVE_PLAYER_TO_POSITION: Player ${playerId} from "${from}" to ${zone} position ${position}`
  );

  const playerToMove = state.players.find((p: Player) => p.id === playerId);
  if (!playerToMove) {
    console.log(`❌ Player ${playerId} not found`);
    return state;
  }

  // Check if the target position is already occupied
  const playersInZone = state.players.filter((p: Player) =>
    p.status.includes(zone as PlayerStatus)
  );

  const positionOccupied = playersInZone.some((p: Player) => {
    if (zone.startsWith("court-")) {
      return p.courtOrder === position && p.id !== playerId;
    } else if (zone.startsWith("queue-")) {
      return p.queueOrder === position && p.id !== playerId;
    }
    return false;
  });

  if (positionOccupied) {
    console.log(`❌ Position ${position} in ${zone} is already occupied`);
    return state;
  }

  const isToCourt = zone.startsWith("court-");
  const isToQueue = zone.startsWith("queue-");
  const isFromCourt = from.startsWith("court-");
  const isFromQueue = from.startsWith("queue-");
  const isFromRest = from === "rest" || from === "all";

  const existingCourt = playerToMove.status.find(
    (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
  );
  const existingQueue = playerToMove.status.find(
    (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
  );

  let newStatus: PlayerStatus[] = [];

  if (isFromQueue && isToQueue) {
    if (existingCourt) {
      newStatus = [existingCourt, zone as PlayerStatus];
    } else {
      newStatus = [zone as PlayerStatus];
    }
  } else if (isFromCourt && isToCourt) {
    if (existingQueue) {
      newStatus = [zone as PlayerStatus, existingQueue];
    } else {
      newStatus = [zone as PlayerStatus];
    }
  } else if (isFromQueue && isToCourt) {
    newStatus = [zone as PlayerStatus];
    console.log(`🔄 Queue→Court TRANSFER: ${playerToMove.name}`);
  } else if (isFromCourt && isToQueue) {
    newStatus = [zone as PlayerStatus];
    console.log(`🔄 Court→Queue TRANSFER: ${playerToMove.name}`);
  } else if (isFromRest) {
    if (isToCourt) {
      if (existingCourt) {
        newStatus = existingQueue
          ? [zone as PlayerStatus, existingQueue]
          : [zone as PlayerStatus];
      } else {
        newStatus = existingQueue
          ? [zone as PlayerStatus, existingQueue]
          : [zone as PlayerStatus];
      }
    } else if (isToQueue) {
      if (existingCourt) {
        newStatus = [existingCourt, zone as PlayerStatus];
        console.log(
          `🔥 ADVANCED QUEUEING: ${playerToMove.name} on court → queue`
        );
      } else {
        newStatus = [zone as PlayerStatus];
      }
    }
  } else if (zone === "rest" || zone === "all") {
    if (isFromCourt) {
      newStatus = existingQueue ? [existingQueue] : [];
    } else if (isFromQueue) {
      newStatus = existingCourt ? [existingCourt] : [];
    } else {
      newStatus = [];
    }
  }

  let updatedPlayer: Player = {
    ...playerToMove,
    status: newStatus,
    timeEntered:
      isToCourt && !existingCourt ? Date.now() : playerToMove.timeEntered,
    courtEnteredTime:
      isToCourt && !existingCourt
        ? Date.now()
        : !isToCourt
        ? undefined
        : playerToMove.courtEnteredTime,
  };

  if (isFromQueue && isToCourt) {
    updatedPlayer.queueOrder = null;
    updatedPlayer.courtOrder = position;
    console.log(
      `⬆️ Queue→Court transfer: ${updatedPlayer.name} → court position ${position}`
    );
  } else if (isFromCourt && isToQueue) {
    updatedPlayer.courtOrder = null;
    updatedPlayer.queueOrder = position;
    console.log(
      `⬇️ Court→Queue transfer: ${updatedPlayer.name} → queue position ${position}`
    );
  } else if (isFromRest && isToQueue && existingCourt) {
    updatedPlayer.queueOrder = position;
    console.log(
      `🔥 Advanced queueing: ${updatedPlayer.name} → queue position ${position}, keeping court`
    );
  } else if (isFromRest && isToCourt && existingQueue) {
    updatedPlayer.courtOrder = position;
    console.log(
      `🔥 Advanced queueing: ${updatedPlayer.name} → court position ${position}, keeping queue`
    );
  } else if (isToCourt) {
    updatedPlayer.courtOrder = position;
    if (!existingQueue) updatedPlayer.queueOrder = null;
    console.log(
      `📍 Court position ${position} assigned to ${updatedPlayer.name}`
    );
  } else if (isToQueue) {
    updatedPlayer.queueOrder = position;
    if (!existingCourt) updatedPlayer.courtOrder = null;
    console.log(
      `📍 Queue position ${position} assigned to ${updatedPlayer.name}`
    );
  }

  const updatedPlayers = state.players.map((p: Player) =>
    p.id === playerId ? updatedPlayer : p
  );

  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  console.log(
    `✅ Position move completed: ${updatedPlayer.name} from "${from}" → ${zone} position ${position}`
  );

  if (zone.startsWith("court-")) {
    const courtPlayers = updatedPlayers.filter((p: Player) =>
      p.status.includes(zone as PlayerStatus)
    );
    logPartnershipWarnings(zone, courtPlayers);
  } else if (zone.startsWith("queue-")) {
    const queuePlayers = updatedPlayers.filter((p: Player) =>
      p.status.includes(zone as PlayerStatus)
    );
    logPartnershipWarnings(zone, queuePlayers);
  }

  const clearedUndoGames = clearUndoDataForChangedCourts(
    state.courts.playersByCourt,
    playersByCourt,
    state.undoableGames
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
    undoableGames: clearedUndoGames,
  };
}

// Due to length constraints, I'll create a separate file for the other movement functions
// The file is getting too long. Let me create this as movementReducer.ts part 1
