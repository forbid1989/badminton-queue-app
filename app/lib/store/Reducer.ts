import { ActionType } from "./Action";
import {
  Player,
  PlayerStatus,
  SkillLevel,
} from "../../components/types/Player";
import { clearLocalStorage } from "../utils/localStorage";
import {
  generateMatchHistoryEntries,
  checkExcessivePartnership,
} from "../utils/matchHistoryUtils";
import { validateCourtAssignment } from "../utils/courtAssignmentUtils";

type Action =
  | { type: "setCourtCount"; payload: number }
  | { type: "addPlayersFromText"; players: Player[] }
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
  | { type: "endGame"; payload: { courtId: string } }
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
  | {
      type: "updatePlayerSkillLevel";
      payload: { playerId: string; skillLevel: string };
    };

function logPartnershipWarnings(courtId: string, players: Player[]): void {
  if (players.length >= 2) {
    const validation = validateCourtAssignment(players);

    if (validation.hasExcessivePartnerships) {
      console.warn(`⚠️  PARTNERSHIP WARNING on ${courtId}:`);
      validation.warnings.forEach((warning) => {
        console.warn(`   ${warning}`);
      });

      // Optional: Add visual notification or dispatch a warning action
      // You could dispatch a new action to show warnings in the UI
    }
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
        // 🆕 NEW: Also check partnerships in queues
        const queuePlayers = updatedPlayers.filter((p: Player) =>
          p.status.includes(zone as PlayerStatus)
        );
        logPartnershipWarnings(zone, queuePlayers);
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
        // 🆕 NEW: Also check partnerships when moving to queues
        const queuePlayers = updatedPlayers.filter((p: Player) =>
          p.status.includes(to as PlayerStatus)
        );
        logPartnershipWarnings(to, queuePlayers);
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
          count: Object.keys(finalPlayersByQueue).length,
          playersByQueue: finalPlayersByQueue,
        },
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

      console.log("✅ Available court found:", availableCourtId);

      const timestamp = Date.now();

      // Step 4: Update all players - remove transferred players and update their status
      const transferredPlayerIds = new Set(
        playersInQueue.map((p: Player) => p.id)
      );

      // ✨ Calculate positions for transferred players in the target court
      const existingCourtPlayers =
        state.courts.playersByCourt[availableCourtId] || [];

      const updatedPlayers = state.players.map((player: Player) => {
        if (transferredPlayerIds.has(player.id)) {
          console.log(
            `🔄 Transferring player ${player.name} to ${availableCourtId}`
          );

          // ✨ Calculate position based on existing court players and transfer order
          const transferIndex = playersInQueue.findIndex(
            (p) => p.id === player.id
          );
          const newCourtPosition = existingCourtPlayers.length + transferIndex;

          // Transfer to court and remove from queue
          return {
            ...player,
            status: [availableCourtId as PlayerStatus],
            timeEntered: timestamp,
            queueOrder: null, // ✨ Clear queue order
            courtOrder: newCourtPosition, // ✨ Assign court order
            courtEnteredTime: timestamp,
          };
        }
        return player;
      });

      // Step 5: Build new queue mappings - PRESERVE ORDER BY REMOVING ONLY THE TRANSFERRED QUEUE
      const remainingQueueIds = Object.keys(state.queue.playersByQueue)
        .filter((id) => id !== queueId)
        .sort((a, b) => {
          const numA = parseInt(a.split("-")[1]);
          const numB = parseInt(b.split("-")[1]);
          return numA - numB;
        });

      console.log("📋 Remaining queue IDs after transfer:", remainingQueueIds);

      // Step 6: Update player statuses to match new queue IDs
      const queueIdMapping: Record<string, string> = {};
      remainingQueueIds.forEach((oldId, index) => {
        queueIdMapping[oldId] = `queue-${index}`;
      });

      const playersWithUpdatedQueueIds = updatedPlayers.map(
        (player: Player) => {
          // Skip transferred players - they're already updated
          if (transferredPlayerIds.has(player.id)) {
            return player;
          }

          const newStatus = player.status.map((s) => {
            if (s.startsWith("queue-") && queueIdMapping[s]) {
              console.log(
                `🔄 Updating ${player.name}: ${s} → ${queueIdMapping[s]}`
              );
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

      // ✨ Rebuild zone mappings using updated order fields
      const finalQueueIds = remainingQueueIds.map(
        (_, index) => `queue-${index}`
      );
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        playersWithUpdatedQueueIds,
        state.courts.count,
        finalQueueIds
      );

      console.log("✅ Transfer completed successfully");

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

    case ActionType.END_GAME: {
      const courtId = action.payload.courtId;
      const endTime = Date.now();

      // Step 1: Find players on this court
      const playersOnCourt: Player[] = state.players.filter((player: Player) =>
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
        playersOnCourt.map((p) => p.name)
      );

      // Step 2: Get court name for match history
      const courtIndex = parseInt(courtId.split("-")[1]);
      const courtName = `Court ${courtIndex + 1}`;

      // Step 3: Calculate match start time from earliest courtEnteredTime
      const matchStartTime = Math.min(
        ...playersOnCourt.map((p) => p.courtEnteredTime || p.timeEntered)
      );

      // Step 4: Generate enhanced match history entries using the updated function
      const matchHistoryEntries = generateMatchHistoryEntries(
        playersOnCourt,
        courtName,
        matchStartTime,
        endTime
      );

      console.log("📝 Generated match history entries:", matchHistoryEntries);

      // Step 5: Update players with enhanced match history
      const updatedPlayers = state.players.map((player: Player) => {
        const isOnCourt = player.status.includes(courtId as PlayerStatus);
        if (!isOnCourt) return player;

        // Find this player's match history entry based on their position in the court
        const playerIndex = playersOnCourt.findIndex((p) => p.id === player.id);
        const playerMatchEntry = matchHistoryEntries[playerIndex];

        if (!playerMatchEntry) {
          console.warn(`⚠️ No match entry found for player ${player.name}`);
          return player;
        }

        // Remove this court from status, keep queue if present (Condition #6)
        const remainingStatus = player.status.filter((s) => s !== courtId);

        console.log(
          `🔄 ${player.name}: status ${JSON.stringify(
            player.status
          )} → ${JSON.stringify(remainingStatus)}, adding match entry:`,
          playerMatchEntry
        );

        return {
          ...player,
          gamesPlayed: player.gamesPlayed + 1,
          status: remainingStatus,
          timeEntered: endTime,
          matchHistory: [...(player.matchHistory || []), playerMatchEntry],
          courtOrder: null, // ✨ Clear court order when leaving court
          courtEnteredTime: undefined,
        };
      });

      // Step 6: Rebuild zone mappings using order fields
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

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
        settings: {
          priorityMode: "FIFO",
          colorCodedTimers: true,
          playerCooldowns: false,
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

    default:
      return state;
  }
}
