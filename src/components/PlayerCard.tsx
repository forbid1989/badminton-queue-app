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
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Player, PlayerStatus } from '../types/Player';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import HistoryIcon from '@mui/icons-material/History';
import BadmintonIcon from './input/BadmintonIcon';
import { getTimeAgo } from '../utils/getTimeAgo';

const formatElapsedTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type PlayerCardProps = {
  player: Player;
  zone: string;
  isDragOverlay?: boolean;
};

const PlayerCard: React.FC<PlayerCardProps> = React.memo(({ player, zone, isDragOverlay = false }) => {
  const theme = useTheme();
  const { state, dispatch } = useContext(AppContext);
  
  // Memoize frequently used values
  const courtCount = useMemo(() => state.courts.count, [state.courts.count]);
  const queueCount = useMemo(() => state.queue.count, [state.queue.count]);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Determine if this card is in a team zone
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
  const [name, setName] = useState(player.name);
  const [isSwapping, setIsSwapping] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nameUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // DND-Kit hooks
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: player.id,
    data: {
      type: 'player',
      player,
      zone,
    },
    disabled: isDragOverlay || isEditing,
  });

  // Make the card itself a drop target for swapping
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `player-${player.id}`,
    data: {
      type: 'player',
      player,
      zone,
    },
    disabled: isDragOverlay,
  });

  // Combine refs
  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    [setDraggableRef, setDroppableRef]
  );

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

  // Event handlers
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

  // Timer effect
  useEffect(() => {
    const updateTimer = () => {
      setElapsedSeconds(Math.floor((Date.now() - player.timeEntered) / 1000));
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [player.timeEntered]);

  // Name update effect
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

  // Sync external changes
  useEffect(() => {
    setName(player.name);
  }, [player.name]);

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

  // Handle swap animation when dropped on
  useEffect(() => {
    if (isOver && !isDragging) {
      setIsSwapping(true);
      const timeout = setTimeout(() => setIsSwapping(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [isOver, isDragging]);

  // Memoized values
  const formattedTime = useMemo(() => formatElapsedTime(elapsedSeconds), [elapsedSeconds]);

  // DND-Kit transform style
  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: 'none',
  };

  // Enhanced card styles
  const enhancedCardStyles = useMemo(() => ({
    display: 'flex',
    width: '100%',
    maxWidth: isInTeamZone 
      ? '100%'
      : isMobile 
        ? '90vw' 
        : '200px',
    minWidth: isInTeamZone ? '120px' : '160px',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isInTeamZone 
      ? '2px 4px'
      : isMobile 
        ? '4px 6px' 
        : '6px 8px',
    backgroundColor: isOver && !isDragging
      ? '#E8F5E9'
      : cardColors.backgroundColor,
    borderRadius: isInTeamZone ? '12px' : '20px',
    boxShadow: isOver && !isDragging
      ? '0 4px 12px rgba(233, 30, 99, 0.3)'
      : isSwapping
        ? '0 0 20px rgba(233, 30, 99, 0.8)'
        : '0 1px 3px rgba(0,0,0,0.1)',
    cursor: isDragging ? 'grabbing' : 'grab',
    margin: '0 auto 2px',
    color: cardColors.textColor,
    border: isSwapping
      ? '3px solid #E91E63'
      : isOver && !isDragging
        ? '2px solid #E91E63'
        : '1px solid rgba(0, 0, 0, 0.06)',
    opacity: isDragging && !isDragOverlay ? 0.5 : 1,
    transform: isOver && !isDragging
      ? 'scale(1.08)'
      : 'scale(1)',
    transition: isSwapping 
      ? 'border-color 0.15s ease-in-out, border-width 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
      : 'all 0.2s ease-in-out',
    animation: isSwapping 
      ? 'swapFlash 0.6s ease-in-out'
      : 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    willChange: 'transform',
    backfaceVisibility: 'hidden',
  }), [isInTeamZone, isMobile, cardColors, isDragging, isOver, isSwapping, isDragOverlay]);

  return (
    <div className="flipped" style={style}>
      <Card
        ref={setNodeRef}
        sx={enhancedCardStyles}
        {...listeners}
        {...attributes}
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