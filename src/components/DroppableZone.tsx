import React, { useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import { Player } from '../types/Player';

// Pragmatic Drag and Drop imports
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';

type DroppableZoneProps = {
  zone: string;
  players: Player[];
  children?: React.ReactNode;
  sx?: object;
  position?: number; // ✨ Optional position for position-specific zones
};

const DroppableZone: React.FC<DroppableZoneProps> = React.memo(({ zone, players, children, sx, position }) => {
  const { dispatch } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOverValid, setIsDragOverValid] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // 📱 Mobile device detection
  const isMobileDevice = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768 ||
           'ontouchstart' in window;
  }, []);
  
  // Memoize isFull calculation
  const isFull = useMemo(() => {
    // For position-specific zones, they can only hold 1 player
    if (position !== undefined) {
      return players.length >= 1;
    }
    // For main zones, max 4 players
    return players.length >= 4;
  }, [players.length, position]);

  // Determine if this is a position-specific zone
  const isPositionZone = position !== undefined;

  // Memoized zone background calculation
  const zoneBackground = useMemo(() => {
    if (zone.startsWith('court')) return '#DFF0D8';
    if (zone.startsWith('queue')) return '#FFF8DC';
    if (zone === 'all') return '#F5EFE6';
    return '#FAFAFA';
  }, [zone]);

  // Enhanced border color calculation
  const borderColor = useMemo(() => {
    const anyHover = isHovered;
    
    if (isPositionZone) {
      if (isFull) return '#D5C96A';
      if (anyHover) return '#FF6B35'; // More vibrant orange for position drops
      return players.length > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
    }
    
    if (isFull) return '#D5C96A';
    if (anyHover) return '#4CAF50';
    return '#CAD4CC';
  }, [isFull, isHovered, isPositionZone, players.length]);

  // Enhanced background color calculation
  const backgroundColor = useMemo(() => {
    const anyHover = isHovered;
    
    if (isPositionZone) {
      if (anyHover) return 'rgba(255, 107, 53, 0.3)';
      return players.length > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)';
    }
    
    if (anyHover) return '#E8F5E9';
    return zoneBackground;
  }, [isHovered, zoneBackground, isPositionZone, players.length]);

  // Enhanced transform calculation
  const transform = useMemo(() => {
    const anyHover = isHovered;
    
    if (isPositionZone) {
      return anyHover ? 'scale(1.12)' : 'scale(1)';
    }
    return anyHover ? 'scale(1.03)' : 'scale(1)';
  }, [isHovered, isPositionZone]);

  // Enhanced box shadow
  const boxShadow = useMemo(() => {
    const anyHover = isHovered;
    
    if (isPositionZone && anyHover) {
      return isMobileDevice 
        ? '0 6px 20px rgba(255, 107, 53, 0.5)' // Stronger shadow on mobile
        : '0 4px 12px rgba(255, 107, 53, 0.4)';
    }
    if (anyHover) {
      return isMobileDevice
        ? '0 4px 16px rgba(76, 175, 80, 0.4)' // Stronger shadow on mobile
        : '0 2px 8px rgba(76, 175, 80, 0.3)';
    }
    return 'none';
  }, [isHovered, isMobileDevice, isPositionZone]);

  // Setup PDD drop target
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // For the main 'all' zone, enable auto-scrolling
    const autoScrollOptions = zone === 'all' ? [
      autoScrollForElements({
        element,
        canScroll: ({ source }) => source.data.type === 'player-card',
        getConfiguration: () => ({
          maxScrollSpeed: 'standard',
        }),
      })
    ] : [];

    return combine(
      dropTargetForElements({
        element,
        getData: () => ({
          zone,
          position,
          type: isPositionZone ? 'position-drop-zone' : 'zone-drop-zone'
        }),
        canDrop: ({ source }) => {
          // Only accept player cards
          if (source.data.type !== 'player-card') return false;
          
          const playerId = source.data.playerId as string;
          const playerZone = source.data.playerZone as string;

          // Check if zone is full
          if (!isPositionZone && isFull) {
            console.log(`❌ Zone ${zone} is full`);
            return false;
          }

          // For position zones, check if position is occupied
          if (isPositionZone) {
            const positionOccupied = players.some(p => {
              if (zone.startsWith('court-')) {
                return p.courtOrder === position && p.id !== playerId;
              } else if (zone.startsWith('queue-')) {
                return p.queueOrder === position && p.id !== playerId;
              }
              return false;
            });
            
            if (positionOccupied) {
              console.log(`❌ Position ${position} in ${zone} is occupied`);
              return false;
            }
          }

          // Allow drops from different zones or within same zone for repositioning
          return true;
        },
        onDragEnter: ({ source }) => {
          console.log(`🎯 Drag enter zone: ${zone}, position: ${position}`);
          setIsHovered(true);
          setIsDragOverValid(true);
        },
        onDragLeave: () => {
          setIsHovered(false);
          setIsDragOverValid(false);
        },
        onDrop: ({ source }) => {
          console.log('📦 PDD Drop detected on zone:', zone, 'position:', position);
          setIsHovered(false);
          setIsDragOverValid(false);

          const playerId = source.data.playerId as string;
          const playerZone = source.data.playerZone as string;
          const isSwapOperation = source.data.isSwapOperation as boolean;

          // Skip if this was a swap operation
          if (isSwapOperation) {
            console.log('🚫 Swap operation detected - skipping zone drop');
            return;
          }

          // Handle the drop based on whether it's position-specific or not
          if (isPositionZone && position !== undefined) {
            console.log(`🎯 Position-specific drop via PDD: Moving player to ${zone} position ${position}`);
            dispatch(Action.movePlayerToPosition(playerId, playerZone, zone, position));
          } else if (playerZone !== zone) {
            console.log(`🎯 Zone drop via PDD: Moving player from "${playerZone}" to "${zone}"`);
            dispatch(Action.quickMovePlayer(playerId, playerZone, zone));
          } else {
            console.log(`⏭️ Same zone drop - no action needed`);
          }
        }
      }),
      ...autoScrollOptions
    );
  }, [zone, position, dispatch, isPositionZone, isFull, players]);

  // Note: Touch support is being investigated
  // PDD v1.7.4 might handle touch automatically through pointer events
  // If touch doesn't work, we'll need to add manual touch handling

  // Memoized combined styles
  const combinedSx = useMemo(() => ({
    border: `2px ${isPositionZone ? 'solid' : 'dashed'} ${borderColor}`,
    borderRadius: isPositionZone ? 1 : 2,
    padding: isPositionZone ? 0.5 : 2,
    marginBottom: isPositionZone ? 0 : 3,
    backgroundColor,
    minHeight: isPositionZone 
      ? (isMobileDevice ? 40 : 35)
      : (isMobileDevice ? 90 : 80),
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform,
    boxShadow,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // 📱 Mobile-specific touch optimizations
    touchAction: isMobileDevice ? 'pan-y' : 'auto', // Allow vertical scrolling
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // 🔧 Improve scrolling for main player list zone
    ...(zone === 'all' && {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollBehavior: 'smooth',
    }),
    ...sx
  }), [
    borderColor, backgroundColor, transform, boxShadow, isPositionZone, 
    isMobileDevice, sx, zone
  ]);

  return (
    <Box
      ref={elementRef}
      data-droppable-zone={zone}
      data-position={position}
      sx={combinedSx}
    >
      {children}
    </Box>
  );
});

DroppableZone.displayName = 'DroppableZone';

export default DroppableZone;