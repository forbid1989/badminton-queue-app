import React, { useMemo, useState, JSX } from 'react';
import { Typography, Grid, TextField, Box, InputAdornment, Tabs, Tab, Badge } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useMediaQuery, useTheme } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import QueueIcon from '@mui/icons-material/Queue';
import SportsIcon from '@mui/icons-material/Sports';
import { Player } from './types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';

type PlayerListZoneProps = {
  state: {
    players: Player[];
  };
};

type TabConfig = {
  value: string;
  label: string;
  icon: JSX.Element;
  color: string;
  description: string;
};

// Tab configuration
const tabs: TabConfig[] = [
    { 
      value: 'all', 
      label: 'All', 
      icon: <GroupIcon />,
      color: '#8B7355',
      description: 'All players'
    },
    { 
      value: 'waiting', 
      label: 'Waiting', 
      icon: <HourglassEmptyIcon />,
      color: '#E8D8C4',
      description: 'Players resting/unassigned'
    },
    { 
      value: 'queued', 
      label: 'Queued', 
      icon: <QueueIcon />,
      color: '#E5D78A',
      description: 'Players in queue'
    },
    { 
      value: 'on-court', 
      label: 'Court', 
      icon: <SportsIcon />,
      color: '#B5CDA3',
      description: 'Players currently playing'
    },
  ];

// 🔢 Visual priority for card colors - moved outside component to avoid recreation
const statusOrder = {
  rest: 0,
  queue: 1,
  court: 2,
  'court-queued': 3,
} as const;

// 🎯 Determine the player's card color zone - moved outside and memoized for better performance
const determineVisualZone = (player: Player): 'rest' | 'queue' | 'court' | 'court-queued' => {
  const hasCourt = player.status.some((s) => s.startsWith('court-'));
  const hasQueue = player.status.some((s) => s.startsWith('queue-'));

  if (hasCourt && hasQueue) return 'court-queued'; // 🟧 Condition #6
  if (hasCourt) return 'court';                    // 🟩 Condition #4
  if (hasQueue) return 'queue';                    // 🟨 Condition #2 or #3
  return 'rest';                                   // 🤍 Condition #1
};

// Filter players based on tab selection
const filterPlayersByTab = (players: Player[], tab: string): Player[] => {
  switch (tab) {
    case 'all':
      return players;
    
    case 'waiting':
      return players.filter(player => player.status.length === 0);
    
    case 'queued':
      return players.filter(player => {
        const hasQueue = player.status.some(s => s.startsWith('queue-'));
        const hasCourt = player.status.some(s => s.startsWith('court-'));
        // Include players who are only in queue OR players who are in both (teal)
        return hasQueue;
      });
    
    case 'on-court':
      return players.filter(player => {
        const hasCourt = player.status.some(s => s.startsWith('court-'));
        // Include all players on court (including teal ones)
        return hasCourt;
      });
    
    default:
      return players;
  }
};

