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
  
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import { Player } from '../types/Player';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';

import BadmintonIcon from './input/BadmintonIcon';

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
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
  }, [name]);

  // Keep local name in sync if player.name updates externally
  useEffect(() => {
    setName(player.name);
  }, [player.name]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleQuickAdd = () => {
    const targetZone = findAvailableZone();
    if (targetZone) {
      dispatch(Action.movePlayer(player.id, 'rest', targetZone));
    }
  };

  const isQuickAddDisabled = !findAvailableZone();

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

const backgroundColor =
  elapsedSeconds > 900
    ? "#F8D7DA"
    : zone.startsWith('court')
    ? "#B5CDA3"
    : zone.startsWith('queue')
    ? "#E5D78A"
    : "#E8D8C4";

const textColor =
  elapsedSeconds > 900
    ? "#8B0000"
    : zone.startsWith('court')
    ? "#2F4023"
    : zone.startsWith('queue')
    ? "#4A3F1C"
    : "#5E473B";

  return (
    <div className="flipped">
      <Card
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '4px 8px',
          backgroundColor,
          borderRadius: '20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          cursor: 'grab',
          width: '100%',
          minWidth: 280,
          minHeight: 40,
          margin: '0 auto 8px', // optional: center in container
          color: textColor,
          border: '1px solid rgba(0, 0, 0, 0.06)',  // Soft outline
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
        <Box sx={{ 
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
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
                    fontSize: 'clamp(0.75rem, 2.3vw, 0.95rem)',
                    fontWeight: 'bold',
                    padding: 0,
                  },
                },
              }}
              sx={{
                '& .MuiInputBase-root': {
                  lineHeight: 1,
                  height: '1.25rem',
                },
              }}
            />
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              maxWidth: 160,
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="body2"
              sx={{ 
                fontWeight: 'bold',
                fontSize: '1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
                verticalAlign: 'middle',
                maxWidth: 100, // Prevent too-wide names
              }}
              title={player.name}
            >
              {player.name}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setIsEditing(true)}
              title="Edit Name"
              sx={{ p: 0.5, flexShrink: 0 }}
            >
              ✏️
            </IconButton>
          </Box>
        )}
      </Box>

        <Typography variant="body2" sx={{ mx: 1 }}>
          🎮 {player.gamesPlayed}
        </Typography>

        <Typography 
          variant="body2" 
          sx={{
            mx: 1,
            fontWeight: elapsedSeconds > 900 ? 'bold' : 'normal',
            color: elapsedSeconds > 900 ? '#8B0000' : textColor,
          }}
        >
          {formatElapsedTime(elapsedSeconds)}
        </Typography>

        {zone === 'rest' && (
          <IconButton
            size="small"
            onClick={handleQuickAdd}
            disabled={isQuickAddDisabled}
            title={isQuickAddDisabled ? "No available court or queue" : "Quick Add"}
            sx={{
              color: isQuickAddDisabled ? '#aaa' : '#2E7D32',
              '&:hover': {
                color: isQuickAddDisabled ? '#aaa' : '#1B5E20',
              },
            }}
          >
            <BadmintonIcon size={20} playerSeed={player.name} isDisabled={isQuickAddDisabled}/>
          </IconButton>
        )}

        {zone !== 'rest' && (
          <IconButton
            size="small"
            onClick={() => dispatch(Action.movePlayer(player.id, zone, 'rest'))}
            title="Send to Resting Players"
            sx={{
              color: '#6D4C41',
              '&:hover': {
                color: '#3E2723',
              },
            }}
          >
            <KeyboardReturnIcon fontSize="small" />
          </IconButton>
        )}

        <IconButton size="small" onClick={openPopover}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Card>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box p={2} display="flex" flexDirection="column" gap={2} minWidth={200}>
          <TextField
            label="Games"
            value={gamesPlayed}
            onChange={handleGamesChange}
            onBlur={handleGamesBlur}
            size="small"
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Court</InputLabel>
            <Select
              label="Court"
              value=""
              onChange={(e) => {
                dispatch(Action.movePlayer(player.id, zone, e.target.value));
                closePopover();
              }}
            >
              {Array.from({ length: courtCount }, (_, i) => (
                <MenuItem key={`court-${i}`} value={`court-${i}`}>
                  Court {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Queue</InputLabel>
            <Select
              label="Queue"
              value=""
              onChange={(e) => {
                dispatch(Action.movePlayer(player.id, zone, e.target.value));
                closePopover();
              }}
            >
              {Array.from({ length: queueCount }, (_, i) => (
                <MenuItem key={`queue-${i}`} value={`queue-${i}`}>
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
            startIcon={<DeleteIcon />}
          >
            Remove
          </Button>
        </Box>
      </Popover>
    </div>
  );
};

export default PlayerCard;
