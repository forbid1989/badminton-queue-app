import { Player } from "../../../components/types/Player";
import { RootState, PaymentSettings } from "../rootState";
import { rebuildZoneMappings } from "../helpers/zoneHelpers";

/**
 * Payment-related reducer actions
 * Handles: UPDATE_PAYMENT_SETTINGS, TOGGLE_PLAYER_PAYMENT, TOGGLE_PLAYER_GUEST,
 * MARK_ALL_PLAYERS_PAID, CLEAR_ALL_PAYMENTS, MARK_PLAYER_UNPAID_AND_MOVE_TO_WAITING
 */

export function updatePaymentSettings(
  state: RootState,
  settings: PaymentSettings
): RootState {
  return {
    ...state,
    settings: {
      ...state.settings,
      paymentSettings: settings,
    },
  };
}

export function togglePlayerPayment(
  state: RootState,
  playerId: string
): RootState {
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

export function togglePlayerGuest(
  state: RootState,
  playerId: string
): RootState {
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

export function markAllPlayersPaid(state: RootState): RootState {
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

export function clearAllPayments(state: RootState): RootState {
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

export function markPlayerUnpaidAndMoveToWaiting(
  state: RootState,
  playerId: string
): RootState {
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
