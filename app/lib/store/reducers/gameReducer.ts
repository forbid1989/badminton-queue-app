import { Player, PlayerStatus, MatchHistoryEntry } from "../../../components/types/Player";
import { RootState, UndoGameData } from "../rootState";
import { rebuildZoneMappings } from "../helpers/zoneHelpers";
import { generateMatchHistoryEntries } from "../../utils/matchHistoryUtils";

/**
 * Game lifecycle reducer actions
 * Handles: END_GAME, UNDO_END_GAME, CLEAR_COURT_UNDO, SET_GAMES_PLAYED
 */

export function endGame(state: RootState, courtId: string): RootState {
  const endTime = Date.now();

  try {
    // Step 1: Validate court ID format
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

    // Step 2: Find players on this court with validation
    const playersOnCourt: Player[] = state.players.filter(
      (player: Player) =>
        Array.isArray(player.status) &&
        player.status.includes(courtId as PlayerStatus)
    );

    if (playersOnCourt.length === 0) {
      console.log("⛔ No players found on court", courtId);
      return state;
    }

    if (playersOnCourt.length < 2) {
      console.log("⛔ Cannot end game with less than 2 players on court", courtId);
      return state;
    }

    console.log(
      "🎮 Ending game on",
      courtId,
      "with players:",
      playersOnCourt.map((p) => p.name || `Player-${p.id}`)
    );

    // Step 3: Validate and calculate match start time
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

    // Step 4: Generate court name safely
    const courtName = `Court ${courtIndex + 1}`;

    // Step 5: Generate match history entries with error handling
    let matchHistoryEntries: MatchHistoryEntry[];
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

    // Step 6: Create match entry map for safe lookup
    const matchEntryMap = new Map<string, MatchHistoryEntry>();
    playersOnCourt.forEach((player, index) => {
      if (matchHistoryEntries[index] && player.id) {
        matchEntryMap.set(player.id, matchHistoryEntries[index]);
      }
    });

    // Step 7: Store undo data BEFORE modifying players
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

    // Step 8: Update players with comprehensive validation
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

    // Step 9: Rebuild zone mappings with validation
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

export function undoEndGame(state: RootState, courtId: string): RootState {
  const undoData = state.undoableGames[courtId];

  if (!undoData) {
    console.log("⛔ No undo data found for court", courtId);
    return state;
  }

  console.log("⏪ Undoing ended game on", courtId);

  // Restore players to their previous state
  const updatedPlayers = state.players.map((player: Player) => {
    const playerUndoData = undoData.playersData.find(
      (p) => p.id === player.id
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

export function clearCourtUndo(state: RootState, courtId: string): RootState {
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

export function setGamesPlayed(
  state: RootState,
  id: string,
  value: number
): RootState {
  // Step 1: Update the player's gamesPlayed field
  const updatedPlayers = state.players.map((p: Player) =>
    p.id === id ? { ...p, gamesPlayed: value } : p
  );

  // Rebuild using order fields
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
