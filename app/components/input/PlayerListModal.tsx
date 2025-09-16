// PlayerListModal.tsx - Enhanced with better mobile responsiveness

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
  TableSortLabel,
  Card,
  CardContent,
  Stack,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SportsIcon from '@mui/icons-material/Sports';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { AppContext } from '../../BadmintonQueueUI';
import { Action } from '../../lib/store/Action';
import { Player, SkillLevel, getSkillLevelColor, getSkillLevelDescription, skillLevelOrder } from '../types/Player';

interface PlayerListModalProps {
  open: boolean;
  onClose: () => void;
}

// Types for sorting
type SortableColumns = 'name' | 'gamesPlayed' | 'status' | 'skillLevel';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  column: SortableColumns | null;
  direction: SortDirection;
}

const PlayerListModal: React.FC<PlayerListModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const { state, dispatch } = useContext(AppContext);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<SkillLevel | 'ALL'>('ALL');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: 'asc'
  });

  // Handle sorting
  const handleSort = (column: SortableColumns) => {
    setSortConfig(prevConfig => {
      if (prevConfig.column === column) {
        // If clicking the same column, toggle direction
        return {
          column,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // If clicking a new column, default to ascending
        return {
          column,
          direction: 'asc'
        };
      }
    });
  };

  // Get player status display
  const getPlayerStatus = (player: Player) => {
    const hasCourt = player.status.some(s => s.startsWith('court-'));
    const hasQueue = player.status.some(s => s.startsWith('queue-'));

    if (hasCourt && hasQueue) return { text: 'Court + Queue', color: '#00b0bd', priority: 1 };
    if (hasCourt) return { text: 'Playing', color: '#4caf50', priority: 2 };
    if (hasQueue) return { text: 'Queued', color: '#ff9800', priority: 3 };
    return { text: 'Resting', color: '#9e9e9e', priority: 4 };
  };

  // Get skill level priority for sorting
  const getSkillLevelPriority = (skillLevel: SkillLevel): number => {
    return skillLevelOrder.indexOf(skillLevel);
  };

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    let filtered = state.players.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    if (skillFilter !== 'ALL') {
      filtered = filtered.filter(player => player.skillLevel === skillFilter);
    }

    // Apply sorting
    if (sortConfig.column) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.column) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'gamesPlayed':
            aValue = a.gamesPlayed;
            bValue = b.gamesPlayed;
            break;
          case 'status':
            aValue = getPlayerStatus(a).priority;
            bValue = getPlayerStatus(b).priority;
            break;
          case 'skillLevel':
            aValue = getSkillLevelPriority(a.skillLevel);
            bValue = getSkillLevelPriority(b.skillLevel);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sorting when no column is selected: skill level (strongest first), then games played, then name
      filtered.sort((a, b) => {
        const skillComparison = skillLevelOrder.indexOf(a.skillLevel) - skillLevelOrder.indexOf(b.skillLevel);
        if (skillComparison !== 0) return skillComparison;
        
        if (a.gamesPlayed !== b.gamesPlayed) {
          return b.gamesPlayed - a.gamesPlayed; // More games first
        }
        
        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [state.players, searchQuery, skillFilter, sortConfig]);

  // Handle skill level change
  const handleSkillLevelChange = (playerId: string, newSkillLevel: SkillLevel) => {
    dispatch(Action.updatePlayerSkillLevel(playerId, newSkillLevel));
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Mobile Card Component for better mobile experience
  const PlayerCard: React.FC<{ player: Player }> = ({ player }) => {
    const status = getPlayerStatus(player);
    
    return (
      <Card sx={{ mb: 1, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={2}>
            {/* Player Name and Games */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                {player.name}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                color: 'text.secondary',
              }}>
                <SportsEsportsIcon sx={{ fontSize: '1.1rem' }} />
                <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 'medium' }}>
                  {player.gamesPlayed} Games
                </Typography>
              </Box>
            </Box>
            
            {/* Status and Skill Level */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Status
                </Typography>
                <Chip
                  label={status.text}
                  size="medium"
                  sx={{
                    backgroundColor: status.color,
                    color: 'white',
                    fontWeight: 'medium',
                    fontSize: '0.8rem',
                  }}
                />
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Skill Level
                </Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={player.skillLevel}
                    onChange={(e) => handleSkillLevelChange(player.id, e.target.value as SkillLevel)}
                    displayEmpty
                    sx={{
                      '& .MuiSelect-select': {
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                      }
                    }}
                  >
                    {skillLevelOrder.map(level => (
                      <MenuItem key={level} value={level}>
                        <Tooltip title={getSkillLevelDescription(level)} arrow>
                          <Chip
                            label={level}
                            size="medium"
                            sx={{
                              backgroundColor: getSkillLevelColor(level),
                              color: 'white',
                              fontWeight: 'bold',
                              minWidth: '32px',
                              height: '28px',
                              cursor: 'pointer',
                            }}
                          />
                        </Tooltip>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
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
          maxHeight: { xs: '95vh', sm: '85vh' },
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: { xs: 2, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SportsIcon sx={{ color: 'primary.main' }} />
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ fontWeight: 'bold' }}>
              {isMobile ? 'Players' : 'Player List & Skills'}
            </Typography>
            <Chip 
              label={`${filteredPlayers.length} player${filteredPlayers.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{ 
                backgroundColor: 'primary.main',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>
          <IconButton 
            onClick={onClose}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search and Filter Controls */}
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 2 }, 
          p: { xs: 2, sm: 3 }, 
          py: { xs: 1.5, sm: 2 },
          borderBottom: 1,
          borderColor: 'divider',
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          {/* Search Field */}
          <TextField
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
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
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
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

        {/* Content Area - Different layouts for mobile vs desktop */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {isMobile ? (
            /* Mobile Card Layout */
            <Box sx={{ p: 2 }}>
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery || skillFilter !== 'ALL'
                      ? "No players found matching your criteria"
                      : "No players added yet"
                    }
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            /* Desktop/Tablet Table Layout */
            <TableContainer>
              <Table stickyHeader size={isTablet ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    {/* Player Name Column */}
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.column === 'name'}
                        direction={sortConfig.column === 'name' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('name')}
                        sx={{ 
                          fontWeight: 'bold',
                          color: sortConfig.column === 'name' ? 'primary.main' : 'text.primary',
                          '&:hover': {
                            color: 'primary.main',
                            backgroundColor: 'primary.50',
                            borderRadius: 1,
                          },
                          '&.Mui-active': {
                            color: 'primary.main',
                            fontWeight: 'bold',
                          },
                          '& .MuiTableSortLabel-icon': {
                            fontSize: '1.2rem',
                            opacity: sortConfig.column === 'name' ? 1 : 0.5,
                          }
                        }}
                      >
                        Player
                        {sortConfig.column === 'name' && (
                          <Box component="span" sx={{ 
                            ml: 0.5, 
                            color: 'primary.main',
                            fontSize: '0.7rem',
                            fontWeight: 'normal'
                          }}>
                            ({sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})
                          </Box>
                        )}
                      </TableSortLabel>
                    </TableCell>

                    {/* Games Column */}
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortConfig.column === 'gamesPlayed'}
                        direction={sortConfig.column === 'gamesPlayed' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('gamesPlayed')}
                        sx={{ 
                          fontWeight: 'bold',
                          color: sortConfig.column === 'gamesPlayed' ? 'primary.main' : 'text.primary',
                          '&:hover': {
                            color: 'primary.main',
                            backgroundColor: 'primary.50',
                            borderRadius: 1,
                          },
                          '&.Mui-active': {
                            color: 'primary.main',
                            fontWeight: 'bold',
                          },
                          '& .MuiTableSortLabel-icon': {
                            fontSize: '1.2rem',
                            opacity: sortConfig.column === 'gamesPlayed' ? 1 : 0.5,
                          }
                        }}
                      >
                        <Tooltip title="Number of games played">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <SportsEsportsIcon sx={{ fontSize: '1rem' }} />
                            Games
                          </Box>
                        </Tooltip>
                        {sortConfig.column === 'gamesPlayed' && (
                          <Box component="span" sx={{ 
                            ml: 0.5, 
                            color: 'primary.main',
                            fontSize: '0.7rem',
                            fontWeight: 'normal'
                          }}>
                            ({sortConfig.direction === 'asc' ? 'Low' : 'High'})
                          </Box>
                        )}
                      </TableSortLabel>
                    </TableCell>

                    {/* Status Column */}
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortConfig.column === 'status'}
                        direction={sortConfig.column === 'status' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('status')}
                        sx={{ 
                          fontWeight: 'bold',
                          color: sortConfig.column === 'status' ? 'primary.main' : 'text.primary',
                          '&:hover': {
                            color: 'primary.main',
                            backgroundColor: 'primary.50',
                            borderRadius: 1,
                          },
                          '&.Mui-active': {
                            color: 'primary.main',
                            fontWeight: 'bold',
                          },
                          '& .MuiTableSortLabel-icon': {
                            fontSize: '1.2rem',
                            opacity: sortConfig.column === 'status' ? 1 : 0.5,
                          }
                        }}
                      >
                        Status
                        {sortConfig.column === 'status' && (
                          <Box component="span" sx={{ 
                            ml: 0.5, 
                            color: 'primary.main',
                            fontSize: '0.7rem',
                            fontWeight: 'normal'
                          }}>
                            ({sortConfig.direction === 'asc' ? 'Active→Rest' : 'Rest→Active'})
                          </Box>
                        )}
                      </TableSortLabel>
                    </TableCell>

                    {/* Skill Level Column */}
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortConfig.column === 'skillLevel'}
                        direction={sortConfig.column === 'skillLevel' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('skillLevel')}
                        sx={{ 
                          fontWeight: 'bold',
                          color: sortConfig.column === 'skillLevel' ? 'primary.main' : 'text.primary',
                          '&:hover': {
                            color: 'primary.main',
                            backgroundColor: 'primary.50',
                            borderRadius: 1,
                          },
                          '&.Mui-active': {
                            color: 'primary.main',
                            fontWeight: 'bold',
                          },
                          '& .MuiTableSortLabel-icon': {
                            fontSize: '1.2rem',
                            opacity: sortConfig.column === 'skillLevel' ? 1 : 0.5,
                          }
                        }}
                      >
                        <Tooltip title="Player skill level">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <EmojiEventsIcon sx={{ fontSize: '1rem' }} />
                            Skill
                          </Box>
                        </Tooltip>
                        {sortConfig.column === 'skillLevel' && (
                          <Box component="span" sx={{ 
                            ml: 0.5, 
                            color: 'primary.main',
                            fontSize: '0.7rem',
                            fontWeight: 'normal'
                          }}>
                            ({sortConfig.direction === 'asc' ? 'S→F' : 'F→S'})
                          </Box>
                        )}
                      </TableSortLabel>
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
          )}
        </Box>

        {/* Skill Level Legend - Only show on desktop/tablet */}
        {!isMobile && (
          <Box sx={{ 
            mt: 2, 
            pt: 2, 
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            p: 3,
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
        )}
      </Paper>
    </Modal>
  );
};

export default PlayerListModal;