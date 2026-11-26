import { Player, PlayerStatus } from "../../../components/types/Player";
import { RootState, UndoGameData } from "../rootState";
import { rebuildZoneMappings } from "../helpers/zoneHelpers";

/**
 * Court-related reducer actions
 * Handles: SET_COURT_COUNT, SWAP_COURT_PLAYERS, REMOVE_SPECIFIC_COURT
 */

export function setCourtCount(state: RootState, newCount: number): RootState {
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

    // Clear order if player is no longer in valid zone
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

  // Handle court display numbers
  const existingDisplayNumbers = state.courts.courtDisplayNumbers || {};
  const updatedDisplayNumbers: Record<string, number> = {};

  // Keep existing display numbers for courts that still exist
  for (let i = 0; i < newCount; i++) {
    const courtId = `court-${i}`;
    if (existingDisplayNumbers[courtId] !== undefined) {
      // Keep existing custom number
      updatedDisplayNumbers[courtId] = existingDisplayNumbers[courtId];
    } else {
      // New court: assign default sequential number (1-based)
      updatedDisplayNumbers[courtId] = i + 1;
    }
  }

  // A removed court's Undo must not reappear if a court is added back later
  const remainingUndoGames = Object.fromEntries(
    Object.entries(state.undoableGames).filter(([courtId]) =>
      newCourtIds.includes(courtId)
    )
  ) as RootState["undoableGames"];

  return {
    ...state,
    undoableGames: remainingUndoGames,
    courts: {
      ...state.courts,
      count: newCount,
      playersByCourt,
      courtDisplayNumbers: updatedDisplayNumbers,
    },
    queue: {
      ...state.queue,
      playersByQueue,
    },
    players: updatedPlayers,
  };
}

export function swapCourtPlayers(
  state: RootState,
  sourceCourtId: string,
  targetCourtId: string
): RootState {
  console.log(
    "🔄 REDUCER: SWAP_COURT_PLAYERS action received:",
    { sourceCourtId, targetCourtId }
  );

  // Validation: Check if court IDs are valid
  if (!sourceCourtId || !targetCourtId) {
    console.warn("⚠️ REDUCER: Invalid court IDs provided");
    return state;
  }

  // Validation: Check if trying to swap court with itself
  if (sourceCourtId === targetCourtId) {
    console.warn("⚠️ REDUCER: Cannot swap court with itself");
    return state;
  }

  // Validation: Check if court IDs exist in current court mappings
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

  // Early exit: If both courts are empty, nothing to swap
  if (sourceCourtPlayers.length === 0 && targetCourtPlayers.length === 0) {
    console.warn("⚠️ REDUCER: Both courts are empty, nothing to swap");
    return state;
  }

  console.log(
    `🔄 Swapping players between ${sourceCourtId} (${sourceCourtPlayers.length} players) and ${targetCourtId} (${targetCourtPlayers.length} players)`
  );

  // Create updated players array with proper error handling
  const updatedPlayers = state.players.map((player: Player) => {
    const isInSourceCourt = player.status.includes(
      sourceCourtId as PlayerStatus
    );
    const isInTargetCourt = player.status.includes(
      targetCourtId as PlayerStatus
    );

    // Validation: Ensure player has valid courtOrder if on a court
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
        // Don't update courtEnteredTime - players are just swapping courts
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
        // Don't update courtEnteredTime - players are just swapping courts
      };
    }

    return player; // No change for players not in either court
  });

  // Position conflict detection: Check for position conflicts before rebuilding
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

  // Rebuild zone mappings using updated players
  // This will handle any position conflicts and ensure proper ordering
  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    updatedPlayers,
    state.courts.count,
    Object.keys(state.queue.playersByQueue)
  );

  // Validation: Verify the swap actually worked
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

  // Clear undo data for both courts since composition changed
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

  // Success logging
  console.log("✅ REDUCER: Court players swap completed successfully");
  if (undoCleared) {
    console.log("✅ Undo data cleared for affected courts");
  }

  // Final validation: Ensure no player is lost in the process
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

