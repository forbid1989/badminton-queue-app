import { ActionType } from "./Action";
import {
  Player,
  PlayerStatus,
  SkillLevel,
} from "../../components/types/Player";
import { UndoGameData } from "./rootState";
import { clearLocalStorage } from "../utils/localStorage";
import { generateMatchHistoryEntries } from "../utils/matchHistoryUtils";
import { PlayerListSortConfig } from "../../components/types/Settings";

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
    };

function logPartnershipWarnings(zoneId: string, players: Player[]): void {
  if (players.length < 2) {
    return;
  }

  const warnings: string[] = [];
  let hasExcessivePartnerships = false;
  let hasExcessiveOppositions = false;

  // Check partnerships between positions 0&2 and 1&3
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const player1 = players[i];
      const player2 = players[j];

      // Check if they're teammates (positions 0&2 or 1&3)
      const areTeammates =
        (i === 0 && j === 2) || // positions 0,2
        (i === 1 && j === 3); // positions 1,3

      // Check if they're opponents (positions 0,1 vs 2,3)
      const areOpponents =
        (i === 0 && (j === 2 || j === 3)) || // pos 0 vs pos 2,3
        (i === 1 && (j === 2 || j === 3)) || // pos 1 vs pos 2,3
        (i === 2 && (j === 0 || j === 1)) || // pos 2 vs pos 0,1
        (i === 3 && (j === 0 || j === 1)); // pos 3 vs pos 0,1

      if (areTeammates) {
        const count1 = (player1.matchHistory || []).filter(
          (match) => match.partner?.id === player2.id
        ).length;
        const count2 = (player2.matchHistory || []).filter(
          (match) => match.partner?.id === player1.id
        ).length;
        const maxCount = Math.max(count1, count2);

        if (maxCount >= 2) {
          hasExcessivePartnerships = true;
          warnings.push(
            `PARTNERSHIP: ${player1.name} & ${player2.name} have partnered ${maxCount} times`
          );
        }
      }

      if (areOpponents) {
        const count1 = (player1.matchHistory || []).filter((match) =>
          match.opponents.some((opp) => opp.id === player2.id)
        ).length;
        const count2 = (player2.matchHistory || []).filter((match) =>
          match.opponents.some((opp) => opp.id === player1.id)
        ).length;
        const maxCount = Math.max(count1, count2);

        if (maxCount >= 2) {
          hasExcessiveOppositions = true;
          warnings.push(
            `OPPOSITION: ${player1.name} vs ${player2.name} have faced each other ${maxCount} times`
          );
        }
      }
    }
  }

  if (hasExcessivePartnerships || hasExcessiveOppositions) {
    console.warn(`⚠️ REPEAT DETECTION WARNING on ${zoneId}:`);
    warnings.forEach((warning) => console.warn(`   ${warning}`));
  }
}

// Helper function to check if we should auto-create a new queue
function shouldAutoCreateQueue(state: any): boolean {
  const queueEntries = Object.entries(state.queue.playersByQueue) as [
    string,
    Player[]
  ][];

  // Auto-create if all existing queues have 3+ players
  return (
    queueEntries.length > 0 &&
    queueEntries.every(([, players]) => players.length >= 3)
  );
}

// Helper function to get next queue ID
function getNextQueueId(state: any): string {
  const existingIds = Object.keys(state.queue.playersByQueue)
    .map((id) => parseInt(id.split("-")[1]))
    .filter((num) => !isNaN(num));

  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1;
  return `queue-${maxId + 1}`;
}

// Helper function to rebuild queue IDs after removal
function rebuildQueueIds(
  playersByQueue: Record<string, Player[]>
): Record<string, Player[]> {
  const entries = Object.entries(playersByQueue) as [string, Player[]][];
  const rebuilt: Record<string, Player[]> = {};

  entries.forEach(([, players], index) => {
    rebuilt[`queue-${index}`] = players;
  });

  return rebuilt;
}

