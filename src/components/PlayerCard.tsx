import React, { useContext, useState, useEffect } from 'react';
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

const PlayerCard: React.FC<PlayerCardProps> = ({ player, zone }) => {
  const theme = useTheme();
  const { state, dispatch } = useContext(AppContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [historyAnchorEl, setHistoryAnchorEl] = useState<null | HTMLElement>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    return Math.floor((Date.now() - player.timeEntered) / 1000);
  });
  const [isEditing, setIsEditing] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(player.gamesPlayed.toString());

  const courtCount = state.courts.count;
  const queueCount = state.queue.count;

  const [name, setName] = useState(player.name); 

  // Debounce logic
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (name !== player.name) {
        dispatch(Action.updatePlayerName(player.id, name));
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [name, player.name]);

  // Keep local name in sync if player.name updates externally
  useEffect(() => {
    setName(player.name);
  }, [player.name]);

  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (isMounted) {
        setElapsedSeconds(Math.floor((Date.now() - player.timeEntered) / 1000));
      }
    }, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [player.timeEntered]);

  useEffect(() => {
    setGamesPlayed(player.gamesPlayed.toString());
  }, [player.gamesPlayed]);

  const findAvailableZone = () => {
    // 1. Try courts first
    for (let i = 0; i < courtCount; i++) {
      const courtKey = `court-${i}`;
      if ((state.courts.playersByCourt[courtKey] || []).length < 4) {
        return courtKey;
      }
    }

    // 2. Try queues if no court has room
    for (let i = 0; i < queueCount; i++) {
      const queueKey = `queue-${i}`;
      if ((state.queue.playersByQueue?.[queueKey] || []).length < 4) {
        return queueKey;
      }
    }

    // 3. No available spot
    return null;
  };

  const availableZone = findAvailableZone();
  const isQuickAddDisabled = !availableZone;

  const handleQuickAdd = () => {
    if (availableZone) {
      dispatch(Action.movePlayer(player.id, 'rest', availableZone));
    }
  };

  const handleGamesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGamesPlayed(e.target.value);
  };

  const handleGamesBlur = () => {
    const parsed = parseInt(gamesPlayed);
    if (!isNaN(parsed) && parsed !== player.gamesPlayed) {
      dispatch(Action.setGamesPlayed(player.id, parsed));
    }
  };

  const openPopover = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const closePopover = () => {
    setAnchorEl(null);
  };


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

const backgroundColor = isConflict
  ? "#F7C59F" // light orange
  : isIdleTooLong
    ? "#F8D7DA" // red alert
    : zone.startsWith('court')
      ? "#B5CDA3"
      : zone.startsWith('queue')
        ? "#E5D78A"
        : "#E8D8C4";

const textColor = isConflict
  ? "#5C3D2E" // dark orange
  : isIdleTooLong
    ? "#8B0000"
    : zone.startsWith('court')
      ? "#2F4023"
      : zone.startsWith('queue')
        ? "#4A3F1C"
        : "#5E473B";

const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

const showQuickAddIcon = isUnassigned && !isOnCourt;

  return (
    <div className="flipped">
      <Card
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: isMobile ? '90vw' : '200px',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '0.5px 2px' : '1px 4px',
          backgroundColor,
          borderRadius: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          cursor: 'grab',
          margin: '0 auto 4px',
          color: textColor,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
          '&:hover': {
            transform: 'scale(1.025)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('player/id', player.id.toString());
          e.dataTransfer.setData('player/source', zone);
          e.dataTransfer.setData('player/json', JSON.stringify(player));
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            gap: 0.5,
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
            <>
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
            </>
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
                  fontSize: 'clamp(0.5rem, 0.65vw, 0.65rem)', // scalable but consistent
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
                onClick={() => setIsEditing(true)}
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
                color: elapsedSeconds > 900 ? '#8B0000' : textColor,
                fontSize: 'clamp(0.5rem, 0.65vw, 0.65rem)',
              }}
            >
              {formatElapsedTime(elapsedSeconds)}
            </Typography>

            {showQuickAddIcon && (
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
                  padding: '2px',
                  borderRadius: '12px',
                  border: `1px solid ${
                    isQuickAddDisabled || isOnCourt ? '#ccc' : '#2E7D32'
                  }`,
                  backgroundColor: isQuickAddDisabled || isOnCourt ? '#f2f2f2' : '#E8F5E9',
                  color: isQuickAddDisabled || isOnCourt ? '#aaa' : '#2E7D32',
                  minWidth: 'auto',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: isQuickAddDisabled || isOnCourt ? '#f2f2f2' : '#C8E6C9',
                    color: isQuickAddDisabled || isOnCourt ? '#aaa' : '#1B5E20',
                    borderColor: isQuickAddDisabled || isOnCourt ? '#ccc' : '#1B5E20',
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

            {(zone !== 'rest' || isOnCourt) && (
              <IconButton
                size="small"
                onClick={() => dispatch(Action.movePlayer(player.id, zone, 'rest'))}
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
              onClick={(e) => setHistoryAnchorEl(e.currentTarget)}
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

      <Popover
        open={Boolean(historyAnchorEl)}
        anchorEl={historyAnchorEl}
        onClose={() => setHistoryAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            minWidth: 280,
            p: 2,
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
                const alreadyInCourt = courtTags.length > 0;
                const existingQueue = queueTags[0]; // if it exists

                if (alreadyInCourt) {
                  alert("Player is already assigned to a court. Cannot assign to another.");
                  return;
                }

                const newStatus: PlayerStatus[] = [to as PlayerStatus];
                if (existingQueue) newStatus.push(existingQueue); // Condition #6

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
                const alreadyInQueue = queueTags.length > 0;
                const existingCourt = courtTags[0]; // if it exists

                if (alreadyInQueue) {
                  alert("Player is already assigned to a queue. Cannot assign to another.");
                  return;
                }

                const newStatus = existingCourt ? [existingCourt] : [];
                newStatus.push(to as PlayerStatus); // Condition #6

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
            onClick={() => {
              dispatch(Action.removePlayer(player.id));
              closePopover();
            }}
            startIcon={<DeleteIcon sx={{ fontSize: '0.75rem' }} />}
            sx={{ fontSize: '0.65rem', padding: '4px 6px' }}
          >
            Delete Player
          </Button>
        </Box>
      </Popover>
    </div>
  );
};

export default PlayerCard;
