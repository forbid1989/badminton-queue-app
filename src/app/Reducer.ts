import { ActionType } from "./Action";
import { Player, PlayerStatus } from "../types/Player";
import { clearLocalStorage } from "../utils/localStorage";

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
  | { type: "setGamesPlayed"; payload: { id: string; value: number } }
  | { type: "updatePlayerName"; payload: { id: string; newName: string } }
  | { type: "setPlayerTextInput"; text: string }
  | { type: "toggleTimers" }
  | { type: "setPriorityMode"; mode: "FIFO" | "LongestWaiting" }
  | { type: "removePlayer"; id: string }
  | { type: "transferQueueToCourt"; payload: { queueId: string } }
  | { type: "endGame"; payload: { courtId: string } }
  | { type: "createQueue" }
  | { type: "removeQueue"; payload: { queueId: string } };

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

// ✨ NEW: Helper function to assign order based on current position
function assignOrderToPlayer(player: Player, zone: string, position: number): Player {
  if (zone.startsWith('court-')) {
    return {
      ...player,
      courtOrder: position,
    };
  } else if (zone.startsWith('queue-')) {
    return {
      ...player,
      queueOrder: position,
    };
  }
  return player;
}

// ✨ NEW: Helper function to clear order when leaving a zone
function clearOrderFromPlayer(player: Player, zone: string): Player {
  if (zone.startsWith('court-')) {
    return {
      ...player,
      courtOrder: null,
    };
  } else if (zone.startsWith('queue-')) {
    return {
      ...player,
      queueOrder: null,
    };
  }
  return player;
}

// ✨ NEW: Helper function to get next available position in a zone
function getNextPositionInZone(players: Player[], zone: string): number {
  if (zone.startsWith('court-')) {
    const existingPositions = players
      .filter(p => p.courtOrder !== null)
      .map(p => p.courtOrder!)
      .sort((a, b) => a - b);

    // Find first gap or return next position
    for (let i = 0; i < 4; i++) {
      if (!existingPositions.includes(i)) {
        return i;
      }
    }
    return existingPositions.length; // Fallback
  } else if (zone.startsWith('queue-')) {
    const existingPositions = players
      .filter(p => p.queueOrder !== null)
      .map(p => p.queueOrder!)
      .sort((a, b) => a - b);

    // Find first gap or return next position
    for (let i = 0; i < 4; i++) {
      if (!existingPositions.includes(i)) {
        return i;
      }
    }
    return existingPositions.length; // Fallback
  }
  return 0;
}

