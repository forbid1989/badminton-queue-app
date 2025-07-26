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
  | { type: "createQueue" } // 🆕 New action type
  | { type: "removeQueue"; payload: { queueId: string } }; // 🆕 New action type

// 🆕 Helper function to check if we should auto-create a new queue
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

// 🆕 Helper function to get next queue ID
function getNextQueueId(state: any): string {
  const existingIds = Object.keys(state.queue.playersByQueue)
    .map((id) => parseInt(id.split("-")[1]))
    .filter((num) => !isNaN(num));

  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : -1;
  return `queue-${maxId + 1}`;
}

// 🆕 Helper function to rebuild queue IDs after removal
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

export default function reducer(state: any, action: Action) {
  switch (action.type) {
    case ActionType.SET_COURT_COUNT: {
      const newCount = action.payload;

      const newCourtIds = Array.from(
        { length: newCount },
        (_, i) => `court-${i}`
      );

      // 🆕 Keep queue IDs unchanged - they're now independent
      const existingQueueIds = Object.keys(state.queue.playersByQueue);

      const updatedPlayers = state.players.map((player: Player) => {
        // ✅ Filter statuses to only valid court/queue IDs
        const validStatuses = player.status.filter((s) => {
          const isCourt = s.startsWith("court-");
          const isQueue = s.startsWith("queue-");
          return (
            (!isCourt || newCourtIds.includes(s)) &&
            (!isQueue || existingQueueIds.includes(s))
          );
        });

        // ✅ Keep only 1 court-* and 1 queue-* (Condition #6 & #7)
        const court = validStatuses.find((s) => s.startsWith("court-"));
        const queue = validStatuses.find((s) => s.startsWith("queue-"));

        const cleanStatus: PlayerStatus[] = [];
        if (court) cleanStatus.push(court);
        if (queue) cleanStatus.push(queue);

        return {
          ...player,
          status: cleanStatus,
        };
      });

      return {
        ...state,
        courts: {
          ...state.courts,
          count: newCount,
        },
        // 🆕 Don't change queue count when court count changes
        players: updatedPlayers,
      };
    }

    case ActionType.ADD_PLAYERS_FROM_TEXT: {
      const newPlayers = action.players.map((player) => ({
        ...player,
        status: [], // ✅ Start as unqueued (Condition #1)
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
        players: clearedPlayers, // ✅ global list updated
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
      // RULE 6: Moving back to rest - clear all statuses
      else if (to === "rest" || to === "all") {
        newStatus = [];
      }

      const updatedPlayer: Player = {
        ...playerToMove,
        status: newStatus,
        timeEntered:
          isToCourt && !existingCourt ? Date.now() : playerToMove.timeEntered,
      };

      const updatedPlayers = state.players.map((p: Player) =>
        p.id === id ? updatedPlayer : p
      );

      // Step 2: Recalculate playersByCourt and playersByQueue
      const playersByCourt: Record<string, Player[]> = {};
      const playersByQueue: Record<string, Player[]> = {};

      // Initialize empty arrays for all courts and queues
      for (let i = 0; i < state.courts.count; i++) {
        playersByCourt[`court-${i}`] = [];
      }

      // 🆕 Initialize queues based on existing queue keys
      Object.keys(state.queue.playersByQueue).forEach((queueId) => {
        playersByQueue[queueId] = [];
      });

      for (const p of updatedPlayers) {
        const courtId = p.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queueId = p.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (courtId && playersByCourt[courtId]) {
          playersByCourt[courtId].push(p);
        }

        if (queueId && playersByQueue[queueId]) {
          playersByQueue[queueId].push(p);
        }
      }

      // 🆕 Check if we should auto-create a new queue after this move
      const tempState = {
        ...state,
        players: updatedPlayers,
        queue: {
          ...state.queue,
          playersByQueue,
        },
      };

      if (isToQueue && shouldAutoCreateQueue(tempState)) {
        const newQueueId = getNextQueueId(tempState);
        playersByQueue[newQueueId] = [];
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
          count: Object.keys(playersByQueue).length,
          playersByQueue,
        },
      };
    }

    // 🆕 New case for creating queue manually
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

    // 🆕 New case for removing queue
    case ActionType.REMOVE_QUEUE: {
      const { queueId } = action.payload;

      // Don't allow removing the last queue
      if (Object.keys(state.queue.playersByQueue).length <= 1) {
        return state;
      }

      // Move players from deleted queue back to unqueued state
      const updatedPlayers = state.players.map((player: Player) => {
        if (player.status.includes(queueId as PlayerStatus)) {
          const newStatus = player.status.filter((s) => s !== queueId);
          return {
            ...player,
            status: newStatus,
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

      // Rebuild court mappings
      const playersByCourt: Record<string, Player[]> = {};
      for (let i = 0; i < state.courts.count; i++) {
        playersByCourt[`court-${i}`] = [];
      }

      const playersByQueue: Record<string, Player[]> = {};
      Object.keys(rebuiltQueues).forEach((queueId) => {
        playersByQueue[queueId] = [];
      });

      for (const p of playersWithUpdatedQueueIds) {
        const courtId = p.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queueId = p.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (courtId && playersByCourt[courtId]) {
          playersByCourt[courtId].push(p);
        }

        if (queueId && playersByQueue[queueId]) {
          playersByQueue[queueId].push(p);
        }
      }

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

      // ✅ Step 1: Update the player's gamesPlayed field
      const updatedPlayers = state.players.map((p: Player) =>
        p.id === id ? { ...p, gamesPlayed: value } : p
      );

      // ✅ Step 2: Rebuild court and queue mappings only (no unqueued zone)
      const playersByCourt: Record<string, Player[]> = {};
      const playersByQueue: Record<string, Player[]> = {};

      for (const player of updatedPlayers) {
        const courtId = player.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queueId = player.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (courtId) {
          if (!playersByCourt[courtId]) playersByCourt[courtId] = [];
          playersByCourt[courtId].push(player);
        }

        if (queueId) {
          if (!playersByQueue[queueId]) playersByQueue[queueId] = [];
          playersByQueue[queueId].push(player);
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

      // ✅ Step 1: Remove player from global list
      const updatedPlayers = state.players.filter(
        (p: Player) => p.id !== idToRemove
      );

      // ✅ Step 2: Rebuild court and queue mappings only
      const playersByCourt: Record<string, Player[]> = {};
      const playersByQueue: Record<string, Player[]> = {};

      for (const player of updatedPlayers) {
        const courtId = player.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queueId = player.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (courtId) {
          if (!playersByCourt[courtId]) playersByCourt[courtId] = [];
          playersByCourt[courtId].push(player);
        }

        if (queueId) {
          if (!playersByQueue[queueId]) playersByQueue[queueId] = [];
          playersByQueue[queueId].push(player);
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

    case ActionType.TRANSFER_QUEUE_TO_COURT: {
      const { queueId } = action.payload;
      console.log("🚀 TRANSFER_QUEUE_TO_COURT started:", { queueId });

      // Step 1: Extract players in the queue - FIX: Use zone mapping directly
      const playersInQueue = state.queue.playersByQueue[queueId] || [];
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

      // Step 3: Find available court - FIX: Use zone mapping for accurate count
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

      // Step 4: Update player statuses - Transfer players AND shift queue numbers
      const transferredQueueIndex = parseInt(queueId.split("-")[1], 10);

      const updatedPlayers = state.players.map((player: Player) => {
        const isInThisQueue = playersInQueue.some(
          (p: Player) => p.id === player.id
        );

        if (isInThisQueue) {
          console.log(
            `🔄 Transferring player ${player.name} to ${availableCourtId}`
          );
          // Transfer to court and remove from queue
          return {
            ...player,
            status: [availableCourtId as PlayerStatus],
            timeEntered: timestamp,
          };
        }

        // For all other players: shift their queue numbers down if they're in higher queues
        const newStatus = player.status.map((s) => {
          if (s.startsWith("queue-")) {
            const currentQueueIndex = parseInt(s.split("-")[1], 10);

            // If this queue is higher than the transferred queue, shift it down
            if (currentQueueIndex > transferredQueueIndex) {
              const newQueueIndex = currentQueueIndex - 1;
              console.log(
                `🔽 Shifting ${player.name} from ${s} to queue-${newQueueIndex}`
              );
              return `queue-${newQueueIndex}` as PlayerStatus;
            }
          }
          return s;
        });

        return {
          ...player,
          status: newStatus,
        };
      });

      // Step 5: Rebuild zone mappings with shifted queue numbers
      const playersByCourt: Record<string, Player[]> = {};
      const playersByQueue: Record<string, Player[]> = {};

      // Initialize courts
      for (let i = 0; i < state.courts.count; i++) {
        playersByCourt[`court-${i}`] = [];
      }

      // Initialize queues - one less queue since one was transferred
      const remainingQueueCount =
        Object.keys(state.queue.playersByQueue).length - 1;
      for (let i = 0; i < remainingQueueCount; i++) {
        playersByQueue[`queue-${i}`] = [];
      }

      // Populate zone mappings
      for (const player of updatedPlayers) {
        const courtId = player.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queueId = player.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (courtId && playersByCourt[courtId]) {
          playersByCourt[courtId].push(player);
        }
        if (queueId && playersByQueue[queueId]) {
          playersByQueue[queueId].push(player);
        }
      }

      console.log("✅ Transfer completed successfully");
      console.log("🔽 Queue shift completed");
      console.log(
        "🏟️ Updated court mapping:",
        Object.fromEntries(
          Object.entries(playersByCourt).map(([k, v]) => [
            k,
            v.map((p) => p.name),
          ])
        )
      );
      console.log(
        "⏳ Updated queue mapping:",
        Object.fromEntries(
          Object.entries(playersByQueue).map(([k, v]) => [
            k,
            v.map((p) => p.name),
          ])
        )
      );

      return {
        ...state,
        players: updatedPlayers,
        courts: {
          ...state.courts,
          playersByCourt,
        },
        queue: {
          count: remainingQueueCount,
          playersByQueue,
        },
      };
    }

    case ActionType.END_GAME: {
      const courtId = action.payload.courtId;
      const timestamp = Date.now();

      // Step 1: Update players
      const updatedPlayers = state.players.map((player: Player) => {
        const isOnCourt = player.status.includes(courtId as PlayerStatus);
        if (!isOnCourt) return player;

        // Find opponents (same court)
        const opponents = state.players
          .filter(
            (p: Player) =>
              p.id !== player.id && p.status.includes(courtId as PlayerStatus)
          )
          .map((p: Player) => p.name);

        const matchEntry = {
          opponents,
          timestamp,
        };

        // Remove this court from status
        const remainingStatus = player.status.filter(
          (s) => !s.startsWith("court-")
        );

        // Keep queue if present (Condition #6)
        const queue = remainingStatus.find((s) => s.startsWith("queue-"));
        const newStatus: PlayerStatus[] = queue ? [queue] : [];

        return {
          ...player,
          gamesPlayed: player.gamesPlayed + 1,
          status: newStatus,
          timeEntered: timestamp,
          matchHistory: [...(player.matchHistory || []), matchEntry],
        };
      });

      // Step 2: Rebuild courts & queue (❌ skip unqueued)
      const playersByCourt: Record<string, Player[]> = {};
      const playersByQueue: Record<string, Player[]> = {};

      for (const p of updatedPlayers) {
        const court = p.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queue = p.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (court) {
          if (!playersByCourt[court]) playersByCourt[court] = [];
          playersByCourt[court].push(p);
        }

        if (queue) {
          if (!playersByQueue[queue]) playersByQueue[queue] = [];
          playersByQueue[queue].push(p);
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

    // SWAP_PLAYERS case with fixes
    case ActionType.SWAP_PLAYERS: {
      console.log("🔄 REDUCER: SWAP_PLAYERS action received:", action.payload);

      const { playerId1, playerId2, zone } = action.payload;

      // Find both players
      const player1 = state.players.find((p: Player) => p.id === playerId1);
      const player2 = state.players.find((p: Player) => p.id === playerId2);

      console.log("🔍 REDUCER: Player lookup results:", {
        player1: player1 ? `${player1.name} (${player1.id})` : "NOT FOUND",
        player2: player2 ? `${player2.name} (${player2.id})` : "NOT FOUND",
        zone,
      });

      if (!player1 || !player2) {
        console.warn("❌ REDUCER: Cannot swap: one or both players not found");
        return state;
      }

      // Verify both players are in the same zone
      const player1InZone = player1.status.includes(zone as PlayerStatus);
      const player2InZone = player2.status.includes(zone as PlayerStatus);

      console.log("🔍 REDUCER: Zone validation:", {
        player1InZone,
        player2InZone,
        player1Status: player1.status,
        player2Status: player2.status,
      });

      if (!player1InZone || !player2InZone) {
        console.warn("❌ REDUCER: Cannot swap: players not in the same zone");
        return state;
      }

      console.log(
        "✅ REDUCER: Swap validation passed, proceeding with swap..."
      );

      // CRITICAL FIX: Use the zone mappings instead of filtering from global players
      let playersInZone: Player[] = [];

      if (zone.startsWith("court-")) {
        playersInZone = [...(state.courts.playersByCourt[zone] || [])];
      } else if (zone.startsWith("queue-")) {
        playersInZone = [...(state.queue.playersByQueue[zone] || [])];
      }

      console.log(
        "🔍 REDUCER: Players in zone before swap:",
        playersInZone.map((p: Player) => p.name)
      );

      // Find the indices of the two players in the zone
      const index1 = playersInZone.findIndex((p: Player) => p.id === playerId1);
      const index2 = playersInZone.findIndex((p: Player) => p.id === playerId2);

      if (index1 === -1 || index2 === -1) {
        console.warn(
          "❌ REDUCER: Cannot swap: players not found in zone mapping"
        );
        return state;
      }

      // Create a new array with swapped positions
      const newPlayersInZone = [...playersInZone];
      [newPlayersInZone[index1], newPlayersInZone[index2]] = [
        newPlayersInZone[index2],
        newPlayersInZone[index1],
      ];

      console.log(
        "🔄 REDUCER: Players in zone after swap:",
        newPlayersInZone.map((p) => p.name)
      );

      // CRITICAL FIX: Copy existing mappings and only update the swapped zone
      const playersByCourt = { ...state.courts.playersByCourt };
      const playersByQueue = { ...state.queue.playersByQueue };

      // Update only the specific zone that was swapped
      if (zone.startsWith("court-")) {
        playersByCourt[zone] = newPlayersInZone;
        console.log(
          "🔄 REDUCER: Updated court",
          zone,
          "with players:",
          newPlayersInZone.map((p) => p.name)
        );
      } else if (zone.startsWith("queue-")) {
        playersByQueue[zone] = newPlayersInZone;
        console.log(
          "🔄 REDUCER: Updated queue",
          zone,
          "with players:",
          newPlayersInZone.map((p) => p.name)
        );
      }

      console.log("✅ REDUCER: Swap completed successfully");

      return {
        ...state,
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
