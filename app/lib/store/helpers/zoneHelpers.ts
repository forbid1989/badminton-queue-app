import { Player } from "../../../components/types/Player";

/**
 * Gets the next available position in a zone (court or queue)
 */
export function getNextAvailablePosition(
  players: Player[],
  zone: string
): number {
  if (zone.startsWith("court-")) {
    const usedPositions = players
      .filter((p) => p.courtOrder !== null)
      .map((p) => p.courtOrder!);

    // Find first available position (0-3)
    for (let i = 0; i < 4; i++) {
      if (!usedPositions.includes(i)) {
        return i;
      }
    }
    return usedPositions.length; // Fallback
  } else if (zone.startsWith("queue-")) {
    const usedPositions = players
      .filter((p) => p.queueOrder !== null)
      .map((p) => p.queueOrder!);

    // Find first available position (0-3)
    for (let i = 0; i < 4; i++) {
      if (!usedPositions.includes(i)) {
        return i;
      }
    }
    return usedPositions.length; // Fallback
  }
  return 0;
}

/**
 * Clears order fields when a player leaves a zone
 */
export function clearOrderFromPlayer(player: Player, zone: string): Player {
  if (zone.startsWith("court-")) {
    return {
      ...player,
      courtOrder: null,
    };
  } else if (zone.startsWith("queue-")) {
    return {
      ...player,
      queueOrder: null,
    };
  }
  return player;
}

/**
 * Rebuilds zone mappings using order fields from player data
 * This ensures consistency between player status and zone assignments
 */
export function rebuildZoneMappings(
  players: Player[],
  courtCount: number,
  queueIds: string[]
): {
  playersByCourt: Record<string, Player[]>;
  playersByQueue: Record<string, Player[]>;
} {
  const playersByCourt: Record<string, Player[]> = {};
  const playersByQueue: Record<string, Player[]> = {};

  // Initialize empty arrays
  for (let i = 0; i < courtCount; i++) {
    playersByCourt[`court-${i}`] = [];
  }
  queueIds.forEach((queueId) => {
    playersByQueue[queueId] = [];
  });

  // Populate mappings
  players.forEach((player) => {
    const courtId = player.status.find((s) => s.startsWith("court-"));
    const queueId = player.status.find((s) => s.startsWith("queue-"));

    // Add players to court even if courtOrder is null (assign order later)
    if (courtId && playersByCourt[courtId]) {
      // If courtOrder is null, assign next available position
      if (player.courtOrder === null) {
        const existingOrders = playersByCourt[courtId]
          .filter((p) => p.courtOrder !== null)
          .map((p) => p.courtOrder!);

        // Find next available position
        let nextOrder = 0;
        while (existingOrders.includes(nextOrder) && nextOrder < 4) {
          nextOrder++;
        }

        // Create updated player with assigned order
        const updatedPlayer = { ...player, courtOrder: nextOrder };
        playersByCourt[courtId].push(updatedPlayer);

        // Update the original player in the players array (this will be reflected in the returned state)
        player.courtOrder = nextOrder;

        console.log(
          `🔧 REBUILD: Auto-assigned courtOrder ${nextOrder} to ${player.name} in ${courtId}`
        );
      } else {
        playersByCourt[courtId].push(player);
      }
    }

    // Add players to queue even if queueOrder is null (assign order later)
    if (queueId && playersByQueue[queueId]) {
      // If queueOrder is null, assign next available position
      if (player.queueOrder === null) {
        const existingOrders = playersByQueue[queueId]
          .filter((p) => p.queueOrder !== null)
          .map((p) => p.queueOrder!);

        // Find next available position
        let nextOrder = 0;
        while (existingOrders.includes(nextOrder) && nextOrder < 4) {
          nextOrder++;
        }

        // Create updated player with assigned order
        const updatedPlayer = { ...player, queueOrder: nextOrder };
        playersByQueue[queueId].push(updatedPlayer);

        // Update the original player in the players array
        player.queueOrder = nextOrder;

        console.log(
          `🔧 REBUILD: Auto-assigned queueOrder ${nextOrder} to ${player.name} in ${queueId}`
        );
      } else {
        playersByQueue[queueId].push(player);
      }
    }
  });

  // Sort by order fields
  Object.keys(playersByCourt).forEach((courtId) => {
    playersByCourt[courtId].sort(
      (a, b) => (a.courtOrder || 0) - (b.courtOrder || 0)
    );
  });

  Object.keys(playersByQueue).forEach((queueId) => {
    playersByQueue[queueId].sort(
      (a, b) => (a.queueOrder || 0) - (b.queueOrder || 0)
    );
  });

  return { playersByCourt, playersByQueue };
}

/**
 * Returns a player to the waiting list, clearing all statuses and orders
 */
export function returnPlayerToList(player: Player): Player {
  console.log(
    `🔙 Returning ${player.name} to player list - clearing all statuses and orders`
  );

  return {
    ...player,
    status: [], // Clear all statuses (return to unqueued state)
    courtOrder: null, // Clear court order
    queueOrder: null, // Clear queue order
    courtEnteredTime: undefined, // Clear court entry time
    timeEntered: Date.now(), // Reset time to current (fresh start)
  };
}
