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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BarChartIcon from '@mui/icons-material/BarChart';
import SportsIcon from '@mui/icons-material/Sports';
import QueueIcon from '@mui/icons-material/Queue';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Badge, Chip, Tooltip } from '@mui/material';
import { Player, getSkillLevelColor, SkillLevel, skillLevelOrder, getSkillLevelDescription, getMatchDescription, MatchHistoryEntry } from './types/Player';
import { AppContext, SnackbarContext  } from '../BadmintonQueueUI';
import { Action, } from '../lib/store/Action';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import CloseIcon from '@mui/icons-material/Close';
import { checkExcessivePartnership, checkExcessiveOpposition, formatMatchDuration, isToday  } from '../lib/utils/matchHistoryUtils';

// Pragmatic Drag and Drop imports
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const playerCooldownsEnabled = useMemo(() => state.settings.playerCooldowns, [state.settings.playerCooldowns]);
  
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
  const [submenuName, setSubmenuName] = useState(player.name);
  const [editNameAnchorEl, setEditNameAnchorEl] = useState<null | HTMLElement>(null);
  const [editNameValue, setEditNameValue] = useState(player.name);

  const [partnershipSnackbar, setPartnershipSnackbar] = useState(false);
  const [oppositionSnackbar, setOppositionSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { showPartnershipSnackbar, showOppositionSnackbar } = useContext(SnackbarContext);

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

  const hasExcessivePartnership = useMemo(() => {
    // Check if player is currently on a court or in a queue
    const isOnCourt = zone.startsWith('court-');
    const isInQueue = zone.startsWith('queue-');
    
    if (!isOnCourt && !isInQueue) {
      return false;
    }

    const currentZoneId = zone;
    let currentZonePlayers: Player[] = [];
    
    // Get players from the appropriate zone
    if (isOnCourt) {
      currentZonePlayers = state.courts.playersByCourt[currentZoneId] || [];
    } else if (isInQueue) {
      currentZonePlayers = state.queue.playersByQueue[currentZoneId] || [];
    }
    
    // Need at least 2 players to check partnerships
    if (currentZonePlayers.length < 2) {
      return false;
    }

    // Get current player's position
    const currentPlayerPosition = isOnCourt ? player.courtOrder : player.queueOrder;
    
    if (currentPlayerPosition === null || currentPlayerPosition === undefined) {
      return false;
    }

    // Find teammates: positions 0,2 are teammates OR positions 1,3 are teammates
    const teammates = currentZonePlayers.filter(p => {
      const playerPos = isOnCourt ? p.courtOrder : p.queueOrder;
      
      if (p.id === player.id || playerPos === null || playerPos === undefined) {
        return false;
      }
      
      // Check if they're teammates based on positions
      const areTeammates = 
        (currentPlayerPosition === 0 && playerPos === 2) || // Player at 0, teammate at 2
        (currentPlayerPosition === 2 && playerPos === 0) || // Player at 2, teammate at 0
        (currentPlayerPosition === 1 && playerPos === 3) || // Player at 1, teammate at 3
        (currentPlayerPosition === 3 && playerPos === 1);   // Player at 3, teammate at 1
      
      return areTeammates;
    });

    // Check if current player has excessive partnership with any teammate
    for (const teammate of teammates) {
      if (checkExcessivePartnership(player, teammate) || 
          checkExcessivePartnership(teammate, player)) {
        console.log(`⚠️  Excessive partnership detected: ${player.name} (pos:${currentPlayerPosition}) & ${teammate.name} are teammates in ${zone}`);
        return true;
      }
    }
    
    return false;
  }, [player, zone, state.courts.playersByCourt, state.queue.playersByQueue]);

  const partnershipDetails = useMemo(() => {
    const isOnCourt = zone.startsWith('court-');
    const isInQueue = zone.startsWith('queue-');
    
    if (!isOnCourt && !isInQueue) return null;

    const currentZoneId = zone;
    let currentZonePlayers: Player[] = [];
    
    // Get players from the appropriate zone
    if (isOnCourt) {
      currentZonePlayers = state.courts.playersByCourt[currentZoneId] || [];
    } else if (isInQueue) {
      currentZonePlayers = state.queue.playersByQueue[currentZoneId] || [];
    }
    
    const otherPlayersInZone = currentZonePlayers.filter(p => p.id !== player.id);
    
    const partnerships = otherPlayersInZone
      .map(otherPlayer => {
        const count1 = (player.matchHistory || []).filter(
          match => match.partner?.id === otherPlayer.id
        ).length;
        const count2 = (otherPlayer.matchHistory || []).filter(
          match => match.partner?.id === player.id
        ).length;
        const totalCount = Math.max(count1, count2); // Take the higher count
        
        return {
          partner: otherPlayer,
          count: totalCount
        };
      })
      .filter(p => p.count >= 2);

    return partnerships;
  }, [player, zone, state.courts.playersByCourt, state.queue.playersByQueue]);

  const hasExcessiveOpposition = useMemo(() => {
    const isOnCourt = zone.startsWith('court-');
    const isInQueue = zone.startsWith('queue-');
    
    if (!isOnCourt && !isInQueue) return false;

    const currentZoneId = zone;
    let currentZonePlayers: Player[] = [];
    
    if (isOnCourt) {
      currentZonePlayers = state.courts.playersByCourt[currentZoneId] || [];
    } else if (isInQueue) {
      currentZonePlayers = state.queue.playersByQueue[currentZoneId] || [];
    }
    
    if (currentZonePlayers.length < 2) return false;

    const currentPlayerPosition = isOnCourt ? player.courtOrder : player.queueOrder;
    
    if (currentPlayerPosition === null || currentPlayerPosition === undefined) {
      return false;
    }

    // Find players who are currently opponents (Team A vs Team B)
    const opponents = currentZonePlayers.filter(p => {
      const playerPos = isOnCourt ? p.courtOrder : p.queueOrder;
      
      if (p.id === player.id || playerPos === null || playerPos === undefined) {
        return false;
      }
      
      // Team A (positions 0,2) vs Team B (positions 1,3)
      const areCurrentOpponents = 
        ((currentPlayerPosition === 0 || currentPlayerPosition === 2) && (playerPos === 1 || playerPos === 3)) ||
        ((currentPlayerPosition === 1 || currentPlayerPosition === 3) && (playerPos === 0 || playerPos === 2));
      
      return areCurrentOpponents;
    });

    // Check if any current opponent has opposition history
    for (const opponent of opponents) {
      if (checkExcessiveOpposition(player, opponent) || 
          checkExcessiveOpposition(opponent, player)) {
        return true;
      }
    }
    
    return false;
  }, [player, zone, state.courts.playersByCourt, state.queue.playersByQueue]);

  const getCardClassName = () => {
    let className = `player-card ${isDragging ? "dragging" : ""}`;
    
    if (hasExcessivePartnership && hasExcessiveOpposition) {
      className += " purple-pulse"; // Both partnership and opposition
    } else if (hasExcessivePartnership) {
      className += " blue-pulse"; // Partnership only
    } else if (hasExcessiveOpposition) {
      className += " red-pulse"; // Opposition only
    }
    
    return className;
  };

  // Memoized color calculations
  const cardColors = useMemo(() => {
    const getBackgroundColor = () => {
      const { isConflict, isCourtAndQueue, isIdleTooLong, isOnCourt, isInQueue } = playerStatus;
      
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
        return "#f5f1eb";
      }

      if (isConflict) return "#F7C59F";
      if (isCourtAndQueue) return "#00b0bd";
      if (isOnCourt && !isInQueue) return "#B5CDA3";
      if (isInQueue && !isOnCourt) return "#E5D78A";
      if (isIdleTooLong) return "#F8D7DA";
      return "#f5f1eb";
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
    // Add this line to sync submenu name
    setSubmenuName(player.name);
  }, [player.name]); // Add player.name to dependencies

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

  // Handle pencil icon click for inline name editing
  const handlePencilClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card drag
    setEditNameAnchorEl(e.currentTarget as HTMLElement);
    setEditNameValue(player.name); // Sync with current name
  }, [player.name]);

  // Handle submenu name change
  const handleSubmenuNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSubmenuName(e.target.value);
  }, []);

  // Handle submenu name save
  const handleSubmenuNameSave = useCallback(() => {
    if (submenuName.trim() !== '' && submenuName !== player.name) {
      dispatch(Action.updatePlayerName(player.id, submenuName.trim()));
    }
  }, [submenuName, player.name, player.id, dispatch]);

  // Handle submenu name on blur
  const handleSubmenuNameBlur = useCallback(() => {
    handleSubmenuNameSave();
  }, [handleSubmenuNameSave]);

  // Handle submenu name on enter key
  const handleSubmenuNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmenuNameSave();
    }
  }, [handleSubmenuNameSave]);

  const handleEditNameClose = useCallback(() => {
    setEditNameAnchorEl(null);
  }, []);

  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditNameValue(e.target.value);
  }, []);

  const handleEditNameSave = useCallback(() => {
    if (editNameValue.trim() !== '' && editNameValue !== player.name) {
      dispatch(Action.updatePlayerName(player.id, editNameValue.trim()));
    }
    setEditNameAnchorEl(null);
  }, [editNameValue, player.name, player.id, dispatch]);

  const handleEditNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditNameSave();
    } else if (e.key === 'Escape') {
      setEditNameAnchorEl(null);
    }
  }, [handleEditNameSave]);

    // Smart context menu prevention for tablets/stylus
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    let dragStartTime = 0;
    let isDragOperation = false;

    // Only prevent context menu during actual drag operations
    const handleContextMenu = (e: MouseEvent) => {
      // Check if this is happening during a drag
      const timeSinceDragStart = Date.now() - dragStartTime;
      
      // If we're dragging or just started dragging (within 1 second)
      if (isDragging || isDragOperation || timeSinceDragStart < 1000) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Track when drag operations start
    const handlePointerDown = () => {
      dragStartTime = Date.now();
      isDragOperation = true;
      
      // Reset drag operation flag after a delay
      setTimeout(() => {
        isDragOperation = false;
      }, 1500);
    };

    // Add event listeners
    element.addEventListener('contextmenu', handleContextMenu);
    element.addEventListener('pointerdown', handlePointerDown);

    return () => {
      element.removeEventListener('contextmenu', handleContextMenu);
      element.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isDragging]);

  // Setup PDD draggable and drop target for swapping
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    // Prevent dragging if on cooldown from player list
    const canDrag = !(isOnCooldown && zone === "all");

    if (!canDrag) {
      return;
    }

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
          // Add dragging class for CSS targeting
          element.classList.add('dragging');
          console.log('🚀 PDD Drag started:', player.name, 'from', zone);
        },
        onDrop: () => {
          setIsDragging(false);
          // Remove dragging class
          element.classList.remove('dragging');
          console.log('🎯 PDD Drag ended');
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
      // element.removeEventListener('contextmenu', handleElementContextMenu, { capture: true });
    };
  }, [player, zone, dispatch, isOnCooldown, cardColors]);

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
    setSubmenuName(player.name); 
    setEditNameValue(player.name)
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

  useEffect(() => {
    // Handle multiple partnership snackbars
    if (hasExcessivePartnership && !partnershipSnackbar) {
      const isOnCourt = zone.startsWith('court-');
      const isInQueue = zone.startsWith('queue-');
      
      if (isOnCourt || isInQueue) {
        const currentZoneId = zone;
        let currentZonePlayers: Player[] = [];
        
        if (isOnCourt) {
          currentZonePlayers = state.courts.playersByCourt[currentZoneId] || [];
        } else if (isInQueue) {
          currentZonePlayers = state.queue.playersByQueue[currentZoneId] || [];
        }

        const currentPlayerPosition = isOnCourt ? player.courtOrder : player.queueOrder;
        
        if (currentPlayerPosition !== null) {
          // Find ALL teammates with excessive partnerships
          const teammatesWithHistory = currentZonePlayers.filter(p => {
            const playerPos = isOnCourt ? p.courtOrder : p.queueOrder;
            if (p.id === player.id || playerPos === null) return false;
            
            // Check if they're teammates
            const areTeammates = (
              (currentPlayerPosition === 0 && playerPos === 2) ||
              (currentPlayerPosition === 2 && playerPos === 0) ||
              (currentPlayerPosition === 1 && playerPos === 3) ||
              (currentPlayerPosition === 3 && playerPos === 1)
            );

            if (!areTeammates) return false;

            // Check if they have excessive partnership history
            const count1 = (player.matchHistory || []).filter(
              match => match.partner?.id === p.id
            ).length;
            const count2 = (p.matchHistory || []).filter(
              match => match.partner?.id === player.id
            ).length;
            const maxCount = Math.max(count1, count2);

            return maxCount >= 2;
          });

          // Show a snackbar for EACH teammate with excessive partnership
          teammatesWithHistory.forEach(teammate => {
            // Only show snackbar if this player's name comes first alphabetically (prevents duplicates)
            if (player.name.localeCompare(teammate.name) < 0) {
              const count1 = (player.matchHistory || []).filter(
                match => match.partner?.id === teammate.id
              ).length;
              const count2 = (teammate.matchHistory || []).filter(
                match => match.partner?.id === player.id
              ).length;
              const maxCount = Math.max(count1, count2);

              const zoneDisplay = zone.startsWith('court-') 
                ? `Court ${parseInt(zone.split('-')[1]) + 1}` 
                : `Queue ${parseInt(zone.split('-')[1]) + 1}`;

              showPartnershipSnackbar(
                `${player.name} & ${teammate.name} have partnered ${maxCount} times before (${zoneDisplay})`
              );
            }
          });

          if (teammatesWithHistory.length > 0) {
            setPartnershipSnackbar(true);
          }
        }
      }
    }

    // Handle multiple opposition snackbars
    if (hasExcessiveOpposition && !oppositionSnackbar) {
      const isOnCourt = zone.startsWith('court-');
      const isInQueue = zone.startsWith('queue-');
      
      if (isOnCourt || isInQueue) {
        const currentZoneId = zone;
        let currentZonePlayers: Player[] = [];
        
        if (isOnCourt) {
          currentZonePlayers = state.courts.playersByCourt[currentZoneId] || [];
        } else if (isInQueue) {
          currentZonePlayers = state.queue.playersByQueue[currentZoneId] || [];
        }

        const currentPlayerPosition = isOnCourt ? player.courtOrder : player.queueOrder;
        
        if (currentPlayerPosition !== null) {
          // Find ALL opponents with excessive opposition history
          const opponentsWithHistory = currentZonePlayers.filter(p => {
            const playerPos = isOnCourt ? p.courtOrder : p.queueOrder;
            if (p.id === player.id || playerPos === null) return false;
            
            // Check if they're opponents
            const areOpponents = (
              ((currentPlayerPosition === 0 || currentPlayerPosition === 2) && (playerPos === 1 || playerPos === 3)) ||
              ((currentPlayerPosition === 1 || currentPlayerPosition === 3) && (playerPos === 0 || playerPos === 2))
            );

            if (!areOpponents) return false;

            // Check if they have excessive opposition history
            const count1 = (player.matchHistory || []).filter(
              match => match.opponents.some(opp => opp.id === p.id)
            ).length;
            const count2 = (p.matchHistory || []).filter(
              match => match.opponents.some(opp => opp.id === player.id)
            ).length;
            const maxCount = Math.max(count1, count2);

            return maxCount >= 2;
          });

          // Show a snackbar for EACH opponent with excessive opposition
          // Only show if current player name is alphabetically first to prevent duplicates
          opponentsWithHistory.forEach(opponent => {
            // Only show snackbar if this player's name comes first alphabetically (prevents duplicates)
            if (player.name.localeCompare(opponent.name) < 0) {
              const count1 = (player.matchHistory || []).filter(
                match => match.opponents.some(opp => opp.id === opponent.id)
              ).length;
              const count2 = (opponent.matchHistory || []).filter(
                match => match.opponents.some(opp => opp.id === player.id)
              ).length;
              const maxCount = Math.max(count1, count2);

              const zoneDisplay = zone.startsWith('court-') 
                ? `Court ${parseInt(zone.split('-')[1]) + 1}` 
                : `Queue ${parseInt(zone.split('-')[1]) + 1}`;

              showOppositionSnackbar(
                `${player.name} vs ${opponent.name} have faced each other ${maxCount} times before (${zoneDisplay})`
              );
            }
          });

          if (opponentsWithHistory.length > 0) {
            setOppositionSnackbar(true);
          }
        }
      }
    }

    // Reset snackbars when conditions change
    if (!hasExcessivePartnership && partnershipSnackbar) {
      setPartnershipSnackbar(false);
    }
    if (!hasExcessiveOpposition && oppositionSnackbar) {
      setOppositionSnackbar(false);
    }

  }, [hasExcessivePartnership, hasExcessiveOpposition, player, zone, state.courts.playersByCourt, state.queue.playersByQueue, partnershipSnackbar, oppositionSnackbar, showOppositionSnackbar, showPartnershipSnackbar]);

  // Memoized formatted time
  const formattedTime = useMemo(() => formatElapsedTime(elapsedSeconds), [elapsedSeconds]);

  // Enhanced card styles with mobile optimizations and context menu prevention
  const enhancedCardStyles = useMemo(() => {
    const getCardDimensions = () => {
      return {
        width: isMobile ? '140px': '100%',
        height: isMobile ? '32px' : '30px',
        fontSize: isMobile ? '0.72rem' : '0.68rem',
        nameMaxWidth: isMobile ? '130px' : '120px',
      };
    };

    const dimensions = getCardDimensions();

    // Determine border color and animation based on detection results
    const getBorderAndAnimation = () => {
      if (hasExcessivePartnership && hasExcessiveOpposition) {
        return {
          border: '2px solid #9C27B0', // Purple for both
          animation: 'purplePulse 2s ease-in-out infinite',
          boxShadow: '0 0 12px rgba(156, 39, 176, 0.6)',
          transition: 'border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out'
        };
      } else if (hasExcessivePartnership) {
        return {
          border: '2px solid #1565C0', // Blue for partnerships
          animation: 'bluePulse 2s ease-in-out infinite', 
          boxShadow: '0 0 12px rgba(21, 101, 192, 0.6)',
          transition: 'border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out'
        };
      } else if (hasExcessiveOpposition) {
        return {
          border: '2px solid #D32F2F', // Red for opponents
          animation: 'redPulse 2s ease-in-out infinite',
          boxShadow: '0 0 12px rgba(211, 47, 47, 0.6)', 
          transition: 'border-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out'
        };
      } else if (isSwapping) {
        return {
          border: '2px solid #E91E63',
          animation: 'swapFlash 0.6s ease-in-out',
          boxShadow: '0 0 20px rgba(233, 30, 99, 0.8)',
          transition: 'border-color 0.15s ease-in-out, border-width 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
        };
      } else if (isDropTarget) {
        return {
          border: '2px solid #E91E63',
          animation: 'none',
          boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)',
          transition: 'all 0.2s ease-in-out'
        };
      } else {
        return {
          border: `1px solid ${cardColors.backgroundColor}`,
          animation: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2)',
          transition: 'all 0.2s ease-in-out'
        };
      }
    };

    const borderAndAnimation = getBorderAndAnimation();

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
      boxShadow: borderAndAnimation.boxShadow,
      cursor: isOnCooldown && zone === "all" ? 'not-allowed' : 'grab',
      margin: '0 auto 2px',
      color: cardColors.textColor,
      border: borderAndAnimation.border,
      opacity: isDragging ? 0.5 : 1,
      transform: isDropTarget 
        ? 'scale(1.05)' 
        : (isDragging ? 'scale(0.95)' : 'scale(1)'),
      transition: borderAndAnimation.transition,
      animation: borderAndAnimation.animation,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      WebkitTouchCallout: 'none',
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
  }, [isMobile, cardColors, isDragging, isDropTarget, isSwapping, isOnCooldown, zone, hasExcessivePartnership, hasExcessiveOpposition]);

  const enhancedBadgeStyle = useMemo(() => {

    const muiBadge = {
      '& .MuiBadge-badge':{
      backgroundColor: getSkillLevelColor(player.skillLevel),
      color: 'white',
      fontWeight: 'bold',
      fontSize: isInTeamZone ? '0.5rem' : '0.6rem',
      minWidth: isInTeamZone ? '14px' : '16px',
      height: isInTeamZone ? '14px' : '16px',
      border: '1.5px solid white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      zIndex: 1,
      transform: `translate(-50%, 0%)`,
    }}
    
    return isMobile ? {
      ...muiBadge,
      width: '100%',
    } : muiBadge
          
  }, [isInTeamZone, isMobile, player.skillLevel])

  return (
    <>
      <Badge
        badgeContent={player.skillLevel}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={enhancedBadgeStyle}
      >
        <Card
            ref={cardRef}
            sx={enhancedCardStyles}
            className={getCardClassName()}
            data-player-id={player.id}
            data-zone={zone}
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
                  gap: 0,
                }}>
                  {/* TOP ROW: Player Name with Edit Icon */}
                  <Box sx={{ 
                    width: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                  }}>

                    <Typography
                      component="div"
                      sx={{
                        fontWeight: 'bold',
                        fontSize: isInTeamZone 
                          ? (isMobile ? '0.62rem' : '0.58rem')
                          : (isMobile ? '0.72rem' : '0.68rem'),
                        lineHeight: 1.1,
                        textShadow: isMobile ? '1px 1px 2px rgba(0,0,0,0.1)' : 'none',
                        maxWidth: isInTeamZone 
                          ? (isMobile ? '85px' : '80px')
                          : (isMobile ? '120px' : '115px'),
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        paddingLeft: '6px'
                      }}
                      title={player.name}
                    >
                      {player.name}
                    </Typography>
                  </Box>

                  {/* BOTTOM ROW: Games and Timer */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '6px', // Reduced from 8px
                    padding: '0px 3px',  // Reduced padding
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    gap: 0.5,  // Reduced from 0.75
                    minHeight: '16px', // Add minimum height to prevent cutoff
                    width: 'fit-content', // Ensure container fits content
                    marginTop: '-2.5px'
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
                      <SportsEsportsIcon 
                        sx={{ 
                          fontSize: isInTeamZone 
                            ? (isMobile ? '0.7rem' : '0.65rem')
                            : (isMobile ? '0.8rem' : '0.75rem'),
                          color: cardColors.textColor,
                          filter: 'brightness(1.1)',
                        }}
                      />
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
                        border: `1px solid ${isQuickAddDisabled ? '#cbd5e1' : '#64748b'}`,
                        backgroundColor: isQuickAddDisabled ? '#f8fafc' : 'rgba(100, 116, 139, 0.1)',
                        color: isQuickAddDisabled ? '#94a3b8' : '#64748b',
                        minWidth: 'auto',
                        minHeight: isMobile ? '28px' : 'auto',
                        '&:hover': {
                          backgroundColor: isQuickAddDisabled ? '#f8fafc' : 'rgba(100, 116, 139, 0.2)',
                        },
                      }}
                    >
                      <AddIcon
                        sx={{ 
                          fontSize: isMobile ? '0.8rem' : '0.7rem',
                          color: isQuickAddDisabled ? '#aaa' : '#64748b'
                        }}
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
                        color: '#475569',
                        minHeight: isMobile ? '28px' : 'auto',
                        // Enhanced styling to make it more prominent
                        backgroundColor: 'rgba(71, 85, 105, 0.1)',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        borderRadius: '50%',
                        '&:hover': {
                          color: '#334155',
                          backgroundColor: 'rgba(109, 76, 65, 0.2)',
                          transform: 'scale(1.1)',
                        },
                        // Special styling based on player status
                        ...(playerStatus.isCourtAndQueue && {
                          backgroundColor: 'rgba(0, 176, 189, 0.2)', // Teal background for advanced queue
                          borderColor: 'rgba(0, 176, 189, 0.5)',
                          color: '#475569',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 176, 189, 0.3)',
                            color: '#334155',
                          },
                          // FIXED: Ensure the icon itself is visible
                          '& .MuiSvgIcon-root': {
                            color: '#475569',
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
                      color: '#64748b', // GRAY instead of brown
                      '&:hover': {
                        backgroundColor: 'rgba(100, 116, 139, 0.1)',
                        color: '#475569',
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: isMobile 
                          ? (isInTeamZone ? '0.7rem' : '0.8rem')
                          : (isInTeamZone ? '0.6rem' : '0.7rem')
                      }
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

        </Card>
      </Badge>


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
              position: 'relative',
            },
          },
        }}
      >
        <IconButton
          onClick={handleHistoryClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: '#64748b', // Gray to match navy theme
            zIndex: 1, // Ensure it stays on top
            '&:hover': {
              backgroundColor: 'rgba(100, 116, 139, 0.1)',
              color: '#475569',
            },
          }}
          size="small"
        >
          <CloseIcon sx={{ fontSize: '1.2rem' }} />
        </IconButton>
        <Typography variant="subtitle2" gutterBottom sx={{
          fontSize: isMobile ? '0.9rem' : '0.8rem',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          paddingBottom: '8px',
          marginBottom: '12px',
          pr: 4
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

                // 🆕 NEW: Enhanced skill level display showing progression
                const getSkillBadges = (entry: MatchHistoryEntry) => {
                  const allRefs = [...(entry.partner ? [entry.partner] : []), ...entry.opponents];
                  return allRefs.map(ref => {
                    const currentPlayer = state.players.find(p => p.id === ref.id);
                    const hasChanged = currentPlayer && currentPlayer.skillLevel !== ref.skillLevel;
                    
                    return (
                      <Tooltip 
                        key={ref.id} 
                        title={hasChanged 
                          ? `${ref.name}: was ${ref.skillLevel}, now ${currentPlayer.skillLevel}` 
                          : `${ref.name}: ${ref.skillLevel}`
                        }
                        arrow
                      >
                        <Chip
                          label={hasChanged ? `${ref.skillLevel}→${currentPlayer.skillLevel}` : ref.skillLevel}
                          size="small"
                          sx={{
                            fontSize: '0.6rem',
                            height: '18px',
                            backgroundColor: getSkillLevelColor(ref.skillLevel),
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'help',
                            ...(hasChanged && {
                              background: `linear-gradient(45deg, ${getSkillLevelColor(ref.skillLevel)} 50%, ${getSkillLevelColor(currentPlayer.skillLevel)} 50%)`,
                            })
                          }}
                        />
                      </Tooltip>
                    );
                  });
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

                    {/* 🆕 NEW: Skill level badges for opponents/partners */}
                    {entry.opponents.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', mr: 0.5 }}>
                          Players:
                        </Typography>
                        {getSkillBadges(entry)}
                      </Box>
                    )}

                    {/* Court and timing info - UNCHANGED */}
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

                    {/* Show date if not today - UNCHANGED */}
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
              p: 0,
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
          backgroundColor: '#1e293b',
          color: 'white'
        }}>
          <Typography variant="subtitle2" sx={{ 
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <SettingsIcon sx={{ fontSize: '1rem' }} />
            {player.name}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          {/* Player Name Edit Section */}
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary', 
                fontSize: '0.75rem', // Standardized
                fontWeight: 600,
                mb: 1,
                display: 'block'
              }}
            >
              EDIT NAME
            </Typography>
            <TextField
              value={submenuName}
              onChange={handleSubmenuNameChange}
              onBlur={handleSubmenuNameBlur}
              onKeyDown={handleSubmenuNameKeyDown}
              placeholder="Enter player name"
              size="small"
              fullWidth
              variant="outlined"
              slotProps={{
                input: {
                  sx: { 
                    fontSize: '0.8rem', // Standardized
                  }
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          {/* Games Field */}
          <Box sx={{ mb: 2 }}>
            <TextField
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SportsEsportsIcon sx={{ fontSize: '0.9rem' }} />
                  Games Played
                </Box>
              }
              value={gamesPlayed}
              onChange={handleGamesChange}
              onBlur={handleGamesBlur}
              size="small"
              fullWidth
              variant="outlined"
              slotProps={{
                input: {
                  sx: { 
                    fontSize: '0.8rem', // Standardized
                  },
                },
                inputLabel: {
                  sx: { 
                    fontSize: '0.75rem', // Standardized
                    '& .MuiBox-root': {
                      fontSize: '0.75rem',
                    }
                  }
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          {/* Skill Level Section */}
          <>
              <Typography variant="caption" sx={{ 
                color: 'text.secondary', 
                fontSize: '0.75rem',
                fontWeight: 600,
                mb: 1,
                display: 'block'
              }}>
                SKILL LEVEL
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ 
                    fontSize: isMobile ? '0.7rem' : '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}>
                    <EmojiEventsIcon sx={{ fontSize: '0.9rem' }} />
                    Skill Level
                  </InputLabel>
                  <Select
                    value={player.skillLevel}
                    onChange={(e) => {
                      dispatch(Action.updatePlayerSkillLevel(player.id, e.target.value as SkillLevel));
                      closePopover();
                    }}
                    label="Skill Level"
                    size="small"
                    sx={{ 
                      fontSize: isMobile ? '0.7rem' : '0.65rem',
                      minHeight: isMobile ? '36px' : 'auto',
                    }}
                  >
                    {skillLevelOrder.map(level => (
                      <MenuItem key={level} value={level}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          width: '100%'
                        }}>
                          <Chip
                            label={level}
                            size="small"
                            sx={{
                              backgroundColor: 'white',
                              color: getSkillLevelColor(level),
                              border: `1.5px solid ${getSkillLevelColor(level)}`,
                              fontWeight: 'bold',
                              minWidth: '24px',
                              height: '20px',
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ 
                              fontSize: isMobile ? '0.7rem' : '0.65rem',
                              fontWeight: 'medium'
                            }}>
                              Level {level}
                            </Typography>
                            <Typography sx={{ 
                              fontSize: '0.6rem',
                              color: 'text.secondary',
                              lineHeight: 1.2
                            }}>
                              {getSkillLevelDescription(level)}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </>

          {/* View History Button */}
          <Box sx={{ mb: 2 }}>
            <Button
                variant="outlined"
                size="small"
                onClick={handleHistoryOpen}
                fullWidth
                startIcon={<BarChartIcon sx={{ fontSize: '0.9rem' }} />}
                sx={{ 
                  fontSize: '0.75rem', // Standardized
                  fontWeight: 500,
                  borderRadius: 2,
                  textTransform: 'none',
                  color: '#475569',
                  orderColor: '#475569',
                  '&:hover': {
                    backgroundColor: 'rgba(71, 85, 105, 0.04)',
                    borderColor: '#475569',
                  }
                }}
              >
                View History
            </Button>
          </Box>

          {/* Movement Options */}
          {!isInTeamZone && (
            <>
              <Typography variant="caption" sx={{ 
                color: 'text.secondary', 
                fontSize: '0.75rem', // Standardized
                fontWeight: 600,
                mb: 1,
                display: 'block'
              }}>
                MOVE TO
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ 
                    fontSize: isMobile ? '0.7rem' : '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}>
                    <SportsIcon sx={{ fontSize: '0.9rem' }} />
                    Court
                  </InputLabel>
                  <Select
                    label="Court"
                    value=""
                    onChange={(e) => {
                      const to = e.target.value;
                      // Calculate next available position
                      const targetZonePlayers = state.courts.playersByCourt[to] || [];
                      const usedPositions = targetZonePlayers
                        .map(p => p.courtOrder)
                        .filter(pos => pos !== null && pos !== undefined);
                      
                      let nextPosition = 0;
                      while (usedPositions.includes(nextPosition) && nextPosition < 4) {
                        nextPosition++;
                      }
                      
                      // Use reliable position-specific action
                      dispatch(Action.movePlayerToPosition(player.id, zone, to, nextPosition));
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
                      const occupancy = courtPlayers.length;

                      return (
                        <MenuItem
                          key={courtKey}
                          value={courtKey}
                          disabled={isCourtFull}
                          sx={{ 
                            fontSize: isMobile ? '0.7rem' : '0.65rem',
                            minHeight: isMobile ? '36px' : 'auto',
                            opacity: isCourtFull ? 0.5 : 1,
                            backgroundColor: isCourtFull ? 'rgba(255, 0, 0, 0.05)' : 'transparent',
                            color: isCourtFull ? 'text.disabled' : 'text.primary',
                            '&:hover': {
                              backgroundColor: isCourtFull 
                                ? 'rgba(255, 0, 0, 0.08)' 
                                : 'rgba(0, 0, 0, 0.04)',
                            },
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>Court {i + 1}</span>
                          <span style={{ 
                            fontSize: '0.6rem', 
                            color: isCourtFull ? '#d32f2f' : '#666',
                            fontWeight: 'bold'
                          }}>
                            ({occupancy}/4)
                          </span>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel sx={{ 
                    fontSize: isMobile ? '0.7rem' : '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}>
                    <QueueIcon sx={{ fontSize: '0.9rem' }} />
                    Queue
                  </InputLabel>
                  <Select
                    label="Queue"
                    value=""
                    onChange={(e) => {
                      const to = e.target.value;
  
                      // Calculate next available position
                      const targetZonePlayers = state.queue.playersByQueue[to] || [];
                      const usedPositions = targetZonePlayers
                        .map(p => p.queueOrder)
                        .filter(pos => pos !== null && pos !== undefined);
                      
                      let nextPosition = 0;
                      while (usedPositions.includes(nextPosition) && nextPosition < 4) {
                        nextPosition++;
                      }
                      
                      // Use reliable position-specific action
                      dispatch(Action.movePlayerToPosition(player.id, zone, to, nextPosition));
                      closePopover();

                    }}
                    size="small"
                    sx={{ 
                      fontSize: isMobile ? '0.7rem' : '0.65rem',
                      minHeight: isMobile ? '36px' : 'auto',
                    }}
                  >
                    {Object.keys(state.queue.playersByQueue).map((queueId, index) => {
                      // 🔧 NEW: Check queue occupancy and disable if full
                      const queuePlayers = state.queue.playersByQueue[queueId] || [];
                      const isQueueFull = queuePlayers.length >= 4;
                      const occupancy = queuePlayers.length;

                      return (
                        <MenuItem 
                          key={queueId} 
                          value={queueId}
                          disabled={isQueueFull}  // 🔧 NEW: Disable when full
                          sx={{ 
                            fontSize: isMobile ? '0.7rem' : '0.65rem',
                            minHeight: isMobile ? '36px' : 'auto',
                            // 🎨 NEW: Enhanced visual feedback
                            opacity: isQueueFull ? 0.5 : 1,
                            backgroundColor: isQueueFull ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                            color: isQueueFull ? 'text.disabled' : 'text.primary',
                            '&:hover': {
                              backgroundColor: isQueueFull 
                                ? 'rgba(255, 152, 0, 0.08)' 
                                : 'rgba(0, 0, 0, 0.04)',
                            },
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>Queue {index + 1}</span>
                          <span style={{ 
                            fontSize: '0.6rem', 
                            color: isQueueFull ? '#f57c00' : '#666',
                            fontWeight: 'bold'
                          }}>
                            ({occupancy}/4)
                          </span>
                        </MenuItem>
                      );
                    })}
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
                fontSize: '0.75rem', // Standardized
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

      <Popover
        open={Boolean(editNameAnchorEl)}
        anchorEl={editNameAnchorEl}
        onClose={handleEditNameClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.08)',
              minWidth: 180,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#5C4033',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <EditIcon sx={{ fontSize: '0.9rem' }} />
            Edit Name
          </Typography>
          
          <TextField
            value={editNameValue}
            onChange={handleEditNameChange}
            onKeyDown={handleEditNameKeyDown}
            placeholder="Enter player name"
            size="small"
            fullWidth
            autoFocus
            variant="outlined"
            slotProps={{
              input: {
                sx: { 
                  fontSize: '0.8rem',
                }
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
              }
            }}
          />
          
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={handleEditNameClose}
              sx={{ 
                fontSize: '0.7rem',
                textTransform: 'none',
                color: 'text.secondary'
              }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleEditNameSave}
              disabled={editNameValue.trim() === '' || editNameValue === player.name}
              sx={{ 
                fontSize: '0.7rem',
                textTransform: 'none',
                backgroundColor: '#5C4033',
                '&:hover': {
                  backgroundColor: '#3E2723',
                }
              }}
            >
              Save
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
    </>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;