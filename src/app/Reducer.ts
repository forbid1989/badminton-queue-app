import { ActionType } from "./Action";
import { Player, PlayerStatus } from "../types/Player";

type Action =
  | { type: "setCourtCount"; payload: number }
  | { type: "addPlayersFromText"; players: Player[] }
  | { type: "clearAllPlayers" }
  | { type: "movePlayer"; payload: { id: string; from: string; to: string } }
  | { type: "setGamesPlayed"; payload: { id: string; value: number } }
  | { type: "updatePlayerName"; payload: { id: string; newName: string } }
  | { type: "setPlayerTextInput"; text: string }
  | { type: "toggleTimers" }
  | { type: "setPriorityMode"; mode: "FIFO" | "LongestWaiting" }
  | { type: "removePlayer"; id: string }
  | { type: "transferQueueToCourt"; payload: { queueId: string } }
  | { type: "endGame"; payload: { courtId: string } };

export default function reducer(state: any, action: Action) {
  switch (action.type) {
    case ActionType.SET_COURT_COUNT: {
      const newCount = action.payload;

      const newCourtIds = Array.from(
        { length: newCount },
        (_, i) => `court-${i}`
      );
      const newQueueIds = Array.from(
        { length: newCount },
        (_, i) => `queue-${i}`
      );

      const updatedPlayers = state.players.map((player: Player) => {
        // ✅ Filter statuses to only valid court/queue IDs
        const validStatuses = player.status.filter((s) => {
          const isCourt = s.startsWith("court-");
          const isQueue = s.startsWith("queue-");
          return (
            (!isCourt || newCourtIds.includes(s)) &&
            (!isQueue || newQueueIds.includes(s))
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
        queue: {
          ...state.queue,
          count: newCount,
        },
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

      // ✅ Prevent overfilling courts/queues (max 4)
      const playersInTarget = state.players.filter((p: Player) =>
        p.status.includes(to as PlayerStatus)
      );
      if (playersInTarget.length >= 4) return state;

      // ✅ Step 1: Clean existing court-*/queue-* before assigning new one
      let newStatus: PlayerStatus[] = [];

      const existingCourt = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("court-")
      );

      const existingQueue = playerToMove.status.find(
        (s: PlayerStatus): s is PlayerStatus => s.startsWith("queue-")
      );

      if (isToCourt) {
        // Replace court assignment, keep queue if it exists (Condition #6)
        newStatus = [to as PlayerStatus];
        if (existingQueue) newStatus.push(existingQueue);
      } else if (isToQueue) {
        // Replace queue assignment, keep court if it exists (Condition #6)
        newStatus = existingCourt ? [existingCourt] : [];
        newStatus.push(to as PlayerStatus);
      }

      const updatedPlayer: Player = {
        ...playerToMove,
        status: newStatus,
        timeEntered: isToCourt ? Date.now() : playerToMove.timeEntered,
      };

      const updatedPlayers = state.players.map((p: Player) =>
        p.id === id ? updatedPlayer : p
      );

      // ✅ Step 2: Recalculate playersByCourt and playersByQueue
      const playersByCourt: Record<string, Player[]> = {};
      const playersByQueue: Record<string, Player[]> = {};

      for (const p of updatedPlayers) {
        const courtId = p.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queueId = p.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (courtId) {
          if (!playersByCourt[courtId]) playersByCourt[courtId] = [];
          playersByCourt[courtId].push(p);
        }

        if (queueId) {
          if (!playersByQueue[queueId]) playersByQueue[queueId] = [];
          playersByQueue[queueId].push(p);
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

      // Step 1: Extract players in the queue
      const playersInQueue = state.players.filter((p: Player) => {
        const status: PlayerStatus[] = Array.isArray(p.status)
          ? p.status
          : JSON.parse(p.status);

        return status.includes(queueId as PlayerStatus);
      });
      if (playersInQueue.length === 0) return state;

      // Step 2: Rebuild current court occupancy
      const courtMap: Record<string, Player[]> = {};
      for (const p of state.players) {
        const courtId = p.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        if (courtId) {
          if (!courtMap[courtId]) courtMap[courtId] = [];
          courtMap[courtId].push(p);
        }
      }

      // Step 3: Find a court that can fit all players from this queue
      const courtCount = Object.keys(state.courts.playersByCourt).length; // or pass from UI if available
      const allCourtIds = Array.from(
        { length: courtCount },
        (_, i) => `court-${i}`
      );
      const availableCourtId =
        Object.entries(courtMap).find(
          ([, courtPlayers]) => courtPlayers.length + playersInQueue.length <= 4
        )?.[0] ||
        allCourtIds.find(
          (cid) => (courtMap[cid] || []).length + playersInQueue.length <= 4
        );

      if (!availableCourtId) return state;

      const timestamp = Date.now();

      // Step 4: Update player statuses
      const updatedPlayers = state.players.map((p: Player) => {
        const isInQueue = p.status.includes(queueId as PlayerStatus);

        if (isInQueue) {
          // ✅ Transferred players: assign to court + retain queue (Condition #6)
          const newStatus: PlayerStatus[] = [];

          // Assign to available court
          newStatus.push(availableCourtId as PlayerStatus);

          return {
            ...p,
            status: [...new Set(newStatus)],
            timeEntered: timestamp,
          };
        }

        // ✅ Everyone else: shift their queues down
        const newStatus = p.status
          .map((s) => {
            if (s.startsWith("queue-")) {
              const [, idxStr] = s.split("-");
              const i = parseInt(idxStr, 10);
              const currentIndex = parseInt(queueId.split("-")[1], 10);

              if (i === currentIndex) return null; // Remove this queue
              if (i > currentIndex) return `queue-${i - 1}` as PlayerStatus;
            }
            return s;
          })
          .filter(Boolean) as PlayerStatus[];

        // Ensure no duplicates, max 1 court and 1 queue
        const cleaned: PlayerStatus[] = [];
        let courtSeen = false;
        let queueSeen = false;

        for (const s of newStatus) {
          if (s.startsWith("court-")) {
            if (!courtSeen) {
              cleaned.push(s);
              courtSeen = true;
            }
          } else if (s.startsWith("queue-")) {
            if (!queueSeen) {
              cleaned.push(s);
              queueSeen = true;
            }
          } else {
            cleaned.push(s);
          }
        }

        return {
          ...p,
          status: cleaned,
        };
      });

      // Step 5: Rebuild zones (no more unqueued!)
      const playersByCourt: Record<string, Player[]> = {};
      const playersByQueue: Record<string, Player[]> = {};

      for (const p of updatedPlayers) {
        const courtId = p.status.find((s: PlayerStatus) =>
          s.startsWith("court-")
        );
        const queueId = p.status.find((s: PlayerStatus) =>
          s.startsWith("queue-")
        );

        if (courtId) {
          if (!playersByCourt[courtId]) playersByCourt[courtId] = [];
          playersByCourt[courtId].push(p);
        }
        if (queueId) {
          if (!playersByQueue[queueId]) playersByQueue[queueId] = [];
          playersByQueue[queueId].push(p);
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

    default:
      return state;
  }
}