// ✨ NEW: Helper function to rebuild zone mappings using order fields
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
  queueIds.forEach(queueId => {
    playersByQueue[queueId] = [];
  });

  // Populate mappings
  players.forEach(player => {
    const courtId = player.status.find(s => s.startsWith('court-'));
    const queueId = player.status.find(s => s.startsWith('queue-'));

    if (courtId && playersByCourt[courtId] && player.courtOrder !== null) {
      playersByCourt[courtId].push(player);
    }

    if (queueId && playersByQueue[queueId] && player.queueOrder !== null) {
      playersByQueue[queueId].push(player);
    }
  });

  // Sort by order fields
  Object.keys(playersByCourt).forEach(courtId => {
    playersByCourt[courtId].sort((a, b) => (a.courtOrder || 0) - (b.courtOrder || 0));
  });

  Object.keys(playersByQueue).forEach(queueId => {
    playersByQueue[queueId].sort((a, b) => (a.queueOrder || 0) - (b.queueOrder || 0));
  });

  return { playersByCourt, playersByQueue };
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

    case ActionType.MOVE_PLAYER: {
      const { id, from, to } = action.payload;

      const playerToMove = state.players.find((p: Player) => p.id === id);
      if (!playerToMove) return state;

      const isToCourt = to.startsWith("court-");
      const isToQueue = to.startsWith("queue-");
      const isFromCourt = from.startsWith("court-");
      const isFromQueue = from.startsWith("queue-");
      const isFromRest = from === "rest" || from === "all";

      // Prevent overfilling courts/queues (max 4)
      const playersInTarget = state.players.filter((p: Player) =>
        p.status.includes(to as PlayerStatus)
      );
      if (playersInTarget.length >= 4) return state;

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
      // RULE 6: Moving back to rest - only remove the specific status being moved FROM
      else if (to === "rest" || to === "all") {
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

      // ✨ Calculate position for the target zone
      const targetZonePlayers = state.players.filter((p: Player) =>
        p.status.includes(to as PlayerStatus)
      );
      const newPosition = getNextPositionInZone(targetZonePlayers, to);

      let updatedPlayer: Player = {
        ...playerToMove,
        status: newStatus,
        timeEntered:
          isToCourt && !existingCourt ? Date.now() : playerToMove.timeEntered,
      };

      // ✨ Update order fields based on move
      if (isFromCourt && (to === "rest" || to === "all")) {
        // Leaving court - clear court order
        updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
      } else if (isFromQueue && (to === "rest" || to === "all")) {
        // Leaving queue - clear queue order
        updatedPlayer = clearOrderFromPlayer(updatedPlayer, from);
      }

      // ✨ Assign new position if moving to a zone
      if (isToCourt || isToQueue) {
        updatedPlayer = assignOrderToPlayer(updatedPlayer, to, newPosition);
      }

      // ✨ Handle order updates for zone-to-zone moves
      if (isFromQueue && isToQueue && from !== to) {
        // Moving between queues - clear old queue order, assign new
        updatedPlayer.queueOrder = newPosition;
      } else if (isFromCourt && isToCourt && from !== to) {
        // Moving between courts - clear old court order, assign new
        updatedPlayer.courtOrder = newPosition;
      } else if (isFromQueue && isToCourt) {
        // Queue to court - clear queue order, assign court order
        updatedPlayer.queueOrder = null;
        updatedPlayer.courtOrder = newPosition;
      } else if (isFromCourt && isToQueue) {
        // Court to queue - clear court order, assign queue order
        updatedPlayer.courtOrder = null;
        updatedPlayer.queueOrder = newPosition;
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

      // Check if we should auto-create a new queue after this move
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

      if (zone.startsWith('court-')) {
        // Swap court orders
        const temp = updatedPlayer1.courtOrder;
        updatedPlayer1.courtOrder = updatedPlayer2.courtOrder;
        updatedPlayer2.courtOrder = temp;
        console.log(`🔄 Swapped court orders: ${player1.name} (${temp} → ${updatedPlayer1.courtOrder}) ↔ ${player2.name} (${player2.courtOrder} → ${updatedPlayer2.courtOrder})`);
      } else if (zone.startsWith('queue-')) {
        // Swap queue orders
        const temp = updatedPlayer1.queueOrder;
        updatedPlayer1.queueOrder = updatedPlayer2.queueOrder;
        updatedPlayer2.queueOrder = temp;
        console.log(`🔄 Swapped queue orders: ${player1.name} (${temp} → ${updatedPlayer1.queueOrder}) ↔ ${player2.name} (${player2.queueOrder} → ${updatedPlayer2.queueOrder})`);
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

    // New case for creating queue manually
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

    // New case for removing queue
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
      const playersInQueue: Player[] = state.queue.playersByQueue[queueId] || [];
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
      const transferredPlayerIds = new Set(playersInQueue.map((p: Player) => p.id));

      // ✨ Calculate positions for transferred players in the target court
      const existingCourtPlayers = state.courts.playersByCourt[availableCourtId] || [];

      const updatedPlayers = state.players.map((player: Player) => {
        if (transferredPlayerIds.has(player.id)) {
          console.log(`🔄 Transferring player ${player.name} to ${availableCourtId}`);

          // ✨ Calculate position based on existing court players and transfer order
          const transferIndex = playersInQueue.findIndex(p => p.id === player.id);
          const newCourtPosition = existingCourtPlayers.length + transferIndex;

          // Transfer to court and remove from queue
          return {
            ...player,
            status: [availableCourtId as PlayerStatus],
            timeEntered: timestamp,
            queueOrder: null, // ✨ Clear queue order
            courtOrder: newCourtPosition, // ✨ Assign court order
          };
        }
        return player;
      });

      // Step 5: Build new queue mappings - PRESERVE ORDER BY REMOVING ONLY THE TRANSFERRED QUEUE
      const remainingQueueIds = Object.keys(state.queue.playersByQueue)
        .filter(id => id !== queueId)
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

      const playersWithUpdatedQueueIds = updatedPlayers.map((player: Player) => {
        // Skip transferred players - they're already updated
        if (transferredPlayerIds.has(player.id)) {
          return player;
        }

        const newStatus = player.status.map((s) => {
          if (s.startsWith("queue-") && queueIdMapping[s]) {
            console.log(`🔄 Updating ${player.name}: ${s} → ${queueIdMapping[s]}`);
            return queueIdMapping[s] as PlayerStatus;
          }
          return s;
        });

        return {
          ...player,
          status: newStatus,
        };
      });

      // ✨ Rebuild zone mappings using updated order fields
      const finalQueueIds = remainingQueueIds.map((_, index) => `queue-${index}`);
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        playersWithUpdatedQueueIds,
        state.courts.count,
        finalQueueIds
      );

      console.log("✅ Transfer completed successfully");
      console.log(
        "🏟️ Updated court mapping:",
        Object.fromEntries(
          Object.entries(playersByCourt).map(([k, v]) => [
            k,
            v.map((p) => `${p.name}(${p.courtOrder})`),
          ])
        )
      );
      console.log(
        "⏳ Updated queue mapping:",
        Object.fromEntries(
          Object.entries(playersByQueue).map(([k, v]) => [
            k,
            v.map((p) => `${p.name}(${p.queueOrder})`),
          ])
        )
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

    case ActionType.END_GAME: {
      const courtId = action.payload.courtId;
      const timestamp = Date.now();

      // Step 1: Find players on this court
      const playersOnCourt: Player[] = state.players.filter((player: Player) =>
        player.status.includes(courtId as PlayerStatus)
      );

      if (playersOnCourt.length === 0) {
        console.log("❌ No players found on court", courtId);
        return state;
      }

      console.log("🎮 Ending game on", courtId, "with players:", playersOnCourt.map(p => p.name));

      // Step 2: Update players - increment games and handle status
      const updatedPlayers = state.players.map((player: Player) => {
        const isOnCourt = player.status.includes(courtId as PlayerStatus);
        if (!isOnCourt) return player;

        // Find opponents (other players on same court)
        const opponents = playersOnCourt
          .filter(p => p.id !== player.id)
          .map(p => p.name);

        const matchEntry = {
          opponents,
          timestamp,
        };

        // Remove this court from status, keep queue if present (Condition #6)
        const remainingStatus = player.status.filter(
          (s) => s !== courtId
        );

        console.log(`🔄 ${player.name}: status ${JSON.stringify(player.status)} → ${JSON.stringify(remainingStatus)}`);

        return {
          ...player,
          gamesPlayed: player.gamesPlayed + 1,
          status: remainingStatus,
          timeEntered: timestamp,
          matchHistory: [...(player.matchHistory || []), matchEntry],
          courtOrder: null, // ✨ Clear court order when leaving court
        };
      });

      // ✨ Rebuild using order fields
      const { playersByCourt, playersByQueue } = rebuildZoneMappings(
        updatedPlayers,
        state.courts.count,
        Object.keys(state.queue.playersByQueue)
      );

      console.log("✅ Game ended successfully");

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
        },
      };
    }

    default:
      return state;
  }
}