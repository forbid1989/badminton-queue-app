// src/utils/localStorage.ts
import { RootState } from "../store/rootState";
import { Player, SkillLevel } from "../../components/types/Player";

const STORAGE_KEY = "badminton-queue-state";
const VERSION_KEY = "badminton-queue-version";
const CURRENT_VERSION = "1.1";

// Define what we want to persist - only the essential data
interface PersistedState {
  players: Player[];
  courts: {
    count: number;
    courtDisplayNumbers?: Record<string, number>; // Custom court display numbers
  };
  queue: {
    count: number;
    // 🆕 Add the queue structure so we know which queue IDs exist
    playersByQueue: Record<string, Player[]>;
  };
  settings?: {
    playerCooldowns?: boolean;
    paymentSettings?: any;
  };
  version: string;
}

/**
 * Save state to localStorage
 */
export const saveToLocalStorage = (state: RootState): void => {
  // Guard against server-side execution
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const persistedState: PersistedState = {
      players: state.players,
      courts: {
        count: state.courts.count,
        courtDisplayNumbers: state.courts.courtDisplayNumbers,
      },
      queue: {
        count: state.queue.count,
        // 🆕 Save the actual queue structure
        playersByQueue: state.queue.playersByQueue,
      },
      settings: {
        playerCooldowns: state.settings?.playerCooldowns || false,
        paymentSettings: state.settings?.paymentSettings,
      },
      version: CURRENT_VERSION,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);

    console.log("State saved to localStorage:", persistedState);
  } catch (error) {
    console.error("Failed to save state to localStorage:", error);
  }
};

/**
 * Load state from localStorage
 */
export const loadFromLocalStorage = (): Partial<RootState> | null => {
  // Guard against server-side execution
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedVersion = localStorage.getItem(VERSION_KEY);

    if (!savedData) {
      return null;
    }

    // Check version compatibility - allow migration from 1.0 to 1.1
    if (savedVersion !== CURRENT_VERSION && savedVersion !== "1.0") {
      console.warn("localStorage version mismatch, clearing data");
      clearLocalStorage();
      return null;
    }

    const persistedState: PersistedState = JSON.parse(savedData);

    // 🆕 Migrate match history from old format (strings) to new format (MatchPlayerRef)
    if (persistedState.players) {
      persistedState.players = persistedState.players.map((player) => {
        if (player.matchHistory && player.matchHistory.length > 0) {
          // Check if this is old format (first opponent is a string)
          const firstMatch = player.matchHistory[0];
          if (
            firstMatch.opponents &&
            typeof firstMatch.opponents[0] === "string"
          ) {
            console.log(
              `Migrating match history for player ${player.name} from old format`
            );

            // Convert old format to new format using immutable update
            const migratedHistory = player.matchHistory.map(
              (oldEntry: any) => ({
                ...oldEntry,
                partner: oldEntry.partner
                  ? {
                      id: "unknown", // Can't recover old IDs
                      name: oldEntry.partner,
                      skillLevel: "C" as SkillLevel, // Default skill level
                    }
                  : undefined,
                opponents: oldEntry.opponents.map((opponentName: any) => ({
                  id: "unknown", // Can't recover old IDs
                  name: opponentName,
                  skillLevel: "C" as SkillLevel, // Default skill level
                })),
              })
            );

            // Return new player object with migrated history (immutable)
            return { ...player, matchHistory: migratedHistory };
          }
        }
        return player;
      });
    }

    // Remove records that repeat an ID. Names are not unique: different players can share one.
    if (persistedState.players) {
      const seenIds = new Set<string>();

      persistedState.players = persistedState.players.filter((player) => {
        if (seenIds.has(player.id)) {
          console.warn(
            `⚠️ Duplicate player ID detected: ${player.id} (${player.name}) - removing duplicate`
          );
          return false;
        }
        seenIds.add(player.id);
        return true;
      });

      console.log(
        `✅ Player validation complete: ${persistedState.players.length} valid players loaded`
      );
    }

    // Validate the structure
    if (!persistedState.players || !Array.isArray(persistedState.players)) {
      console.warn("Invalid localStorage data structure, clearing data");
      clearLocalStorage();
      return null;
    }

    // Return only the parts we want to restore
    return {
      players: persistedState.players,
      courts: {
        count: persistedState.courts?.count || 2,
        playersByCourt: {}, // Will be rebuilt by InitialState
        courtDisplayNumbers: persistedState.courts?.courtDisplayNumbers,
      },
      queue: {
        count: persistedState.queue?.count || 1,
        // 🆕 Restore the actual queue structure instead of empty object
        playersByQueue: persistedState.queue?.playersByQueue || {
          "queue-0": [],
        },
      },
      settings: {
        priorityMode: "FIFO",
        colorCodedTimers: true,
        playerCooldowns: persistedState.settings?.playerCooldowns || false,
        paymentSettings: persistedState.settings?.paymentSettings,
      },
    };
  } catch (error) {
    console.error("Failed to load state from localStorage:", error);
    clearLocalStorage();
    return null;
  }
};

/**
 * Clear localStorage data
 */
export const clearLocalStorage = (): void => {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
    console.log("localStorage cleared");
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
  }
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Debounced save function to avoid too frequent saves
 */
let saveTimeout: NodeJS.Timeout;
export const debouncedSave = (state: RootState, delay: number = 1000): void => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveToLocalStorage(state);
  }, delay);
};
