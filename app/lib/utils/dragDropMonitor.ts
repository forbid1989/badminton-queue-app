// src/utils/dragDropMonitor.ts
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

// Global drop lock to prevent duplicate drops
let dropLock: {
  playerId: string | null;
  timestamp: number;
  isPositionSpecific: boolean;
} = {
  playerId: null,
  timestamp: 0,
  isPositionSpecific: false,
};

const DROP_LOCK_TIMEOUT = 100; // 100ms lock duration

// Global drag state
let globalDragState: {
  isDragging: boolean;
  draggedPlayerId: string | null;
  draggedPlayerZone: string | null;
} = {
  isDragging: false,
  draggedPlayerId: null,
  draggedPlayerZone: null,
};

// Initialize global monitor
export const initializeDragDropMonitor = () => {
  const cleanup = monitorForElements({
    onGenerateDragPreview: ({ source }) => {
      console.log("🎨 Global: Drag preview generated", source.data);
    },

    onDragStart: ({ source }) => {
      const playerId = source.data.playerId as string;
      const playerZone = source.data.playerZone as string;

      globalDragState = {
        isDragging: true,
        draggedPlayerId: playerId,
        draggedPlayerZone: playerZone,
      };

      console.log("🚀 Global: Drag started", {
        playerId,
        zone: playerZone,
      });
    },

    onDrop: ({ source, location }) => {
      const playerId = source.data.playerId as string;
      const currentTime = Date.now();

      // Get all drop targets
      const dropTargets = location.current.dropTargets;
      if (!dropTargets || dropTargets.length === 0) {
        console.log("❌ Global: No valid drop target");
        return;
      }

      // Find the highest priority drop target (position-specific zones have higher priority)
      const highestPriorityTarget = dropTargets.reduce((highest, current) => {
        const currentPriority = current.data.priority || 0;
        const highestPriority = highest.data.priority || 0;
        return currentPriority > highestPriority ? current : highest;
      }, dropTargets[0]);

      const targetZone = highestPriorityTarget.data.zone as string;
      const targetPosition = highestPriorityTarget.data.position as
        | number
        | undefined;
      const isPositionSpecific = targetPosition !== undefined;

      console.log("📍 Global: Drop detected", {
        playerId,
        targetZone,
        targetPosition,
        isPositionSpecific,
        dropTargetsCount: dropTargets.length,
        allTargets: dropTargets.map((dt) => ({
          zone: dt.data.zone,
          position: dt.data.position,
          priority: dt.data.priority,
        })),
      });

      // Check drop lock
      if (
        dropLock.playerId === playerId &&
        currentTime - dropLock.timestamp < DROP_LOCK_TIMEOUT
      ) {
        // Allow position-specific drops to override zone drops
        if (isPositionSpecific && !dropLock.isPositionSpecific) {
          console.log("🔓 Global: Position-specific drop overriding zone drop");
        } else {
          console.log("🔒 Global: Drop blocked by lock");
          return;
        }
      }

      // Set drop lock
      dropLock = {
        playerId,
        timestamp: currentTime,
        isPositionSpecific,
      };

      // Clear lock after timeout
      setTimeout(() => {
        if (
          dropLock.playerId === playerId &&
          dropLock.timestamp === currentTime
        ) {
          console.log("🔓 Global: Drop lock cleared for", playerId);
          dropLock = {
            playerId: null,
            timestamp: 0,
            isPositionSpecific: false,
          };
        }
      }, DROP_LOCK_TIMEOUT);

      console.log("✅ Global: Drop processed successfully", {
        zone: targetZone,
        position: targetPosition,
        type: isPositionSpecific ? "position-specific" : "zone",
      });
    },

    onDrag: () => {
      console.log("🏁 Global: Drag ended");

      globalDragState = {
        isDragging: false,
        draggedPlayerId: null,
        draggedPlayerZone: null,
      };
    },
  });

  return cleanup;
};

// Export utility functions
export const getGlobalDragState = () => globalDragState;
export const isDropLocked = (playerId: string) => {
  const currentTime = Date.now();
  return (
    dropLock.playerId === playerId &&
    currentTime - dropLock.timestamp < DROP_LOCK_TIMEOUT
  );
};
