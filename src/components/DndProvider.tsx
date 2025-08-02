import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
  Active,
  Over,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Player } from '../types/Player';
import PlayerCard from './PlayerCard';

interface DndProviderProps {
  children: React.ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  players: Player[];
}

export const DndProvider: React.FC<DndProviderProps> = ({
  children,
  onDragEnd,
  onDragOver,
  players,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Configure sensors for different input methods
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Small delay to differentiate from scrolling
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find the active player being dragged
  const activePlayer = activeId
    ? players.find((p) => p.id === activeId.toString())
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      onDragEnd(event);
    },
    [onDragEnd]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (onDragOver) {
        onDragOver(event);
      }
    },
    [onDragOver]
  );

  // Custom collision detection that prioritizes player cards for swapping
  const customCollisionDetection = useCallback(
    (args: any) => {
      // First, check if we're over another player card in the same zone
      const { active, droppableContainers, draggingRect, ...rest } = args;
      
      if (active.data.current?.type === 'player') {
        const activeZone = active.data.current.zone;
        
        // Find player cards in the same zone
        const playerCollisions = Array.from(droppableContainers.values())
          .filter((container: any) => {
            return (
              container.data.current?.type === 'player' &&
              container.data.current?.zone === activeZone &&
              container.id !== active.id
            );
          });

        if (playerCollisions.length > 0) {
          // Use closest center for player swapping
          const collisions = closestCenter({
            ...args,
            droppableContainers: new Map(
              playerCollisions.map((c: any) => [c.id, c])
            ),
          });
          
          if (collisions.length > 0) {
            return collisions;
          }
        }
      }

      // Fall back to default collision detection for zones
      return closestCenter(args);
    },
    []
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      {children}
      <DragOverlay
        style={{
          cursor: 'grabbing',
        }}
      >
        {activePlayer ? (
          <div
            style={{
              transform: 'rotate(2deg) scale(1.05)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              borderRadius: '20px',
              opacity: 0.9,
            }}
          >
            <PlayerCard
              player={activePlayer}
              zone="overlay"
              isDragOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// Helper function to extract data from drag events
export const getDragData = (event: DragEndEvent | DragOverEvent) => {
  const { active, over } = event;
  
  const activeData = active.data.current as {
    type: 'player' | 'zone';
    player?: Player;
    zone?: string;
  };
  
  const overData = over?.data.current as {
    type: 'player' | 'zone';
    player?: Player;
    zone?: string;
    playerCount?: number;
    isFull?: boolean;
  } | undefined;

  return {
    activeData,
    overData,
    activeId: active.id.toString(),
    overId: over?.id.toString(),
  };
};