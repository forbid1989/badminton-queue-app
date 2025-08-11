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
  
  // 📱 Mobile device detection
  const isMobileDevice = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768 ||
           'ontouchstart' in window;
  }, []);
  
  // Use refs to store current values for event handlers
  const zoneRef = useRef(zone);
  const positionRef = useRef(position);
  const isFullRef = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);
  
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

  // ✨ SIMPLIFIED Enhanced handleDrop with priority lock system
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
        dispatch(Action.movePlayerToPosition(player.id, from, currentZone, currentPosition));
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
    
    // Only set hover for desktop
    if (!isMobileDevice && (isPositionZone || !isFullRef.current)) {
      setIsHovered(true);
    }
  }, [isPositionZone, isMobileDevice]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear hover if we're actually leaving this element and not on mobile
    if (!isMobileDevice && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsHovered(false);
    }
  }, [isMobileDevice]);

  // 📱 SIMPLIFIED mobile touch handlers - Let PlayerCard handle all touch logic
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't interfere with PlayerCard touch handling
    console.log('📱 Zone touch start - allowing PlayerCard to handle');
  }, []);

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
    // 📱 SIMPLIFIED Mobile-specific touch optimizations
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onTouchStart={handleTouchStart}
      sx={combinedSx}
    >
      {children}
    </Box>
  );
});

DroppableZone.displayName = 'DroppableZone';

export default DroppableZone;