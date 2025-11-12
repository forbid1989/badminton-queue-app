import { Player, PlayerStatus } from "../../../components/types/Player";
import { RootState } from "../rootState";
import { getNextQueueId, rebuildQueueIds } from "../helpers/queueHelpers";
import { rebuildZoneMappings } from "../helpers/zoneHelpers";
import { transferQueueToCourtHelper } from "../helpers/gameHelpers";

/**
 * Queue-related reducer actions
 * Handles: CREATE_QUEUE, REMOVE_QUEUE, TRANSFER_QUEUE_TO_COURT,
 * TRANSFER_QUEUE_TO_SPECIFIC_COURT, TRANSFER_QUEUE_TO_SPECIFIC_COURT_FROM_SUBMENU
 */

export function createQueue(state: RootState): RootState {
  const newQueueId = getNextQueueId(state);

  return {
    ...state,
    queue: {
      ...state.queue,
      count: state.queue.count + 1,
      playersByQueue: {
        ...state.queue.playersByQueue,
        [newQueueId]: [],
      },
    },
  };
}

export function removeQueue(state: RootState, queueId: string): RootState {
  // Don't allow removing the last queue
  if (Object.keys(state.queue.playersByQueue).length <= 1) {
    return state;
  }

  // Move players from deleted queue back to unqueued state and clear queue order
  const updatedPlayers = state.players.map((player: Player) => {
    if (player.status.includes(queueId as PlayerStatus)) {
      const newStatus = player.status.filter((s) => s !== queueId);
      return {
        ...player,
        status: newStatus,
        queueOrder: null, // Clear queue order when removing from queue
      };
    }
    return player;
  });

  // Remove the queue and rebuild IDs
  const { [queueId]: removedQueue, ...remainingQueues } =
    state.queue.playersByQueue;
  const rebuiltQueues = rebuildQueueIds(remainingQueues);

  // Update player statuses to match new queue IDs
  const oldToNewQueueMap: Record<string, string> = {};
  Object.keys(remainingQueues).forEach((oldId, index) => {
    oldToNewQueueMap[oldId] = `queue-${index}`;
  });

  const playersWithUpdatedQueueIds = updatedPlayers.map((player: Player) => {
    const newStatus = player.status.map((s) => {
      if (s.startsWith("queue-") && oldToNewQueueMap[s]) {
        return oldToNewQueueMap[s] as PlayerStatus;
      }
      return s;
    });
    return {
      ...player,
      status: newStatus,
    };
  });

  // Rebuild using order fields
  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    playersWithUpdatedQueueIds,
    state.courts.count,
    Object.keys(rebuiltQueues)
  );

  return {
    ...state,
    players: playersWithUpdatedQueueIds,
    courts: {
      ...state.courts,
      playersByCourt,
    },
    queue: {
      count: Object.keys(rebuiltQueues).length,
      playersByQueue,
    },
  };
}

export function transferQueueToCourt(
  state: RootState,
  queueId: string
): RootState {
  console.log("🚀 TRANSFER_QUEUE_TO_COURT started:", { queueId });

  // Step 1: Extract players in the queue - Use zone mapping directly
  const playersInQueue: Player[] =
    state.queue.playersByQueue[queueId] || [];
  console.log(
    "👥 Players in queue:",
    playersInQueue.map((p: Player) => p.name)
  );

  if (playersInQueue.length === 0) {
    console.log("❌ No players in queue, aborting transfer");
    return state;
  }

  // Step 2: Check if any player is already on a court (should prevent transfer)
  const hasPlayerOnCourt = playersInQueue.some((player: Player) =>
    player.status.some((s: PlayerStatus) => s.startsWith("court-"))
  );

  if (hasPlayerOnCourt) {
    console.log("❌ Some players already on court, aborting transfer");
    return state;
  }

  // Step 3: Find available court - Use zone mapping for accurate count
  const courtOccupancy: Record<string, number> = {};

  // Initialize all courts
  for (let i = 0; i < state.courts.count; i++) {
    const courtId = `court-${i}`;
    courtOccupancy[courtId] = (
      state.courts.playersByCourt[courtId] || []
    ).length;
  }

  console.log("🏟️ Court occupancy:", courtOccupancy);

  // Find first available court that can fit all players
  const availableCourtId = Object.entries(courtOccupancy).find(
    ([courtId, currentCount]) => currentCount + playersInQueue.length <= 4
  )?.[0];

  if (!availableCourtId) {
    console.log("❌ No available court found");
    return state;
  }

  // Use the common transfer logic
  return transferQueueToCourtHelper(
    state,
    queueId,
    availableCourtId,
    playersInQueue
  );
}

