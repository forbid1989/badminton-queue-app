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
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { Player, PlayerStatus } from '../types/Player';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import HistoryIcon from '@mui/icons-material/History';
import BadmintonIcon from './input/BadmintonIcon';
import { getTimeAgo } from '../utils/getTimeAgo';

let currentDragData: { playerId: string; playerZone: string } | null = null;

const formatElapsedTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type PlayerCardProps = {
  player: Player;
  zone: string;
};

// Global variables for drag state
let draggedElement: HTMLElement | null = null;
let draggedData: { player: Player; zone: string } | null = null;

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
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    return Math.floor((Date.now() - player.timeEntered) / 1000);
  });
  const [isEditing, setIsEditing] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(player.gamesPlayed.toString());
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [name, setName] = useState(player.name);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nameUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const initialTouchRef = useRef<{ x: number, y: number } | null>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Use courtEnteredTime if available, otherwise fallback to timeEntered
    // This handles players who were already on court before the feature was added
    // const enteredTime = player.courtEnteredTime || player.timeEntered;
    // const timeOnCourt = Math.floor((Date.now() - enteredTime) / 1000);
    return elapsedSeconds < 900; // 15 minutes = 900 seconds
  }, [playerCooldownsEnabled, playerStatus.isOnCourt, elapsedSeconds]);

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
    dispatch(Action.movePlayer(player.id, zone, 'rest'));
  }, [player.id, zone, dispatch]);

  const handleDeletePlayer = useCallback(() => {
    dispatch(Action.removePlayer(player.id));
    closePopover();
  }, [player.id, dispatch, closePopover]);

  const handleHistoryOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setHistoryAnchorEl(e.currentTarget);
  }, []);

  const handleHistoryClose = useCallback(() => {
    setHistoryAnchorEl(null);
  }, []);

  // Enhanced drag start with global state
  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Prevent dragging from player list if on cooldown (for advance queueing)
    if (isOnCooldown && zone === "all") {
      e.preventDefault();
      console.log('🚫 Drag prevented: Player on cooldown');
      return;
    }
    
    // Set global drag data
    currentDragData = { playerId: player.id, playerZone: zone };
    
    // Keep original data transfer for zone drops
    e.dataTransfer.setData('player/id', player.id.toString());
    e.dataTransfer.setData('player/source', zone);
    e.dataTransfer.setData('player/json', JSON.stringify(player));
    e.dataTransfer.setData('player/isSwapOperation', 'false');
    
    setIsDragging(true);
    console.log('🚀 Drag started:', currentDragData);
  }, [player, zone, isOnCooldown]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    currentDragData = null; // Clear global drag data
    console.log('🏁 Drag ended');
  }, []);

  // Fixed drag over using global variables
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Use global drag data instead of dataTransfer
    if (!currentDragData) {
      console.log('❌ No current drag data');
      return;
    }
    
    const { playerId: draggedPlayerId, playerZone: draggedPlayerZone } = currentDragData;
    
    // Only allow swap if conditions are met
    if (
      draggedPlayerId !== player.id && 
      draggedPlayerZone === zone &&
      (zone.startsWith('court-') || zone.startsWith('queue-'))
    ) {
      console.log('✅ Setting drop target');
      setIsDropTarget(true);
    } else {
      console.log('❌ Conditions not met, clearing drop target');
      setIsDropTarget(false);
    }
  }, [player.id, zone]);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only remove drop target state if we're actually leaving this element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      console.log('🚪 Drag leave');
      setIsDropTarget(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📦 Drop detected on player:', player.name);
    setIsDropTarget(false);
    
    if (!currentDragData) {
      console.log('❌ No drag data on drop');
      return;
    }
    
    const { playerId: draggedPlayerId, playerZone: draggedPlayerZone } = currentDragData;
    
    // Perform swap if conditions are met
    if (
      draggedPlayerId !== player.id && 
      draggedPlayerZone === zone &&
      (zone.startsWith('court-') || zone.startsWith('queue-'))
    ) {
      console.log('🔄 Dispatching swap action');
      
      try {
        setIsSwapping(true);
        dispatch(Action.swapPlayers(draggedPlayerId, player.id, zone));
         // Reset animation after delay
        setTimeout(() => {
          setIsSwapping(false);
        }, 600); // Animation duration
        console.log('✅ Swap action dispatched successfully');
      } catch (error) {
        console.error('❌ Error dispatching swap action:', error);
      }
    } else {
      console.log('❌ Drop conditions not met - no swap will occur');
    }
  }, [player.id, player.name, zone, dispatch]);

  // 🔧 COMPLETELY REWRITTEN mobile touch handling - Much simpler and more reliable
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice) return;

    // Prevent touch dragging from player list if on cooldown
    if (isOnCooldown && zone === "all") {
      console.log('🚫 Touch drag prevented: Player on cooldown');
      return;
    }

    const touch = e.touches[0];
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Store initial touch data
    touchStartTimeRef.current = Date.now();
    initialTouchRef.current = { x: touch.clientX, y: touch.clientY };
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });

    // Set global drag data immediately
    draggedElement = cardRef.current;
    draggedData = { player, zone };
    currentDragData = { playerId: player.id, playerZone: zone };

    console.log('📱 Touch start - player:', player.name, 'zone:', zone);

    // Very short delay for drag start (150ms)
    dragTimeoutRef.current = setTimeout(() => {
      console.log('🚀 Starting mobile drag');
      setIsDragging(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Prevent scrolling during drag
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
    }, 150);

  }, [isTouchDevice, player, zone, isOnCooldown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice || !initialTouchRef.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - initialTouchRef.current.x);
    const deltaY = Math.abs(touch.clientY - initialTouchRef.current.y);
    const deltaTime = Date.now() - touchStartTimeRef.current;

    // If moving enough, consider it a drag
    if ((deltaX > 10 || deltaY > 10) && deltaTime > 100) {
      // Clear timeout and start drag immediately
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }

      if (!isDragging) {
        console.log('🚀 Touch move threshold exceeded - starting drag');
        setIsDragging(true);
        
        // Prevent scrolling
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      }

      // Prevent default scrolling
      e.preventDefault();
    }
  }, [isTouchDevice, isDragging]);

  // 🔧 COMPLETELY REWRITTEN touch end - Much more reliable drop detection
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice) return;

    // Clear timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // Restore scrolling
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    // Only process if we were actually dragging
    if (!isDragging || !draggedData) {
      console.log('📱 Touch end - not dragging, ignoring');
      setIsDragging(false);
      initialTouchRef.current = null;
      draggedElement = null;
      draggedData = null;
      currentDragData = null;
      return;
    }

    const touch = e.changedTouches[0];
    console.log('📱 Touch end at:', touch.clientX, touch.clientY);

    // 🔧 SIMPLIFIED element detection - try multiple approaches
    let targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Look for player card first (for swaps)
    const playerCard = targetElement?.closest('[data-player-id]');
    if (playerCard) {
      const targetPlayerId = playerCard.getAttribute('data-player-id');
      const targetZone = playerCard.getAttribute('data-zone');
      
      if (
        targetPlayerId && 
        targetZone === zone && 
        targetPlayerId !== player.id &&
        (zone.startsWith('court-') || zone.startsWith('queue-'))
      ) {
        console.log('✅ Mobile swap detected');
        setIsSwapping(true);
        setTimeout(() => setIsSwapping(false), 600);
        dispatch(Action.swapPlayers(player.id, targetPlayerId, zone));
        
        // Success haptic
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 100, 50]);
        }
      }
    } else {
      // Look for droppable zone
      let droppableZone = targetElement?.closest('[data-droppable-zone]');
      
      // If not found, search more aggressively
      if (!droppableZone) {
        let searchElement = targetElement?.parentElement;
        let attempts = 0;
        while (searchElement && attempts < 3) {
          droppableZone = searchElement.closest('[data-droppable-zone]');
          if (droppableZone) break;
          searchElement = searchElement.parentElement;
          attempts++;
        }
      }

      if (droppableZone) {
        const targetZone = droppableZone.getAttribute('data-droppable-zone');
        const targetPosition = droppableZone.getAttribute('data-position');
        
        console.log('📱 Found drop zone:', targetZone, 'position:', targetPosition);
        
        if (targetZone) {
          if (targetPosition !== null && targetPosition !== 'null') {
            // Position-specific drop
            const positionNum = parseInt(targetPosition);
            console.log('✅ Mobile position drop:', player.name, 'to', targetZone, 'position', positionNum);
            dispatch(Action.movePlayerToPosition(player.id, zone, targetZone, positionNum));
          } else if (targetZone !== zone) {
            // Regular zone drop
            console.log('✅ Mobile zone drop:', player.name, 'to', targetZone);
            dispatch(Action.quickMovePlayer(player.id, zone, targetZone));
          }
          
          // Success haptic
          if ('vibrate' in navigator) {
            navigator.vibrate(100);
          }
        }
      } else {
        console.log('❌ No valid drop target found');
        // Error haptic
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    }

    // Reset all drag states
    setIsDragging(false);
    initialTouchRef.current = null;
    draggedElement = null;
    draggedData = null;
    currentDragData = null;
    
  }, [isTouchDevice, isDragging, player.id, zone, dispatch]);

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
    }, 300);

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
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  // Memoized formatted time
  const formattedTime = useMemo(() => formatElapsedTime(elapsedSeconds), [elapsedSeconds]);

  // Enhanced card styles with mobile optimizations
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
      // 🔧 SIMPLIFIED touch optimizations
      touchAction: 'none', // Prevent all default touch behaviors
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none',
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
        draggable={!(isOnCooldown && zone === "all")}
        data-player-id={player.id}
        data-zone={zone}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
              backgroundColor: 'rgba(255, 255, 255, 0.2)', // Subtle background
              borderRadius: '8px',
              padding: '1px 4px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              gap: 0.75, // Add consistent spacing between games and timer
            }}>
              {/* Games played indicator */}
              <Typography 
                variant="body2" 
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: isInTeamZone 
                    ? (isMobile ? '0.65rem' : '0.6rem')   // Increased from 0.54/0.5
                    : (isMobile ? '0.75rem' : '0.7rem'),  // Increased from 0.62/0.58
                  gap: 0.3,
                  fontWeight: 600, // Bolder
                  color: cardColors.textColor,
                  textShadow: '1px 1px 1px rgba(0,0,0,0.3)', // Better contrast
                }}
              >
                {player.gamesPlayed}
                <Box 
                  component="span" 
                  sx={{ 
                    fontSize: '1em', // Same size as number
                    filter: 'brightness(1.2)', // Make emoji more vibrant
                  }}
                >
                  🎮
                </Box>
              </Typography>

              {/* Timer */}
              <Typography 
                variant="body2" 
                sx={{
                  fontWeight: elapsedSeconds > 900 ? 700 : 600, // Match the boldness of games
                  color: elapsedSeconds > 900 ? '#8B0000' : cardColors.textColor,
                  fontSize: isInTeamZone 
                    ? (isMobile ? '0.65rem' : '0.6rem')   // SAME AS GAMES - was 0.54/0.5
                    : (isMobile ? '0.75rem' : '0.7rem'),  // SAME AS GAMES - was 0.62/0.58
                  minWidth: isInTeamZone ? '32px' : '36px', // Slightly wider for larger text
                  textAlign: 'left',
                  textShadow: '1px 1px 1px rgba(0,0,0,0.3)', // Same text shadow as games
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

            {/* Return button */}
            {!playerStatus.isUnassigned && (
              <IconButton
                size="small"
                onClick={handleReturnToRest}
                title="Return to Rest"
                sx={{
                  padding: isMobile ? '2px' : '1px',
                  color: '#6D4C41',
                  minHeight: isMobile ? '28px' : 'auto',
                  '&:hover': {
                    color: '#3E2723',
                  },
                }}
              >
                <KeyboardReturnIcon sx={{ 
                  fontSize: isMobile 
                    ? (isInTeamZone ? '0.7rem' : '0.8rem')
                    : (isInTeamZone ? '0.6rem' : '0.75rem')
                }} />
              </IconButton>
            )}

            {/* History button */}
            <IconButton
              size="small"
              onClick={handleHistoryOpen}
              title="View Match History"
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
              <HistoryIcon />
            </IconButton>

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
              minWidth: isMobile ? 320 : 280,
              p: 2,
              borderRadius: isMobile ? 2 : 1,
              boxShadow: isMobile 
                ? '0 8px 24px rgba(0,0,0,0.15)' 
                : theme.shadows[8],
            },
          },
        }}
      >
        <Typography variant="subtitle2" gutterBottom sx={{
          fontSize: isMobile ? '0.9rem' : '0.8rem',
        }}>
          {player.name}&apos;s Match History
        </Typography>

        {player.matchHistory?.length ? (
          player.matchHistory.map((entry, i) => {
            const timestamp = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <Typography
                key={i}
                variant="body2"
                fontSize={isMobile ? '0.8rem' : '0.75rem'}
                sx={{ mb: 0.5 }}
              >
                <strong>Played with:</strong> {entry.opponents.join(', ')} at {timestamp}
              </Typography>
            );
          })
        ) : (
          <Typography 
            variant="body2" 
            fontSize={isMobile ? '0.8rem' : '0.75rem'}
          >
            No match history
          </Typography>
        )}
      </Popover>

      {/* Settings Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: isMobile ? 160 : 140,
              p: isMobile ? 1.5 : 1,
              borderRadius: isMobile ? 2 : 1,
              boxShadow: isMobile 
                ? '0 8px 24px rgba(0,0,0,0.15)' 
                : theme.shadows[8],
            },
          },
        }}
      >
        <Box 
          display="flex" 
          flexDirection="column" 
          gap={isMobile ? 1.5 : 1.2}
          sx={{ fontSize: isMobile ? '0.7rem' : '0.65rem' }}
        >
          <TextField
            label="Games"
            value={gamesPlayed}
            onChange={handleGamesChange}
            onBlur={handleGamesBlur}
            size="small"
            slotProps={{
              input: {
                style: {
                  fontSize: isMobile ? '0.7rem' : '0.65rem',
                  padding: isMobile ? '2px 6px' : '0 4px',
                },
              },
              inputLabel: {
                sx: { fontSize: isMobile ? '0.7rem' : '0.65rem' }
              }
            }}
          />

          {!isInTeamZone && (
            <>
              <Button
                variant="text"
                size="small"
                onClick={handleHistoryOpen}
                sx={{ 
                  fontSize: isMobile ? '0.7rem' : '0.65rem', 
                  padding: isMobile ? '4px 6px' : '2px 4px',
                  minHeight: isMobile ? '36px' : 'auto',
                }}
              >
                View History
              </Button>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: isMobile ? '0.7rem' : '0.65rem' }}>Court</InputLabel>
                <Select
                  label="Court"
                  value=""
                  onChange={(e) => {
                    const to = e.target.value;
                    dispatch(Action.movePlayer(player.id, zone, to));
                    closePopover();
                  }}
                  size='small'
                  sx={{ 
                    fontSize: isMobile ? '0.7rem' : '0.65rem',
                    minHeight: isMobile ? '36px' : 'auto',
                  }}
                >
                  {Array.from({ length: courtCount }, (_, i) => {
                    const courtKey = `court-${i}`;
                    const courtPlayers = state.courts.playersByCourt[courtKey] || [];
                    const isCourtFull = courtPlayers.length >= 4;

                    return (
                      <MenuItem
                        key={courtKey}
                        value={courtKey}
                        sx={{ 
                          fontSize: isMobile ? '0.7rem' : '0.65rem',
                          minHeight: isMobile ? '36px' : 'auto',
                        }}
                        disabled={isCourtFull}
                      >
                        Court {i + 1}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: isMobile ? '0.7rem' : '0.65rem' }}>Queue</InputLabel>
                <Select
                  label="Queue"
                  value=""
                  onChange={(e) => {
                    const to = e.target.value;
                    dispatch(Action.movePlayer(player.id, zone, to));
                    closePopover();
                  }}
                  size="small"
                  sx={{ 
                    fontSize: isMobile ? '0.7rem' : '0.65rem',
                    minHeight: isMobile ? '36px' : 'auto',
                  }}
                >
                  {Object.keys(state.queue.playersByQueue).map((queueId, index) => (
                    <MenuItem 
                      key={queueId} 
                      value={queueId} 
                      sx={{ 
                        fontSize: isMobile ? '0.7rem' : '0.65rem',
                        minHeight: isMobile ? '36px' : 'auto',
                      }}
                    >
                      Queue {index + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleDeletePlayer}
            startIcon={<DeleteIcon sx={{ fontSize: isMobile ? '0.8rem' : '0.75rem' }} />}
            sx={{ 
              fontSize: isMobile ? '0.7rem' : '0.65rem', 
              padding: isMobile ? '6px 8px' : '4px 6px',
              minHeight: isMobile ? '36px' : 'auto',
            }}
          >
            Delete Player
          </Button>
        </Box>
      </Popover>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;