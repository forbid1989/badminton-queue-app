import React, { useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import { Player } from '../types/Player';

type DroppableZoneProps = {
  zone: string;
  players: Player[];
  children?: React.ReactNode;
  sx?: object;
  position?: number; // ✨ Optional position for position-specific zones
};

// Global drop lock to prevent duplicate drops in the same event cycle
let dropLock: {
  playerId: string | null;
  timestamp: number;
  isPositionSpecific: boolean;
} = {
  playerId: null,
  timestamp: 0,
  isPositionSpecific: false
};

const DROP_LOCK_TIMEOUT = 100; // 100ms lock duration

const DroppableZone: React.FC<DroppableZoneProps> = React.memo(({ zone, players, children, sx, position }) => {
  const { dispatch } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  
  // Use refs to store current values for event handlers
  const zoneRef = useRef(zone);
  const positionRef = useRef(position);
  const isFullRef = useRef(false);
  
  // Memoize isFull calculation
  const isFull = useMemo(() => {
    // For position-specific zones, they can only hold 1 player
    if (position !== undefined) {
      return players.length >= 1;
    }
    // For main zones, max 4 players
    return players.length >= 4;
  }, [players.length, position]);
  
  // Update refs when values change
  useEffect(() => {
    zoneRef.current = zone;
    positionRef.current = position;
    isFullRef.current = isFull;
  }, [zone, position, isFull]);

  // Determine if this is a position-specific zone
  const isPositionZone = position !== undefined;

  // Add debugging for ref updates
  useEffect(() => {
    console.log('🔍 DroppableZone refs updated:', {
      zone: zoneRef.current,
      position: positionRef.current,
      componentId: `${zone}-${position}`,
      isPositionZone
    });
  }, [zone, position, isPositionZone]);

  // Memoized zone background calculation
  const zoneBackground = useMemo(() => {
    if (zone.startsWith('court')) return '#DFF0D8';
    if (zone.startsWith('queue')) return '#FFF8DC';
    if (zone === 'all') return '#F5EFE6';
    return '#FAFAFA';
  }, [zone]);

  // Memoized border color calculation - Enhanced for position-specific zones
  const borderColor = useMemo(() => {
    if (isPositionZone) {
      // Position-specific zones get more prominent hover effects
      if (isFull) return '#D5C96A';
      if (isHovered) return '#FF6B35'; // More vibrant orange for position drops
      return players.length > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
    }
    
    if (isFull) return '#D5C96A';
    if (isHovered) return '#4CAF50';
    return '#CAD4CC';
  }, [isFull, isHovered, isPositionZone, players.length]);

  // Memoized background color calculation - Enhanced for position-specific zones
  const backgroundColor = useMemo(() => {
    if (isPositionZone) {
      if (isHovered) return 'rgba(255, 107, 53, 0.2)'; // Orange tint for position drops
      return players.length > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)';
    }
    
    return isHovered ? '#E8F5E9' : zoneBackground;
  }, [isHovered, zoneBackground, isPositionZone, players.length]);

  // Memoized transform calculation - Enhanced for position-specific zones
  const transform = useMemo(() => {
    if (isPositionZone) {
      return isHovered ? 'scale(1.08)' : 'scale(1)'; // Bigger scale for position zones
    }
    return isHovered ? 'scale(1.02)' : 'scale(1)';
  }, [isHovered, isPositionZone]);

  // Memoized box shadow for enhanced visual feedback
  const boxShadow = useMemo(() => {
    if (isPositionZone && isHovered) {
      return '0 4px 12px rgba(255, 107, 53, 0.4)'; // Orange glow for position drops
    }
    if (isHovered) {
      return '0 2px 8px rgba(76, 175, 80, 0.3)'; // Green glow for regular zones
    }
    return 'none';
  }, [isHovered, isPositionZone]);

  // Memoized combined styles
  const combinedSx = useMemo(() => ({
    border: `2px ${isPositionZone ? 'solid' : 'dashed'} ${borderColor}`,
    borderRadius: isPositionZone ? 1 : 2,
    padding: isPositionZone ? 0.5 : 2,
    marginBottom: isPositionZone ? 0 : 3,
    backgroundColor,
    minHeight: isPositionZone ? 35 : 80,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smoother transition
    transform,
    boxShadow,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&.touch-hover': {
      backgroundColor: isPositionZone ? 'rgba(255, 107, 53, 0.2)' : '#E8F5E9',
      borderColor: isPositionZone ? '#FF6B35' : '#4CAF50',
      transform: isPositionZone ? 'scale(1.08)' : 'scale(1.02)',
      boxShadow: isPositionZone 
        ? '0 4px 12px rgba(255, 107, 53, 0.4)' 
        : '0 2px 8px rgba(76, 175, 80, 0.3)',
    },
    // Add CSS for touch swap targets
    '& [data-player-id].touch-swap-target': {
      backgroundColor: '#E8F5E9',
      borderColor: '#4CAF50',
      transform: 'scale(1.05)',
    },
    ...sx
  }), [borderColor, backgroundColor, transform, boxShadow, isPositionZone, sx]);

  // ✨ FIXED: Enhanced handleDrop with priority lock system
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    
    const json = e.dataTransfer.getData('player/json');
    const isSwapOperation = e.dataTransfer.getData('player/isSwapOperation') === 'true';

    if (!json) return;

    try {
      const player: Player = JSON.parse(json);
      const from = e.dataTransfer.getData('player/source');
      const currentTime = Date.now();

      // Get current ref values to avoid stale closure issues
      const currentZone = zoneRef.current;
      const currentPosition = positionRef.current;
      const isCurrentPositionSpecific = currentPosition !== undefined;
      
      console.log('🔍 Drop analysis:', {
        player: player.name,
        from,
        targetZone: currentZone,
        targetPosition: currentPosition,
        isPositionSpecific: isCurrentPositionSpecific,
        currentTime,
        lockState: dropLock
      });

      // If this was a swap operation that was handled by a PlayerCard, don't process it here
      if (isSwapOperation) {
        console.log('🚫 Swap operation detected - skipping zone drop handling');
        return;
      }

      // ✨ CHECK DROP LOCK - Prevent duplicate drops
      if (dropLock.playerId === player.id && 
          currentTime - dropLock.timestamp < DROP_LOCK_TIMEOUT) {
        
        // If the current drop is position-specific but the locked one wasn't, allow override
        if (isCurrentPositionSpecific && !dropLock.isPositionSpecific) {
          console.log('🔓 Override: Position-specific drop overriding zone drop');
        } else {
          console.log('🔒 Drop blocked by lock - duplicate drop prevented');
          return;
        }
      }

      // ✨ SET DROP LOCK with priority information
      dropLock = {
        playerId: player.id,
        timestamp: currentTime,
        isPositionSpecific: isCurrentPositionSpecific
      };

      // ✨ STOP EVENT PROPAGATION for position-specific drops
      if (isCurrentPositionSpecific) {
        e.stopPropagation();
        console.log('🛑 Event propagation stopped for position-specific drop');
      }

      // Process the drop with explicit if-else logic
      if (isCurrentPositionSpecific) {
        // Position-specific drop (P1, P2, P3, P4 grid boxes) - HIGHEST PRIORITY
        console.log(`🎯 Position-specific drop: Moving ${player.name} to ${currentZone} position ${currentPosition}`);
        dispatch(Action.movePlayerToPosition(player.id, currentZone, currentPosition));
      } else if (from === currentZone) {
        // Same zone - no operation needed
        console.log(`❌ No-op: Same zone ${from} === ${currentZone}`);
      } else {
        // Regular zone drop with auto-positioning - LOWER PRIORITY
        console.log(`🎯 Zone drop with auto-positioning: Moving ${player.name} from "${from}" to "${currentZone}"`);
        dispatch(Action.quickMovePlayer(player.id, from, currentZone));
      }

      // Clear lock after timeout
      setTimeout(() => {
        if (dropLock.playerId === player.id && dropLock.timestamp === currentTime) {
          console.log('🔓 Drop lock cleared for', player.name);
          dropLock = { playerId: null, timestamp: 0, isPositionSpecific: false };
        }
      }, DROP_LOCK_TIMEOUT);
      
    } catch (error) {
      console.error('Error parsing player data:', error);
    }
  }, [dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // For position-specific zones or non-full regular zones, allow hover
    if (isPositionZone || !isFullRef.current) {
      setIsHovered(true);
    }
  }, [isPositionZone]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear hover if we're actually leaving this element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsHovered(false);
    }
  }, []);

  // Enhanced touch handlers to support swap operations
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Check if we're over another player card for potential swap
    const playerCard = elementBelow?.closest('[data-player-id]');
    const droppableZone = elementBelow?.closest('[data-droppable-zone]');
    
    // Remove hover from all zones and player cards
    const allZones = document.querySelectorAll('[data-droppable-zone]');
    const allPlayerCards = document.querySelectorAll('[data-player-id]');
    
    allZones.forEach(el => el.classList.remove('touch-hover'));
    allPlayerCards.forEach(el => el.classList.remove('touch-swap-target'));
    
    if (playerCard && playerCard.getAttribute('data-zone') === zoneRef.current) {
      // Hovering over a player in the same zone - potential swap
      playerCard.classList.add('touch-swap-target');
    } else if (droppableZone && 
               droppableZone.getAttribute('data-droppable-zone') === zoneRef.current) {
      // For position-specific zones or non-full regular zones
      if (isPositionZone || !isFullRef.current) {
        droppableZone.classList.add('touch-hover');
      }
    }
  }, [isPositionZone]);

  const handleTouchEnd = useCallback(() => {
    // Remove all hover states
    const allZones = document.querySelectorAll('[data-droppable-zone]');
    const allPlayerCards = document.querySelectorAll('[data-player-id]');
    
    allZones.forEach(el => el.classList.remove('touch-hover'));
    allPlayerCards.forEach(el => el.classList.remove('touch-swap-target'));
  }, []);

  // Optimized effect with proper cleanup and memoized handlers
  useEffect(() => {
    const touchMoveHandler = handleTouchMove;
    const touchEndHandler = handleTouchEnd;

    document.addEventListener('touchmove', touchMoveHandler, { passive: true });
    document.addEventListener('touchend', touchEndHandler, { passive: true });
    
    return () => {
      document.removeEventListener('touchmove', touchMoveHandler);
      document.removeEventListener('touchend', touchEndHandler);
    };
  }, [handleTouchMove, handleTouchEnd]);

  return (
    <Box
      data-droppable-zone={zone}
      data-position={position}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={combinedSx}
    >
      {children}
    </Box>
  );
});

DroppableZone.displayName = 'DroppableZone';

export default DroppableZone;