const PlayerListZone: React.FC<PlayerListZoneProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const theme = useTheme();

  const shouldUseIcons = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  // Calculate tab counts for badges
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    tabs.forEach(tab => {
      const filteredPlayers = filterPlayersByTab(state.players, tab.value);
      counts[tab.value] = filteredPlayers.length;
    });
    
    return counts;
  }, [state.players]);

  // ✅ Memoize the filtering and sorting operation
  const filteredAndSortedPlayers = useMemo(() => {
    // First filter by tab selection
    let tabFiltered = filterPlayersByTab(state.players, activeTab);
    
    // Then filter by search query
    const searchFiltered = tabFiltered.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    // Then sort the filtered results
    return searchFiltered.sort((a, b) => {
      const zoneA = determineVisualZone(a);
      const zoneB = determineVisualZone(b);

      if (statusOrder[zoneA] !== statusOrder[zoneB]) {
        return statusOrder[zoneA] - statusOrder[zoneB];
      }

      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed;
      }

      return a.timeEntered - b.timeEntered;
    });
  }, [state.players, searchQuery, activeTab]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    // Clear search when changing tabs for better UX
    setSearchQuery('');
  };

  // Handle clearing the search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // ✅ Memoize the empty state message
  const emptyMessage = useMemo(() => {
    const isSearching = searchQuery.trim() !== '';
    const currentTab = tabs.find(t => t.value === activeTab);
    const tabName = currentTab?.label || 'this category';
    
    if (isSearching) {
      return `No players found matching "${searchQuery}" in ${tabName}`;
    }
    
    switch (activeTab) {
      case 'waiting':
        return "No players are currently waiting. All players are either in queue or on court.";
      case 'queued':
        return "No players are currently in queue.";
      case 'on-court':
        return "No players are currently on court.";
      default:
        return "No players found.";
    }
  }, [searchQuery, activeTab]);

  // ✅ Memoize the player grid with better responsive sizing
  const playerGrid = useMemo(() => (
    <Grid container spacing={{ xs: 0.5, sm: 1 }}>
      {filteredAndSortedPlayers.map((player) => (
        <Grid 
          key={player.id} 
          size={{ xs: 6, sm: 12, md: 12, lg: 6, xl: 4 }}
        >
          {/* IMPORTANT: Always pass "all" as the zone for cards in PlayerListZone */}
          <PlayerCard player={player} zone="all" />
        </Grid>
      ))}
    </Grid>
  ), [filteredAndSortedPlayers]);

  // 🆕 Calculate whether to show the drop message
  const shouldShowDropMessage = useMemo(() => {
    // Only show drop message if:
    // 1. There are no players in the current tab view (filteredAndSortedPlayers.length === 0)
    // 2. AND there are actually players in the system (state.players.length > 0)
    // 3. AND user is not currently searching
    // 4. AND we're on the "All" tab (other tabs might legitimately be empty)
    const hasNoPlayersInView = filteredAndSortedPlayers.length === 0;
    const hasPlayersInSystem = state.players.length > 0;
    const isNotSearching = searchQuery.trim() === '';
    const isAllTab = activeTab === 'all';
    
    return hasNoPlayersInView && hasPlayersInSystem && isNotSearching && isAllTab;
  }, [filteredAndSortedPlayers.length, state.players.length, searchQuery, activeTab]);

  return (
    <Box sx={{ px: { xs: 0.5, sm: 0.5, md: 0.5, lg: 1 } }}>
      {/* Tab Navigation */}
      <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minHeight: 40,
              fontSize: '0.75rem',
              textTransform: 'none',
              fontWeight: 500,
              minWidth: 'auto',
              px: { xs: 1, sm: 1, md: 2 },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#5C4033',
            },
            '& .Mui-selected': {
              color: '#5C4033 !important',
              fontWeight: 600,
            },
          }}
        >
          {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={
                  <Badge 
                    badgeContent={tabCounts[tab.value]} 
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        minWidth: '16px',
                        height: '16px',
                        right: -8,
                        top: -8,
                        backgroundColor: 'transparent',
                        color: '#5C4033',
                        border: 'none',
                        fontWeight: 'bold',
                      }
                    }}
                  >
                    {shouldUseIcons ? (
                      // Mobile/Tablet: Colored icon only
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: tab.color,
                      }}>
                        {React.cloneElement(tab.icon, { sx: { fontSize: '1.1rem' } })}
                      </Box>
                    ) : (
                      // Desktop/Laptop: Color dot + label
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.75,
                        flexDirection: 'row'
                      }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: tab.color,
                            border: '1.5px solid rgba(0,0,0,0.2)',
                            flexShrink: 0,
                          }}
                        />
                        <span>{tab.label}</span>
                      </Box>
                    )}
                  </Badge>
                }
                title={tab.description}
              />
          ))}
        </Tabs>
      </Box>

      {/* Search Filter */}
      <Box sx={{ mb: 1.5, px: { xs: 0.5, lg: 1 } }}> 
        <TextField
          size="small"
          placeholder={`Search in ${tabs.find(t => t.value === activeTab)?.label.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1rem', color: '#666' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <ClearIcon
                    sx={{ 
                      fontSize: '1rem', 
                      color: '#666', 
                      cursor: 'pointer',
                      '&:hover': { color: '#333' }
                    }}
                    onClick={handleClearSearch}
                  />
                </InputAdornment>
              ),
              sx: {
                fontSize: '0.8rem',
                backgroundColor: '#fff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ddd',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#bbb',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#5C4033',
                },
              }
            }
          }}
          sx={{
            '& .MuiInputLabel-root': {
              fontSize: '0.8rem',
            },
          }}
        />
        
        {/* Results count */}
        {searchQuery && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#666', 
              fontSize: '0.7rem',
              display: 'block',
              mt: 0.5,
              textAlign: 'center'
            }}
          >
            {filteredAndSortedPlayers.length} of {tabCounts[activeTab]} players in {tabs.find(t => t.value === activeTab)?.label.toLowerCase()}
          </Typography>
        )}
      </Box>

      {/* Player List */}
      <DroppableZone
        zone="all"
        players={filteredAndSortedPlayers}
        sx={{
          backgroundColor: '#F5EFE6',
          borderRadius: 2,
          px: 2,
          py: 1,
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.04)',
          borderTop: '2px dashed #d8c9aa',
          minHeight: '200px', // 🆕 Ensure adequate drop target size
          position: 'relative',
          // 🆕 Enhanced styling when players are being dragged over from courts/queues
          transition: 'all 0.3s ease',
          '&::before': {
            content: '"Drop players here to return them to the player list"',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(0,0,0,0.3)',
            fontSize: '0.85rem',
            fontStyle: 'italic',
            textAlign: 'center',
            pointerEvents: 'none',
            opacity: shouldShowDropMessage ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 1,
          },
        }}
      >
        {filteredAndSortedPlayers.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#555555', textAlign: 'center', py: 2 }}>
            {emptyMessage}
          </Typography>
        ) : (
          playerGrid
        )}
      </DroppableZone>
    </Box>
  );
};

export default PlayerListZone;