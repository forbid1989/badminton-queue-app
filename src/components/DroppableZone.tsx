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

// 📱 Mobile-specific constants
const MOBILE_HOVER_THRESHOLD = 20; // px threshold for mobile hover detection
const MOBILE_SCROLL_PREVENTION_DELAY = 150; // ms delay before preventing scroll

const DroppableZone: React.FC<DroppableZoneProps> = React.memo(({ zone, players, children, sx, position }) => {
  const { dispatch } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileHovered, setIsMobileHovered] = useState(false);
  
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
  const lastTouchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const scrollPreventionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // 📱 Enhanced mobile touch detection within zone
  const checkIfTouchIsInZone = useCallback((touch: Touch): boolean => {
    if (!elementRef.current) return false;
    
    const rect = elementRef.current.getBoundingClientRect();
    const buffer = MOBILE_HOVER_THRESHOLD;
    
    return (
      touch.clientX >= rect.left - buffer &&
      touch.clientX <= rect.right + buffer &&
      touch.clientY >= rect.top - buffer &&
      touch.clientY <= rect.bottom + buffer
    );
  }, []);

  // 📱 Mobile-optimized global touch move handler
  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    if (!isMobileDevice) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    // Store last touch position
    lastTouchPositionRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Check if touch is within this zone
    const isInZone = checkIfTouchIsInZone(touch);
    
    if (isInZone && !isFullRef.current) {
      if (!isMobileHovered) {
        setIsMobileHovered(true);
        console.log('📱 Mobile hover activated for zone:', zoneRef.current);
        
        // Add haptic feedback for zone entry
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }
    } else {
      if (isMobileHovered) {
        setIsMobileHovered(false);
        console.log('📱 Mobile hover deactivated for zone:', zoneRef.current);
      }
    }
  }, [isMobileDevice, checkIfTouchIsInZone, isMobileHovered]);

  // 📱 Mobile-optimized global touch end handler
  const handleGlobalTouchEnd = useCallback((e: TouchEvent) => {
    if (!isMobileDevice) return;
    
    // Clear mobile hover state
    setIsMobileHovered(false);
    
    // Clear scroll prevention timeout
    if (scrollPreventionTimeoutRef.current) {
      clearTimeout(scrollPreventionTimeoutRef.current);
      scrollPreventionTimeoutRef.current = null;
    }
    
    // Re-enable scroll
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
    const touch = e.changedTouches[0];
    if (!touch || !lastTouchPositionRef.current) return;
    
    // Check if final touch position is within this zone
    const isInZone = checkIfTouchIsInZone(touch);
    
    if (isInZone) {
      console.log('📱 Touch ended in zone:', zoneRef.current, 'Position:', positionRef.current);
      
      // The actual drop handling will be done by the PlayerCard's touch end handler
      // This just provides visual feedback and logging
    }
    
    lastTouchPositionRef.current = null;
  }, [isMobileDevice, checkIfTouchIsInZone]);

  // 📱 Set up global touch event listeners for mobile
  useEffect(() => {
    if (!isMobileDevice) return;
    
    const touchMoveHandler = handleGlobalTouchMove;
    const touchEndHandler = handleGlobalTouchEnd;
    
    // Use passive listeners for better performance
    document.addEventListener('touchmove', touchMoveHandler, { passive: true });
    document.addEventListener('touchend', touchEndHandler, { passive: true });
    document.addEventListener('touchcancel', touchEndHandler, { passive: true });
    
    return () => {
      document.removeEventListener('touchmove', touchMoveHandler);
      document.removeEventListener('touchend', touchEndHandler);
      document.removeEventListener('touchcancel', touchEndHandler);
    };
  }, [handleGlobalTouchMove, handleGlobalTouchEnd, isMobileDevice]);

  // Memoized zone background calculation
  const zoneBackground = useMemo(() => {
    if (zone.startsWith('court')) return '#DFF0D8';
    if (zone.startsWith('queue')) return '#FFF8DC';
    if (zone === 'all') return '#F5EFE6';
    return '#FAFAFA';
  }, [zone]);

  // Enhanced border color calculation for mobile
  const borderColor = useMemo(() => {
    const mobileHover = isMobileDevice && isMobileHovered;
    const regularHover = !isMobileDevice && isHovered;
    const anyHover = mobileHover || regularHover;
    
    if (isPositionZone) {
      if (isFull) return '#D5C96A';
      if (anyHover) return '#FF6B35'; // More vibrant orange for position drops
      return players.length > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
    }
    
    if (isFull) return '#D5C96A';
    if (anyHover) return '#4CAF50';
    return '#CAD4CC';
  }, [isFull, isHovered, isMobileHovered, isMobileDevice, isPositionZone, players.length]);

  // Enhanced background color calculation for mobile
  const backgroundColor = useMemo(() => {
    const mobileHover = isMobileDevice && isMobileHovered;
    const regularHover = !isMobileDevice && isHovered;
    const anyHover = mobileHover || regularHover;
    
    if (isPositionZone) {
      if (anyHover) return 'rgba(255, 107, 53, 0.3)'; // More pronounced on mobile
      return players.length > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)';
    }
    
    if (anyHover) return '#E8F5E9';
    return zoneBackground;
  }, [isHovered, isMobileHovered, isMobileDevice, zoneBackground, isPositionZone, players.length]);

  // Enhanced transform calculation for mobile
  const transform = useMemo(() => {
    const mobileHover = isMobileDevice && isMobileHovered;
    const regularHover = !isMobileDevice && isHovered;
    const anyHover = mobileHover || regularHover;
    
    if (isPositionZone) {
      return anyHover ? 'scale(1.12)' : 'scale(1)'; // Bigger scale for mobile
    }
    return anyHover ? 'scale(1.03)' : 'scale(1)';
  }, [isHovered, isMobileHovered, isMobileDevice, isPositionZone]);

  // Enhanced box shadow for mobile
  const boxShadow = useMemo(() => {
    const mobileHover = isMobileDevice && isMobileHovered;
    const regularHover = !isMobileDevice && isHovered;
    const anyHover = mobileHover || regularHover;
    
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
  }, [isHovered, isMobileHovered, isMobileDevice, isPositionZone]);

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
        // dispatch(Action.movePlayerToPosition(player.id, currentZone, currentPosition));
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
    
    // Only set hover for desktop - mobile uses separate system
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

  // // 1. Update the handleTouchStart function (around line 200):
  // const handleTouchStart = useCallback((e: React.TouchEvent) => {
  //   if (!isMobileDevice) return;
    
  //   // 🔧 IMPORTANT: Don't prevent default on zone touch start
  //   // This allows natural scrolling to work when touching empty areas
  //   // Only player cards should handle drag operations
  //   console.log('📱 Zone touch start - allowing natural behavior');
  // }, [isMobileDevice]);

    // 📱 SIMPLIFIED mobile touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't interfere with drag operations
    console.log('📱 Zone touch start - allowing natural behavior');
  }, []);

  // 📱 Prevent scroll during active drag operations
  const preventScrollDuringDrag = useCallback(() => {
    if (!isMobileDevice) return;
    
    // Prevent scroll with a delay to avoid interfering with normal scrolling
    scrollPreventionTimeoutRef.current = setTimeout(() => {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }, MOBILE_SCROLL_PREVENTION_DELAY);
  }, [isMobileDevice]);

    // 2. Update the combinedSx styles (around line 280):
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
    // 📱 Mobile-specific touch optimizations - IMPROVED
    touchAction: isMobileDevice 
      ? (isPositionZone ? 'none' : 'pan-y') // Allow scrolling in main zones, prevent in position zones
      : 'auto',
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // Enhanced hover states for both mobile and desktop
    '&.touch-hover, &.mobile-hover': {
      backgroundColor: isPositionZone ? 'rgba(255, 107, 53, 0.3)' : '#E8F5E9',
      borderColor: isPositionZone ? '#FF6B35' : '#4CAF50',
      transform: isPositionZone 
        ? (isMobileDevice ? 'scale(1.12)' : 'scale(1.08)') 
        : (isMobileDevice ? 'scale(1.03)' : 'scale(1.02)'),
      boxShadow: isPositionZone 
        ? (isMobileDevice ? '0 6px 20px rgba(255, 107, 53, 0.5)' : '0 4px 12px rgba(255, 107, 53, 0.4)')
        : (isMobileDevice ? '0 4px 16px rgba(76, 175, 80, 0.4)' : '0 2px 8px rgba(76, 175, 80, 0.3)'),
    },
    // CSS for touch swap targets
    '& [data-player-id].touch-swap-target': {
      backgroundColor: '#E8F5E9',
      borderColor: '#4CAF50',
      transform: isMobileDevice ? 'scale(1.08)' : 'scale(1.05)',
    },
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

  // Apply mobile hover class when needed
  useEffect(() => {
    if (!elementRef.current || !isMobileDevice) return;
    
    if (isMobileHovered) {
      elementRef.current.classList.add('mobile-hover');
    } else {
      elementRef.current.classList.remove('mobile-hover');
    }
  }, [isMobileHovered, isMobileDevice]);

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