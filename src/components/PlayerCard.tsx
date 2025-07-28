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

// Global variable to store the dragged element
let draggedElement: HTMLElement | null = null;
let draggedData: { player: Player; zone: string } | null = null;

const PlayerCard: React.FC<PlayerCardProps> = React.memo(({ player, zone }) => {
  const theme = useTheme();
  const { state, dispatch } = useContext(AppContext);
  
  // Memoize frequently used values
  const courtCount = useMemo(() => state.courts.count, [state.courts.count]);
  const queueCount = useMemo(() => state.queue.count, [state.queue.count]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
  const [isDropTarget, setIsDropTarget] = useState(false); // For visual feedback when being a drop target
  const [isSwapping, setIsSwapping] = useState(false);
  const [dragStarted, setDragStarted] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nameUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Memoized color calculations
  const cardColors = useMemo(() => {
    const getBackgroundColor = () => {
      const { isConflict, isCourtAndQueue, isIdleTooLong, isOnCourt, isInQueue, isUnassigned } = playerStatus;
      
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
  }, [playerStatus, zone]);

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

  const isQuickAddDisabled = !availableZone;
  const showQuickAddIcon = useMemo(() => {
    const { isUnassigned, isOnCourt, isInQueue } = playerStatus;
    return (isUnassigned && !isOnCourt) || (zone === "all" && isOnCourt && !isInQueue);
  }, [playerStatus, zone]);

  // Optimized event handlers with useCallback
  const handleQuickAdd = useCallback(() => {
    if (availableZone) {
      const sourceZone = zone === "all" ? "all" : "rest";
      dispatch(Action.movePlayer(player.id, sourceZone, availableZone));
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
    // Set global drag data
    currentDragData = { playerId: player.id, playerZone: zone };
    
    // Keep original data transfer for zone drops
    e.dataTransfer.setData('player/id', player.id.toString());
    e.dataTransfer.setData('player/source', zone);
    e.dataTransfer.setData('player/json', JSON.stringify(player));
    e.dataTransfer.setData('player/isSwapOperation', 'false');
    
    setIsDragging(true);
    console.log('🚀 Drag started:', currentDragData);
  }, [player, zone]);

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
    
    console.log('🔍 Drag over check:', {
      draggedPlayerId,
      draggedPlayerZone,
      currentPlayerId: player.id,
      currentZone: zone,
      isDifferentPlayer: draggedPlayerId !== player.id,
      isSameZone: draggedPlayerZone === zone,
      isValidZone: zone.startsWith('court-') || zone.startsWith('queue-')
    });
    
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
    
    console.log('🔍 Drop validation:', {
      draggedPlayerId,
      draggedPlayerZone,
      targetPlayerId: player.id,
      targetPlayerName: player.name,
      targetZone: zone,
      condition1_DifferentPlayer: draggedPlayerId !== player.id,
      condition2_SameZone: draggedPlayerZone === zone,
      condition3_ValidZone: zone.startsWith('court-') || zone.startsWith('queue-'),
      allConditionsMet: (
        draggedPlayerId !== player.id && 
        draggedPlayerZone === zone &&
        (zone.startsWith('court-') || zone.startsWith('queue-'))
      )
    });
    
    // Perform swap if conditions are met
    if (
      draggedPlayerId !== player.id && 
      draggedPlayerZone === zone &&
      (zone.startsWith('court-') || zone.startsWith('queue-'))
    ) {
      console.log('🔄 Dispatching swap action:', {
        from: draggedPlayerId,
        to: player.id,
        zone: zone,
        actionType: 'SWAP_PLAYERS'
      });
      
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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent any default touch behavior
    
    const touch = e.touches[0];
    const rect = cardRef.current?.getBoundingClientRect();
    
    console.log('🎯 Touch start - IMMEDIATE DRAG:', { x: touch.clientX, y: touch.clientY });
    
    // Calculate offset immediately
    const currentOffset = rect ? {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    } : { x: 0, y: 0 };
    
    setDragOffset(currentOffset);
    setIsDragging(true);
    setDragStarted(true);
    
    // Set global drag data
    draggedElement = cardRef.current;
    draggedData = { player, zone };
    
    // Create visual clone IMMEDIATELY (dnd-kit style)
    if (cardRef.current) {
      console.log('📋 Creating immediate drag clone (dnd-kit style)');
      
      // Remove any existing clone first
      const existingClone = document.getElementById('dragging-clone');
      if (existingClone) {
        existingClone.remove();
      }
      
      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      clone.id = 'dragging-clone';
      
      // dnd-kit style: High-performance overlay styling
      clone.style.position = 'fixed';
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = '10000';
      clone.style.opacity = '0.9';
      clone.style.transition = 'none';
      clone.style.willChange = 'transform';
      clone.style.backfaceVisibility = 'hidden';
      clone.style.transform = 'translate3d(0, 0, 0)'; // Force GPU layer
      
      // Position it at current touch location
      const x = touch.clientX - currentOffset.x;
      const y = touch.clientY - currentOffset.y;
      clone.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(2deg) scale(1.05)`;
      
      // Enhanced visual feedback (like dnd-kit DragOverlay)
      clone.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
      clone.style.border = '2px solid #E91E63';
      clone.style.borderRadius = '20px'; // Match your card styling
      
      document.body.appendChild(clone);
      console.log('✅ Immediate clone added to DOM at position:', { x, y });
    }
    
    console.log('📏 Drag offset calculated:', currentOffset);
  }, [player, zone]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !dragStarted) return;
    
    e.preventDefault(); // CRITICAL: Prevent scrolling
    
    const touch = e.touches[0];
    const clone = document.getElementById('dragging-clone');
    
    if (clone) {
      // dnd-kit style: Smooth GPU-accelerated movement
      const x = touch.clientX - dragOffset.x;
      const y = touch.clientY - dragOffset.y;
      clone.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(2deg) scale(1.05)`;
      // console.log('📍 Updating clone position:', { x, y }); // Comment out for performance
    } else {
      console.log('❌ Clone not found during move - should exist!');
    }
  }, [isDragging, dragOffset, dragStarted]);

  // Enhanced touch end handler with swap support
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    console.log('🏁 Touch end - dragStarted:', dragStarted, 'isDragging:', isDragging);
    
    // Clean up clone FIRST (dnd-kit style cleanup)
    const clone = document.getElementById('dragging-clone');
    if (clone) {
      console.log('🗑️ Removing drag clone');
      clone.remove();
    }
    
    // Only process drop if we actually started dragging
    if (!dragStarted || !isDragging) {
      console.log('❌ Not processing drop - resetting states');
      setIsDragging(false);
      setDragStarted(false);
      draggedElement = null;
      draggedData = null;
      return;
    }
    
    const touch = e.changedTouches[0];
    console.log('👆 Final touch coordinates:', { x: touch.clientX, y: touch.clientY });
    
    // Drop detection (similar to dnd-kit collision detection)
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    console.log('🎯 Element below finger:', elementBelow);
    
    // Check for player card first (swap operation)
    const playerCard = elementBelow?.closest('[data-player-id]');
    if (playerCard && draggedData) {
      const targetPlayerId = playerCard.getAttribute('data-player-id');
      const targetZone = playerCard.getAttribute('data-zone');
      
      if (
        targetPlayerId && 
        targetZone === zone && 
        targetPlayerId !== player.id &&
        (zone.startsWith('court-') || zone.startsWith('queue-'))
      ) {
        console.log('✅ Performing player swap');
        setIsSwapping(true);
        setTimeout(() => setIsSwapping(false), 600);
        dispatch(Action.swapPlayers(player.id, targetPlayerId, zone));
      }
    } else {
      // Check for droppable zone (dnd-kit style zone detection)
      const droppableZone = elementBelow?.closest('[data-droppable-zone]');
      if (droppableZone && draggedData) {
        const targetZone = droppableZone.getAttribute('data-droppable-zone');
        
        if (targetZone && targetZone !== zone) {
          console.log('✅ Performing zone move');
          dispatch(Action.movePlayer(player.id, zone, targetZone));
        }
      }
    }
    
    // Reset all states (dnd-kit style cleanup)
    console.log('🔄 Resetting all drag states');
    setIsDragging(false);
    setDragStarted(false);
    draggedElement = null;
    draggedData = null;
  }, [isDragging, player.id, zone, dispatch, dragStarted, dragOffset]);

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
    };
  }, []);

  // Memoized formatted time
  const formattedTime = useMemo(() => formatElapsedTime(elapsedSeconds), [elapsedSeconds]);

  // Enhanced card styles with drop target indication
  // Enhanced card styles with drop target indication and swap animation
  const enhancedCardStyles = useMemo(() => ({
    display: 'flex',
    width: '100%',
    maxWidth: isInTeamZone 
      ? '100%'  // Fill available space in teams
      : isMobile 
        ? '90vw' 
        : '200px',
    minWidth: isInTeamZone ? '120px' : '160px', // Ensure minimum readable size
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isInTeamZone 
      ? '2px 4px'  // Tighter padding for team zones
      : isMobile 
        ? '4px 6px' 
        : '6px 8px',
    backgroundColor: isDropTarget 
      ? '#E8F5E9'  // Light green when drop target
      : cardColors.backgroundColor,
    borderRadius: isInTeamZone ? '12px' : '20px',
    boxShadow: isDropTarget 
    ? '0 4px 12px rgba(233, 30, 99, 0.3)'  // Magenta shadow when drop target
    : isSwapping
      ? '0 0 20px rgba(233, 30, 99, 0.8)'  // Magenta glow when swapping
      : '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'grab',
    margin: '0 auto 2px',
    color: cardColors.textColor,
    border: isSwapping
    ? '3px solid #E91E63'  // Bright magenta border when swapping
    : isDropTarget 
      ? '2px solid #E91E63'  // Magenta border when drop target
      : '1px solid rgba(0, 0, 0, 0.06)',
    opacity: isDragging ? 0.5 : 1,
    transform: isDropTarget 
      ? 'scale(1.08)'  // Larger scale when drop target (more noticeable)
      : (isDragging ? 'scale(0.95)' : 'scale(1)'),
    transition: isSwapping 
      ? 'border-color 0.15s ease-in-out, border-width 0.15s ease-in-out, box-shadow 0.15s ease-in-out'  // Quick flash transition for swap
      : 'all 0.2s ease-in-out',  // Normal transition for other states
    animation: isSwapping 
      ? 'swapFlash 0.6s ease-in-out'  // Flash animation when swapping - references CSS keyframes
      : 'none',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    '&:active': {
      cursor: 'grabbing',
    },
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
  }), [isInTeamZone, isMobile, cardColors, isDragging, isDropTarget, isSwapping]);
  return (
    <div className="flipped">
      <Card
        ref={cardRef}
        sx={enhancedCardStyles}
        draggable
        // Add data attributes for touch swap detection
        data-player-id={player.id}
        data-zone={zone}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver} // Handle drag over for swap detection
        onDragLeave={handleDragLeave} // Handle drag leave
        onDrop={handleDrop} // Handle drop for swapping
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
          {/* Name Section */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            gap: 0.25,
            minWidth: 0,
            flex: 1,
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
                      fontSize: isInTeamZone ? '0.55rem' : '0.65rem',
                      fontWeight: 'bold',
                      padding: 0,
                    },
                  },
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    lineHeight: 1,
                    height: '1rem',
                  },
                }}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 'bold',
                  fontSize: isInTeamZone ? '0.55rem' : '0.65rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: isInTeamZone ? '60px' : '80px',
                  cursor: 'pointer',
                }}
                title={player.name}
                onClick={handleEditToggle}
              >
                {player.name}
              </Typography>
            )}
          </Box>

          {/* Stats and Actions Section */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: isInTeamZone ? 0.15 : 0.25,
              flexShrink: 0,
            }}
          >
            {/* Games played indicator */}
            <Typography 
              variant="body2" 
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: isInTeamZone ? '0.5rem' : '0.6rem',
                gap: 0.1,
              }}
            >
              {player.gamesPlayed}
              <Box component="span" sx={{ fontSize: '0.8em' }}>🎮</Box>
            </Typography>

            {/* Timer */}
            <Typography 
              variant="body2" 
              sx={{
                fontWeight: elapsedSeconds > 900 ? 'bold' : 'normal',
                color: elapsedSeconds > 900 ? '#8B0000' : cardColors.textColor,
                fontSize: isInTeamZone ? '0.5rem' : '0.6rem',
              }}
            >
              {formattedTime}
            </Typography>

            {/* Action buttons - only show essential ones in team zones */}
            {!isInTeamZone && showQuickAddIcon && (
              <IconButton
                size="small"
                onClick={handleQuickAdd}
                disabled={isQuickAddDisabled}
                title={
                  isQuickAddDisabled
                    ? "No available court or queue"
                    : "Quick Add"
                }
                sx={{
                  padding: '1px',
                  borderRadius: '8px',
                  border: `1px solid ${isQuickAddDisabled ? '#ccc' : '#2E7D32'}`,
                  backgroundColor: isQuickAddDisabled ? '#f2f2f2' : '#E8F5E9',
                  color: isQuickAddDisabled ? '#aaa' : '#2E7D32',
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: isQuickAddDisabled ? '#f2f2f2' : '#C8E6C9',
                  },
                }}
              >
                <BadmintonIcon
                  size={10}
                  playerSeed={player.name}
                  isDisabled={isQuickAddDisabled}
                />
              </IconButton>
            )}

            {/* Return button - essential for team zones */}
            {!playerStatus.isUnassigned && (
              <IconButton
                size="small"
                onClick={handleReturnToRest}
                title="Return to Rest"
                sx={{
                  padding: '1px',
                  color: '#6D4C41',
                  '&:hover': {
                    color: '#3E2723',
                  },
                }}
              >
                <KeyboardReturnIcon sx={{ fontSize: isInTeamZone ? '0.6rem' : '0.75rem' }} />
              </IconButton>
            )}

            {/* History button - essential for tracking matches */}
            <IconButton
              size="small"
              onClick={handleHistoryOpen}
              title="View Match History"
              sx={{ 
                padding: '1px',
                '& .MuiSvgIcon-root': {
                  fontSize: isInTeamZone ? '0.6rem' : '0.75rem',
                },
              }}
            >
              <HistoryIcon />
            </IconButton>

            {/* Menu button - always available but smaller in teams */}
            <IconButton 
              size="small" 
              onClick={openPopover} 
              sx={{ 
                padding: '1px',
                '& .MuiSvgIcon-root': {
                  fontSize: isInTeamZone ? '0.6rem' : '0.75rem',
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
      </Card>

      {/* Popovers - Match History available in all zones */}
      {/* Match History Popover */}
      <Popover
        open={Boolean(historyAnchorEl)}
        anchorEl={historyAnchorEl}
        onClose={handleHistoryClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 280,
              p: 2,
            },
          },
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
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
                fontSize="0.75rem"
                sx={{ mb: 0.5 }}
              >
                <strong>Played with:</strong> {entry.opponents.join(', ')} at {timestamp}
              </Typography>
            );
          })
        ) : (
          <Typography variant="body2" fontSize="0.75rem">
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
      >
        <Box 
          p={1} 
          display="flex" 
          flexDirection="column" 
          gap={1.2} 
          minWidth={140}
          sx={{ fontSize: '0.65rem' }}
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
                  fontSize: '0.65rem',
                  padding: '0 4px',
                },
              },
              inputLabel: {
                sx: { fontSize: '0.65rem' }
              }
            }}
          />

          {!isInTeamZone && (
            <>
              <Button
                variant="text"
                size="small"
                onClick={handleHistoryOpen}
                sx={{ fontSize: '0.65rem', padding: '2px 4px' }}
              >
                View History
              </Button>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '0.65rem' }}>Court</InputLabel>
                <Select
                  label="Court"
                  value=""
                  onChange={(e) => {
                    const to = e.target.value;
                    dispatch(Action.movePlayer(player.id, zone, to));
                    closePopover();
                  }}
                  size='small'
                  sx={{ fontSize: '0.65rem' }}
                >
                  {Array.from({ length: courtCount }, (_, i) => {
                    const courtKey = `court-${i}`;
                    const courtPlayers = state.courts.playersByCourt[courtKey] || [];
                    const isCourtFull = courtPlayers.length >= 4;

                    return (
                      <MenuItem
                        key={courtKey}
                        value={courtKey}
                        sx={{ fontSize: '0.65rem' }}
                        disabled={isCourtFull}
                      >
                        Court {i + 1}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '0.65rem' }}>Queue</InputLabel>
                <Select
                  label="Queue"
                  value=""
                  onChange={(e) => {
                    const to = e.target.value;
                    dispatch(Action.movePlayer(player.id, zone, to));
                    closePopover();
                  }}
                  size="small"
                  sx={{ fontSize: '0.65rem' }}
                >
                  {Object.keys(state.queue.playersByQueue).map((queueId, index) => (
                    <MenuItem key={queueId} value={queueId} sx={{ fontSize: '0.65rem' }}>
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
            startIcon={<DeleteIcon sx={{ fontSize: '0.75rem' }} />}
            sx={{ fontSize: '0.65rem', padding: '4px 6px' }}
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