// ✨ Helper function to get next available position in a zone
function getNextAvailablePosition(players: Player[], zone: string): number {
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

// ✨ Helper function to clear order when leaving a zone
function clearOrderFromPlayer(player: Player, zone: string): Player {
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

// ✨ Helper function to rebuild zone mappings using order fields
function rebuildZoneMappings(
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

    // ✅ FIXED: Add players to court even if courtOrder is null (assign order later)
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

    // ✅ FIXED: Add players to queue even if queueOrder is null (assign order later)
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

function returnPlayerToList(player: Player): Player {
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

const clearUndoDataForChangedCourts = (
  oldPlayersByCourt: Record<string, Player[]>,
  newPlayersByCourt: Record<string, Player[]>,
  undoableGames: Record<string, UndoGameData>
): Record<string, UndoGameData> => {
  const updatedUndoGames = { ...undoableGames };

  Object.keys(undoableGames).forEach((courtId) => {
    const undoData = updatedUndoGames[courtId];
    if (!undoData) return;

    // Get current and original player compositions
    const originalPlayerIds = undoData.playersData.map((p) => p.id).sort();
    const currentPlayers = newPlayersByCourt[courtId] || [];
    const currentPlayerIds = currentPlayers.map((p) => p.id).sort();

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
};

// 🆕 Helper function to handle the common transfer logic
function transferQueueToCourtHelper(
  state: any,
  queueId: string,
  targetCourtId: string,
  playersInQueue: Player[]
) {
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
      .filter((pos: Player) => pos !== null && pos !== undefined)
  );

  console.log(
    `Court ${targetCourtId} occupied positions:`,
    Array.from(occupiedPositions)
  );

  // 🔧 FIX: Sort playersInQueue by their queue order to preserve order
  const sortedPlayersInQueue = [...playersInQueue].sort(
    (a, b) => (a.queueOrder || 0) - (b.queueOrder || 0)
  );

  // 🔧 FIX: Create position mapping for transferred players in correct order
  const playerPositionMap = new Map<string, number>();
  let nextPositionIndex = 0;

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

  // 🔧 FIX: Assign positions to players in queue order
  sortedPlayersInQueue.forEach((player, index) => {
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

  // Rest remains the same...
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

export default function reducer(state: any, action: Action) {
  switch (action.type) {
    case ActionType.SET_COURT_COUNT: {
      const newCount = action.payload;

      const newCourtIds = Array.from(
        { length: newCount },
        (_, i) => `court-${i}`
      );

      // Keep queue IDs unchanged - they're now independent
      const existingQueueIds = Object.keys(state.queue.playersByQueue);

      const updatedPlayers = state.players.map((player: Player) => {
        // Filter statuses to only valid court/queue IDs
        const validStatuses = player.status.filter((s) => {
          const isCourt = s.startsWith("court-");
          const isQueue = s.startsWith("queue-");
          return (
            (!isCourt || newCourtIds.includes(s)) &&
            (!isQueue || existingQueueIds.includes(s))
          );
        });

        // Keep only 1 court-* and 1 queue-* (Condition #6 & #7)
        const court = validStatuses.find((s) => s.startsWith("court-"));
        const queue = validStatuses.find((s) => s.startsWith("queue-"));

        const cleanStatus: PlayerStatus[] = [];
        if (court) cleanStatus.push(court);
        if (queue) cleanStatus.push(queue);

        // ✨ Clear order if player is no longer in valid zone
        let updatedPlayer = { ...player, status: cleanStatus };

        // Clear court order if no longer on any court
        if (!court && player.courtOrder !== null) {
          updatedPlayer.courtOrder = null;
        }

        // Clear queue order if no longer in any queue
        if (!queue && player.queueOrder !== null) {
          updatedPlayer.queueOrder = null;
        }

        return updatedPlayer;
      });

      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        newCount,
        existingQueueIds
      );

      return {
        ...state,
        courts: {
          ...state.courts,
          count: newCount,
          playersByCourt,
        },
        queue: {
          ...state.queue,
          playersByQueue,
        },
        players: updatedPlayers,
      };
    }

    case ActionType.ADD_PLAYERS_FROM_TEXT: {
      const newPlayers = action.players.map((player) => ({
        ...player,
        status: [], // Start as unqueued (Condition #1)
        courtOrder: null, // ✨ Ensure new players have null orders
        queueOrder: null,
      }));

      return {
        ...state,
        players: [...state.players, ...newPlayers],
      };
    }

    case ActionType.CLEAR_ALL_PLAYERS: {
      // 1. Reset all players to unqueued state (Condition #1)
      const clearedPlayers: Player[] = state.players.map((p: Player) => ({
        ...p,
        status: [],
        timeEntered: Date.now(),
        courtOrder: null, // ✨ Clear order fields
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

    // ✨ FINAL: MOVE_PLAYER_TO_POSITION using exact same logic as MOVE_PLAYER + position assignment
    case ActionType.MOVE_PLAYER_TO_POSITION: {
      const { playerId, from, zone, position } = action.payload;

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

      // Get player's current statuses
      const existingCourt = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
      );
      const existingQueue = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
      );

      // ✨ EXACT SAME LOGIC AS MOVE_PLAYER - now we can distinguish drag sources!
      let newStatus: PlayerStatus[] = [];

      // RULE 1: Moving between queue boxes - just replace the queue
      if (isFromQueue && isToQueue) {
        // If player has court status, keep it (advanced queue)
        if (existingCourt) {
          newStatus = [existingCourt, zone as PlayerStatus];
        } else {
          newStatus = [zone as PlayerStatus];
        }
      }
      // RULE 2: Moving between court boxes - just replace the court
      else if (isFromCourt && isToCourt) {
        // If player has queue status, keep it (advanced queue)
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
          // Check if player already has a court - if so, just update it
          if (existingCourt) {
            newStatus = existingQueue
              ? [zone as PlayerStatus, existingQueue]
              : [zone as PlayerStatus];
          } else {
            // No existing court, add court and keep queue if exists
            newStatus = existingQueue
              ? [zone as PlayerStatus, existingQueue]
              : [zone as PlayerStatus];
          }
        } else if (isToQueue) {
          // ADVANCED QUEUEING: If player is on court and dragged to queue from player list
          if (existingCourt) {
            newStatus = [existingCourt, zone as PlayerStatus]; // TEAL status!
            console.log(
              `🔥 ADVANCED QUEUEING: ${playerToMove.name} on court → queue`
            );
          } else {
            // Not on court, just add to queue
            newStatus = [zone as PlayerStatus];
          }
        }
      }
      // RULE 6: Moving back to rest - only remove the specific status being moved FROM
      else if (zone === "rest" || zone === "all") {
        if (isFromCourt) {
          // Remove only court status, keep queue if exists
          newStatus = existingQueue ? [existingQueue] : [];
        } else if (isFromQueue) {
          // Remove only queue status, keep court if exists
          newStatus = existingCourt ? [existingCourt] : [];
        } else {
          // If moving from "all" zone (player list), clear all statuses
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

      // ✨ Handle order fields with EXACT POSITION assignment (the key difference from MOVE_PLAYER)
      if (isFromQueue && isToCourt) {
        // Queue to court TRANSFER - clear queue order, assign exact court position
        updatedPlayer.queueOrder = null;
        updatedPlayer.courtOrder = position;
        console.log(
          `⬆️ Queue→Court transfer: ${updatedPlayer.name} → court position ${position}`
        );
      } else if (isFromCourt && isToQueue) {
        // Court to queue TRANSFER - clear court order, assign exact queue position
        updatedPlayer.courtOrder = null;
        updatedPlayer.queueOrder = position;
        console.log(
          `⬇️ Court→Queue transfer: ${updatedPlayer.name} → queue position ${position}`
        );
      } else if (isFromRest && isToQueue && existingCourt) {
        // ADVANCED QUEUEING: Player on court being added to queue from player list
        // Keep court order, assign exact queue position
        updatedPlayer.queueOrder = position;
        console.log(
          `🔥 Advanced queueing: ${updatedPlayer.name} → queue position ${position}, keeping court`
        );
      } else if (isFromRest && isToCourt && existingQueue) {
        // ADVANCED QUEUEING: Player in queue being added to court from player list
        // Keep queue order, assign exact court position
        updatedPlayer.courtOrder = position;
        console.log(
          `🔥 Advanced queueing: ${updatedPlayer.name} → court position ${position}, keeping queue`
        );
      } else if (isToCourt) {
        // Any other move to court - assign exact court position, clear queue if no existing queue
        updatedPlayer.courtOrder = position;
        if (!existingQueue) updatedPlayer.queueOrder = null;
        console.log(
          `📍 Court position ${position} assigned to ${updatedPlayer.name}`
        );
      } else if (isToQueue) {
        // Any other move to queue - assign exact queue position, clear court if no existing court
        updatedPlayer.queueOrder = position;
        if (!existingCourt) updatedPlayer.courtOrder = null;
        console.log(
          `📍 Queue position ${position} assigned to ${updatedPlayer.name}`
        );
      }

      const updatedPlayers = state.players.map((p: Player) =>
        p.id === playerId ? updatedPlayer : p
      );

      // ✨ Rebuild using order fields
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
        // 🆕 RESTORED: Team-aware queue partnership checking
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
    // ========================================
    // MOVE_PLAYER case (no automatic positioning)
    // ========================================
    case ActionType.MOVE_PLAYER: {
      const { id, from, to } = action.payload;

      const playerToMove = state.players.find((p: Player) => p.id === id);
      if (!playerToMove) return state;

      console.log(
        `🎯 MOVE_PLAYER: ${playerToMove.name} from "${from}" to "${to}" (no auto-positioning)`
      );

      // 🆕 SPECIAL CASE: Moving TO the player list (zone "all" or "rest")
      if (to === "all" || to === "rest") {
        console.log(
          `🔙 PARTIAL RETURN TO PLAYER LIST: ${playerToMove.name} from "${from}"`
        );

        // 🆕 FIXED: Only remove from the specific zone, preserve other assignments
        const isFromCourt = from.startsWith("court-");
        const isFromQueue = from.startsWith("queue-");

        // Get player's current statuses
        const existingCourt = playerToMove.status.find(
          (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
        );
        const existingQueue = playerToMove.status.find(
          (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
        );

        let newStatus: PlayerStatus[] = [];
        let updatedPlayer = { ...playerToMove };

        if (isFromCourt) {
          // Remove only court status, keep queue if exists
          newStatus = existingQueue ? [existingQueue] : [];
          updatedPlayer.courtOrder = null;
          updatedPlayer.courtEnteredTime = undefined;
          console.log(
            `🔄 Removed court status, ${
              existingQueue ? "keeping queue" : "no queue to keep"
            }`
          );
        } else if (isFromQueue) {
          // Remove only queue status, keep court if exists
          newStatus = existingCourt ? [existingCourt] : [];
          updatedPlayer.queueOrder = null;
          console.log(
            `🔄 Removed queue status, ${
              existingCourt ? "keeping court" : "no court to keep"
            }`
          );
        } else {
          // If moving from "all" zone (player list), clear all statuses (full return)
          newStatus = [];
          updatedPlayer.courtOrder = null;
          updatedPlayer.queueOrder = null;
          updatedPlayer.courtEnteredTime = undefined;
          updatedPlayer.timeEntered = Date.now(); // Reset time for full return
          console.log(`🔄 Full return to player list - cleared all statuses`);
        }

        updatedPlayer.status = newStatus;

        const updatedPlayers = state.players.map((p: Player) =>
          p.id === id ? updatedPlayer : p
        );

        // Rebuild zone mappings
        const { playersByCourt, playersByQueue } = rebuildZoneMappings(
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

      // Rest of existing logic continues...
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

      // Get player's current statuses
      const existingCourt = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
      );
      const existingQueue = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
      );

      // Determine new status based on the move type
      let newStatus: PlayerStatus[] = [];

      // RULE 1: Moving between queue boxes - just replace the queue
      if (isFromQueue && isToQueue) {
        // If player has court status, keep it (advanced queue)
        if (existingCourt) {
          newStatus = [existingCourt, to as PlayerStatus];
        } else {
          newStatus = [to as PlayerStatus];
        }
      }
      // RULE 2: Moving between court boxes - just replace the court
      else if (isFromCourt && isToCourt) {
        // If player has queue status, keep it (advanced queue)
        if (existingQueue) {
          newStatus = [to as PlayerStatus, existingQueue];
        } else {
          newStatus = [to as PlayerStatus];
        }
      }
      // RULE 3: Moving from queue to court - MOVE not duplicate
      else if (isFromQueue && isToCourt) {
        newStatus = [to as PlayerStatus];
      }
      // RULE 4: Moving from court to queue - MOVE not duplicate
      else if (isFromCourt && isToQueue) {
        newStatus = [to as PlayerStatus];
      }
      // RULE 5: Moving from rest/player list
      else if (isFromRest) {
        if (isToCourt) {
          // Check if player already has a court - if so, just update it
          if (existingCourt) {
            newStatus = existingQueue
              ? [to as PlayerStatus, existingQueue]
              : [to as PlayerStatus];
          } else {
            // No existing court, add court and keep queue if exists
            newStatus = existingQueue
              ? [to as PlayerStatus, existingQueue]
              : [to as PlayerStatus];
          }
        } else if (isToQueue) {
          // ADVANCED QUEUEING: If player is on court and dragged to queue from player list
          if (existingCourt) {
            newStatus = [existingCourt, to as PlayerStatus]; // TEAL status!
          } else {
            // Not on court, just add to queue
            newStatus = [to as PlayerStatus];
          }
        }
      }

      // ✨ No automatic position assignment for MOVE_PLAYER
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

      // ✨ Update order fields based on move
      if (isFromCourt) {
        // Leaving court - clear court order
        updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
        console.log(`🧹 Cleared court order for ${updatedPlayer.name}`);
      } else if (isFromQueue) {
        // Leaving queue - clear queue order
        updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
        console.log(`🧹 Cleared queue order for ${updatedPlayer.name}`);
      }

      // No position assignment for MOVE_PLAYER - positions handled elsewhere
      console.log(
        `🎯 Player ${updatedPlayer.name} moved to ${to} - no position assigned (zone drop only)`
      );

      const updatedPlayers = state.players.map((p: Player) =>
        p.id === id ? updatedPlayer : p
      );

      // ✨ Rebuild using order fields
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      console.log(
        `✅ Move completed: ${updatedPlayer.name} status=${JSON.stringify(
          updatedPlayer.status
        )} court=${updatedPlayer.courtOrder} queue=${updatedPlayer.queueOrder}`
      );

      // 🆕 UPDATED: Check partnerships for both courts and queues
      if (isToCourt || (isFromCourt && to.startsWith("court-"))) {
        const targetCourtId = isToCourt ? to : isFromCourt ? from : "";
        if (targetCourtId.startsWith("court-")) {
          const courtPlayers = updatedPlayers.filter((p: Player) =>
            p.status.includes(targetCourtId as PlayerStatus)
          );
          logPartnershipWarnings(targetCourtId, courtPlayers);
        }
      }

      // 🆕 NEW: Also check for queue partnerships
      if (isToQueue || (isFromQueue && to.startsWith("queue-"))) {
        const targetQueueId = isToQueue ? to : isFromQueue ? from : "";
        if (targetQueueId.startsWith("queue-")) {
          const queuePlayers = updatedPlayers.filter((p: Player) =>
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

    // ========================================
    // QUICK_MOVE_PLAYER case (with automatic positioning and auto-queue creation)
    // ========================================
    case ActionType.QUICK_MOVE_PLAYER: {
      const { id, from, to } = action.payload;

      const playerToMove = state.players.find((p: Player) => p.id === id);
      if (!playerToMove) return state;

      console.log(
        `🚀 QUICK_MOVE_PLAYER: ${playerToMove.name} from "${from}" to "${to}" (with auto-positioning)`
      );

      // 🆕 SPECIAL CASE: Moving TO the player list (zone "all" or "rest")
      if (to === "all" || to === "rest") {
        console.log(
          `🔙 QUICK RETURN TO PLAYER LIST: ${playerToMove.name} from "${from}"`
        );

        const updatedPlayer = returnPlayerToList(playerToMove);

        const updatedPlayers = state.players.map((p: Player) =>
          p.id === id ? updatedPlayer : p
        );

        // Rebuild zone mappings
        const { playersByCourt, playersByQueue } = rebuildZoneMappings(
          updatedPlayers,
          state.courts.count,
          Object.keys(state.queue.playersByQueue)
        );

        console.log(
          `✅ Successfully quick-returned ${updatedPlayer.name} to player list`
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

      // Rest of existing logic continues...
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

      // Get player's current statuses
      const existingCourt = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
      );
      const existingQueue = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
      );

      // Determine new status based on the move type (same logic as MOVE_PLAYER)
      let newStatus: PlayerStatus[] = [];

      // RULE 1: Moving between queue boxes - just replace the queue
      if (isFromQueue && isToQueue) {
        // If player has court status, keep it (advanced queue)
        if (existingCourt) {
          newStatus = [existingCourt, to as PlayerStatus];
        } else {
          newStatus = [to as PlayerStatus];
        }
      }
      // RULE 2: Moving between court boxes - just replace the court
      else if (isFromCourt && isToCourt) {
        // If player has queue status, keep it (advanced queue)
        if (existingQueue) {
          newStatus = [to as PlayerStatus, existingQueue];
        } else {
          newStatus = [to as PlayerStatus];
        }
      }
      // RULE 3: Moving from queue to court - MOVE not duplicate
      else if (isFromQueue && isToCourt) {
        newStatus = [to as PlayerStatus];
      }
      // RULE 4: Moving from court to queue - MOVE not duplicate
      else if (isFromCourt && isToQueue) {
        newStatus = [to as PlayerStatus];
      }
      // RULE 5: Moving from rest/player list
      else if (isFromRest) {
        if (isToCourt) {
          // Check if player already has a court - if so, just update it
          if (existingCourt) {
            newStatus = existingQueue
              ? [to as PlayerStatus, existingQueue]
              : [to as PlayerStatus];
          } else {
            // No existing court, add court and keep queue if exists
            newStatus = existingQueue
              ? [to as PlayerStatus, existingQueue]
              : [to as PlayerStatus];
          }
        } else if (isToQueue) {
          // ADVANCED QUEUEING: If player is on court and dragged to queue from player list
          if (existingCourt) {
            newStatus = [existingCourt, to as PlayerStatus]; // TEAL status!
          } else {
            // Not on court, just add to queue
            newStatus = [to as PlayerStatus];
          }
        }
      }

      // ✨ AUTOMATIC POSITION ASSIGNMENT for quick moves
      let assignedPosition: number | null = null;
      if (isToCourt || isToQueue) {
        // Get players currently in the target zone (BEFORE this move) and exclude the moving player
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

      // ✨ Update order fields based on move
      if (isFromCourt) {
        // Leaving court - clear court order
        updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
        updatedPlayer.courtEnteredTime = undefined;
        console.log(`🧹 Cleared court order for ${updatedPlayer.name}`);
      } else if (isFromQueue) {
        // Leaving queue - clear queue order
        updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
        console.log(`🧹 Cleared queue order for ${updatedPlayer.name}`);
      }

      // ✨ Assign new position if moving to a zone
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

      // ✨ Handle order updates for zone-to-zone moves
      if (isFromQueue && isToQueue && from !== to) {
        // Moving between queues - assign new position
        updatedPlayer.queueOrder = assignedPosition;
        console.log(
          `🔄 Queue-to-queue move: ${updatedPlayer.name} now at queue position ${assignedPosition}`
        );
      } else if (isFromCourt && isToCourt && from !== to) {
        // Moving between courts - assign new position
        updatedPlayer.courtOrder = assignedPosition;
        console.log(
          `🔄 Court-to-court move: ${updatedPlayer.name} now at court position ${assignedPosition}`
        );
      } else if (isFromQueue && isToCourt) {
        // Queue to court - clear queue order, assign court order
        updatedPlayer.queueOrder = null;
        updatedPlayer.courtOrder = assignedPosition;
        console.log(
          `⬆️ Queue-to-court: ${updatedPlayer.name} cleared queue order, assigned court position ${assignedPosition}`
        );
      } else if (isFromCourt && isToQueue) {
        // Court to queue - clear court order, assign queue order
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

      // ✨ Rebuild using order fields
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      // ✨ Check if we should auto-create a new queue after this move
      const tempState = {
        ...state,
        players: updatedPlayers,
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
        const courtPlayers = updatedPlayers.filter((p: Player) =>
          p.status.includes(to as PlayerStatus)
        );
        logPartnershipWarnings(to, courtPlayers);
      } else if (isToQueue) {
        const queuePlayers = updatedPlayers.filter((p: Player) =>
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
        players: updatedPlayers,
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

    // ✨ UPDATED: Swap players by exchanging their order fields
    case ActionType.SWAP_PLAYERS: {
      console.log("🔄 REDUCER: SWAP_PLAYERS action received:", action.payload);

      const { playerId1, playerId2, zone } = action.payload;

      // Find both players
      const player1 = state.players.find((p: Player) => p.id === playerId1);
      const player2 = state.players.find((p: Player) => p.id === playerId2);

      if (!player1 || !player2) {
        console.warn("❌ REDUCER: Cannot swap: one or both players not found");
        return state;
      }

      // Verify both players are in the same zone
      const player1InZone = player1.status.includes(zone as PlayerStatus);
      const player2InZone = player2.status.includes(zone as PlayerStatus);

      if (!player1InZone || !player2InZone) {
        console.warn("❌ REDUCER: Cannot swap: players not in the same zone");
        return state;
      }

      // ✨ Swap order fields instead of positions in arrays
      let updatedPlayer1 = { ...player1 };
      let updatedPlayer2 = { ...player2 };

      if (zone.startsWith("court-")) {
        // Swap court orders
        const temp = updatedPlayer1.courtOrder;
        updatedPlayer1.courtOrder = updatedPlayer2.courtOrder;
        updatedPlayer2.courtOrder = temp;
        console.log(
          `🔄 Swapped court orders: ${player1.name} (${temp} → ${updatedPlayer1.courtOrder}) ↔ ${player2.name} (${player2.courtOrder} → ${updatedPlayer2.courtOrder})`
        );
      } else if (zone.startsWith("queue-")) {
        // Swap queue orders
        const temp = updatedPlayer1.queueOrder;
        updatedPlayer1.queueOrder = updatedPlayer2.queueOrder;
        updatedPlayer2.queueOrder = temp;
        console.log(
          `🔄 Swapped queue orders: ${player1.name} (${temp} → ${updatedPlayer1.queueOrder}) ↔ ${player2.name} (${player2.queueOrder} → ${updatedPlayer2.queueOrder})`
        );
      }

      // Update players array
      const updatedPlayers = state.players.map((p: Player) => {
        if (p.id === playerId1) return updatedPlayer1;
        if (p.id === playerId2) return updatedPlayer2;
        return p;
      });

      // ✨ Rebuild zone mappings using updated order fields
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      console.log("✅ REDUCER: Swap completed successfully");

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

    case ActionType.SWAP_PLAYERS_CROSS_ZONE: {
      console.log(
        "🔄 REDUCER: SWAP_PLAYERS_CROSS_ZONE action received:",
        action.payload
      );

      const { playerId1, zone1, playerId2, zone2 } = action.payload;

      // Find both players
      const player1 = state.players.find((p: Player) => p.id === playerId1);
      const player2 = state.players.find((p: Player) => p.id === playerId2);

      if (!player1 || !player2) {
        console.warn("❌ REDUCER: Cannot swap: one or both players not found");
        return state;
      }

      // Verify players are in their respective zones
      const player1InZone1 = player1.status.includes(zone1 as PlayerStatus);
      const player2InZone2 = player2.status.includes(zone2 as PlayerStatus);

      if (!player1InZone1 || !player2InZone2) {
        console.warn("❌ REDUCER: Cannot swap: players not in expected zones");
        return state;
      }

      console.log(
        `🔄 Cross-zone swap: ${player1.name} (${zone1}) ↔ ${player2.name} (${zone2})`
      );

      // Helper function to update player status and orders for cross-zone swap
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

        // Get existing statuses
        const existingCourt = player.status.find((s) => s.startsWith("court-"));
        const existingQueue = player.status.find((s) => s.startsWith("queue-"));

        let newStatus: PlayerStatus[] = [];

        // Determine new status based on move type
        if (isFromCourt && isToCourt) {
          // Court to court - replace court, keep queue if exists
          newStatus = existingQueue
            ? [toZone as PlayerStatus, existingQueue]
            : [toZone as PlayerStatus];
        } else if (isFromQueue && isToQueue) {
          // Queue to queue - replace queue, keep court if exists
          newStatus = existingCourt
            ? [existingCourt, toZone as PlayerStatus]
            : [toZone as PlayerStatus];
        } else if (isFromCourt && isToQueue) {
          // Court to queue - replace court with queue
          newStatus = [toZone as PlayerStatus];
        } else if (isFromQueue && isToCourt) {
          // Queue to court - replace queue with court
          newStatus = [toZone as PlayerStatus];
        }

        // Create updated player with new status
        let updatedPlayer: Player = {
          ...player,
          status: newStatus,
        };

        // Update order fields and timestamps based on the zones
        if (isFromCourt && isToCourt) {
          // Court to court - update court order, keep queue order
          updatedPlayer.courtOrder = targetPosition;
          // Keep existing court entry time since still on court
        } else if (isFromQueue && isToQueue) {
          // Queue to queue - update queue order, keep court order
          updatedPlayer.queueOrder = targetPosition;
        } else if (isFromCourt && isToQueue) {
          // Court to queue - clear court order, set queue order
          updatedPlayer.courtOrder = null;
          updatedPlayer.queueOrder = targetPosition;
          updatedPlayer.courtEnteredTime = undefined; // No longer on court
        } else if (isFromQueue && isToCourt) {
          // Queue to court - clear queue order, set court order
          updatedPlayer.queueOrder = null;
          updatedPlayer.courtOrder = targetPosition;
          updatedPlayer.courtEnteredTime = Date.now(); // Now on court
        }

        return updatedPlayer;
      };

      // Get the positions/orders of both players to swap them
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

      // Perform the cross-zone swap
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

      console.log(`✅ Cross-zone swap completed:
      ${player1.name}: ${zone1} (pos ${player1TargetPosition}) → ${zone2} (pos ${player2TargetPosition})
      ${player2.name}: ${zone2} (pos ${player2TargetPosition}) → ${zone1} (pos ${player1TargetPosition})`);

      // Update players array
      const updatedPlayers = state.players.map((p: Player) => {
        if (p.id === playerId1) return updatedPlayer1;
        if (p.id === playerId2) return updatedPlayer2;
        return p;
      });

      // Rebuild zone mappings using updated order fields
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      console.log("✅ REDUCER: Cross-zone swap completed successfully");

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

    case ActionType.REPLACE_PLAYER: {
      console.log(
        "🔄 REDUCER: REPLACE_PLAYER action received:",
        action.payload
      );

      const { sourcePlayerId, sourceZone, targetPlayerId, targetZone } =
        action.payload;

      // Find both players
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

      // Verify source is from player list and target is in court/queue
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

      // Get the target player's position/order in their current zone
      let targetPosition: number | null = null;
      if (targetZone.startsWith("court-")) {
        targetPosition = targetPlayer.courtOrder;
      } else if (targetZone.startsWith("queue-")) {
        targetPosition = targetPlayer.queueOrder;
      }

      console.log(`🎯 Target position: ${targetPosition} in ${targetZone}`);

      // Update both players
      let updatedSourcePlayer: Player = {
        ...sourcePlayer,
        // Source player takes target's exact status and position
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
        // Target player gets sent back to player list (clear all statuses and orders)
        status: [],
        timeEntered: Date.now(), // Reset time for return to player list
        courtEnteredTime: undefined,
        courtOrder: null,
        queueOrder: null,
      };

      // Set the correct order for the source player based on target zone
      if (targetZone.startsWith("court-")) {
        updatedSourcePlayer.courtOrder = targetPosition;
        updatedSourcePlayer.queueOrder = targetPlayer.queueOrder; // Keep queue order if target was in advanced queue
      } else if (targetZone.startsWith("queue-")) {
        updatedSourcePlayer.queueOrder = targetPosition;
        updatedSourcePlayer.courtOrder = targetPlayer.courtOrder; // Keep court order if target was in advanced queue
      }

      console.log(`✅ Replacement details:
      Source (${sourcePlayer.name}): player list → ${targetZone} (pos ${targetPosition})
      Target (${targetPlayer.name}): ${targetZone} → player list (cleared)`);

      // Update players array
      const updatedPlayers = state.players.map((p: Player) => {
        if (p.id === sourcePlayerId) return updatedSourcePlayer;
        if (p.id === targetPlayerId) return updatedTargetPlayer;
        return p;
      });

      // Rebuild zone mappings using updated order fields
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      console.log("✅ REDUCER: Replacement completed successfully");

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

    // ... (rest of the cases remain the same)
    case ActionType.CREATE_QUEUE: {
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

    case ActionType.REMOVE_QUEUE: {
      const { queueId } = action.payload;

      // Don't allow removing the last queue
      if (Object.keys(state.queue.playersByQueue).length <= 1) {
        return state;
      }

      // ✨ Move players from deleted queue back to unqueued state and clear queue order
      const updatedPlayers = state.players.map((player: Player) => {
        if (player.status.includes(queueId as PlayerStatus)) {
          const newStatus = player.status.filter((s) => s !== queueId);
          return {
            ...player,
            status: newStatus,
            queueOrder: null, // ✨ Clear queue order when removing from queue
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

      const playersWithUpdatedQueueIds = updatedPlayers.map(
        (player: Player) => {
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
        }
      );

      // ✨ Rebuild using order fields
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

    case ActionType.SET_GAMES_PLAYED: {
      const { id, value } = action.payload;

      // Step 1: Update the player's gamesPlayed field
      const updatedPlayers = state.players.map((p: Player) =>
        p.id === id ? { ...p, gamesPlayed: value } : p
      );

      // ✨ Rebuild using order fields
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

    case ActionType.SET_PLAYER_TEXT_INPUT: {
      return {
        ...state,
        playerTextInput: action.text,
      };
    }

    case ActionType.TOGGLE_TIMERS: {
      return {
        ...state,
        showTimers: !state.showTimers,
      };
    }

    case ActionType.TOGGLE_PLAYER_COOLDOWNS: {
      return {
        ...state,
        settings: {
          ...state.settings,
          playerCooldowns: !state.settings.playerCooldowns,
        },
      };
    }

    case ActionType.SET_PRIORITY_MODE: {
      return {
        ...state,
        settings: {
          ...state.settings,
          priorityMode: action.mode,
        },
      };
    }

    case ActionType.REMOVE_PLAYER: {
      const idToRemove = action.id;

      // Step 1: Remove player from global list
      const updatedPlayers = state.players.filter(
        (p: Player) => p.id !== idToRemove
      );

      // ✨ Rebuild using order fields
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

    case ActionType.TRANSFER_QUEUE_TO_COURT: {
      const { queueId } = action.payload;
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

    case ActionType.TRANSFER_QUEUE_TO_SPECIFIC_COURT: {
      const { queueId, targetCourtId } = action.payload;
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

    case ActionType.END_GAME: {
      const courtId = action.payload.courtId;
      const endTime = Date.now();

      try {
        // 🔍 Step 1: Validate court ID format
        if (
          !courtId ||
          typeof courtId !== "string" ||
          !courtId.startsWith("court-")
        ) {
          console.error("⛔ Invalid court ID:", courtId);
          return state;
        }

        const courtIndex = parseInt(courtId.split("-")[1]);
        if (isNaN(courtIndex) || courtIndex < 0) {
          console.error("⛔ Invalid court index in ID:", courtId);
          return state;
        }

        // 🔍 Step 2: Find players on this court with validation
        const playersOnCourt: Player[] = state.players.filter(
          (player: Player) =>
            Array.isArray(player.status) &&
            player.status.includes(courtId as PlayerStatus)
        );

        if (playersOnCourt.length === 0) {
          console.log("⛔ No players found on court", courtId);
          return state;
        }

        console.log(
          "🎮 Ending game on",
          courtId,
          "with players:",
          playersOnCourt.map((p) => p.name || `Player-${p.id}`)
        );

        // 🔍 Step 3: Validate and calculate match start time
        const validTimes = playersOnCourt
          .map((p) => p.courtEnteredTime || p.timeEntered)
          .filter((time) => time && typeof time === "number" && time > 0);

        let matchStartTime: number;
        if (validTimes.length === 0) {
          console.warn(
            "⚠️ No valid entry times found, estimating match duration"
          );
          matchStartTime = endTime - 15 * 60 * 1000; // Default 15 min game
        } else {
          matchStartTime = Math.min(...validTimes);

          // Sanity check: match can't be longer than 2 hours
          if (endTime - matchStartTime > 2 * 60 * 60 * 1000) {
            console.warn("⚠️ Unusually long match detected, capping duration");
            matchStartTime = endTime - 2 * 60 * 60 * 1000;
          }
        }

        // 🔍 Step 4: Generate court name safely
        const courtName = `Court ${courtIndex + 1}`;

        // 🔍 Step 5: Generate match history entries with error handling
        let matchHistoryEntries;
        try {
          matchHistoryEntries = generateMatchHistoryEntries(
            playersOnCourt,
            courtName,
            matchStartTime,
            endTime
          );

          // Validate the result
          if (!Array.isArray(matchHistoryEntries)) {
            throw new Error(
              "generateMatchHistoryEntries did not return an array"
            );
          }

          if (matchHistoryEntries.length !== playersOnCourt.length) {
            throw new Error(
              `Mismatch: ${playersOnCourt.length} players but ${matchHistoryEntries.length} entries`
            );
          }
        } catch (error) {
          console.error("⛔ Failed to generate match history entries:", error);
          return state;
        }

        console.log("📝 Generated match history entries:", matchHistoryEntries);

        // 🔍 Step 6: Create match entry map for safe lookup
        const matchEntryMap = new Map<string, any>();
        playersOnCourt.forEach((player, index) => {
          if (matchHistoryEntries[index] && player.id) {
            matchEntryMap.set(player.id, matchHistoryEntries[index]);
          }
        });

        // 🔍 Step 7: Store undo data BEFORE modifying players
        const undoData: UndoGameData = {
          courtId,
          endedAt: endTime,
          playersData: playersOnCourt.map((player, index) => {
            if (!player.id) {
              console.warn("⚠️ Player missing ID, using index as fallback");
            }

            return {
              id: player.id || `temp-${index}`,
              name: player.name || `Player-${index}`,
              previousGamesPlayed: player.gamesPlayed || 0,
              previousStatus: [...(player.status || [])],
              previousTimeEntered: player.timeEntered || endTime,
              courtOrder: player.courtOrder,
              courtEnteredTime: player.courtEnteredTime,
              addedMatchHistoryEntry: matchHistoryEntries[index],
            };
          }),
        };

        // 🔍 Step 8: Update players with comprehensive validation
        const updatedPlayers = state.players.map((player: Player) => {
          if (!Array.isArray(player.status)) {
            console.warn("⚠️ Player has invalid status array:", player.id);
            return player;
          }

          const isOnCourt = player.status.includes(courtId as PlayerStatus);
          if (!isOnCourt) return player;

          // Get this player's match history entry
          const playerMatchEntry = matchEntryMap.get(player.id);
          if (!playerMatchEntry) {
            console.warn(
              `⚠️ No match entry found for player ${player.name || player.id}`
            );
            // Continue without adding match history rather than failing completely
          }

          // Remove this court from status, preserve other statuses
          const remainingStatus = [...player.status].filter(
            (s) => s !== courtId
          );

          console.log(
            `🔄 ${player.name || player.id}: status ${JSON.stringify(
              player.status
            )} → ${JSON.stringify(remainingStatus)}${
              playerMatchEntry ? ", adding match entry" : ", no match entry"
            }`
          );

          const updatedPlayer = {
            ...player,
            gamesPlayed: (player.gamesPlayed || 0) + 1,
            status: remainingStatus,
            timeEntered: endTime,
            courtOrder: null,
            courtEnteredTime: undefined,
          };

          // Only add match history if we have a valid entry
          if (playerMatchEntry) {
            updatedPlayer.matchHistory = [
              ...(player.matchHistory || []),
              playerMatchEntry,
            ];
          }

          return updatedPlayer;
        });

        // 🔍 Step 9: Rebuild zone mappings with validation
        let playersByCourt: Record<string, Player[]>;
        let playersByQueue: Record<string, Player[]>;

        try {
          const rebuildResult = rebuildZoneMappings(
            updatedPlayers,
            state.courts?.count || 0,
            Object.keys(state.queue?.playersByQueue || {})
          );

          playersByCourt = rebuildResult.playersByCourt;
          playersByQueue = rebuildResult.playersByQueue;
        } catch (error) {
          console.error("⛔ Failed to rebuild zone mappings:", error);
          // Use existing mappings as fallback
          playersByCourt = state.courts?.playersByCourt || {};
          playersByQueue = state.queue?.playersByQueue || {};
        }

        console.log("✅ Game ended successfully with enhanced match history");

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
          undoableGames: {
            ...state.undoableGames,
            [courtId]: undoData,
          },
        };
      } catch (error) {
        console.error("⛔ Critical error in END_GAME:", error);
        // Return state unchanged on critical error
        return state;
      }
    }

    case ActionType.UNDO_END_GAME: {
      const courtId = action.payload.courtId;
      const undoData = state.undoableGames[courtId];

      if (!undoData) {
        console.log("⛔ No undo data found for court", courtId);
        return state;
      }

      console.log("⏪ Undoing ended game on", courtId);

      // Restore players to their previous state
      const updatedPlayers = state.players.map((player: Player) => {
        const playerUndoData = undoData.playersData.find(
          (p: Player) => p.id === player.id
        );

        if (!playerUndoData) return player;

        // Remove the last match history entry (the one we added)
        const updatedMatchHistory = player.matchHistory
          ? player.matchHistory.filter(
              (entry) =>
                entry.matchId !== playerUndoData.addedMatchHistoryEntry.matchId
            )
          : [];

        console.log(
          `⏪ ${player.name}: games ${player.gamesPlayed} → ${playerUndoData.previousGamesPlayed}, ` +
            `status ${JSON.stringify(player.status)} → ${JSON.stringify(
              playerUndoData.previousStatus
            )}`
        );

        return {
          ...player,
          gamesPlayed: playerUndoData.previousGamesPlayed,
          status: playerUndoData.previousStatus,
          timeEntered: playerUndoData.previousTimeEntered,
          matchHistory: updatedMatchHistory,
          courtOrder: playerUndoData.courtOrder,
          courtEnteredTime: playerUndoData.courtEnteredTime,
        };
      });

      // Rebuild zone mappings
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      // Remove the undo data for this court
      const { [courtId]: removedUndoData, ...remainingUndoGames } =
        state.undoableGames;

      console.log("✅ Game undo completed successfully");

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
        undoableGames: remainingUndoGames,
      };
    }

    case ActionType.CLEAR_COURT_UNDO: {
      const { courtId } = action.payload;

      if (!state.undoableGames[courtId]) {
        return state; // No undo data for this court
      }

      const { [courtId]: removedUndoData, ...remainingUndoGames } =
        state.undoableGames;

      console.log(
        `🧹 Cleared undo data for court ${courtId} due to composition change`
      );

      return {
        ...state,
        undoableGames: remainingUndoGames,
      };
    }

    case ActionType.UPDATE_PLAYER_SKILL_LEVEL: {
      const { playerId, skillLevel } = action.payload;

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

    case ActionType.UPDATE_PLAYER_NAME: {
      const { id, newName } = action.payload;

      const updatedPlayers = state.players.map((p: Player) =>
        p.id === id ? { ...p, name: newName } : p
      );

      return {
        ...state,
        players: updatedPlayers,
      };
    }

    case ActionType.CLEAR_ALL_DATA: {
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

    case ActionType.UPDATE_PAYMENT_SETTINGS: {
      return {
        ...state,
        settings: {
          ...state.settings,
          paymentSettings: action.payload,
        },
      };
    }

    case ActionType.TOGGLE_PLAYER_PAYMENT: {
      const { playerId } = action.payload;

      const updatedPlayers = state.players.map((player: Player) => {
        if (player.id === playerId) {
          const currentPaymentInfo = player.paymentInfo || {
            hasPaid: false,
            isGuest: false,
          };
          const newHasPaid = !currentPaymentInfo.hasPaid;

          return {
            ...player,
            paymentInfo: {
              ...currentPaymentInfo,
              hasPaid: newHasPaid,
              paidAt: newHasPaid ? Date.now() : undefined,
            },
          };
        }
        return player;
      });

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

    case ActionType.TOGGLE_PLAYER_GUEST: {
      const { playerId } = action.payload;

      const updatedPlayers = state.players.map((player: Player) => {
        if (player.id === playerId) {
          const currentPaymentInfo = player.paymentInfo || {
            hasPaid: false,
            isGuest: false,
          };

          return {
            ...player,
            paymentInfo: {
              ...currentPaymentInfo,
              isGuest: !currentPaymentInfo.isGuest,
            },
          };
        }
        return player;
      });

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

    case ActionType.MARK_ALL_PLAYERS_PAID: {
      const updatedPlayers = state.players.map((player: Player) => ({
        ...player,
        paymentInfo: {
          ...(player.paymentInfo || { isGuest: false }),
          hasPaid: true,
          paidAt: Date.now(),
        },
      }));

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

    case ActionType.CLEAR_ALL_PAYMENTS: {
      const updatedPlayers = state.players.map((player: Player) => ({
        ...player,
        paymentInfo: {
          ...(player.paymentInfo || {}),
          hasPaid: false,
          paidAt: undefined,
        },
      }));

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

    case ActionType.MARK_PLAYER_UNPAID_AND_MOVE_TO_WAITING: {
      const { playerId } = action.payload;

      const updatedPlayers = state.players.map((player: Player) => {
        if (player.id === playerId) {
          const currentPaymentInfo = player.paymentInfo || {
            hasPaid: false,
            isGuest: false,
          };

          return {
            ...player,
            // Mark as unpaid
            paymentInfo: {
              ...currentPaymentInfo,
              hasPaid: false,
              paidAt: undefined,
            },
            // Move to waiting status (clear all statuses)
            status: [],
            courtOrder: null,
            queueOrder: null,
            waitingSince: Date.now(), // Set waiting time
          };
        }
        return player;
      });

      // Rebuild zone mappings to reflect the player's removal from courts/queues
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

    case ActionType.UPDATE_PLAYER_LIST_SORT: {
      const { sortConfig } = action.payload;

      return {
        ...state,
        settings: {
          ...state.settings,
          playerListSort: sortConfig,
        },
      };
    }

    case ActionType.SWAP_COURT_PLAYERS: {
      console.log(
        "🔄 REDUCER: SWAP_COURT_PLAYERS action received:",
        action.payload
      );

      const { sourceCourtId, targetCourtId } = action.payload;

      // ✅ VALIDATION: Check if court IDs are valid
      if (!sourceCourtId || !targetCourtId) {
        console.warn("⚠️ REDUCER: Invalid court IDs provided");
        return state;
      }

      // ✅ VALIDATION: Check if trying to swap court with itself
      if (sourceCourtId === targetCourtId) {
        console.warn("⚠️ REDUCER: Cannot swap court with itself");
        return state;
      }

      // ✅ VALIDATION: Check if court IDs exist in current court mappings
      const validCourtIds = Object.keys(state.courts.playersByCourt);
      if (
        !validCourtIds.includes(sourceCourtId) ||
        !validCourtIds.includes(targetCourtId)
      ) {
        console.warn("⚠️ REDUCER: One or both court IDs do not exist");
        return state;
      }

      // Get players from both courts using the zone mapping (more reliable)
      const sourceCourtPlayers =
        state.courts.playersByCourt[sourceCourtId] || [];
      const targetCourtPlayers =
        state.courts.playersByCourt[targetCourtId] || [];

      // ✅ EARLY EXIT: If both courts are empty, nothing to swap
      if (sourceCourtPlayers.length === 0 && targetCourtPlayers.length === 0) {
        console.warn("⚠️ REDUCER: Both courts are empty, nothing to swap");
        return state;
      }

      console.log(
        `🔄 Swapping players between ${sourceCourtId} (${sourceCourtPlayers.length} players) and ${targetCourtId} (${targetCourtPlayers.length} players)`
      );

      // ✅ ROBUST: Create updated players array with proper error handling
      const updatedPlayers = state.players.map((player: Player) => {
        const isInSourceCourt = player.status.includes(
          sourceCourtId as PlayerStatus
        );
        const isInTargetCourt = player.status.includes(
          targetCourtId as PlayerStatus
        );

        // ✅ VALIDATION: Ensure player has valid courtOrder if on a court
        if (
          (isInSourceCourt || isInTargetCourt) &&
          player.courtOrder === null
        ) {
          console.warn(
            `⚠️ Player ${player.name} has null courtOrder but is on court - fixing this`
          );
          // Don't abort, but we'll let rebuildZoneMappings handle this
        }

        if (isInSourceCourt) {
          // Move player from source court to target court, keeping same position
          const currentPosition = player.courtOrder;
          const newStatus = player.status.map((s) =>
            s === sourceCourtId ? (targetCourtId as PlayerStatus) : s
          );

          console.log(
            `Moving ${player.name} from ${sourceCourtId} to ${targetCourtId} (position ${currentPosition})`
          );

          return {
            ...player,
            status: newStatus,
            courtOrder: currentPosition, // Retain position
            // ✅ IMPORTANT: Don't update courtEnteredTime - players are just swapping courts
          };
        } else if (isInTargetCourt) {
          // Move player from target court to source court, keeping same position
          const currentPosition = player.courtOrder;
          const newStatus = player.status.map((s) =>
            s === targetCourtId ? (sourceCourtId as PlayerStatus) : s
          );

          console.log(
            `Moving ${player.name} from ${targetCourtId} to ${sourceCourtId} (position ${currentPosition})`
          );

          return {
            ...player,
            status: newStatus,
            courtOrder: currentPosition, // Retain position
            // ✅ IMPORTANT: Don't update courtEnteredTime - players are just swapping courts
          };
        }

        return player; // No change for players not in either court
      });

      // ✅ POSITION CONFLICT DETECTION: Check for position conflicts before rebuilding
      const sourcePlayersAfterSwap = updatedPlayers.filter((p: Player) =>
        p.status.includes(sourceCourtId as PlayerStatus)
      );
      const targetPlayersAfterSwap = updatedPlayers.filter((p: Player) =>
        p.status.includes(targetCourtId as PlayerStatus)
      );

      // Check for position conflicts within each court
      const checkPositionConflicts = (players: Player[], courtId: string) => {
        const positionCount = new Map<number, number>();
        players.forEach((player) => {
          if (player.courtOrder !== null) {
            const count = positionCount.get(player.courtOrder) || 0;
            positionCount.set(player.courtOrder, count + 1);
          }
        });

        const conflicts = Array.from(positionCount.entries()).filter(
          ([pos, count]) => count > 1
        );
        if (conflicts.length > 0) {
          console.warn(
            `⚠️ Position conflicts detected in ${courtId}:`,
            conflicts
          );
          // rebuildZoneMappings will handle this by sorting and reassigning positions
        }
      };

      checkPositionConflicts(sourcePlayersAfterSwap, sourceCourtId);
      checkPositionConflicts(targetPlayersAfterSwap, targetCourtId);

      // ✅ ROBUST: Rebuild zone mappings using updated players
      // This will handle any position conflicts and ensure proper ordering
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      // ✅ VALIDATION: Verify the swap actually worked
      const newSourceCount = (playersByCourt[sourceCourtId] || []).length;
      const newTargetCount = (playersByCourt[targetCourtId] || []).length;

      // The counts should have swapped (unless there were conflicts resolved)
      if (
        newSourceCount !== targetCourtPlayers.length ||
        newTargetCount !== sourceCourtPlayers.length
      ) {
        console.warn(
          `⚠️ Unexpected player counts after swap: ` +
            `${sourceCourtId}: ${sourceCourtPlayers.length} -> ${newSourceCount}, ` +
            `${targetCourtId}: ${targetCourtPlayers.length} -> ${newTargetCount}`
        );
        // Continue anyway - rebuildZoneMappings may have resolved conflicts
      }

      // ✅ PROPER: Clear undo data for both courts since composition changed
      const updatedUndoGames = { ...state.undoableGames };
      let undoCleared = false;

      if (updatedUndoGames[sourceCourtId]) {
        console.log(
          `🧹 Clearing undo data for ${sourceCourtId} due to court swap`
        );
        delete updatedUndoGames[sourceCourtId];
        undoCleared = true;
      }
      if (updatedUndoGames[targetCourtId]) {
        console.log(
          `🧹 Clearing undo data for ${targetCourtId} due to court swap`
        );
        delete updatedUndoGames[targetCourtId];
        undoCleared = true;
      }

      // ✅ SUCCESS LOGGING
      console.log("✅ REDUCER: Court players swap completed successfully");
      if (undoCleared) {
        console.log("✅ Undo data cleared for affected courts");
      }

      // ✅ FINAL VALIDATION: Ensure no player is lost in the process
      const originalPlayerCount = state.players.length;
      const newPlayerCount = updatedPlayers.length;
      if (originalPlayerCount !== newPlayerCount) {
        console.error("❌ CRITICAL: Player count mismatch after swap!");
        // This should never happen, but if it does, return original state
        return state;
      }

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
        undoableGames: updatedUndoGames,
      };
    }

    case ActionType.TRANSFER_QUEUE_TO_SPECIFIC_COURT_FROM_SUBMENU: {
      console.log(
        "🎯 REDUCER: TRANSFER_QUEUE_TO_SPECIFIC_COURT_FROM_SUBMENU started:",
        action.payload
      );

      const { queueId, targetCourtId } = action.payload;

      // ✅ VALIDATION: Check if inputs are valid
      if (!queueId || !targetCourtId) {
        console.warn("⚠️ REDUCER: Invalid queueId or targetCourtId provided");
        return state;
      }

      // ✅ VALIDATION: Check if queue exists and has players
      const playersInQueue = state.queue.playersByQueue[queueId] || [];
      if (playersInQueue.length === 0) {
        console.warn(
          `⚠️ REDUCER: Queue ${queueId} is empty, nothing to transfer`
        );
        return state;
      }

      // ✅ VALIDATION: Check if target court exists
      const validCourtIds = Object.keys(state.courts.playersByCourt);
      if (!validCourtIds.includes(targetCourtId)) {
        console.warn(
          `⚠️ REDUCER: Target court ${targetCourtId} does not exist`
        );
        return state;
      }

      // ✅ VALIDATION: Check if any queue player is already on a court (advanced queueing check)
      const hasPlayerOnCourt = playersInQueue.some((player: Player) =>
        player.status.some((s: PlayerStatus) => s.startsWith("court-"))
      );

      if (hasPlayerOnCourt) {
        console.warn(
          "⚠️ REDUCER: Some players in queue are already on court, aborting transfer"
        );
        return state;
      }

      // ✅ STRICT CAPACITY CHECK: Prevent overflow completely
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
        return state; // ❌ ABORT: Don't allow overflow
      }

      console.log(
        `🚀 Transferring ${playersInQueue.length} players from ${queueId} to ${targetCourtId}. ` +
          `Court currently has ${currentCourtPlayers.length} players. ` +
          `Final count will be ${totalPlayersAfterTransfer}/4.`
      );

      // ✅ EXISTING PLAYER PROTECTION: Get existing players and their positions
      const existingPlayerIds = new Set(
        currentCourtPlayers.map((p: Player) => p.id)
      );
      const transferredPlayerIds = new Set(
        playersInQueue.map((p: Player) => p.id)
      );

      // Find occupied positions by existing players (ones not being transferred)
      const occupiedPositions = new Set(
        currentCourtPlayers
          .filter((p: Player) => !transferredPlayerIds.has(p.id)) // Only non-transferred players
          .map((p: Player) => p.courtOrder)
          .filter((pos: Player) => pos !== null && pos !== undefined)
      );

      console.log(
        `🏟️ Court ${targetCourtId} occupied positions by existing players:`,
        Array.from(occupiedPositions)
      );

      // ✅ PRESERVE QUEUE ORDER: Sort players by their queue order
      const sortedQueuePlayers = [...playersInQueue].sort(
        (a, b) => (a.queueOrder || 0) - (b.queueOrder || 0)
      );

      // ✅ POSITION ASSIGNMENT: Create position mapping for queue players (0-3 only)
      const playerPositionMap = new Map<string, number>();

      const getNextAvailablePosition = (): number | null => {
        for (let position = 0; position < 4; position++) {
          // ✅ STRICT: Only positions 0-3
          if (!occupiedPositions.has(position)) {
            occupiedPositions.add(position);
            return position;
          }
        }
        return null; // ❌ No available positions
      };

      // Assign positions to queue players in order
      sortedQueuePlayers.forEach((player, index) => {
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

      // ✅ FINAL VALIDATION: Ensure all players got positions
      if (playerPositionMap.size !== sortedQueuePlayers.length) {
        console.error(
          "❌ CRITICAL: Not all players could be assigned positions - aborting transfer"
        );
        return state;
      }

      // ✅ UPDATE PLAYERS: Transfer queue players to court
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

      // ✅ QUEUE CLEANUP: Remove the transferred queue and reindex remaining queues
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
      const playersWithUpdatedQueueIds = updatedPlayers.map(
        (player: Player) => {
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
        }
      );

      // ✅ REBUILD MAPPINGS: Use the helper function to rebuild all zone mappings
      const finalQueueIds = remainingQueueIds.map(
        (_, index) => `queue-${index}`
      );
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        playersWithUpdatedQueueIds,
        state.courts.count,
        finalQueueIds
      );

      // ✅ UNDO DATA CLEANUP: Clear undo data for the affected court
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

    case ActionType.REMOVE_SPECIFIC_COURT: {
      console.log(
        "🗑️ REDUCER: REMOVE_SPECIFIC_COURT action received:",
        action.payload
      );

      const { courtId } = action.payload;
      const courtIndex = parseInt(courtId.split("-")[1]);

      // ✅ VALIDATION: Prevent removing if only 1 court left
      if (state.courts.count <= 1) {
        console.warn(
          "⚠️ REDUCER: Cannot remove court - at least 1 court must remain"
        );
        return state;
      }

      // ✅ VALIDATION: Check if court exists
      if (courtIndex >= state.courts.count || courtIndex < 0) {
        console.warn(`⚠️ REDUCER: Court ${courtId} does not exist`);
        return state;
      }

      console.log(`🗑️ Removing ${courtId} (index ${courtIndex})`);

      // ✅ ROBUST: Single-pass player processing with comprehensive logging
      const updatedPlayers = state.players.map((player: Player) => {
        let updatedPlayer = { ...player };
        let playerModified = false;

        // Process each status
        const newStatus = player.status
          .map((status) => {
            if (status === courtId) {
              // Player is on the deleted court - remove court status
              console.log(`👤 Removing ${player.name} from deleted ${courtId}`);
              playerModified = true;
              return null; // Mark for removal
            } else if (status.startsWith("court-")) {
              const statusCourtIndex = parseInt(status.split("-")[1]);

              // Shift courts that come after the deleted court
              if (statusCourtIndex > courtIndex) {
                const newCourtIndex = statusCourtIndex - 1;
                const newCourtId = `court-${newCourtIndex}`;
                console.log(
                  `🔄 Shifting ${player.name} from ${status} to ${newCourtId}`
                );
                playerModified = true;
                return newCourtId as PlayerStatus;
              }
            }
            return status;
          })
          .filter((status): status is PlayerStatus => status !== null); // Remove null values

        // Update player if modified
        if (playerModified) {
          updatedPlayer = {
            ...updatedPlayer,
            status: newStatus,
            // Clear court-specific data if player was on deleted court
            ...(player.status.includes(courtId as PlayerStatus) && {
              courtOrder: null,
              courtEnteredTime: undefined,
              timeEntered: Date.now(),
            }),
          };
        }

        return updatedPlayer;
      });

      // ✅ VALIDATION: Ensure no players were lost
      if (updatedPlayers.length !== state.players.length) {
        console.error(
          "❌ CRITICAL: Player count mismatch during court deletion!"
        );
        return state; // Abort if players were lost
      }

      // ✅ ROBUST: Build new court structure with validation
      const newCourtCount = state.courts.count - 1;
      console.log(`📊 Court count: ${state.courts.count} → ${newCourtCount}`);

      // ✅ VALIDATION: Verify all remaining players have valid court references
      const playersWithInvalidCourts = updatedPlayers.filter((player: Player) =>
        player.status.some((status: PlayerStatus) => {
          if (status.startsWith("court-")) {
            const courtIdx = parseInt(status.split("-")[1]);
            return courtIdx >= newCourtCount || courtIdx < 0;
          }
          return false;
        })
      );

      if (playersWithInvalidCourts.length > 0) {
        console.error(
          "❌ CRITICAL: Players with invalid court references detected:",
          playersWithInvalidCourts.map(
            (p: Player) => `${p.name}: ${p.status.join(", ")}`
          )
        );
        return state; // Abort if invalid references exist
      }

      // ✅ SAFE: Rebuild zone mappings with validated players
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        newCourtCount,
        Object.keys(state.queue.playersByQueue)
      );

      // ✅ VALIDATION: Verify rebuild didn't lose players
      const totalPlayersInZones = Object.values(playersByCourt)
        .flat()
        .concat(Object.values(playersByQueue).flat()).length;

      const playersInQueuesAndCourts = updatedPlayers.filter((p: Player) =>
        p.status.some(
          (s: PlayerStatus) => s.startsWith("court-") || s.startsWith("queue-")
        )
      ).length;

      if (totalPlayersInZones !== playersInQueuesAndCourts) {
        console.error("❌ CRITICAL: Zone mapping lost players during rebuild!");
        console.error(
          `Expected: ${playersInQueuesAndCourts}, Got: ${totalPlayersInZones}`
        );
        return state;
      }

      // ✅ SAFE: Handle undo data with proper validation
      const updatedUndoGames: Record<string, UndoGameData> = {};
      Object.entries(state.undoableGames).forEach(([undoCourtId, undoData]) => {
        const undoCourtIndex = parseInt(undoCourtId.split("-")[1]);

        // Skip undo data for deleted court
        if (undoCourtIndex === courtIndex) {
          console.log(`🧹 Clearing undo data for deleted ${undoCourtId}`);
          return;
        }

        // Validate undo court index
        if (undoCourtIndex < 0 || undoCourtIndex >= state.courts.count) {
          console.warn(
            `⚠️ Invalid undo court index ${undoCourtIndex}, skipping`
          );
          return;
        }

        // Shift undo data for courts after deleted court
        if (undoCourtIndex > courtIndex) {
          const newUndoCourtId = `court-${undoCourtIndex - 1}`;
          // Validate new court ID is within bounds
          if (undoCourtIndex - 1 >= 0 && undoCourtIndex - 1 < newCourtCount) {
            updatedUndoGames[newUndoCourtId] = undoData as UndoGameData;
          }
        } else {
          updatedUndoGames[undoCourtId] = undoData as UndoGameData;
        }
      });

      // ✅ FINAL VALIDATION: Comprehensive state check
      const playersOnDeletedCourt = state.courts.playersByCourt[courtId] || [];
      const expectedRemovedPlayers = playersOnDeletedCourt.length;

      console.log(`✅ Court deletion summary:
        - Removed court: ${courtId} (index ${courtIndex})
        - Players moved to waiting: ${expectedRemovedPlayers}
        - New court count: ${newCourtCount}
        - Remaining courts: ${Object.keys(playersByCourt).join(", ")}
        - Total players: ${updatedPlayers.length} (unchanged)
      `);

      return {
        ...state,
        players: updatedPlayers,
        courts: {
          count: newCourtCount,
          playersByCourt,
        },
        queue: {
          ...state.queue,
          playersByQueue,
        },
        undoableGames: updatedUndoGames,
      };
    }

    default:
      return state;
  }
}