export function transferQueueToSpecificCourt(
  state: RootState,
  queueId: string,
  targetCourtId: string
): RootState {
  console.log("🎯 TRANSFER_QUEUE_TO_SPECIFIC_COURT started:", {
    queueId,
    targetCourtId,
  });

  // Step 1: Extract players in the queue
  const playersInQueue: Player[] =
    state.queue.playersByQueue[queueId] || [];

  if (playersInQueue.length === 0) {
    console.log("❌ No players in queue, aborting transfer");
    return state;
  }

  // Step 2: Check if any player is already on a court
  const hasPlayerOnCourt = playersInQueue.some((player: Player) =>
    player.status.some((s: PlayerStatus) => s.startsWith("court-"))
  );

  if (hasPlayerOnCourt) {
    console.log("❌ Some players already on court, aborting transfer");
    return state;
  }

  // Step 3: Validate target court can accommodate all players
  const currentCourtPlayers =
    state.courts.playersByCourt[targetCourtId] || [];
  if (currentCourtPlayers.length + playersInQueue.length > 4) {
    console.log(
      `❌ Target court ${targetCourtId} cannot fit ${playersInQueue.length} players`
    );
    return state;
  }

  // Use the common transfer logic
  return transferQueueToCourtHelper(
    state,
    queueId,
    targetCourtId,
    playersInQueue
  );
}