export function removeSpecificCourt(
  state: RootState,
  courtId: string
): RootState {
  console.log(
    "🗑️ REDUCER: REMOVE_SPECIFIC_COURT action received:",
    { courtId }
  );

  const courtIndex = parseInt(courtId.split("-")[1]);

  // Validation: Prevent removing if only 1 court left
  if (state.courts.count <= 1) {
    console.warn(
      "⚠️ REDUCER: Cannot remove court - at least 1 court must remain"
    );
    return state;
  }

  // Validation: Check if court exists
  if (courtIndex >= state.courts.count || courtIndex < 0) {
    console.warn(`⚠️ REDUCER: Court ${courtId} does not exist`);
    return state;
  }

  console.log(`🗑️ Removing ${courtId} (index ${courtIndex})`);

  // Single-pass player processing with comprehensive logging
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

  // Validation: Ensure no players were lost
  if (updatedPlayers.length !== state.players.length) {
    console.error(
      "❌ CRITICAL: Player count mismatch during court deletion!"
    );
    return state; // Abort if players were lost
  }

  // Build new court structure with validation
  const newCourtCount = state.courts.count - 1;
  console.log(`📊 Court count: ${state.courts.count} → ${newCourtCount}`);

  // Validation: Verify all remaining players have valid court references
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

  // Rebuild zone mappings with validated players
  const { playersByCourt, playersByQueue } = rebuildZoneMappings(
    updatedPlayers,
    newCourtCount,
    Object.keys(state.queue.playersByQueue)
  );

  // Validation: Verify rebuild didn't lose players
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

  // Handle undo data with proper validation
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

  // Final validation: Comprehensive state check
  const playersOnDeletedCourt = state.courts.playersByCourt[courtId] || [];
  const expectedRemovedPlayers = playersOnDeletedCourt.length;

  // Handle court display numbers - shift them for remaining courts
  const existingDisplayNumbers = state.courts.courtDisplayNumbers || {};
  const updatedDisplayNumbers: Record<string, number> = {};

  for (let i = 0; i < newCourtCount; i++) {
    const newCourtId = `court-${i}`;
    let displayNumber: number;

    if (i < courtIndex) {
      // Courts before deleted court: keep their display numbers
      displayNumber = existingDisplayNumbers[newCourtId] || (i + 1);
    } else {
      // Courts after deleted court: get display number from next court
      const oldCourtId = `court-${i + 1}`;
      displayNumber = existingDisplayNumbers[oldCourtId] || (i + 2);
    }

    updatedDisplayNumbers[newCourtId] = displayNumber;
  }

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
      courtDisplayNumbers: updatedDisplayNumbers,
    },
    queue: {
      ...state.queue,
      playersByQueue,
    },
    undoableGames: updatedUndoGames,
  };
}

export function updateCourtDisplayNumber(
  state: RootState,
  courtId: string,
  displayNumber: number
): RootState {
  console.log(
    `🔢 REDUCER: UPDATE_COURT_DISPLAY_NUMBER action received:`,
    { courtId, displayNumber }
  );

  // Validation: Check if court exists
  const courtIndex = parseInt(courtId.split("-")[1]);
  if (courtIndex >= state.courts.count || courtIndex < 0) {
    console.warn(`⚠️ REDUCER: Court ${courtId} does not exist`);
    return state;
  }

  // Validation: Check if display number is valid (positive integer)
  if (!Number.isInteger(displayNumber) || displayNumber <= 0) {
    console.warn(
      `⚠️ REDUCER: Invalid display number ${displayNumber} (must be positive integer)`
    );
    return state;
  }

  // Validation: Check for duplicate display numbers
  const existingDisplayNumbers = state.courts.courtDisplayNumbers || {};
  const isDuplicate = Object.entries(existingDisplayNumbers).some(
    ([id, num]) => id !== courtId && num === displayNumber
  );

  if (isDuplicate) {
    console.warn(
      `⚠️ REDUCER: Display number ${displayNumber} is already in use by another court`
    );
    return state;
  }

  // Update display number
  const updatedDisplayNumbers = {
    ...existingDisplayNumbers,
    [courtId]: displayNumber,
  };

  console.log(`✅ Court ${courtId} display number updated to ${displayNumber}`);

  return {
    ...state,
    courts: {
      ...state.courts,
      courtDisplayNumbers: updatedDisplayNumbers,
    },
  };
}
