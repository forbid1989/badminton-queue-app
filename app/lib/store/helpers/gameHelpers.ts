import { Player, PlayerStatus } from "../../../components/types/Player";
import { RootState, UndoGameData } from "../rootState";
import { rebuildZoneMappings } from "./zoneHelpers";

/**
 * Clears undo data for courts where player composition has changed
 */
export function clearUndoDataForChangedCourts(
  oldPlayersByCourt: Record<string, Player[]>,
  newPlayersByCourt: Record<string, Player[]>,
  undoableGames: Record<string, UndoGameData>
): Record<string, UndoGameData> {
  const updatedUndoGames = { ...undoableGames };

  Object.keys(undoableGames).forEach((courtId) => {
    const undoData = updatedUndoGames[courtId];
    if (!undoData) return;

    // Get current and original player compositions
    const originalPlayerIds = undoData.playersData.map((p) => p.id).sort();
    const currentPlayers = newPlayersByCourt[courtId] || [];
    const currentPlayerIds = currentPlayers.map((p) => p.id).sort();

    // An ended court that is still empty has not changed
    if (currentPlayers.length === 0) return;

    // Check if composition changed
    const compositionChanged =
      originalPlayerIds.length !== currentPlayerIds.length ||
      !originalPlayerIds.every((id, index) => id === currentPlayerIds[index]);

    if (compositionChanged) {
      console.log(
        `🧹 Court ${courtId} composition changed, clearing undo data`
      );
      delete updatedUndoGames[courtId];
    }
  });

  return updatedUndoGames;
}

/**
 * Withdraws Undo for any game whose players have since been placed on another court,
 * so that undoing it cannot pull them out of the game they are in now
 */
export function withdrawUndoForRelocatedPlayers(state: RootState): RootState {
  const entries = Object.entries(state.undoableGames) as [string, UndoGameData][];

  const stillValid = entries.filter(([courtId, undoData]) =>
    undoData.playersData.every(({ id }) => {
      const player = state.players.find((p) => p.id === id);
      return !player?.status.some((s) => s.startsWith("court-") && s !== courtId);
    })
  );

  if (stillValid.length === entries.length) return state;

  return { ...state, undoableGames: Object.fromEntries(stillValid) };
}

/**
 * Helper function to handle the common transfer logic from queue to court
 */
export function transferQueueToCourtHelper(
  state: RootState,
  queueId: string,
  targetCourtId: string,
  playersInQueue: Player[]
): RootState {
  console.log(`Transferring queue ${queueId} to court ${targetCourtId}`);

  const timestamp = Date.now();
  const transferredPlayerIds = new Set(playersInQueue.map((p: Player) => p.id));

  // Get existing court players (excluding ones being transferred)
  const existingCourtPlayers = state.courts.playersByCourt[targetCourtId] || [];
  const nonTransferredPlayers = existingCourtPlayers.filter(
    (p: Player) => !transferredPlayerIds.has(p.id)
  );

  // Find occupied positions
  const occupiedPositions = new Set(
    nonTransferredPlayers
      .map((p: Player) => p.courtOrder)
      .filter((pos) => pos !== null && pos !== undefined)
  );

  console.log(
    `Court ${targetCourtId} occupied positions:`,
    Array.from(occupiedPositions)
  );

  // Sort playersInQueue by their queue order to preserve order
  const sortedPlayersInQueue = [...playersInQueue].sort(
    (a, b) => (a.queueOrder || 0) - (b.queueOrder || 0)
  );

  // Create position mapping for transferred players in correct order
  const playerPositionMap = new Map<string, number>();

  const getNextAvailablePosition = (): number | null => {
    for (let position = 0; position < 4; position++) {
      if (!occupiedPositions.has(position)) {
        occupiedPositions.add(position);
        return position;
      }
    }
    // No available positions found
    console.error("❌ No available court positions - this should not happen!");
    return null;
  };

  // Assign positions to players in queue order
  sortedPlayersInQueue.forEach((player) => {
    const safePosition = getNextAvailablePosition();

    if (safePosition === null) {
      console.error(
        `❌ Cannot assign position to ${player.name} - court full!`
      );
      // Handle gracefully - could abort transfer or use fallback logic
      return; // Skip this player or implement fallback
    }

    playerPositionMap.set(player.id, safePosition);
    console.log(
      `Queue order preserved: ${player.name} (queue pos ${player.queueOrder}) → court pos ${safePosition}`
    );
  });

  if (playerPositionMap.size !== sortedPlayersInQueue.length) {
    console.error(
      "❌ Not all players could be assigned positions - aborting transfer"
    );
    return state; // Abort the entire transfer
  }

  // Update players using the position mapping
  const updatedPlayers = state.players.map((player: Player) => {
    if (transferredPlayerIds.has(player.id)) {
      const assignedPosition = playerPositionMap.get(player.id)!;

      console.log(
        `Transferring ${player.name} to ${targetCourtId} position ${assignedPosition}`
      );

      return {
        ...player,
        status: [targetCourtId as PlayerStatus],
        timeEntered: timestamp,
        queueOrder: null,
        courtOrder: assignedPosition,
        courtEnteredTime: timestamp,
      };
    }
    return player;
  });

  // Remove the transferred queue and rebuild queue IDs
  const remainingQueueIds = Object.keys(state.queue.playersByQueue)
    .filter((id) => id !== queueId)
    .sort((a, b) => {
      const numA = parseInt(a.split("-")[1]);
      const numB = parseInt(b.split("-")[1]);
      return numA - numB;
    });

  const queueIdMapping: Record<string, string> = {};
  remainingQueueIds.forEach((oldId, index) => {
    queueIdMapping[oldId] = `queue-${index}`;
  });

  const playersWithUpdatedQueueIds = updatedPlayers.map((player: Player) => {
    if (transferredPlayerIds.has(player.id)) {
      return player;
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

  const finalQueueIds = remainingQueueIds.map((_, index) => `queue-${index}`);
  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    playersWithUpdatedQueueIds,
    state.courts.count,
    finalQueueIds
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
  };
}
