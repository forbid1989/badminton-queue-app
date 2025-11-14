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

// ========================================
// MOVE_PLAYER_TO_POSITION
// ========================================
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

  // RULE 1: Moving between queue boxes - just replace the queue
  if (isFromQueue && isToQueue) {
    if (existingCourt) {
      newStatus = [existingCourt, zone as PlayerStatus];
    } else {
      newStatus = [zone as PlayerStatus];
    }
  }
  // RULE 2: Moving between court boxes - just replace the court
  else if (isFromCourt && isToCourt) {
    if (existingQueue) {
      newStatus = [zone as PlayerStatus, existingQueue];
    } else {
      newStatus = [zone as PlayerStatus];
    }
  }
  // RULE 3: Moving from queue to court - MOVE not duplicate (TRANSFER)
  else if (isFromQueue && isToCourt) {
    newStatus = [zone as PlayerStatus];
    console.log(`🔄 Queue→Court TRANSFER: ${playerToMove.name}`);
  }
  // RULE 4: Moving from court to queue - MOVE not duplicate (TRANSFER)
  else if (isFromCourt && isToQueue) {
    newStatus = [zone as PlayerStatus];
    console.log(`🔄 Court→Queue TRANSFER: ${playerToMove.name}`);
  }
  // RULE 5: Moving from rest/player list (ADVANCED QUEUEING POSSIBLE)
  else if (isFromRest) {
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
  }
  // RULE 6: Moving back to rest - only remove the specific status being moved FROM
  else if (zone === "rest" || zone === "all") {
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

  // Handle order fields with EXACT POSITION assignment
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

  const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  console.log(
    `✅ Position move completed: ${updatedPlayer.name} from "${from}" → ${zone} position ${position}`
  );

  if (zone.startsWith("court-")) {
    const courtPlayers = finalPlayers.filter((p: Player) =>
      p.status.includes(zone as PlayerStatus)
    );
    logPartnershipWarnings(zone, courtPlayers);
  } else if (zone.startsWith("queue-")) {
    const queuePlayers = finalPlayers.filter((p: Player) =>
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
    players: finalPlayers,
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

// ========================================
// MOVE_PLAYER
// ========================================
export function movePlayer(
  state: RootState,
  id: string,
  from: string,
  to: string
): RootState {
  const playerToMove = state.players.find((p: Player) => p.id === id);
  if (!playerToMove) return state;

  console.log(
    `🎯 MOVE_PLAYER: ${playerToMove.name} from "${from}" to "${to}" (no auto-positioning)`
  );

  // SPECIAL CASE: Moving TO the player list (zone "all" or "rest")
  if (to === "all" || to === "rest") {
    console.log(
      `🔙 PARTIAL RETURN TO PLAYER LIST: ${playerToMove.name} from "${from}"`
    );

    const isFromCourt = from.startsWith("court-");
    const isFromQueue = from.startsWith("queue-");

    const existingCourt = playerToMove.status.find(
      (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
    );
    const existingQueue = playerToMove.status.find(
      (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
    );

    let newStatus: PlayerStatus[] = [];
    let updatedPlayer = { ...playerToMove };

    if (isFromCourt) {
      newStatus = existingQueue ? [existingQueue] : [];
      updatedPlayer.courtOrder = null;
      updatedPlayer.courtEnteredTime = undefined;
      console.log(
        `🔄 Removed court status, ${
          existingQueue ? "keeping queue" : "no queue to keep"
        }`
      );
    } else if (isFromQueue) {
      newStatus = existingCourt ? [existingCourt] : [];
      updatedPlayer.queueOrder = null;
      console.log(
        `🔄 Removed queue status, ${
          existingCourt ? "keeping court" : "no court to keep"
        }`
      );
    } else {
      newStatus = [];
      updatedPlayer.courtOrder = null;
      updatedPlayer.queueOrder = null;
      updatedPlayer.courtEnteredTime = undefined;
      updatedPlayer.timeEntered = Date.now();
      console.log(`🔄 Full return to player list - cleared all statuses`);
    }

    updatedPlayer.status = newStatus;

    const updatedPlayers = state.players.map((p: Player) =>
      p.id === id ? updatedPlayer : p
    );

    const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
      updatedPlayers,
      state.courts.count,
      Object.keys(state.queue.playersByQueue)
    );

    console.log(
      `✅ Successfully returned ${
        updatedPlayer.name
      } from ${from} to player list, remaining status: ${JSON.stringify(
        updatedPlayer.status
      )}`
    );

    return {
      ...state,
      players: finalPlayers,
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

  const isToCourt = to.startsWith("court-");
  const isToQueue = to.startsWith("queue-");
  const isFromCourt = from.startsWith("court-");
  const isFromQueue = from.startsWith("queue-");
  const isFromRest = from === "rest" || from === "all";

  // Prevent overfilling courts/queues (max 4)
  const playersInTarget = state.players.filter((p: Player) =>
    p.status.includes(to as PlayerStatus)
  );
  if (playersInTarget.length >= 4) {
    console.log(`❌ Zone ${to} is full (${playersInTarget.length}/4)`);
    return state;
  }

  const existingCourt = playerToMove.status.find(
    (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
  );
  const existingQueue = playerToMove.status.find(
    (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
  );

  let newStatus: PlayerStatus[] = [];

  if (isFromQueue && isToQueue) {
    if (existingCourt) {
      newStatus = [existingCourt, to as PlayerStatus];
    } else {
      newStatus = [to as PlayerStatus];
    }
  } else if (isFromCourt && isToCourt) {
    if (existingQueue) {
      newStatus = [to as PlayerStatus, existingQueue];
    } else {
      newStatus = [to as PlayerStatus];
    }
  } else if (isFromQueue && isToCourt) {
    newStatus = [to as PlayerStatus];
  } else if (isFromCourt && isToQueue) {
    newStatus = [to as PlayerStatus];
  } else if (isFromRest) {
    if (isToCourt) {
      if (existingCourt) {
        newStatus = existingQueue
          ? [to as PlayerStatus, existingQueue]
          : [to as PlayerStatus];
      } else {
        newStatus = existingQueue
          ? [to as PlayerStatus, existingQueue]
          : [to as PlayerStatus];
      }
    } else if (isToQueue) {
      if (existingCourt) {
        newStatus = [existingCourt, to as PlayerStatus];
      } else {
        newStatus = [to as PlayerStatus];
      }
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

  if (isFromCourt) {
    updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
    console.log(`🧹 Cleared court order for ${updatedPlayer.name}`);
  } else if (isFromQueue) {
    updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
    console.log(`🧹 Cleared queue order for ${updatedPlayer.name}`);
  }

  console.log(
    `🎯 Player ${updatedPlayer.name} moved to ${to} - no position assigned (zone drop only)`
  );

  const updatedPlayers = state.players.map((p: Player) =>
    p.id === id ? updatedPlayer : p
  );

  const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  console.log(
    `✅ Move completed: ${updatedPlayer.name} status=${JSON.stringify(
      updatedPlayer.status
    )} court=${updatedPlayer.courtOrder} queue=${updatedPlayer.queueOrder}`
  );

  if (isToCourt || (isFromCourt && to.startsWith("court-"))) {
    const targetCourtId = isToCourt ? to : isFromCourt ? from : "";
    if (targetCourtId.startsWith("court-")) {
      const courtPlayers = finalPlayers.filter((p: Player) =>
        p.status.includes(targetCourtId as PlayerStatus)
      );
      logPartnershipWarnings(targetCourtId, courtPlayers);
    }
  }

  if (isToQueue || (isFromQueue && to.startsWith("queue-"))) {
    const targetQueueId = isToQueue ? to : isFromQueue ? from : "";
    if (targetQueueId.startsWith("queue-")) {
      const queuePlayers = finalPlayers.filter((p: Player) =>
        p.status.includes(targetQueueId as PlayerStatus)
      );
      logPartnershipWarnings(targetQueueId, queuePlayers);
    }
  }

  const clearedUndoGames = clearUndoDataForChangedCourts(
    state.courts.playersByCourt,
    playersByCourt,
    state.undoableGames
  );

  return {
    ...state,
    players: finalPlayers,
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

// ========================================
// QUICK_MOVE_PLAYER
// ========================================
export function quickMovePlayer(
  state: RootState,
  id: string,
  from: string,
  to: string
): RootState {
  const playerToMove = state.players.find((p: Player) => p.id === id);
  if (!playerToMove) return state;

  console.log(
    `🚀 QUICK_MOVE_PLAYER: ${playerToMove.name} from "${from}" to "${to}" (with auto-positioning)`
  );

  // SPECIAL CASE: Moving TO the player list (zone "all" or "rest")
  if (to === "all" || to === "rest") {
    console.log(
      `🔙 QUICK RETURN TO PLAYER LIST: ${playerToMove.name} from "${from}"`
    );

    const updatedPlayer = returnPlayerToList(playerToMove);

    const updatedPlayers = state.players.map((p: Player) =>
      p.id === id ? updatedPlayer : p
    );

    const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
      updatedPlayers,
      state.courts.count,
      Object.keys(state.queue.playersByQueue)
    );

    console.log(
      `✅ Successfully quick-returned ${updatedPlayer.name} to player list`
    );

    return {
      ...state,
      players: finalPlayers,
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

  const isToCourt = to.startsWith("court-");
  const isToQueue = to.startsWith("queue-");
  const isFromCourt = from.startsWith("court-");
  const isFromQueue = from.startsWith("queue-");
  const isFromRest = from === "rest" || from === "all";

  // Prevent overfilling courts/queues (max 4)
  const playersInTarget = state.players.filter((p: Player) =>
    p.status.includes(to as PlayerStatus)
  );
  if (playersInTarget.length >= 4) {
    console.log(`❌ Zone ${to} is full (${playersInTarget.length}/4)`);
    return state;
  }

  const existingCourt = playerToMove.status.find(
    (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
  );
  const existingQueue = playerToMove.status.find(
    (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
  );

  let newStatus: PlayerStatus[] = [];

  if (isFromQueue && isToQueue) {
    if (existingCourt) {
      newStatus = [existingCourt, to as PlayerStatus];
    } else {
      newStatus = [to as PlayerStatus];
    }
  } else if (isFromCourt && isToCourt) {
    if (existingQueue) {
      newStatus = [to as PlayerStatus, existingQueue];
    } else {
      newStatus = [to as PlayerStatus];
    }
  } else if (isFromQueue && isToCourt) {
    newStatus = [to as PlayerStatus];
  } else if (isFromCourt && isToQueue) {
    newStatus = [to as PlayerStatus];
  } else if (isFromRest) {
    if (isToCourt) {
      if (existingCourt) {
        newStatus = existingQueue
          ? [to as PlayerStatus, existingQueue]
          : [to as PlayerStatus];
      } else {
        newStatus = existingQueue
          ? [to as PlayerStatus, existingQueue]
          : [to as PlayerStatus];
      }
    } else if (isToQueue) {
      if (existingCourt) {
        newStatus = [existingCourt, to as PlayerStatus];
      } else {
        newStatus = [to as PlayerStatus];
      }
    }
  }

  // AUTOMATIC POSITION ASSIGNMENT for quick moves
  let assignedPosition: number | null = null;
  if (isToCourt || isToQueue) {
    const currentTargetZonePlayers = state.players.filter(
      (p: Player) => p.status.includes(to as PlayerStatus) && p.id !== id
    );
    assignedPosition = getNextAvailablePosition(
      currentTargetZonePlayers,
      to
    );
    console.log(
      `🏷️ Auto-assigned position ${assignedPosition} for ${playerToMove.name} in ${to} (${currentTargetZonePlayers.length} existing players)`
    );
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

  if (isFromCourt) {
    updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
    updatedPlayer.courtEnteredTime = undefined;
    console.log(`🧹 Cleared court order for ${updatedPlayer.name}`);
  } else if (isFromQueue) {
    updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
    console.log(`🧹 Cleared queue order for ${updatedPlayer.name}`);
  }

  if (isToCourt && assignedPosition !== null) {
    updatedPlayer.courtOrder = assignedPosition;
    console.log(
      `🏷️ Assigned court position ${assignedPosition} to ${updatedPlayer.name}`
    );
  } else if (isToQueue && assignedPosition !== null) {
    updatedPlayer.queueOrder = assignedPosition;
    console.log(
      `🏷️ Assigned queue position ${assignedPosition} to ${updatedPlayer.name}`
    );
  }

  if (isFromQueue && isToQueue && from !== to) {
    updatedPlayer.queueOrder = assignedPosition;
    console.log(
      `🔄 Queue-to-queue move: ${updatedPlayer.name} now at queue position ${assignedPosition}`
    );
  } else if (isFromCourt && isToCourt && from !== to) {
    updatedPlayer.courtOrder = assignedPosition;
    console.log(
      `🔄 Court-to-court move: ${updatedPlayer.name} now at court position ${assignedPosition}`
    );
  } else if (isFromQueue && isToCourt) {
    updatedPlayer.queueOrder = null;
    updatedPlayer.courtOrder = assignedPosition;
    console.log(
      `⬆️ Queue-to-court: ${updatedPlayer.name} cleared queue order, assigned court position ${assignedPosition}`
    );
  } else if (isFromCourt && isToQueue) {
    updatedPlayer.courtOrder = null;
    updatedPlayer.courtEnteredTime = undefined;
    updatedPlayer.queueOrder = assignedPosition;
    console.log(
      `⬇️ Court-to-queue: ${updatedPlayer.name} cleared court order, assigned queue position ${assignedPosition}`
    );
  }

  const updatedPlayers = state.players.map((p: Player) =>
    p.id === id ? updatedPlayer : p
  );

  const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  const tempState = {
    ...state,
    players: finalPlayers,
    queue: {
      ...state.queue,
      playersByQueue,
    },
  };

  let finalPlayersByQueue = playersByQueue;
  if (isToQueue && shouldAutoCreateQueue(tempState)) {
    const newQueueId = getNextQueueId(tempState);
    finalPlayersByQueue = { ...playersByQueue, [newQueueId]: [] };
    console.log(`🆕 Auto-created new queue: ${newQueueId}`);
  }

  console.log(
    `✅ Quick move completed: ${updatedPlayer.name} status=${JSON.stringify(
      updatedPlayer.status
    )} court=${updatedPlayer.courtOrder} queue=${updatedPlayer.queueOrder}`
  );

  if (isToCourt) {
    const courtPlayers = finalPlayers.filter((p: Player) =>
      p.status.includes(to as PlayerStatus)
    );
    logPartnershipWarnings(to, courtPlayers);
  } else if (isToQueue) {
    const queuePlayers = finalPlayers.filter((p: Player) =>
      p.status.includes(to as PlayerStatus)
    );
    logPartnershipWarnings(to, queuePlayers);
  }

  const clearedUndoGames = clearUndoDataForChangedCourts(
    state.courts.playersByCourt,
    playersByCourt,
    state.undoableGames
  );

  return {
    ...state,
    players: finalPlayers,
    courts: {
      ...state.courts,
      playersByCourt,
    },
    queue: {
      ...state.queue,
      count: Object.keys(finalPlayersByQueue).length,
      playersByQueue: finalPlayersByQueue,
    },
    undoableGames: clearedUndoGames,
  };
}

// ========================================
// SWAP_PLAYERS
// ========================================
export function swapPlayers(
  state: RootState,
  playerId1: string,
  playerId2: string,
  zone: string
): RootState {
  console.log("🔄 REDUCER: SWAP_PLAYERS action received");

  const player1 = state.players.find((p: Player) => p.id === playerId1);
  const player2 = state.players.find((p: Player) => p.id === playerId2);

  if (!player1 || !player2) {
    console.warn("❌ REDUCER: Cannot swap: one or both players not found");
    return state;
  }

  const player1InZone = player1.status.includes(zone as PlayerStatus);
  const player2InZone = player2.status.includes(zone as PlayerStatus);

  if (!player1InZone || !player2InZone) {
    console.warn("❌ REDUCER: Cannot swap: players not in the same zone");
    return state;
  }

  let updatedPlayer1 = { ...player1 };
  let updatedPlayer2 = { ...player2 };

  if (zone.startsWith("court-")) {
    const temp = updatedPlayer1.courtOrder;
    updatedPlayer1.courtOrder = updatedPlayer2.courtOrder;
    updatedPlayer2.courtOrder = temp;
    console.log(
      `🔄 Swapped court orders: ${player1.name} (${temp} → ${updatedPlayer1.courtOrder}) ↔ ${player2.name}`
    );
  } else if (zone.startsWith("queue-")) {
    const temp = updatedPlayer1.queueOrder;
    updatedPlayer1.queueOrder = updatedPlayer2.queueOrder;
    updatedPlayer2.queueOrder = temp;
    console.log(
      `🔄 Swapped queue orders: ${player1.name} (${temp} → ${updatedPlayer1.queueOrder}) ↔ ${player2.name}`
    );
  }

  const updatedPlayers = state.players.map((p: Player) => {
    if (p.id === playerId1) return updatedPlayer1;
    if (p.id === playerId2) return updatedPlayer2;
    return p;
  });

  const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  console.log("✅ REDUCER: Swap completed successfully");

  return {
    ...state,
    players: finalPlayers,
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

// ========================================
// SWAP_PLAYERS_CROSS_ZONE
// ========================================
export function swapPlayersCrossZone(
  state: RootState,
  playerId1: string,
  zone1: string,
  playerId2: string,
  zone2: string
): RootState {
  console.log(
    "🔄 REDUCER: SWAP_PLAYERS_CROSS_ZONE action received"
  );

  const player1 = state.players.find((p: Player) => p.id === playerId1);
  const player2 = state.players.find((p: Player) => p.id === playerId2);

  if (!player1 || !player2) {
    console.warn("❌ REDUCER: Cannot swap: one or both players not found");
    return state;
  }

  const player1InZone1 = player1.status.includes(zone1 as PlayerStatus);
  const player2InZone2 = player2.status.includes(zone2 as PlayerStatus);

  if (!player1InZone1 || !player2InZone2) {
    console.warn("❌ REDUCER: Cannot swap: players not in expected zones");
    return state;
  }

  console.log(
    `🔄 Cross-zone swap: ${player1.name} (${zone1}) ↔ ${player2.name} (${zone2})`
  );

  const updatePlayerForCrossZoneSwap = (
    player: Player,
    fromZone: string,
    toZone: string,
    targetPosition: number | null
  ): Player => {
    const isFromCourt = fromZone.startsWith("court-");
    const isFromQueue = fromZone.startsWith("queue-");
    const isToCourt = toZone.startsWith("court-");
    const isToQueue = toZone.startsWith("queue-");

    const existingCourt = player.status.find((s) => s.startsWith("court-"));
    const existingQueue = player.status.find((s) => s.startsWith("queue-"));

    let newStatus: PlayerStatus[] = [];

    if (isFromCourt && isToCourt) {
      newStatus = existingQueue
        ? [toZone as PlayerStatus, existingQueue]
        : [toZone as PlayerStatus];
    } else if (isFromQueue && isToQueue) {
      newStatus = existingCourt
        ? [existingCourt, toZone as PlayerStatus]
        : [toZone as PlayerStatus];
    } else if (isFromCourt && isToQueue) {
      newStatus = [toZone as PlayerStatus];
    } else if (isFromQueue && isToCourt) {
      newStatus = [toZone as PlayerStatus];
    }

    let updatedPlayer: Player = {
      ...player,
      status: newStatus,
    };

    if (isFromCourt && isToCourt) {
      updatedPlayer.courtOrder = targetPosition;
    } else if (isFromQueue && isToQueue) {
      updatedPlayer.queueOrder = targetPosition;
    } else if (isFromCourt && isToQueue) {
      updatedPlayer.courtOrder = null;
      updatedPlayer.queueOrder = targetPosition;
      updatedPlayer.courtEnteredTime = undefined;
    } else if (isFromQueue && isToCourt) {
      updatedPlayer.queueOrder = null;
      updatedPlayer.courtOrder = targetPosition;
      updatedPlayer.courtEnteredTime = Date.now();
    }

    return updatedPlayer;
  };

  let player1TargetPosition: number | null = null;
  let player2TargetPosition: number | null = null;

  if (zone1.startsWith("court-")) {
    player1TargetPosition = player1.courtOrder;
  } else if (zone1.startsWith("queue-")) {
    player1TargetPosition = player1.queueOrder;
  }

  if (zone2.startsWith("court-")) {
    player2TargetPosition = player2.courtOrder;
  } else if (zone2.startsWith("queue-")) {
    player2TargetPosition = player2.queueOrder;
  }

  const updatedPlayer1 = updatePlayerForCrossZoneSwap(
    player1,
    zone1,
    zone2,
    player2TargetPosition
  );
  const updatedPlayer2 = updatePlayerForCrossZoneSwap(
    player2,
    zone2,
    zone1,
    player1TargetPosition
  );

  console.log(`✅ Cross-zone swap completed`);

  const updatedPlayers = state.players.map((p: Player) => {
    if (p.id === playerId1) return updatedPlayer1;
    if (p.id === playerId2) return updatedPlayer2;
    return p;
  });

  const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  console.log("✅ REDUCER: Cross-zone swap completed successfully");

  return {
    ...state,
    players: finalPlayers,
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

// ========================================
// REPLACE_PLAYER
// ========================================
export function replacePlayer(
  state: RootState,
  sourcePlayerId: string,
  sourceZone: string,
  targetPlayerId: string,
  targetZone: string
): RootState {
  console.log(
    "🔄 REDUCER: REPLACE_PLAYER action received"
  );

  const sourcePlayer = state.players.find(
    (p: Player) => p.id === sourcePlayerId
  );
  const targetPlayer = state.players.find(
    (p: Player) => p.id === targetPlayerId
  );

  if (!sourcePlayer || !targetPlayer) {
    console.warn(
      "⚠️ REDUCER: Cannot replace: one or both players not found"
    );
    return state;
  }

  const isSourceFromPlayerList = sourceZone === "all";
  const isTargetInCourtOrQueue =
    targetZone.startsWith("court-") || targetZone.startsWith("queue-");

  if (!isSourceFromPlayerList || !isTargetInCourtOrQueue) {
    console.warn(
      "⚠️ REDUCER: Invalid replacement: source must be from player list, target must be in court/queue"
    );
    return state;
  }

  console.log(
    `🔄 Replacement: ${sourcePlayer.name} (player list) → replacing ${targetPlayer.name} (${targetZone})`
  );

  let targetPosition: number | null = null;
  if (targetZone.startsWith("court-")) {
    targetPosition = targetPlayer.courtOrder;
  } else if (targetZone.startsWith("queue-")) {
    targetPosition = targetPlayer.queueOrder;
  }

  console.log(`🎯 Target position: ${targetPosition} in ${targetZone}`);

  let updatedSourcePlayer: Player = {
    ...sourcePlayer,
    status: [...targetPlayer.status] as PlayerStatus[],
    timeEntered: targetZone.startsWith("court-")
      ? Date.now()
      : sourcePlayer.timeEntered,
    courtEnteredTime: targetZone.startsWith("court-")
      ? Date.now()
      : undefined,
  };

  let updatedTargetPlayer: Player = {
    ...targetPlayer,
    status: [],
    timeEntered: Date.now(),
    courtEnteredTime: undefined,
    courtOrder: null,
    queueOrder: null,
  };

  if (targetZone.startsWith("court-")) {
    updatedSourcePlayer.courtOrder = targetPosition;
    updatedSourcePlayer.queueOrder = targetPlayer.queueOrder;
  } else if (targetZone.startsWith("queue-")) {
    updatedSourcePlayer.queueOrder = targetPosition;
    updatedSourcePlayer.courtOrder = targetPlayer.courtOrder;
  }

  console.log(`✅ Replacement details:
  Source (${sourcePlayer.name}): player list → ${targetZone}
  Target (${targetPlayer.name}): ${targetZone} → player list`);

  const updatedPlayers = state.players.map((p: Player) => {
    if (p.id === sourcePlayerId) return updatedSourcePlayer;
    if (p.id === targetPlayerId) return updatedTargetPlayer;
    return p;
  });

  const { playersByCourt, playersByQueue, updatedPlayers: finalPlayers } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  console.log("✅ REDUCER: Replacement completed successfully");

  return {
    ...state,
    players: finalPlayers,
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