export function transferQueueToSpecificCourtFromSubmenu(
  state: RootState,
  queueId: string,
  targetCourtId: string
): RootState {
  console.log(
    "🎯 REDUCER: TRANSFER_QUEUE_TO_SPECIFIC_COURT_FROM_SUBMENU started:",
    { queueId, targetCourtId }
  );

  // Validation: Check if inputs are valid
  if (!queueId || !targetCourtId) {
    console.warn("⚠️ REDUCER: Invalid queueId or targetCourtId provided");
    return state;
  }

  // Validation: Check if queue exists and has players
  const playersInQueue = state.queue.playersByQueue[queueId] || [];
  if (playersInQueue.length === 0) {
    console.warn(
      `⚠️ REDUCER: Queue ${queueId} is empty, nothing to transfer`
    );
    return state;
  }

  // Validation: Check if target court exists
  const validCourtIds = Object.keys(state.courts.playersByCourt);
  if (!validCourtIds.includes(targetCourtId)) {
    console.warn(
      `⚠️ REDUCER: Target court ${targetCourtId} does not exist`
    );
    return state;
  }

  // Validation: Check if any queue player is already on a court (advanced queueing check)
  const hasPlayerOnCourt = playersInQueue.some((player: Player) =>
    player.status.some((s: PlayerStatus) => s.startsWith("court-"))
  );

  if (hasPlayerOnCourt) {
    console.warn(
      "⚠️ REDUCER: Some players in queue are already on court, aborting transfer"
    );
    return state;
  }

  // Strict capacity check: Prevent overflow completely
  const currentCourtPlayers =
    state.courts.playersByCourt[targetCourtId] || [];
  const totalPlayersAfterTransfer =
    currentCourtPlayers.length + playersInQueue.length;

  if (totalPlayersAfterTransfer > 4) {
    console.warn(
      `❌ REDUCER: Transfer rejected - would cause overflow. ` +
        `Court ${targetCourtId} has ${currentCourtPlayers.length} players, ` +
        `queue has ${playersInQueue.length} players ` +
        `(total would be ${totalPlayersAfterTransfer}/4). Transfer aborted.`
    );
    return state; // Abort: Don't allow overflow
  }

  console.log(
    `🚀 Transferring ${playersInQueue.length} players from ${queueId} to ${targetCourtId}. ` +
      `Court currently has ${currentCourtPlayers.length} players. ` +
      `Final count will be ${totalPlayersAfterTransfer}/4.`
  );

  // Existing player protection: Get existing players and their positions
  const transferredPlayerIds = new Set(
    playersInQueue.map((p: Player) => p.id)
  );

  // Find occupied positions by existing players (ones not being transferred)
  const occupiedPositions = new Set(
    currentCourtPlayers
      .filter((p: Player) => !transferredPlayerIds.has(p.id)) // Only non-transferred players
      .map((p: Player) => p.courtOrder)
      .filter((pos) => pos !== null && pos !== undefined)
  );

  console.log(
    `🏟️ Court ${targetCourtId} occupied positions by existing players:`,
    Array.from(occupiedPositions)
  );

  // Preserve queue order: Sort players by their queue order
  const sortedQueuePlayers = [...playersInQueue].sort(
    (a, b) => (a.queueOrder || 0) - (b.queueOrder || 0)
  );

  // Position assignment: Create position mapping for queue players (0-3 only)
  const playerPositionMap = new Map<string, number>();

  const getNextAvailablePosition = (): number | null => {
    for (let position = 0; position < 4; position++) {
      // Strict: Only positions 0-3
      if (!occupiedPositions.has(position)) {
        occupiedPositions.add(position);
        return position;
      }
    }
    return null; // No available positions
  };

  // Assign positions to queue players in order
  sortedQueuePlayers.forEach((player) => {
    const assignedPosition = getNextAvailablePosition();

    if (assignedPosition === null) {
      console.error(
        `❌ CRITICAL: No available position for ${player.name} - this should not happen!`
      );
      return; // This should never happen due to our capacity check above
    }

    playerPositionMap.set(player.id, assignedPosition);
    console.log(
      `📍 Position assignment: ${player.name} (queue pos ${player.queueOrder}) → court pos ${assignedPosition}`
    );
  });

  // Final validation: Ensure all players got positions
  if (playerPositionMap.size !== sortedQueuePlayers.length) {
    console.error(
      "❌ CRITICAL: Not all players could be assigned positions - aborting transfer"
    );
    return state;
  }

  // Update players: Transfer queue players to court
  const timestamp = Date.now();
  const updatedPlayers = state.players.map((player: Player) => {
    if (transferredPlayerIds.has(player.id)) {
      const assignedPosition = playerPositionMap.get(player.id)!;

      console.log(
        `🎯 Transferring ${player.name} to ${targetCourtId} position ${assignedPosition}`
      );

      return {
        ...player,
        status: [targetCourtId as PlayerStatus], // Move from queue to court
        timeEntered: timestamp,
        queueOrder: null, // Clear queue order
        courtOrder: assignedPosition, // Set court position
        courtEnteredTime: timestamp, // Set court entry time
      };
    }
    return player; // No change for other players
  });

  // Queue cleanup: Remove the transferred queue and reindex remaining queues
  const remainingQueueIds = Object.keys(state.queue.playersByQueue)
    .filter((id) => id !== queueId)
    .sort((a, b) => {
      const numA = parseInt(a.split("-")[1]);
      const numB = parseInt(b.split("-")[1]);
      return numA - numB;
    });

  // Create mapping for queue ID updates
  const queueIdMapping: Record<string, string> = {};
  remainingQueueIds.forEach((oldId, index) => {
    queueIdMapping[oldId] = `queue-${index}`;
  });

  // Update remaining players' queue IDs
  const playersWithUpdatedQueueIds = updatedPlayers.map((player: Player) => {
    if (transferredPlayerIds.has(player.id)) {
      return player; // Already updated above
    }

    const newStatus = player.status.map((s) => {
      if (s.startsWith("queue-") && queueIdMapping[s]) {
        return queueIdMapping[s] as PlayerStatus;
      }
      return s;
    });

    return {
      ...player,
      status: newStatus,
    };
  });

  // Rebuild mappings: Use the helper function to rebuild all zone mappings
  const finalQueueIds = remainingQueueIds.map(
    (_, index) => `queue-${index}`
  );
  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    playersWithUpdatedQueueIds,
    state.courts.count,
    finalQueueIds
  );

  // Undo data cleanup: Clear undo data for the affected court
  const updatedUndoGames = { ...state.undoableGames };
  if (updatedUndoGames[targetCourtId]) {
    console.log(
      `🧹 Clearing undo data for ${targetCourtId} due to queue transfer`
    );
    delete updatedUndoGames[targetCourtId];
  }

  console.log("✅ REDUCER: Queue to court transfer completed successfully");
  console.log(
    `📊 Final state: Court ${targetCourtId} now has ${
      (playersByCourt[targetCourtId] || []).length
    }/4 players`
  );

  return {
    ...state,
    players: playersWithUpdatedQueueIds,
    courts: {
      ...state.courts,
      playersByCourt,
    },
    queue: {
      count: Object.keys(playersByQueue).length,
      playersByQueue,
    },
    undoableGames: updatedUndoGames,
  };
}
