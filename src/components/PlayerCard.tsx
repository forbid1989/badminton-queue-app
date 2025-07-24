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

  // Touch event handlers with useCallback
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
    }
    
    setIsDragging(true);
    draggedElement = cardRef.current;
    draggedData = { player, zone };
    
    if (cardRef.current) {
      const clone = cardRef.current.cloneNode(true) as HTMLElement;
      clone.id = 'dragging-clone';
      clone.style.position = 'fixed';
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = '9999';
      clone.style.opacity = '0.8';
      clone.style.transform = 'rotate(3deg) scale(1.05)';
      clone.style.left = `${touch.clientX - dragOffset.x}px`;
      clone.style.top = `${touch.clientY - dragOffset.y}px`;
      document.body.appendChild(clone);
    }
  }, [player, zone, dragOffset.x, dragOffset.y]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const clone = document.getElementById('dragging-clone');
    if (clone) {
      clone.style.left = `${touch.clientX - dragOffset.x}px`;
      clone.style.top = `${touch.clientY - dragOffset.y}px`;
    }
  }, [isDragging, dragOffset]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.changedTouches[0];
    const clone = document.getElementById('dragging-clone');
    if (clone) {
      clone.remove();
    }
    
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const droppableZone = elementBelow?.closest('[data-droppable-zone]');
    
    if (droppableZone && draggedData) {
      const targetZone = droppableZone.getAttribute('data-droppable-zone');
      if (targetZone && targetZone !== zone) {
        dispatch(Action.movePlayer(player.id, zone, targetZone));
      }
    }
    
    setIsDragging(false);
    draggedElement = null;
    draggedData = null;
  }, [isDragging, player.id, zone, dispatch]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('player/id', player.id.toString());
    e.dataTransfer.setData('player/source', zone);
    e.dataTransfer.setData('player/json', JSON.stringify(player));
    setIsDragging(true);
  }, [player, zone]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  return (
    <div className="flipped">
      <Card
        ref={cardRef}
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: isMobile ? '90vw' : '200px',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '0.5px 2px' : '1px 4px',
          backgroundColor: cardColors.backgroundColor,
          borderRadius: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          cursor: 'grab',
          margin: '0 auto 4px',
          color: cardColors.textColor,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          opacity: isDragging ? 0.5 : 1,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          '&:active': {
            cursor: 'grabbing',
          },
        }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
            gap: 0.5,
            pointerEvents: isDragging ? 'none' : 'auto',
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            gap: 0.25,
            minWidth: 0,
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
                      fontSize: 'clamp(0.5rem, 0.65vw, 0.65rem)',
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  maxWidth: 160,
                  overflow: 'hidden',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: 'clamp(0.5rem, 0.65vw, 0.65rem)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 100,
                  }}
                  title={player.name}
                >
                  {player.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleEditToggle}
                  title="Edit Name"
                  sx={{ fontSize: '0.7rem', padding: '2px' }}
                >
                  ✏️
                </IconButton>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              flexShrink: 0,
            }}
          >
            <Typography 
              variant="body2" 
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 'clamp(0.5rem, 0.65vw, 0.65rem)',
                gap: 0.15,
              }}
            >
              <Box component="span" sx={{ fontSize: '0.8em' }}>🎮</Box>
              {player.gamesPlayed}
            </Typography>

            <Typography 
              variant="body2" 
              sx={{
                mx: 1,
                fontWeight: elapsedSeconds > 900 ? 'bold' : 'normal',
                color: elapsedSeconds > 900 ? '#8B0000' : cardColors.textColor,
                fontSize: 'clamp(0.5rem, 0.65vw, 0.65rem)',
              }}
            >
              {formattedTime}
            </Typography>

            {showQuickAddIcon && !(zone.startsWith('court') && playerStatus.isOnCourt) && (
              <IconButton
                size="small"
                onClick={handleQuickAdd}
                disabled={isQuickAddDisabled}
                title={
                  isQuickAddDisabled
                    ? "No available court or queue"
                    : playerStatus.isOnCourt && !playerStatus.isInQueue
                    ? "Quick Add to Queue"
                    : "Quick Add"
                }
                sx={{
                  padding: '2px',
                  borderRadius: '12px',
                  border: `1px solid ${
                    isQuickAddDisabled || playerStatus.isOnCourt ? '#ccc' : '#2E7D32'
                  }`,
                  backgroundColor: isQuickAddDisabled || playerStatus.isOnCourt ? '#f2f2f2' : '#E8F5E9',
                  color: isQuickAddDisabled || playerStatus.isOnCourt ? '#aaa' : '#2E7D32',
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: isQuickAddDisabled || playerStatus.isOnCourt ? '#f2f2f2' : '#C8E6C9',
                    color: isQuickAddDisabled || playerStatus.isOnCourt ? '#aaa' : '#1B5E20',
                    borderColor: isQuickAddDisabled || playerStatus.isOnCourt ? '#ccc' : '#1B5E20',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '16px',
                  },
                }}
              >
                <BadmintonIcon
                  size={12}
                  playerSeed={player.name}
                  isDisabled={isQuickAddDisabled}
                />
              </IconButton>
            )}

            {!playerStatus.isUnassigned && (
              <IconButton
                size="small"
                onClick={handleReturnToRest}
                title="Send to Resting Players"
                sx={{
                  padding: '2px',
                  color: '#6D4C41',
                  '&:hover': {
                    color: '#3E2723',
                  },
                }}
              >
                <KeyboardReturnIcon sx={{ fontSize: '0.75rem' }} />
              </IconButton>
            )}

            <IconButton
              size="small"
              onClick={handleHistoryOpen}
              title="View Match History"
            >
              <HistoryIcon sx={{ fontSize: '0.75rem' }} />
            </IconButton>
            <IconButton size="small" onClick={openPopover} sx={{ padding: '2px' }}>
              <MoreVertIcon sx={{ fontSize: '0.75rem' }} />
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

          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: '0.65rem' }}>Court</InputLabel>
            <Select
              label="Court"
              value=""
              onChange={(e) => {
                const to = e.target.value;
                const alreadyInCourt = playerStatus.courtTags.length > 0;
                const existingQueue = playerStatus.queueTags[0];

                if (alreadyInCourt) {
                  alert("Player is already assigned to a court. Cannot assign to another.");
                  return;
                }

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
                const alreadyInQueue = playerStatus.queueTags.length > 0;

                if (alreadyInQueue) {
                  alert("Player is already assigned to a queue. Cannot assign to another.");
                  return;
                }

                dispatch(Action.movePlayer(player.id, zone, to));
                closePopover();
              }}
              size="small"
              sx={{ fontSize: '0.65rem' }}
            >
              {Array.from({ length: queueCount }, (_, i) => (
                <MenuItem key={`queue-${i}`} value={`queue-${i}`} sx={{ fontSize: '0.65rem' }}>
                  Queue {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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