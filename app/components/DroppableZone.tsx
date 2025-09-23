'use client'

import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../lib/store/Action';
import { Player } from './types/Player';

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
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ isHovered: false, isDragOverValid: false });

  const resetDragStates = () => {
    setIsHovered(false);
    setIsDragOverValid(false);
    dragStateRef.current = { isHovered: false, isDragOverValid: false };
  };

  const setDragStates = (hovered: boolean, valid: boolean) => {
    setIsHovered(hovered);
    setIsDragOverValid(valid);
    dragStateRef.current = { isHovered: hovered, isDragOverValid: valid };
  };

  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const checkMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
              window.innerWidth <= 768 ||
              'ontouchstart' in window;
      };
      setIsMobileDevice(checkMobileDevice());
    }
  }, []);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      // Small delay to ensure all drag events have processed
      setTimeout(() => {
        if (dragStateRef.current.isHovered || dragStateRef.current.isDragOverValid) {
          console.log(`🧹 Global cleanup: resetting drag states for zone ${zone}`);
          resetDragStates();
        }
      }, 100);
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('drop', handleGlobalDragEnd);
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, [zone]);

  // Determine if this is a position-specific zone
  const isPositionZone = position !== undefined;

  // 🆕 Determine if this is the player list zone
  const isPlayerListZone = zone === 'all';

  // Memoize isFull calculation
  const isFull = useMemo(() => {
    // For position-specific zones, they can only hold 1 player
    if (position !== undefined) {
      return players.length >= 1;
    }
    // For main zones, max 4 players (except "all" zone which has no limit)
    if (zone === 'all') {
      return false; // Player list zone never gets "full"
    }
    return players.length >= 4;
  }, [players.length, position, zone]);

  // Memoized zone background calculation
  const zoneBackground = useMemo(() => {
    if (zone.startsWith('court')) return '#DFF0D8';
    if (zone.startsWith('queue')) return '#FFF8DC';
    if (zone === 'all') return '#ffffff';
    return '#FAFAFA';
  }, [zone]);

  // Update the borderColor calculation for better premium colors:
  const borderColor = useMemo(() => {
    const anyHover = isHovered && isDragOverValid;
    
    if (isPlayerListZone) {
      if (anyHover) return '#10b981'; // Emerald green when accepting
      return '#cbd5e1'; // Soft gray default
    }
    
    if (isPositionZone) {
      if (isFull) return '#fbbf24'; // Amber when full
      if (anyHover) return '#f59e0b'; // Orange for position drops
      return players.length > 0 ? '#e5e7eb' : '#f3f4f6'; // Light grays
    }
    
    if (isFull) return '#fbbf24'; // Amber when full
    if (anyHover) return '#10b981'; // Emerald when hovering
    return '#cbd5e1'; // Default soft gray
  }, [isFull, isHovered, isDragOverValid, isPositionZone, isPlayerListZone, players.length]);

  // Update backgroundColor for better contrast:
  const backgroundColor = useMemo(() => {
    const anyHover = isHovered && isDragOverValid;
    
    if (isPlayerListZone) {
      if (anyHover) return '#f0fdf4'; // Very light green
      return zoneBackground;
    }
    
    if (isPositionZone) {
      if (anyHover) return 'rgba(245, 158, 11, 0.1)'; // Light amber
      return players.length > 0 ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.01)';
    }
    
    if (anyHover) return '#f0fdf4'; // Light green
    return zoneBackground;
  }, [isHovered, isDragOverValid, zoneBackground, isPositionZone, isPlayerListZone, players.length]);

  // Enhanced transform calculation
  const transform = useMemo(() => {
    const anyHover = isHovered && isDragOverValid;
    
    // 🆕 Subtle transform for player list zone
    if (isPlayerListZone) {
      return anyHover ? 'scale(1.01)' : 'scale(1)';
    }
    
    if (isPositionZone) {
      return anyHover ? 'scale(1.12)' : 'scale(1)';
    }
    return anyHover ? 'scale(1.03)' : 'scale(1)';
  }, [isHovered, isDragOverValid, isPositionZone, isPlayerListZone]);

  // Enhanced box shadow
  const boxShadow = useMemo(() => {
    const anyHover = isHovered && isDragOverValid;
    
    // 🆕 Special shadow for player list zone
    if (isPlayerListZone && anyHover) {
      return isMobileDevice 
        ? '0 6px 20px rgba(76, 175, 80, 0.4)' 
        : '0 4px 12px rgba(76, 175, 80, 0.3)';
    }
    
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
  }, [isHovered, isDragOverValid, isMobileDevice, isPositionZone, isPlayerListZone]);

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
          type: isPositionZone ? 'position-drop-zone' : isPlayerListZone ? 'player-list-zone' : 'zone-drop-zone',
          // Add a priority level - position zones have highest, player list has medium, regular zones lowest
          priority: isPositionZone ? 100 : isPlayerListZone ? 50 : 1
        }),
        canDrop: ({ source }) => {
          // Only accept player cards
          if (source.data.type !== 'player-card') return false;
          
          const playerId = source.data.playerId as string;
          const sourceZone = source.data.playerZone as string;

          // 🆕 ALWAYS allow drops to player list zone (for returns)
          if (isPlayerListZone) {
            // Only allow drops from court/queue zones (not from player list to player list)
            const isFromCourtOrQueue = sourceZone.startsWith('court-') || sourceZone.startsWith('queue-');
            if (isFromCourtOrQueue) {
              console.log(`✅ Allowing return to player list: ${playerId} from ${sourceZone}`);
              return true;
            } else {
              console.log(`❌ Blocking player list to player list drop: ${playerId} from ${sourceZone}`);
              return false;
            }
          }

          // Check if zone is full (only for non-position zones)
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

          return true;
        },
        onDragEnter: ({ source }) => {
          const sourceZone = source.data.playerZone as string;
  
          if (isPlayerListZone) {
            console.log(`📙 Player list drag enter: from ${sourceZone} to player list`);
          } else {
            console.log(`🎯 Drag enter: zone=${zone}, position=${position}, isPositionZone=${isPositionZone}`);
          }
          
          setDragStates(true, true);
        },
        onDragLeave: () => {
          console.log(`🚪 Drag leave: zone=${zone}, position=${position}`);
          resetDragStates();
        },
        onDrop: ({ source, location }) => {
          const playerId = source.data.playerId as string;
          const playerZone = source.data.playerZone as string;

          resetDragStates();
          
          // 🆕 SPECIAL HANDLING: Drops to player list zone (returns)
          if (isPlayerListZone) {
            console.log(`🔙 PLAYER LIST DROP: Returning ${playerId} from ${playerZone} to player list`);
            // setIsHovered(false);
            // setIsDragOverValid(false);
            
            // 🆕 FIXED: Use movePlayer to only remove from the specific zone, preserving other assignments
            dispatch(Action.movePlayer(playerId, playerZone, 'all'));
            return;
          }
          
          console.log('📦 Drop event on zone:', zone, 'position:', position, 'isPositionZone:', isPositionZone);
          
          // For position-specific drops, handle immediately without checking other targets
          if (isPositionZone && position !== undefined) {
            console.log(`✅ POSITION DROP: Moving player to ${zone} position ${position}`);
            setIsHovered(false);
            setIsDragOverValid(false);
            
            // Dispatch the position-specific move
            dispatch(Action.movePlayerToPosition(playerId, playerZone, zone, position));
            return; // Exit early for position drops
          }
          
          // For general zone drops, check if there's a position-specific target that should handle it
          const dropTargets = location.current.dropTargets;
          const hasPositionTarget = dropTargets.some(dt => dt.data.type === 'position-drop-zone');
          
          if (hasPositionTarget) {
            console.log(`⭐ Skipping zone drop - position-specific target will handle it`);
            return;
          }
          
          setIsHovered(false);
          setIsDragOverValid(false);

          // Handle general zone drop
          if (playerZone !== zone) {
            console.log(`✅ ZONE DROP: Moving player from "${playerZone}" to "${zone}"`);
            dispatch(Action.quickMovePlayer(playerId, playerZone, zone));
          } else {
            console.log(`⭐ Same zone - no action needed`);
          }
        }
      }),
      ...autoScrollOptions
    );
  }, [zone, position, dispatch, isPositionZone, isFull, players, isPlayerListZone]);

  // Memoized combined styles
  const combinedSx = useMemo(() => ({
    border: `2px solid ${borderColor}`,
    borderRadius: isPositionZone ? 1 : 2,
    padding: isPositionZone ? 0.5 : 2,
    marginBottom: isPositionZone ? 0 : 3,
    backgroundColor,
    minHeight: isPositionZone 
    ? (isMobileDevice ? 40 : 35)
    : isPlayerListZone
    ? (isMobileDevice ? 150 : 120) 
    : zone.startsWith('queue-')
    ? '140px' 
    : (isMobileDevice ? 90 : 80), 
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform,
    boxShadow: isPlayerListZone 
    ? '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)' // Premium shadow for player list
    : boxShadow,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    ...(zone === 'all' && {
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollBehavior: 'smooth',
    }),
    ...(isPlayerListZone && {
      position: 'relative',
      '&::after': isDragOverValid ? {
        content: '"Drop here to return players to the list"',
        position: 'absolute',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        zIndex: 10,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      } : {},
    }),
    ...sx
  }), [
    borderColor, backgroundColor, transform, boxShadow, isPositionZone, 
    isMobileDevice, sx, zone, isPlayerListZone, isDragOverValid
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