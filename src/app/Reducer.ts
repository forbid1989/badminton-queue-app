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

      const newPlayersByCourt: Record<string, Player[]> = {};
      const newPlayersByQueue: Record<string, Player[]> = {};
      const removedPlayers: Player[] = [];

      // Handle courts
      Object.entries(
        state.courts.playersByCourt as Record<string, Player[]>
      ).forEach(([courtId, players], index) => {
        if (index < newCount) {
          newPlayersByCourt[courtId] = players;
        } else {
          removedPlayers.push(
            ...players.map((p) => {
              const cleanedStatus = p.status.filter(
                (s) => !/^court-\d+$/.test(s)
              );
              const finalStatus: [PlayerStatus, ...PlayerStatus[]] =
                cleanedStatus.length > 0
                  ? (cleanedStatus as [PlayerStatus, ...PlayerStatus[]])
                  : ["rest"];

              return {
                ...p,
                status: finalStatus,
                timeEntered: Date.now(),
              };
            })
          );
        }
      });

      // Handle queues
      Object.entries(
        state.queue.playersByQueue as Record<string, Player[]>
      ).forEach(([queueId, players], index) => {
        if (index < newCount) {
          newPlayersByQueue[queueId] = players;
        } else {
          removedPlayers.push(
            ...players.map((p) => {
              const cleanedStatus = p.status.filter(
                (s) => !/^queue-\d+$/.test(s)
              );
              const finalStatus: [PlayerStatus, ...PlayerStatus[]] =
                cleanedStatus.length > 0
                  ? (cleanedStatus as [PlayerStatus, ...PlayerStatus[]])
                  : ["rest"];

              return {
                ...p,
                status: finalStatus,
                timeEntered: Date.now(),
              };
            })
          );
        }
      });

      // Initialize empty courts/queues up to new count
      for (let i = 0; i < newCount; i++) {
        const courtKey = `court-${i}`;
        const queueKey = `queue-${i}`;
        if (!newPlayersByCourt[courtKey]) newPlayersByCourt[courtKey] = [];
        if (!newPlayersByQueue[queueKey]) newPlayersByQueue[queueKey] = [];
      }

      return {
        ...state,
        courts: {
          count: newCount,
          playersByCourt: newPlayersByCourt,
        },
        queue: {
          count: newCount,
          playersByQueue: newPlayersByQueue,
        },
        unqueued: {
          players: [...state.unqueued.players, ...removedPlayers],
        },
      };
    }

    case ActionType.ADD_PLAYERS_FROM_TEXT: {
      return {
        ...state,
        unqueued: {
          players: [...state.unqueued.players, ...action.players],
        },
      };
    }

    case ActionType.CLEAR_ALL_PLAYERS: {
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
        courts: { ...state.courts, playersByCourt: clearedCourts },
        queue: { ...state.queue, playersByQueue: clearedQueues },
        unqueued: { players: [] },
      };
    }

    case ActionType.MOVE_PLAYER: {
      const { id, from, to } = action.payload;

      let playerToMove: Player | undefined;
      let updatedFrom: Player[] = [];

      // 1. Locate the player and remove from source
      if (from.startsWith("queue-")) {
        updatedFrom = state.queue.playersByQueue[from].filter((p: Player) => {
          if (p.id === id) {
            playerToMove = p;
            return false;
          }
          return true;
        });
      } else if (from === "rest") {
        updatedFrom = state.unqueued.players.filter((p: Player) => {
          if (p.id === id) {
            playerToMove = p;
            return false;
          }
          return true;
        });
      } else if (from.startsWith("court-")) {
        updatedFrom = state.courts.playersByCourt[from].filter((p: Player) => {
          if (p.id === id) {
            playerToMove = p;
            return false;
          }
          return true;
        });
      }

      if (!playerToMove) return state;

      // 2. Prevent court-to-court dragging
      if (to.startsWith("court-")) {
        const isAlreadyInCourt = Object.entries(
          state.courts.playersByCourt as Record<string, Player[]>
        ).some(
          ([courtId, courtPlayers]) =>
            courtPlayers.some((p) => p.id === id) && courtId !== from
        );

        if (isAlreadyInCourt) return state;
      }

      const isToCourt = to.startsWith("court-");

      // 3. Determine new zone status
      const targetStatus: PlayerStatus =
        to === "rest" ? "rest" : (to as PlayerStatus);

      // 4. Remove old zone statuses from current status
      const cleanedStatus = playerToMove!.status.filter(
        (s) => !/^court-\d+$/.test(s) && !/^queue-\d+$/.test(s) && s !== "rest"
      );

      // 5. Add new zone status
      const updatedStatusArray = [...cleanedStatus, targetStatus];

      // 6. Runtime safeguard for TypeScript's tuple constraint
      if (updatedStatusArray.length === 0) {
        throw new Error("Player must have at least one status.");
      }

      const finalStatusArray = updatedStatusArray as [
        PlayerStatus,
        ...PlayerStatus[]
      ];

      // 7. Construct updated player
      const updatedPlayer: Player = {
        ...playerToMove,
        status: finalStatusArray,
        timeEntered: isToCourt ? Date.now() : playerToMove.timeEntered,
      };

      const newState = { ...state };

      // 8. Insert into destination
      if (isToCourt) {
        const targetCourt = state.courts.playersByCourt[to] || [];
        if (targetCourt.length >= 4) return state;

        newState.courts = {
          ...state.courts,
          playersByCourt: {
            ...state.courts.playersByCourt,
            [to]: [...targetCourt, updatedPlayer],
            ...(from.startsWith("court-") && { [from]: updatedFrom }),
          },
        };
      } else if (to.startsWith("queue-")) {
        const maxPerQueue = 4;
        let targetQueueId = to;

        if ((state.queue.playersByQueue[to] || []).length >= maxPerQueue) {
          targetQueueId =
            Object.keys(state.queue.playersByQueue).find(
              (key) => state.queue.playersByQueue[key].length < maxPerQueue
            ) || to;

          if (
            (state.queue.playersByQueue[targetQueueId] || []).length >=
            maxPerQueue
          ) {
            return state;
          }
        }

        const targetQueue = state.queue.playersByQueue[targetQueueId] || [];
        if (targetQueue.some((p: Player) => p.id === id)) return state;

        newState.queue = {
          ...state.queue,
          playersByQueue: {
            ...state.queue.playersByQueue,
            [targetQueueId]: [...targetQueue, updatedPlayer],
            ...(from.startsWith("queue-") && { [from]: updatedFrom }),
          },
        };
      } else if (to === "rest") {
        newState.unqueued = {
          players: [...state.unqueued.players, updatedPlayer],
        };
      }

      // 9. Remove from previous zone
      if (from.startsWith("court-")) {
        newState.courts = {
          ...newState.courts,
          playersByCourt: {
            ...newState.courts.playersByCourt,
            [from]: updatedFrom,
          },
        };
      } else if (from.startsWith("queue-")) {
        newState.queue = {
          ...newState.queue,
          playersByQueue: {
            ...newState.queue.playersByQueue,
            [from]: updatedFrom,
          },
        };
      } else if (from === "rest") {
        newState.unqueued = {
          players: updatedFrom,
        };
      }

      return newState;
    }

    case ActionType.SET_GAMES_PLAYED: {
      const { id, value } = action.payload;
      const update = (players: Player[]) =>
        players.map((p) => (p.id === id ? { ...p, gamesPlayed: value } : p));

      const updatedCourts: Record<string, Player[]> = {};
      for (const [courtId, courtPlayers] of Object.entries(
        state.courts.playersByCourt
      ) as [string, Player[]][]) {
        updatedCourts[courtId] = update(courtPlayers);
      }

      const updatedQueues: Record<string, Player[]> = {};
      for (const [queueId, queuePlayers] of Object.entries(
        state.queue.playersByQueue
      ) as [string, Player[]][]) {
        updatedQueues[queueId] = update(queuePlayers);
      }

      return {
        ...state,
        courts: {
          ...state.courts,
          playersByCourt: updatedCourts,
        },
        queue: {
          ...state.queue,
          playersByQueue: updatedQueues,
        },
        unqueued: {
          players: update(state.unqueued.players),
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
      const remove = (players: Player[]) =>
        players.filter((p) => p.id !== idToRemove);

      const updatedCourts: Record<string, Player[]> = {};
      for (const [courtId, courtPlayers] of Object.entries(
        state.courts.playersByCourt
      ) as [string, Player[]][]) {
        updatedCourts[courtId] = remove(courtPlayers);
      }

      const updatedQueues: Record<string, Player[]> = {};
      for (const [queueId, queuePlayers] of Object.entries(
        state.queue.playersByQueue
      ) as [string, Player[]][]) {
        updatedQueues[queueId] = remove(queuePlayers);
      }

      return {
        ...state,
        courts: {
          ...state.courts,
          playersByCourt: updatedCourts,
        },
        queue: {
          ...state.queue,
          playersByQueue: updatedQueues,
        },
        unqueued: {
          players: remove(state.unqueued.players),
        },
      };
    }

    case ActionType.TRANSFER_QUEUE_TO_COURT: {
      const { queueId } = action.payload;
      const playersInQueue: Player[] =
        state.queue.playersByQueue[queueId] || [];

      if (playersInQueue.length === 0) return state;

      // 1. Find an available court that can accommodate the players
      const availableCourtId = (
        Object.entries(state.courts.playersByCourt) as [string, Player[]][]
      ).find(
        ([, courtPlayers]) => courtPlayers.length + playersInQueue.length <= 4
      )?.[0];

      if (!availableCourtId) return state;

      // 2. Add players to the available court
      const updatedCourtPlayers = [
        ...state.courts.playersByCourt[availableCourtId],
        ...playersInQueue.map((player) => {
          return {
            ...player,
            status: [availableCourtId as PlayerStatus],
            timeEntered: Date.now(),
          };
        }),
      ];

      // 3. Shift all queues above the transferred one
      const updatedQueues: Record<string, Player[]> = {};
      const queueKeys = Object.keys(state.queue.playersByQueue).sort();
      const transferIndex = queueKeys.indexOf(queueId);

      for (let i = 0; i < queueKeys.length; i++) {
        const key = queueKeys[i];

        if (i < transferIndex) {
          updatedQueues[key] = state.queue.playersByQueue[key];
        } else if (i === transferIndex) {
          // Clear the transferred queue
          updatedQueues[key] = [];
        } else if (i > transferIndex) {
          // Shift next queue into current one
          updatedQueues[queueKeys[i - 1]] = state.queue.playersByQueue[key];
        }
      }

      // Clear the last queue slot
      const lastQueueKey = queueKeys[queueKeys.length - 1];
      updatedQueues[lastQueueKey] = [];

      return {
        ...state,
        courts: {
          ...state.courts,
          playersByCourt: {
            ...state.courts.playersByCourt,
            [availableCourtId]: updatedCourtPlayers,
          },
        },
        queue: {
          ...state.queue,
          playersByQueue: updatedQueues,
        },
      };
    }

    case ActionType.END_GAME: {
      const courtId = action.payload.courtId;
      const playersOnCourt: Player[] =
        state.courts.playersByCourt[courtId] || [];

      // Increment gamesPlayed and move them to unqueued

      const timestamp = Date.now();

      const updatedPlayers = playersOnCourt.map((player) => {
        const opponents = playersOnCourt
          .filter((p) => p.id !== player.id)
          .map((p) => p.name); // or use p.id if preferred

        const matchEntry = {
          opponents,
          timestamp,
        };

        const cleanedStatus = player.status.filter((s) => s !== courtId);

        // If no more statuses remain, default to "rest"
        const finalStatus: [PlayerStatus, ...PlayerStatus[]] =
          cleanedStatus.length > 0
            ? (cleanedStatus as [PlayerStatus, ...PlayerStatus[]])
            : ["rest"];

        return {
          ...player,
          gamesPlayed: player.gamesPlayed + 1,
          status: finalStatus,
          timeEntered: timestamp,
          matchHistory: [...(player.matchHistory || []), matchEntry],
        };
      });

      return {
        ...state,
        courts: {
          ...state.courts,
          playersByCourt: {
            ...state.courts.playersByCourt,
            [courtId]: [],
          },
        },
        unqueued: {
          ...state.unqueued,
          players: [...state.unqueued.players, ...updatedPlayers],
        },
      };
    }

    case ActionType.UPDATE_PLAYER_NAME: {
      const { id, newName } = action.payload;

      const update = (players: Player[]) =>
        players.map((p) => (p.id === id ? { ...p, name: newName } : p));

      const updatedCourts: Record<string, Player[]> = {};
      for (const [courtId, courtPlayers] of Object.entries(
        state.courts.playersByCourt
      ) as [string, Player[]][]) {
        updatedCourts[courtId] = update(courtPlayers);
      }

      const updatedQueues: Record<string, Player[]> = {};
      for (const [queueId, queuePlayers] of Object.entries(
        state.queue.playersByQueue
      ) as [string, Player[]][]) {
        updatedQueues[queueId] = update(queuePlayers);
      }

      return {
        ...state,
        courts: {
          ...state.courts,
          playersByCourt: updatedCourts,
        },
        queue: {
          ...state.queue,
          playersByQueue: updatedQueues,
        },
        unqueued: {
          players: update(state.unqueued.players),
        },
      };
    }

    default:
      return state;
  }
}
