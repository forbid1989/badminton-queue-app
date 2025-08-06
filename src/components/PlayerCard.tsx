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
  
  // 🔧 Mobile device detection
  const isMobileDevice = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  }, []);

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

  // 🔧 Mobile-optimized drag clone creation
  const createMobileDragClone = useCallback((touch: React.Touch, offset: { x: number, y: number }, rect: DOMRect) => {
    if (!cardRef.current) return;
    
    // Remove any existing clone
    const existingClone = document.getElementById('dragging-clone');
    if (existingClone) {
      existingClone.remove();
    }
    
    const clone = cardRef.current.cloneNode(true) as HTMLElement;
    clone.id = 'dragging-clone';
    
    // Mobile-optimized styling
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '10000';
    clone.style.opacity = '0.9';
    clone.style.transition = 'none';
    clone.style.willChange = 'transform';
    clone.style.backfaceVisibility = 'hidden';
    clone.style.transform = 'translate3d(0, 0, 0)';
    
    // Mobile-specific: Account for viewport scaling and larger visual feedback
    const viewportScale = window.visualViewport ? window.visualViewport.scale : 1;
    const x = touch.clientX - offset.x * viewportScale;
    const y = touch.clientY - offset.y * viewportScale;
    
    clone.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(2deg) scale(1.15)`;
    clone.style.boxShadow = '0 20px 40px rgba(0,0,0,0.5)';
    clone.style.border = '3px solid #E91E63';
    clone.style.borderRadius = isInTeamZone ? '12px' : '20px';
    
    // Mobile: Enhanced visual feedback
    clone.style.filter = 'brightness(1.2) contrast(1.1)';
    
    document.body.appendChild(clone);
    console.log('✅ Mobile drag clone created at:', { x, y, scale: viewportScale });
  }, [isInTeamZone]);

  // 🔧 Enhanced mobile touch start with proper drag detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = cardRef.current?.getBoundingClientRect();
    
    if (!rect) return;

    console.log('🎯 Touch start - analyzing gesture');
    
    // Store initial touch for drag detection
    const initialTouch = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Calculate offset with mobile viewport considerations
    const viewportScale = window.visualViewport ? window.visualViewport.scale : 1;
    const currentOffset = {
      x: (touch.clientX - rect.left) / viewportScale,
      y: (touch.clientY - rect.top) / viewportScale
    };
    
    setDragOffset(currentOffset);
    
    // Set drag data but don't start drag immediately
    draggedElement = cardRef.current;
    draggedData = { player, zone };
    
    // Mobile-specific: Add delay to distinguish between tap and drag
    const touchStartTimer = setTimeout(() => {
      if (!dragStarted) {
        console.log('🚀 Starting mobile drag after delay');
        
        // Only prevent default after confirming drag intent
        e.preventDefault();
        setIsDragging(true);
        setDragStarted(true);
        
        // Add haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        createMobileDragClone(touch, currentOffset, rect);
      }
    }, isMobileDevice ? 150 : 0); // 150ms delay on mobile, immediate on desktop

    // Store references for cleanup
    (cardRef.current as any)._touchStartTimer = touchStartTimer;
    (cardRef.current as any)._initialTouch = initialTouch;
    
  }, [player, zone, dragStarted, isMobileDevice, createMobileDragClone]);

  // 🔧 Enhanced mobile touch move with drag threshold detection
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const initialTouch = (cardRef.current as any)?._initialTouch;
    
    if (!initialTouch || !dragStarted) {
      // Check if touch moved enough to be considered a drag
      if (initialTouch) {
        const deltaX = Math.abs(touch.clientX - initialTouch.x);
        const deltaY = Math.abs(touch.clientY - initialTouch.y);
        const deltaTime = Date.now() - initialTouch.time;
        
        // Mobile drag threshold (larger for touch)
        const MOBILE_DRAG_THRESHOLD = isMobileDevice ? 15 : 5;
        
        if ((deltaX > MOBILE_DRAG_THRESHOLD || deltaY > MOBILE_DRAG_THRESHOLD) && deltaTime > 100) {
          // Clear the delay timer and start drag immediately
          if ((cardRef.current as any)?._touchStartTimer) {
            clearTimeout((cardRef.current as any)._touchStartTimer);
          }
          
          e.preventDefault();
          setIsDragging(true);
          setDragStarted(true);
          
          // Add haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
          
          const rect = cardRef.current?.getBoundingClientRect();
          if (rect) {
            createMobileDragClone(touch, dragOffset, rect);
          }
        }
      }
      return;
    }
    
    // Prevent scrolling during drag
    e.preventDefault();
    
    const clone = document.getElementById('dragging-clone');
    if (clone) {
      // Mobile-optimized positioning with viewport scale
      const viewportScale = window.visualViewport ? window.visualViewport.scale : 1;
      const x = touch.clientX - dragOffset.x * viewportScale;
      const y = touch.clientY - dragOffset.y * viewportScale;
      
      clone.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(2deg) scale(1.15)`;
    }
  }, [isDragging, dragOffset, dragStarted, isMobileDevice, createMobileDragClone]);

  // 🔧 Enhanced mobile touch end with better drop detection
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear any pending timers
    if ((cardRef.current as any)?._touchStartTimer) {
      clearTimeout((cardRef.current as any)._touchStartTimer);
    }
    
    console.log('🏁 Touch end - dragStarted:', dragStarted, 'isDragging:', isDragging);
    
    // Clean up clone with mobile-friendly animation
    const clone = document.getElementById('dragging-clone');
    if (clone) {
      if (isMobileDevice) {
        // Mobile: Add fade-out animation
        clone.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        clone.style.opacity = '0';
        clone.style.transform = clone.style.transform + ' scale(0.8)';
        setTimeout(() => clone.remove(), 200);
      } else {
        clone.remove();
      }
    }
    
    // Only process drop if we actually started dragging
    if (!dragStarted || !isDragging) {
      setIsDragging(false);
      setDragStarted(false);
      draggedElement = null;
      draggedData = null;
      return;
    }
    
    const touch = e.changedTouches[0];
    
    // Mobile-specific: Account for viewport scaling and scroll position
    const viewportScale = window.visualViewport ? window.visualViewport.scale : 1;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    const adjustedX = (touch.clientX / viewportScale) + scrollX;
    const adjustedY = (touch.clientY / viewportScale) + scrollY;
    
    console.log('👆 Final touch coordinates (mobile-adjusted):', { 
      x: adjustedX, 
      y: adjustedY, 
      scale: viewportScale,
      scroll: { x: scrollX, y: scrollY }
    });
    
    // Enhanced element detection for mobile
    const elementBelow = document.elementFromPoint(adjustedX, adjustedY);
    console.log('🎯 Element below finger:', elementBelow);
    
    // Success haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 50, 30]); // Success pattern
    }
    
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
      // Check for droppable zone
      const droppableZone = elementBelow?.closest('[data-droppable-zone]');
      if (droppableZone && draggedData) {
        const targetZone = droppableZone.getAttribute('data-droppable-zone');
        const targetPosition = droppableZone.getAttribute('data-position');
        
        if (targetZone && targetZone !== zone) {
          console.log('✅ Performing zone move');
          
          // Check if it's a position-specific drop
          if (targetPosition !== null && targetPosition !== 'null') {
            dispatch(Action.movePlayerToPosition(player.id, targetZone, parseInt(targetPosition)));
          } else {
            dispatch(Action.quickMovePlayer(player.id, zone, targetZone));
          }
        }
      }
    }
    
    // Reset all states
    console.log('🔄 Resetting all drag states');
    setIsDragging(false);
    setDragStarted(false);
    draggedElement = null;
    draggedData = null;
  }, [isDragging, player.id, zone, dispatch, dragStarted, dragOffset, isMobileDevice]);

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
      // Clean up any pending touch timers
      if ((cardRef.current as any)?._touchStartTimer) {
        clearTimeout((cardRef.current as any)._touchStartTimer);
      }
    };
  }, []);

  // Memoized formatted time
  const formattedTime = useMemo(() => formatElapsedTime(elapsedSeconds), [elapsedSeconds]);

  // 🔧 Enhanced card styles with mobile optimizations
  const enhancedCardStyles = useMemo(() => ({
    display: 'flex',
    width: '100%',
    maxWidth: isInTeamZone 
      ? '100%'  // Fill available space in teams
      : isMobile 
        ? '90vw' 
        : '200px',
    minWidth: isMobileDevice 
      ? (isInTeamZone ? '140px' : '180px')  // Larger on mobile
      : (isInTeamZone ? '120px' : '160px'),
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobileDevice 
      ? (isInTeamZone ? '4px 6px' : '8px 10px')  // More padding on mobile
      : (isInTeamZone ? '2px 4px' : '6px 8px'),
    backgroundColor: isDropTarget 
      ? '#E8F5E9'
      : cardColors.backgroundColor,
    borderRadius: isInTeamZone ? '12px' : '20px',
    boxShadow: isDropTarget 
    ? '0 4px 12px rgba(233, 30, 99, 0.3)'
    : isSwapping
      ? '0 0 20px rgba(233, 30, 99, 0.8)'
      : '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'grab',
    margin: '0 auto 2px',
    color: cardColors.textColor,
    border: isSwapping
    ? '3px solid #E91E63'
    : isDropTarget 
      ? '2px solid #E91E63'
      : '1px solid rgba(0, 0, 0, 0.06)',
    opacity: isDragging ? 0.5 : 1,
    transform: isDropTarget 
      ? (isMobileDevice ? 'scale(1.12)' : 'scale(1.08)')  // More prominent on mobile
      : (isDragging ? 'scale(0.95)' : 'scale(1)'),
    transition: isSwapping 
      ? 'border-color 0.15s ease-in-out, border-width 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
      : 'all 0.2s ease-in-out',
    animation: isSwapping 
      ? 'swapFlash 0.6s ease-in-out'
      : 'none',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    '&:active': {
      cursor: 'grabbing',
      transform: isMobileDevice ? 'scale(0.98)' : 'scale(0.95)',
      backgroundColor: isMobileDevice 
        ? 'rgba(233, 30, 99, 0.1)' 
        : cardColors.backgroundColor,
    },
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
    // Enhanced mobile touch targets
    minHeight: isMobileDevice 
      ? (isInTeamZone ? '40px' : '50px') 
      : (isInTeamZone ? '35px' : '45px'),
  }), [isInTeamZone, isMobile, isMobileDevice, cardColors, isDragging, isDropTarget, isSwapping]);

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
                      fontSize: isMobileDevice 
                        ? (isInTeamZone ? '0.6rem' : '0.7rem')  // Larger on mobile
                        : (isInTeamZone ? '0.55rem' : '0.65rem'),
                      fontWeight: 'bold',
                      padding: 0,
                    },
                  },
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    lineHeight: 1,
                    height: isMobileDevice ? '1.2rem' : '1rem',
                  },
                }}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 'bold',
                  fontSize: isMobileDevice 
                    ? (isInTeamZone ? '0.6rem' : '0.7rem')  // Larger on mobile
                    : (isInTeamZone ? '0.55rem' : '0.65rem'),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: isMobileDevice 
                    ? (isInTeamZone ? '70px' : '90px')  // More space on mobile
                    : (isInTeamZone ? '60px' : '80px'),
                  cursor: 'pointer',
                  // Mobile: Add text shadow for better visibility
                  textShadow: isMobileDevice ? '1px 1px 2px rgba(0,0,0,0.1)' : 'none',
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
              gap: isMobileDevice 
                ? (isInTeamZone ? 0.25 : 0.4)  // More spacing on mobile
                : (isInTeamZone ? 0.15 : 0.25),
              flexShrink: 0,
            }}
          >
            {/* Games played indicator */}
            <Typography 
              variant="body2" 
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: isMobileDevice 
                  ? (isInTeamZone ? '0.55rem' : '0.65rem')  // Larger on mobile
                  : (isInTeamZone ? '0.5rem' : '0.6rem'),
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
                fontSize: isMobileDevice 
                  ? (isInTeamZone ? '0.55rem' : '0.65rem')  // Larger on mobile
                  : (isInTeamZone ? '0.5rem' : '0.6rem'),
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
                  padding: isMobileDevice ? '2px' : '1px',  // Larger touch target on mobile
                  borderRadius: '8px',
                  border: `1px solid ${isQuickAddDisabled ? '#ccc' : '#2E7D32'}`,
                  backgroundColor: isQuickAddDisabled ? '#f2f2f2' : '#E8F5E9',
                  color: isQuickAddDisabled ? '#aaa' : '#2E7D32',
                  minWidth: 'auto',
                  minHeight: isMobileDevice ? '28px' : 'auto',  // Larger touch target
                  '&:hover': {
                    backgroundColor: isQuickAddDisabled ? '#f2f2f2' : '#C8E6C9',
                  },
                }}
              >
                <BadmintonIcon
                  size={isMobileDevice ? 12 : 10}  // Larger on mobile
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
                  padding: isMobileDevice ? '2px' : '1px',
                  color: '#6D4C41',
                  minHeight: isMobileDevice ? '28px' : 'auto',  // Larger touch target
                  '&:hover': {
                    color: '#3E2723',
                  },
                }}
              >
                <KeyboardReturnIcon sx={{ 
                  fontSize: isMobileDevice 
                    ? (isInTeamZone ? '0.7rem' : '0.8rem')  // Larger on mobile
                    : (isInTeamZone ? '0.6rem' : '0.75rem')
                }} />
              </IconButton>
            )}

            {/* History button - essential for tracking matches */}
            <IconButton
              size="small"
              onClick={handleHistoryOpen}
              title="View Match History"
              sx={{ 
                padding: isMobileDevice ? '2px' : '1px',
                minHeight: isMobileDevice ? '28px' : 'auto',  // Larger touch target
                '& .MuiSvgIcon-root': {
                  fontSize: isMobileDevice 
                    ? (isInTeamZone ? '0.7rem' : '0.8rem')  // Larger on mobile
                    : (isInTeamZone ? '0.6rem' : '0.75rem'),
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
                padding: isMobileDevice ? '2px' : '1px',
                minHeight: isMobileDevice ? '28px' : 'auto',  // Larger touch target
                '& .MuiSvgIcon-root': {
                  fontSize: isMobileDevice 
                    ? (isInTeamZone ? '0.7rem' : '0.8rem')  // Larger on mobile
                    : (isInTeamZone ? '0.6rem' : '0.75rem'),
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
              minWidth: isMobileDevice ? 320 : 280,  // Wider on mobile
              p: 2,
              // Mobile: Add border radius and shadow
              borderRadius: isMobileDevice ? 2 : 1,
              boxShadow: isMobileDevice 
                ? '0 8px 24px rgba(0,0,0,0.15)' 
                : theme.shadows[8],
            },
          },
        }}
      >
        <Typography variant="subtitle2" gutterBottom sx={{
          fontSize: isMobileDevice ? '0.9rem' : '0.8rem',  // Larger on mobile
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
                fontSize={isMobileDevice ? '0.8rem' : '0.75rem'}  // Larger on mobile
                sx={{ mb: 0.5 }}
              >
                <strong>Played with:</strong> {entry.opponents.join(', ')} at {timestamp}
              </Typography>
            );
          })
        ) : (
          <Typography 
            variant="body2" 
            fontSize={isMobileDevice ? '0.8rem' : '0.75rem'}  // Larger on mobile
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
              minWidth: isMobileDevice ? 160 : 140,  // Wider on mobile
              p: isMobileDevice ? 1.5 : 1,  // More padding on mobile
              borderRadius: isMobileDevice ? 2 : 1,
              boxShadow: isMobileDevice 
                ? '0 8px 24px rgba(0,0,0,0.15)' 
                : theme.shadows[8],
            },
          },
        }}
      >
        <Box 
          display="flex" 
          flexDirection="column" 
          gap={isMobileDevice ? 1.5 : 1.2}  // More spacing on mobile
          sx={{ fontSize: isMobileDevice ? '0.7rem' : '0.65rem' }}
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
                  fontSize: isMobileDevice ? '0.7rem' : '0.65rem',
                  padding: isMobileDevice ? '2px 6px' : '0 4px',  // More padding on mobile
                },
              },
              inputLabel: {
                sx: { fontSize: isMobileDevice ? '0.7rem' : '0.65rem' }
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
                  fontSize: isMobileDevice ? '0.7rem' : '0.65rem', 
                  padding: isMobileDevice ? '4px 6px' : '2px 4px',  // Larger touch target on mobile
                  minHeight: isMobileDevice ? '36px' : 'auto',
                }}
              >
                View History
              </Button>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: isMobileDevice ? '0.7rem' : '0.65rem' }}>Court</InputLabel>
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
                    fontSize: isMobileDevice ? '0.7rem' : '0.65rem',
                    minHeight: isMobileDevice ? '36px' : 'auto',  // Larger touch target
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
                          fontSize: isMobileDevice ? '0.7rem' : '0.65rem',
                          minHeight: isMobileDevice ? '36px' : 'auto',  // Larger touch target
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
                <InputLabel sx={{ fontSize: isMobileDevice ? '0.7rem' : '0.65rem' }}>Queue</InputLabel>
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
                    fontSize: isMobileDevice ? '0.7rem' : '0.65rem',
                    minHeight: isMobileDevice ? '36px' : 'auto',  // Larger touch target
                  }}
                >
                  {Object.keys(state.queue.playersByQueue).map((queueId, index) => (
                    <MenuItem 
                      key={queueId} 
                      value={queueId} 
                      sx={{ 
                        fontSize: isMobileDevice ? '0.7rem' : '0.65rem',
                        minHeight: isMobileDevice ? '36px' : 'auto',  // Larger touch target
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
            startIcon={<DeleteIcon sx={{ fontSize: isMobileDevice ? '0.8rem' : '0.75rem' }} />}
            sx={{ 
              fontSize: isMobileDevice ? '0.7rem' : '0.65rem', 
              padding: isMobileDevice ? '6px 8px' : '4px 6px',  // Larger touch target on mobile
              minHeight: isMobileDevice ? '36px' : 'auto',
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