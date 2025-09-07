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
import { usePartnershipWarnings } from '../lib/hooks/usePartnershipWarnings';

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
  const { checkPlayers, getPlayerWarningLevel } = usePartnershipWarnings();

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
    // Check for partnership warnings when players change in court/queue zones
    if (players.length >= 2 && (zone.startsWith('court-') || zone.startsWith('queue-'))) {
      // Small delay to ensure state has updated
      const timeoutId = setTimeout(() => {
        checkPlayers(players, zone);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [players, zone, checkPlayers]);

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
    if (zone === 'all') return '#F5EFE6';
    return '#FAFAFA';
  }, [zone]);

  // Enhanced border color calculation
  const borderColor = useMemo(() => {
    const anyHover = isHovered && isDragOverValid;
    
    // 🆕 Special styling for player list zone when receiving returns
    if (isPlayerListZone) {
      if (anyHover) return '#4CAF50'; // Green when accepting returns
      return '#d8c9aa'; // Default beige
    }
    
    if (isPositionZone) {
      if (isFull) return '#D5C96A';
      if (anyHover) return '#FF6B35'; // More vibrant orange for position drops
      return players.length > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
    }
    
    if (isFull) return '#D5C96A';
    if (anyHover) return '#4CAF50';
    return '#CAD4CC';
  }, [isFull, isHovered, isDragOverValid, isPositionZone, isPlayerListZone, players.length]);

  // Enhanced background color calculation
  const backgroundColor = useMemo(() => {
    const anyHover = isHovered && isDragOverValid;
    
    // 🆕 Special styling for player list zone
    if (isPlayerListZone) {
      if (anyHover) return '#E8F5E9'; // Light green when accepting returns
      return zoneBackground;
    }
    
    if (isPositionZone) {
      if (anyHover) return 'rgba(255, 107, 53, 0.3)';
      return players.length > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)';
    }
    
    if (anyHover) return '#E8F5E9';
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
          
          // 🆕 Enhanced logging for player list drops
          if (isPlayerListZone) {
            console.log(`🔙 Player list drag enter: from ${sourceZone} to player list`);
          } else {
            console.log(`🎯 Drag enter: zone=${zone}, position=${position}, isPositionZone=${isPositionZone}`);
          }
          
          setIsHovered(true);
          setIsDragOverValid(true);
        },
        onDragLeave: () => {
          setIsHovered(false);
          setIsDragOverValid(false);
        },
        onDrop: ({ source, location }) => {
          const playerId = source.data.playerId as string;
          const playerZone = source.data.playerZone as string;
          
          // 🆕 SPECIAL HANDLING: Drops to player list zone (returns)
          if (isPlayerListZone) {
            console.log(`🔙 PLAYER LIST DROP: Returning ${playerId} from ${playerZone} to player list`);
            setIsHovered(false);
            setIsDragOverValid(false);
            
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

  // Check for zone-level warnings
  const zoneWarningLevel = useMemo(() => {
    if (players.length < 2 || isPlayerListZone || isPositionZone) return 'none';
    
    // Check if any player in this zone has warnings
    let maxWarningLevel = 'none';
    
    players.forEach(player => {
      const playerWarning = getPlayerWarningLevel(player.id, players);
      if (playerWarning === 'critical') {
        maxWarningLevel = 'critical';
      } else if (playerWarning === 'warning' && maxWarningLevel !== 'critical') {
        maxWarningLevel = 'warning';
      }
    });
    
    return maxWarningLevel;
  }, [players, getPlayerWarningLevel, isPlayerListZone, isPositionZone]);

  // Calculate zone warning styles with explicit typing
  const zoneWarningStyles = useMemo(() => {
    // Define the return type explicitly
    const styles: {
      background?: string;
      borderColor?: string;
      animation?: string;
    } = {};

    switch (zoneWarningLevel) {
      case 'critical':
        styles.background = 'linear-gradient(135deg, rgba(211, 47, 47, 0.1) 0%, rgba(211, 47, 47, 0.05) 100%)';
        styles.borderColor = 'rgba(211, 47, 47, 0.5)';
        styles.animation = 'partnershipCriticalPulse 2s ease-in-out infinite';
        break;
      case 'warning':
        styles.background = 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.05) 100%)';
        styles.borderColor = 'rgba(156, 39, 176, 0.5)';
        styles.animation = 'partnershipWarningPulse 3s ease-in-out infinite';
        break;
      default:
        // No warning styles needed
        break;
    }
    
    return styles;
  }, [zoneWarningLevel]);


  // Memoized combined styles
  const combinedSx = useMemo(() => {
    // Calculate base border color
    const baseBorderColor = (() => {
      const anyHover = isHovered && isDragOverValid;
      
      if (isPlayerListZone) {
        if (anyHover) return '#4CAF50';
        return '#d8c9aa';
      }
      
      if (isPositionZone) {
        if (isFull) return '#D5C96A';
        if (anyHover) return '#FF6B35';
        return players.length > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
      }
      
      if (isFull) return '#D5C96A';
      if (anyHover) return '#4CAF50';
      return '#CAD4CC';
    })();

    // Calculate base background
    const baseBackground = (() => {
      const anyHover = isHovered && isDragOverValid;
      
      if (isPlayerListZone) {
        if (anyHover) return '#E8F5E9';
        return zoneBackground;
      }
      
      if (isPositionZone) {
        if (anyHover) return 'rgba(255, 107, 53, 0.3)';
        return players.length > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)';
      }
      
      if (anyHover) return '#E8F5E9';
      return zoneBackground;
    })();

    // Apply warning overrides with proper fallbacks
    const finalBorderColor = zoneWarningStyles.borderColor || baseBorderColor;
    const finalBackground = zoneWarningStyles.background || baseBackground;

    // Base styles object
    const styles: any = {
      border: `2px ${isPositionZone ? 'solid' : 'dashed'} ${finalBorderColor}`,
      borderRadius: isPositionZone ? 1 : 2,
      padding: isPositionZone ? 0.5 : 2,
      marginBottom: isPositionZone ? 0 : 3,
      backgroundColor: finalBackground,
      minHeight: isPositionZone 
      ? (isMobileDevice ? 40 : 35)
      : isPlayerListZone
      ? (isMobileDevice ? 150 : 120)
      : zone.startsWith('queue-')
      ? '140px'
      : (isMobileDevice ? 90 : 80),
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform,
      boxShadow,
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
    };

    // Add animation if it exists
    if (zoneWarningStyles.animation) {
      styles.animation = zoneWarningStyles.animation;
    }

    return styles;
  }, [
    isHovered, isDragOverValid, isPlayerListZone, isPositionZone, isFull, players.length,
    zoneBackground, transform, boxShadow, isMobileDevice, zone, isDragOverValid, sx,
    zoneWarningStyles
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