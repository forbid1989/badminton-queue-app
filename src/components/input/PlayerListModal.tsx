// PlayerListModal.tsx - Modal for viewing and managing player list with skill levels

import React, { useState, useContext, useMemo } from 'react';
import {
  Modal,
  Paper,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Tooltip,
  Badge,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SportsIcon from '@mui/icons-material/Sports';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { AppContext } from '../../BadmintonQueueUI';
import { Action } from '../../app/Action';
import { Player, SkillLevel, getSkillLevelColor, getSkillLevelDescription, skillLevelOrder } from '../../types/Player';

interface PlayerListModalProps {
  open: boolean;
  onClose: () => void;
}

const PlayerListModal: React.FC<PlayerListModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { state, dispatch } = useContext(AppContext);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<SkillLevel | 'ALL'>('ALL');

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = state.players.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    if (skillFilter !== 'ALL') {
      filtered = filtered.filter(player => player.skillLevel === skillFilter);
    }

    // Sort by skill level (strongest first), then by games played, then by name
    return filtered.sort((a, b) => {
      const skillComparison = skillLevelOrder.indexOf(a.skillLevel) - skillLevelOrder.indexOf(b.skillLevel);
      if (skillComparison !== 0) return skillComparison;
      
      if (a.gamesPlayed !== b.gamesPlayed) {
        return b.gamesPlayed - a.gamesPlayed; // More games first
      }
      
      return a.name.localeCompare(b.name);
    });
  }, [state.players, searchQuery, skillFilter]);

  // Handle skill level change
  const handleSkillLevelChange = (playerId: string, newSkillLevel: SkillLevel) => {
    dispatch(Action.updatePlayerSkillLevel(playerId, newSkillLevel));
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Get player status display
  const getPlayerStatus = (player: Player) => {
    const hasCourt = player.status.some(s => s.startsWith('court-'));
    const hasQueue = player.status.some(s => s.startsWith('queue-'));

    if (hasCourt && hasQueue) return { text: 'Court + Queue', color: '#00b0bd' };
    if (hasCourt) return { text: 'Playing', color: '#4caf50' };
    if (hasQueue) return { text: 'Queued', color: '#ff9800' };
    return { text: 'Resting', color: '#9e9e9e' };
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '95%', sm: '90%', md: 700 },
          maxWidth: 800,
          maxHeight: { xs: '90vh', sm: '85vh' },
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
          pb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SportsIcon color="primary" />
            <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Player List & Skills
            </Typography>
            <Chip 
              label={`${filteredPlayers.length} players`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Filters */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 2,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          {/* Search */}
          <TextField
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClearSearch} size="small">
                    <ClearIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Skill Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Skill Level</InputLabel>
            <Select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value as SkillLevel | 'ALL')}
              label="Skill Level"
            >
              <MenuItem value="ALL">All Levels</MenuItem>
              {skillLevelOrder.map(level => (
                <MenuItem key={level} value={level}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={level}
                      size="small"
                      sx={{
                        backgroundColor: getSkillLevelColor(level),
                        color: 'white',
                        fontWeight: 'bold',
                        minWidth: '24px',
                        height: '20px',
                      }}
                    />
                    Level {level}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Player Table */}
        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Player</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  <Tooltip title="Number of games played">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      🎮 Games
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  <Tooltip title="Player skill level">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <EmojiEventsIcon sx={{ fontSize: '1rem' }} />
                      Skill
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => {
                  const status = getPlayerStatus(player);
                  return (
                    <TableRow key={player.id} hover>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'medium',
                            fontSize: { xs: '0.8rem', sm: '0.875rem' }
                          }}
                        >
                          {player.name}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Badge
                          badgeContent={player.gamesPlayed}
                          color="primary"
                          max={99}
                          showZero
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.7rem',
                              minWidth: '18px',
                              height: '18px',
                            }
                          }}
                        >
                          <Box sx={{ width: '24px', height: '24px' }} />
                        </Badge>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip
                          label={status.text}
                          size="small"
                          sx={{
                            backgroundColor: status.color,
                            color: 'white',
                            fontWeight: 'medium',
                            fontSize: { xs: '0.65rem', sm: '0.7rem' },
                          }}
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <FormControl size="small" sx={{ minWidth: 70 }}>
                          <Select
                            value={player.skillLevel}
                            onChange={(e) => handleSkillLevelChange(player.id, e.target.value as SkillLevel)}
                            displayEmpty
                            sx={{
                              '& .MuiSelect-select': {
                                padding: '4px 8px',
                                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                              }
                            }}
                          >
                            {skillLevelOrder.map(level => (
                              <MenuItem key={level} value={level}>
                                <Tooltip title={getSkillLevelDescription(level)} arrow>
                                  <Chip
                                    label={level}
                                    size="small"
                                    sx={{
                                      backgroundColor: getSkillLevelColor(level),
                                      color: 'white',
                                      fontWeight: 'bold',
                                      minWidth: '28px',
                                      height: '24px',
                                      cursor: 'pointer',
                                    }}
                                  />
                                </Tooltip>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      {searchQuery || skillFilter !== 'ALL'
                        ? "No players found matching your criteria"
                        : "No players added yet"
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Skill Level Legend */}
        <Box sx={{ 
          mt: 2, 
          pt: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center'
        }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
            Skill Levels:
          </Typography>
          {skillLevelOrder.map(level => (
            <Tooltip key={level} title={getSkillLevelDescription(level)} arrow>
              <Chip
                label={level}
                size="small"
                sx={{
                  backgroundColor: getSkillLevelColor(level),
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: '20px',
                  cursor: 'help',
                }}
              />
            </Tooltip>
          ))}
        </Box>
      </Paper>
    </Modal>
  );
};

export default PlayerListModal;