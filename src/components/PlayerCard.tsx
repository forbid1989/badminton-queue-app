import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Box,
  Typography,
  IconButton,
  Popover,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import { Player, PlayerStatus } from '../types/Player';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import HistoryIcon from '@mui/icons-material/History';
import BadmintonIcon from './input/BadmintonIcon';
import { getTimeAgo } from '../utils/getTimeAgo';
import { formatMatchDuration, getMatchDescription, isToday } from '../utils/matchHistoryUtils';

// Pragmatic Drag and Drop imports
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';

const formatElapsedTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type PlayerCardProps = {
  player: Player;
  zone: string;
};

const PlayerCard: React.FC<PlayerCardProps> = React.memo(({ player, zone }) => {
  const theme = useTheme();
  const { state, dispatch } = useContext(AppContext);
  
  // Memoize frequently used values
  const courtCount = useMemo(() => state.courts.count, [state.courts.count]);
  const queueCount = useMemo(() => state.queue.count, [state.queue.count]);
  const isMobile = useMediaQuery('(max-width: 1110px)');
  const playerCooldownsEnabled = useMemo(() => state.settings.playerCooldowns, [state.settings.playerCooldowns]);

  const isTouchDevice = useMemo(() => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);
  
  // Determine if this card is in a team zone (smaller layout needed)
  const isInTeamZone = useMemo(() => {
    return zone.startsWith('court-') || zone.startsWith('queue-');
  }, [zone]);

  // State management
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [historyAnchorEl, setHistoryAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    return Math.floor((Date.now() - player.timeEntered) / 1000);
  });
  const [isEditing, setIsEditing] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(player.gamesPlayed.toString());
  const [isDragging, setIsDragging] = useState(false);
  const [name, setName] = useState(player.name);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nameUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Context menu prevention refs and state
  const contextMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [contextMenuBlocked, setContextMenuBlocked] = useState(false);

  // Memoized player status calculations
  const playerStatus = useMemo(() => {
    const isOnCourt = player.status.some(s => s.startsWith('court'));
    const isInQueue = player.status.some(s => s.startsWith('queue'));
    const isUnassigned = player.status.length === 0;
    const courtTags = player.status.filter(s => s.startsWith('court'));
    const queueTags = player.status.filter(s => s.startsWith('queue'));
    
    const isConflict =
      courtTags.length > 1 ||
      queueTags.length > 1 ||
      player.status.length > 2 ||
      (player.status.length === 2 && !(courtTags.length === 1 && queueTags.length === 1));

    const isIdleTooLong = isUnassigned && elapsedSeconds > 900;
    const isCourtAndQueue = courtTags.length === 1 && queueTags.length === 1 && player.status.length === 2;

    return {
      isOnCourt,
      isInQueue,
      isUnassigned,
      courtTags,
      queueTags,
      isConflict,
      isIdleTooLong,
      isCourtAndQueue
    };
  }, [player.status, elapsedSeconds]);

  // Calculate if player is on cooldown (< 15 minutes on court)
  const isOnCooldown = useMemo(() => {
    if (!playerCooldownsEnabled) return false;
    if (!playerStatus.isOnCourt) return false;
    
    return elapsedSeconds < 900; // 15 minutes = 900 seconds
  }, [playerCooldownsEnabled, playerStatus.isOnCourt, elapsedSeconds]);

  // Calculate player statistics for delete dialog
  const playerStats = useMemo(() => {
    const matchHistoryCount = player.matchHistory?.length || 0;
    const totalPlayTime = player.matchHistory?.reduce((total, match) => total + match.duration, 0) || 0;
    
    return {
      gamesPlayed: player.gamesPlayed,
      matchHistoryCount,
      totalPlayTime,
      hasPaymentInfo: Boolean(player.paymentInfo?.hasPaid || player.paymentInfo?.isGuest)
    };
  }, [player.gamesPlayed, player.matchHistory, player.paymentInfo]);

  // Memoized color calculations
  const cardColors = useMemo(() => {
    const getBackgroundColor = () => {
      const { isConflict, isCourtAndQueue, isIdleTooLong, isOnCourt, isInQueue, isUnassigned } = playerStatus;
      
      // Check for cooldown state (gray card when on court < 15 mins)
      if (isOnCooldown && zone === "all") {
        return "#B0B0B0"; // Gray for cooldown
      }
      
      if (zone !== "all") {
        if (isConflict) return "#F7C59F";
        if (isCourtAndQueue) return "#00b0bd";
        if (isIdleTooLong) return "#F8D7DA";
        if (zone.startsWith('court')) return "#B5CDA3";
        if (zone.startsWith('queue')) return "#E5D78A";
        return "#E8D8C4";
      }

      if (isConflict) return "#F7C59F";
      if (isCourtAndQueue) return "#00b0bd";
      if (isOnCourt && !isInQueue) return "#B5CDA3";
      if (isInQueue && !isOnCourt) return "#E5D78A";
      if (isIdleTooLong) return "#F8D7DA";
      return "#E8D8C4";
    };

    const getTextColor = () => {
      const { isConflict, isCourtAndQueue, isIdleTooLong, isOnCourt, isInQueue } = playerStatus;
      
      // Check for cooldown state
      if (isOnCooldown && zone === "all") {
        return "#555555"; // Darker gray text for cooldown
      }
      
      if (zone !== "all") {
        if (isConflict) return "#5C3D2E";
        if (isCourtAndQueue) return "#263238";
        if (isIdleTooLong) return "#8B0000";
        if (zone.startsWith('court')) return "#2F4023";
        if (zone.startsWith('queue')) return "#4A3F1C";
        return "#5E473B";
      }

      if (isConflict) return "#5C3D2E";
      if (isCourtAndQueue) return "#263238";
      if (isOnCourt && !isInQueue) return "#2F4023";
      if (isInQueue && !isOnCourt) return "#4A3F1C";
      if (isIdleTooLong) return "#8B0000";
      return "#5E473B";
    };

    return {
      backgroundColor: getBackgroundColor(),
      textColor: getTextColor()
    };
  }, [playerStatus, zone, isOnCooldown]);

  // Memoized available zone calculation
  const availableZone = useMemo(() => {
    // Try courts first
    for (let i = 0; i < courtCount; i++) {
      const courtKey = `court-${i}`;
      if ((state.courts.playersByCourt[courtKey] || []).length < 4) {
        return courtKey;
      }
    }

    // Try queues if no court has room
    for (let i = 0; i < queueCount; i++) {
      const queueKey = `queue-${i}`;
      if ((state.queue.playersByQueue?.[queueKey] || []).length < 4) {
        return queueKey;
      }
    }

    return null;
  }, [courtCount, queueCount, state.courts.playersByCourt, state.queue.playersByQueue]);

  const isQuickAddDisabled = !availableZone || (isOnCooldown && zone === "all");
  const showQuickAddIcon = useMemo(() => {
    const { isUnassigned, isOnCourt, isInQueue } = playerStatus;
    return (isUnassigned && !isOnCourt) || (zone === "all" && isOnCourt && !isInQueue);
  }, [playerStatus, zone]);

  // Context menu prevention handlers
  const handleContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    console.log('Context menu blocked during drag operation');
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const blockContextMenuTemporarily = useCallback(() => {
    setContextMenuBlocked(true);
    
    // Clear any existing timeout
    if (contextMenuTimeoutRef.current) {
      clearTimeout(contextMenuTimeoutRef.current);
    }
    
    // Re-enable context menu after 2 seconds
    contextMenuTimeoutRef.current = setTimeout(() => {
      setContextMenuBlocked(false);
      console.log('Context menu re-enabled');
    }, 2000);
  }, []);

  // Optimized event handlers with useCallback
  const handleQuickAdd = useCallback(() => {
    if (availableZone) {
      const sourceZone = zone === "all" ? "all" : "rest";
      dispatch(Action.quickMovePlayer(player.id, sourceZone, availableZone));
    }
  }, [availableZone, zone, player.id, dispatch]);

  const handleGamesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGamesPlayed(e.target.value);
  }, []);

  const handleGamesBlur = useCallback(() => {
    const parsed = parseInt(gamesPlayed);
    if (!isNaN(parsed) && parsed !== player.gamesPlayed) {
      dispatch(Action.setGamesPlayed(player.id, parsed));
    }
  }, [gamesPlayed, player.gamesPlayed, player.id, dispatch]);

  const openPopover = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const closePopover = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleEditToggle = useCallback(() => {
    setIsEditing(prev => !prev);
  }, []);

  const handleReturnToRest = useCallback(() => {
    dispatch(Action.movePlayer(player.id, zone, 'all'));
  }, [player.id, zone, dispatch]);

  // Enhanced delete handler with confirmation dialog
  const handleDeletePlayer = useCallback(() => {
    setDeleteDialogOpen(true);
    closePopover();
  }, [closePopover]);

  const handleConfirmDelete = useCallback(() => {
    dispatch(Action.removePlayer(player.id));
    setDeleteDialogOpen(false);
  }, [player.id, dispatch]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleHistoryOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setHistoryAnchorEl(e.currentTarget);
  }, []);

  const handleHistoryClose = useCallback(() => {
    setHistoryAnchorEl(null);
  }, []);

  const handleGamesClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation(); // Prevent card drag
    setHistoryAnchorEl(e.currentTarget);
  }, []);

  // Setup PDD draggable and drop target for swapping
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    // Prevent dragging if on cooldown from player list
    const canDrag = !(isOnCooldown && zone === "all");

    if (!canDrag) {
      return;
    }

    // Add context menu event listeners
    const handleElementContextMenu = (e: MouseEvent) => {
      if (contextMenuBlocked) {
        handleContextMenu(e);
      }
    };

    element.addEventListener('contextmenu', handleElementContextMenu, { capture: true });

    const cleanup = combine(
      // Make the card draggable
      draggable({
        element,
        getInitialData: () => ({
          playerId: player.id,
          playerName: player.name,
          playerZone: zone,
          player: player,
          type: 'player-card'
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          // Create custom drag preview
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: () => ({ x: 16, y: 8 }),
            render({ container }) {
              // Create a simplified version of the card as preview
              const preview = document.createElement('div');
              preview.style.padding = '4px 8px';
              preview.style.backgroundColor = cardColors.backgroundColor;
              preview.style.color = cardColors.textColor;
              preview.style.borderRadius = '8px';
              preview.style.fontSize = '0.75rem';
              preview.style.fontWeight = 'bold';
              preview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              preview.textContent = player.name;
              container.appendChild(preview);
            }
          });
        },
        onDragStart: () => {
          setIsDragging(true);
          // Block context menu when drag starts
          blockContextMenuTemporarily();
          console.log('PDD Drag started:', player.name, 'from', zone, '- Context menu blocked');
        },
        onDrop: () => {
          setIsDragging(false);
          console.log('PDD Drag ended');
        }
      }),
      
      // Make the card a drop target for swapping
      dropTargetForElements({
        element,
        getData: () => ({
          playerId: player.id,
          zone: zone,
          type: 'player-card-target'
        }),
        canDrop: ({ source }) => {
          // Only allow drops from other player cards
          if (source.data.type !== 'player-card') return false;
          
          const sourceZone = source.data.playerZone as string;
          const sourcePlayerId = source.data.playerId as string;
          
          // Don't allow dropping on self
          if (sourcePlayerId === player.id) return false;
          
          // REPLACEMENT FEATURE: Allow drops from player list onto court/queue players
          const isFromPlayerList = sourceZone === 'all';
          const isTargetInCourtOrQueue = zone.startsWith('court-') || zone.startsWith('queue-');
          
          if (isFromPlayerList && isTargetInCourtOrQueue) {
            console.log(`Allowing replacement: ${sourcePlayerId} from player list → ${player.name} in ${zone}`);
            return true;
          }
          
          // ENHANCED: Allow cross-zone swapping between any court/queue zones
          const isValidSourceZone = sourceZone.startsWith('court-') || sourceZone.startsWith('queue-');
          const isValidTargetZone = zone.startsWith('court-') || zone.startsWith('queue-');
          
          // Allow swapping between any combination of court/queue zones
          return isValidSourceZone && isValidTargetZone;
        },
        onDragEnter: ({ source }) => {
          const sourcePlayerId = source.data.playerId as string;
          const sourceZone = source.data.playerZone as string;
          if (sourcePlayerId !== player.id) {
            setIsDropTarget(true);
            
            // Enhanced logging for replacement vs swap
            const isReplacement = sourceZone === 'all' && (zone.startsWith('court-') || zone.startsWith('queue-'));
            const operationType = isReplacement ? 'Replacement' : (sourceZone === zone ? 'Same-zone swap' : 'Cross-zone swap');
            console.log(`${operationType} target entered: ${player.name} in ${zone}`);
          }
        },
        onDragLeave: () => {
          setIsDropTarget(false);
        },
        onDrop: ({ source }) => {
          setIsDropTarget(false);
          const sourcePlayerId = source.data.playerId as string;
          const sourceZone = source.data.playerZone as string;
          
          if (sourcePlayerId && sourcePlayerId !== player.id) {
            // REPLACEMENT LOGIC: Player from player list replacing player in court/queue
            const isReplacement = sourceZone === 'all' && (zone.startsWith('court-') || zone.startsWith('queue-'));
            
            if (isReplacement) {
              console.log(`REPLACEMENT: ${sourcePlayerId} from player list → replacing ${player.name} in ${zone}`);
              
              setIsSwapping(true);
              
              // Use new replacement action
              dispatch(Action.replacePlayer(sourcePlayerId, sourceZone, player.id, zone));
              
              // Reset animation after delay
              setTimeout(() => {
                setIsSwapping(false);
              }, 600);
            } else {
              // ENHANCED: Regular swap logic (same-zone or cross-zone)
              const isCrossZone = sourceZone !== zone;
              console.log(`${isCrossZone ? 'Cross-zone' : 'Same-zone'} swap: ${sourceZone} ↔ ${zone}`);
              
              setIsSwapping(true);
              
              // Use different action based on whether it's same-zone or cross-zone
              if (isCrossZone) {
                // Cross-zone - use new cross-zone swap action
                dispatch(Action.swapPlayersCrossZone(sourcePlayerId, sourceZone, player.id, zone));
              } else {
                // Same zone - use existing swap action
                dispatch(Action.swapPlayers(sourcePlayerId, player.id, zone));
              }
              
              // Reset animation after delay
              setTimeout(() => {
                setIsSwapping(false);
              }, 600);
            }
          }
        }
      })
    );

    // Cleanup function
    return () => {
      cleanup();
      element.removeEventListener('contextmenu', handleElementContextMenu, { capture: true });
    };
  }, [player, zone, dispatch, isOnCooldown, cardColors, contextMenuBlocked, handleContextMenu, blockContextMenuTemporarily]);

  // Enhanced touch support with context menu prevention
  useEffect(() => {
    if (!isTouchDevice) return;
    
    const element = cardRef.current;
    if (!element) return;

    let touchStartTime = 0;
    let touchMoved = false;
    let longPressTimer: NodeJS.Timeout | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime = Date.now();
      touchMoved = false;
      
      console.log('Touch start detected on player card:', player.name);
      
      // Start long press timer for context menu prevention
      longPressTimer = setTimeout(() => {
        // This is likely a long press for dragging
        blockContextMenuTemporarily();
        console.log('Long press detected - blocking context menu');
        
        // Add visual feedback for long press
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'transform 0.1s ease';
        
        // Haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 250); // 250ms for long press detection
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchMoved = true;
      
      // Clear long press timer if user moves
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      // If context menu is blocked and user is moving, likely dragging
      if (contextMenuBlocked) {
        e.preventDefault(); // Prevent scrolling during drag
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchDuration = Date.now() - touchStartTime;
      
      // Clear long press timer
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      
      // Reset visual feedback
      element.style.transform = '';
      element.style.transition = '';
      
      // If it was a quick tap (< 200ms) and no movement, allow normal interaction
      if (touchDuration < 200 && !touchMoved) {
        console.log('Quick tap - allowing normal interaction');
      }
    };

    // Add touch event listeners with passive: false to allow preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [player, zone, isTouchDevice, contextMenuBlocked, blockContextMenuTemporarily]);

  // Optimized timer effect
  useEffect(() => {
    const updateTimer = () => {
      setElapsedSeconds(Math.floor((Date.now() - player.timeEntered) / 1000));
    };

    updateTimer(); // Initial update
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [player.timeEntered]);

  // Debounced name update effect
  useEffect(() => {
    if (nameUpdateTimeoutRef.current) {
      clearTimeout(nameUpdateTimeoutRef.current);
    }

    nameUpdateTimeoutRef.current = setTimeout(() => {
      if (name !== player.name && name.trim() !== '') {
        dispatch(Action.updatePlayerName(player.id, name));
      }
    }, 250);

    return () => {
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
    };
  }, [name, player.name, player.id, dispatch]);

  // Sync external name changes
  useEffect(() => {
    setName(player.name);
  }, [player.name]);

  // Sync games played
  useEffect(() => {
    setGamesPlayed(player.gamesPlayed.toString());
  }, [player.gamesPlayed]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (nameUpdateTimeoutRef.current) {
        clearTimeout(nameUpdateTimeoutRef.current);
      }
      if (contextMenuTimeoutRef.current) {
        clearTimeout(contextMenuTimeoutRef.current);
      }
    };
  }, []);

  // Memoized formatted time
  const formattedTime = useMemo(() => formatElapsedTime(elapsedSeconds), [elapsedSeconds]);

  // Enhanced card styles with mobile optimizations and context menu prevention
  const enhancedCardStyles = useMemo(() => {
    const getCardDimensions = () => {
      return {
        width: isMobile ? '140': '160px',
        height: isMobile ? '30px' : '28px',
        fontSize: isMobile ? '0.72rem' : '0.68rem',
        nameMaxWidth: isMobile ? '130px' : '120px',
      };
    };

    const dimensions = getCardDimensions();

    return {
      display: 'flex',
      flexDirection: 'row' as const,
      width: dimensions.width,
      height: dimensions.height,
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '3px 8px',
      backgroundColor: isDropTarget 
        ? '#E8F5E9'
        : cardColors.backgroundColor,
      borderRadius: '14px',
      boxShadow: isDropTarget 
      ? '0 4px 12px rgba(233, 30, 99, 0.3)'
      : isSwapping
        ? '0 0 20px rgba(233, 30, 99, 0.8)'
        : '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2)',
      cursor: isOnCooldown && zone === "all" ? 'not-allowed' : 'grab',
      margin: '0 auto 2px',
      color: cardColors.textColor,
      border: isSwapping
      ? '2px solid #E91E63'
      : isDropTarget 
        ? '2px solid #E91E63'
        : `1px solid ${cardColors.backgroundColor}`,
      opacity: isDragging ? 0.5 : 1,
      transform: isDropTarget 
        ? 'scale(1.05)' 
        : (isDragging ? 'scale(0.95)' : 'scale(1)'),
      transition: isSwapping 
        ? 'border-color 0.15s ease-in-out, border-width 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
        : 'all 0.2s ease-in-out',
      animation: isSwapping 
        ? 'swapFlash 0.6s ease-in-out'
        : 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none',
      // Enhanced context menu prevention
      MozUserSelect: 'none',
      msUserSelect: 'none',
      '&:active': {
        cursor: 'grabbing',
        transform: 'scale(0.95)',
      },
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
      backgroundImage: `
        linear-gradient(0deg, 
          ${cardColors.backgroundColor} 0%, 
          ${cardColors.backgroundColor}f0 25%,
          ${cardColors.backgroundColor}e0 50%, 
          ${cardColors.backgroundColor}f0 75%,
          ${cardColors.backgroundColor} 100%),
        repeating-linear-gradient(0deg, 
          transparent 0px, 
          rgba(0,0,0,0.02) 0.5px, 
          transparent 1px)`,
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `repeating-linear-gradient(90deg, 
          transparent 0px, 
          rgba(0,0,0,0.03) 1px, 
          transparent 2px)`,
        pointerEvents: 'none',
      },
    };
  }, [isInTeamZone, isMobile, cardColors, isDragging, isDropTarget, isSwapping, isOnCooldown, zone]);

  return (
    <div className="flipped">
      <Card
        ref={cardRef}
        sx={enhancedCardStyles}
        data-player-id={player.id}
        data-zone={zone}
        // Add context menu handler to the Card component
        onContextMenu={contextMenuBlocked ? handleContextMenu : undefined}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: isInTeamZone ? 0.25 : 0.5,
            pointerEvents: isDragging ? 'none' : 'auto',
          }}
        >
          {/* LEFT SECTION: Name and Stats in Two Rows */}
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            overflow: 'hidden',
            minWidth: 0,
            flex: 1,
            gap: 0.1,
          }}>
            {/* TOP ROW: Player Name */}
            <Box sx={{ 
              width: '100%',
              overflow: 'hidden',
            }}>
              {isEditing ? (
                <TextField
                  variant="standard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditing(false);
                    }
                  }}
                  onBlur={() => setIsEditing(false)}
                  slotProps={{
                    input: {
                      style: {
                        fontSize: isInTeamZone 
                          ? (isMobile ? '0.62rem' : '0.58rem')
                          : (isMobile ? '0.72rem' : '0.68rem'),
                        fontWeight: 'bold',
                        padding: 0,
                      },
                    },
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      lineHeight: 1.1,
                      height: 'auto',
                    },
                  }}
                />
              ) : (
                <Typography
                  component="div"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: isInTeamZone 
                      ? (isMobile ? '0.62rem' : '0.58rem')
                      : (isMobile ? '0.72rem' : '0.68rem'),
                    lineHeight: 1.1,
                    cursor: 'pointer',
                    textShadow: isMobile ? '1px 1px 2px rgba(0,0,0,0.1)' : 'none',
                    maxWidth: isInTeamZone 
                      ? (isMobile ? '75px' : '70px')
                      : (isMobile ? '110px' : '100px'),
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                    '&:hover': {
                      '&::after': {
                        content: `"${player.name}"`,
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        whiteSpace: 'nowrap',
                        zIndex: 1000,
                        pointerEvents: 'none',
                        visibility: player.name.length > 12 ? 'visible' : 'hidden',
                      },
                    },
                  }}
                  title={player.name.length > 12 ? player.name : undefined}
                  onClick={handleEditToggle}
                >
                  {player.name}
                </Typography>
              )}
            </Box>

            {/* BOTTOM ROW: Games and Timer */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              borderRadius: '8px',
              padding: '1px 4px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              gap: 0.75, 
            }}>
              {/* Games played indicator */}
              <Typography 
                variant="body2" 
                onClick={handleGamesClick}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: isInTeamZone 
                    ? (isMobile ? '0.65rem' : '0.6rem')   
                    : (isMobile ? '0.75rem' : '0.7rem'),  
                  gap: 0.3,
                  fontWeight: 600, 
                  color: cardColors.textColor,
                  textShadow: '1px 1px 1px rgba(0,0,0,0.3)', 
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-2px',
                    left: 0,
                    right: 0,
                    height: '1px',
                    backgroundColor: '#5C4033',
                    transform: 'scaleX(0)',
                    transition: 'transform 0.2s ease',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    '&::after': {
                      transform: 'scaleX(1)',
                    },
                  },
                  '&:active': {
                    transform: 'scale(0.98)',
                  },
                }}
                title="Click to view match history"
              >
                {player.gamesPlayed}
                <Box 
                  component="span" 
                  sx={{ 
                    fontSize: '1em', 
                    filter: 'brightness(1.2)', 
                  }}
                >
                  🎮
                </Box>
              </Typography>

              {/* Timer */}
              <Typography 
                variant="body2" 
                sx={{
                  fontWeight: elapsedSeconds > 900 ? 700 : 600, 
                  color: elapsedSeconds > 900 ? '#8B0000' : cardColors.textColor,
                  fontSize: isInTeamZone 
                    ? (isMobile ? '0.65rem' : '0.6rem')   
                    : (isMobile ? '0.75rem' : '0.7rem'),  
                  minWidth: isInTeamZone ? '32px' : '36px', 
                  textAlign: 'left',
                  textShadow: '1px 1px 1px rgba(0,0,0,0.3)', 
                }}
              >
                {formattedTime}
              </Typography>
            </Box>
          </Box>

          {/* RIGHT SECTION: Action buttons */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isInTeamZone 
                ? (isMobile ? 0.3 : 0.25)
                : (isMobile ? 0.5 : 0.4),
              flexShrink: 0,
            }}
          >
            {/* Quick add button */}
            {!isInTeamZone && showQuickAddIcon && (
              <IconButton
                size="small"
                onClick={handleQuickAdd}
                disabled={isQuickAddDisabled}
                title={
                  isQuickAddDisabled
                    ? isOnCooldown 
                      ? `On cooldown (${Math.ceil((900 - Math.floor((Date.now() - (player.courtEnteredTime || player.timeEntered)) / 1000)) / 60)} mins remaining)`
                      : "No available court or queue"
                    : "Quick Add"
                }
                sx={{
                  padding: isMobile ? '2px' : '1px',
                  borderRadius: '50%',
                  border: `1px solid ${isQuickAddDisabled ? '#ccc' : '#2E7D32'}`,
                  backgroundColor: isQuickAddDisabled ? '#f2f2f2' : '#E8F5E9',
                  color: isQuickAddDisabled ? '#aaa' : '#2E7D32',
                  minWidth: 'auto',
                  minHeight: isMobile ? '28px' : 'auto',
                  '&:hover': {
                    backgroundColor: isQuickAddDisabled ? '#f2f2f2' : '#C8E6C9',
                  },
                }}
              >
                <BadmintonIcon
                  size={isMobile ? 12 : 10}
                  playerSeed={player.name}
                  isDisabled={isQuickAddDisabled}
                />
              </IconButton>
            )}

            {/* Enhanced Return button - now works from any zone back to player list */}
            {(playerStatus.isOnCourt || playerStatus.isInQueue || playerStatus.isCourtAndQueue) && (
              <IconButton
                size="small"
                onClick={handleReturnToRest}
                title={`Return ${player.name} to player list (clears all assignments)`}
                sx={{
                  padding: isMobile ? '2px' : '1px',
                  color: '#6D4C41',
                  minHeight: isMobile ? '28px' : 'auto',
                  // Enhanced styling to make it more prominent
                  backgroundColor: 'rgba(109, 76, 65, 0.1)',
                  border: '1px solid rgba(109, 76, 65, 0.3)',
                  borderRadius: '50%',
                  '&:hover': {
                    color: '#3E2723',
                    backgroundColor: 'rgba(109, 76, 65, 0.2)',
                    transform: 'scale(1.1)',
                  },
                  // Special styling based on player status
                  ...(playerStatus.isCourtAndQueue && {
                    backgroundColor: 'rgba(0, 176, 189, 0.2)', // Teal background for advanced queue
                    borderColor: 'rgba(0, 176, 189, 0.5)',
                    color: '#6D4C41',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 176, 189, 0.3)',
                      color: '#6D4C41', // Darker teal on hover for better visibility
                    },
                    // FIXED: Ensure the icon itself is visible
                    '& .MuiSvgIcon-root': {
                      color: '#6D4C41',
                      fontSize: isMobile 
                        ? (isInTeamZone ? '0.8rem' : '0.9rem')
                        : (isInTeamZone ? '0.7rem' : '0.8rem'),
                    },
                  }),
                }}
              >
                <KeyboardReturnIcon sx={{ 
                  fontSize: isMobile 
                    ? (isInTeamZone ? '0.7rem' : '0.8rem')
                    : (isInTeamZone ? '0.6rem' : '0.75rem')
                }} />
              </IconButton>
            )}

            {/* Menu button */}
            <IconButton 
              size="small" 
              onClick={openPopover} 
              sx={{ 
                padding: isMobile ? '2px' : '1px',
                minHeight: isMobile ? '28px' : 'auto',
                '& .MuiSvgIcon-root': {
                  fontSize: isMobile 
                    ? (isInTeamZone ? '0.7rem' : '0.8rem')
                    : (isInTeamZone ? '0.6rem' : '0.75rem'),
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
      </Card>

      {/* Match History Popover */}
      <Popover
        open={Boolean(historyAnchorEl)}
        anchorEl={historyAnchorEl}
        onClose={handleHistoryClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: isMobile ? 380 : 340,
              maxWidth: isMobile ? 420 : 380,
              maxHeight: '70vh',
              p: 2,
              borderRadius: isMobile ? 2 : 1,
              boxShadow: isMobile 
                ? '0 8px 24px rgba(0,0,0,0.15)' 
                : theme.shadows[8],
              overflowY: 'auto',
            },
          },
        }}
      >
        <Typography variant="subtitle2" gutterBottom sx={{
          fontSize: isMobile ? '0.9rem' : '0.8rem',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          paddingBottom: '8px',
          marginBottom: '12px',
        }}>
          {player.name}'s Match History
        </Typography>

        {player.matchHistory?.length ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {player.matchHistory
              .slice() 
              .reverse() 
              .map((entry, i) => {
                const startTime = new Date(entry.startTime);
                const endTime = new Date(entry.endTime);
                
                const startTimeStr = startTime.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                });
                
                const endTimeStr = endTime.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit', 
                  hour12: true,
                });

                const matchDescription = getMatchDescription(entry, player.name);
                const durationStr = formatMatchDuration(entry.duration);

                const getMatchTypeEmoji = (type: string) => {
                  switch (type) {
                    case '1v1': return '⚔️';
                    case '2v1': return '🔀';
                    case '2v2': return '👥';
                    default: return '🏸';
                  }
                };

                return (
                  <Box
                    key={`${entry.matchId}-${i}`}
                    sx={{
                      backgroundColor: 'rgba(0,0,0,0.03)',
                      borderRadius: 1,
                      padding: 1.5,
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    {/* Match type and description */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: isMobile ? '0.8rem' : '0.75rem',
                        fontWeight: 'bold',
                        color: 'primary.main',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      {getMatchTypeEmoji(entry.matchType)}
                      {matchDescription}
                    </Typography>

                    {/* Court and timing info */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: isMobile ? '0.7rem' : '0.65rem',
                        color: 'text.secondary',
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      {entry.courtName}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: isMobile ? '0.7rem' : '0.65rem',
                        color: 'text.secondary',
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      {startTimeStr} - {endTimeStr}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: isMobile ? '0.7rem' : '0.65rem',
                        color: 'success.main',
                        fontWeight: 'medium',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      Duration: {durationStr}
                    </Typography>

                    {/* Show date if not today */}
                    {!isToday(startTime) && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: isMobile ? '0.65rem' : '0.6rem',
                          color: 'text.disabled',
                          display: 'block',
                          marginTop: '4px',
                          fontStyle: 'italic',
                        }}
                      >
                        {startTime.toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                );
              })}
          </Box>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            padding: 2,
            color: 'text.secondary',
          }}>
            <Typography 
              variant="body2" 
              fontSize={isMobile ? '0.8rem' : '0.75rem'}
              sx={{ marginBottom: 1 }}
            >
              No match history yet
            </Typography>
            <Typography 
              variant="caption" 
              fontSize={isMobile ? '0.7rem' : '0.65rem'}
            >
              Start playing to see your match history here!
            </Typography>
          </Box>
        )}
      </Popover>

      {/* Settings Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: isMobile ? 200 : 180,
              p: 0, // Remove padding, we'll add it per section
              borderRadius: 3,
              boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.08)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ 
          px: 2, 
          py: 1.5, 
          backgroundColor: '#5C4033',
          color: 'white'
        }}>
          <Typography variant="subtitle2" sx={{ 
            fontSize: '0.8rem', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            ⚙️ {player.name}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          {/* Games Field */}
          <Box sx={{ mb: 2 }}>
            <TextField
              label="🎮 Games Played"
              value={gamesPlayed}
              onChange={handleGamesChange}
              onBlur={handleGamesBlur}
              size="small"
              fullWidth
              variant="outlined"
              slotProps={{
                input: {
                  style: {
                    fontSize: '0.8rem',
                  },
                },
                inputLabel: {
                  sx: { fontSize: '0.8rem' }
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          {/* View History Button */}
          {!isInTeamZone && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleHistoryOpen}
                fullWidth
                sx={{ 
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  borderRadius: 2,
                  textTransform: 'none',
                  color: '#5C4033',
                  borderColor: '#5C4033',
                  '&:hover': {
                    backgroundColor: 'rgba(92, 64, 51, 0.04)',
                    borderColor: '#5C4033',
                  }
                }}
              >
                📊 View History
              </Button>
            </Box>
          )}

          {/* Movement Options */}
          {!isInTeamZone && (
            <>
              <Typography variant="caption" sx={{ 
                color: 'text.secondary', 
                fontSize: '0.75rem',
                fontWeight: 600,
                mb: 1,
                display: 'block'
              }}>
                MOVE TO
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>🏸 Court</InputLabel>
                  <Select
                    label="🏸 Court"
                    value=""
                    onChange={(e) => {
                      const to = e.target.value;
                      dispatch(Action.movePlayer(player.id, zone, to));
                      closePopover();
                    }}
                    size='small'
                    sx={{ 
                      fontSize: '0.8rem',
                      borderRadius: 2,
                    }}
                  >
                    {Array.from({ length: courtCount }, (_, i) => (
                      <MenuItem 
                        key={i} 
                        value={`court-${i}`}
                        sx={{ fontSize: '0.8rem' }}
                      >
                        Court {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>⏳ Queue</InputLabel>
                  <Select
                    label="⏳ Queue"
                    value=""
                    onChange={(e) => {
                      const to = e.target.value;
                      dispatch(Action.movePlayer(player.id, zone, to));
                      closePopover();
                    }}
                    size='small'
                    sx={{ 
                      fontSize: '0.8rem',
                      borderRadius: 2,
                    }}
                  >
                    {Object.keys(state.queue.playersByQueue).map((queueId, index) => (
                      <MenuItem 
                        key={queueId} 
                        value={queueId}
                        sx={{ fontSize: '0.8rem' }}
                      >
                        Queue {index + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </>
          )}

          {/* Danger Zone */}
          <Box sx={{ 
            borderTop: '1px solid rgba(0,0,0,0.1)', 
            pt: 2,
            mt: 1 
          }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={handleDeletePlayer}
              startIcon={<DeleteIcon sx={{ fontSize: '0.9rem' }} />}
              fullWidth
              sx={{ 
                fontSize: '0.8rem',
                fontWeight: 600,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)',
                }
              }}
            >
              Delete Player
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'error.main'
        }}>
          <WarningIcon sx={{ fontSize: '1.2rem' }} />
          Delete Player "{player.name}"?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.8rem', mb: 2 }}>
            This action will permanently delete the player and <strong>cannot be undone</strong>.
          </Typography>
          
          <Box sx={{ 
            bgcolor: 'error.light', 
            p: 2, 
            borderRadius: 1, 
            border: '1px solid',
            borderColor: 'error.main',
            color: 'error.contrastText'
          }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', mb: 1 }}>
              The following data will be lost:
            </Typography>
            <Box component="ul" sx={{ fontSize: '0.7rem', margin: 0, paddingLeft: 2 }}>
              <li><strong>{playerStats.gamesPlayed}</strong> recorded games</li>
              {playerStats.matchHistoryCount > 0 && (
                <li><strong>{playerStats.matchHistoryCount}</strong> match history entries</li>
              )}
              {playerStats.totalPlayTime > 0 && (
                <li><strong>{Math.floor(playerStats.totalPlayTime / 60)} minutes</strong> of total play time</li>
              )}
              {playerStats.hasPaymentInfo && (
                <li>Payment information and status</li>
              )}
              <li>Current court/queue position</li>
            </Box>
          </Box>

          <Typography sx={{ fontSize: '0.75rem', mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
            <strong>Tip:</strong> If you just want to remove the player from the current court or queue, 
            look for the <KeyboardReturnIcon sx={{ fontSize: '0.8rem', mx: 0.5, verticalAlign: 'middle' }} /> 
            "Return to Rest" button instead.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: 2, gap: 1 }}>
          <Button 
            onClick={handleCancelDelete}
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon sx={{ fontSize: '0.8rem' }} />}
            sx={{ fontSize: '0.75rem' }}
          >
            Delete Player
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;