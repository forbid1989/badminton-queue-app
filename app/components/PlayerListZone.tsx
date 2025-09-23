import React, { useMemo, useState, JSX, useEffect } from 'react';
import { Typography, Grid, TextField, Box, InputAdornment, Tabs, Tab, Badge, useMediaQuery, useTheme, Button, Stack } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import GroupIcon from '@mui/icons-material/Group';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import QueueIcon from '@mui/icons-material/Queue';
import SportsIcon from '@mui/icons-material/Sports';
import PaidIcon from '@mui/icons-material/Paid'; 
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { Player } from './types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';
import { SortableField } from './types/Settings';
import PlayerParserForm from './input/PlayerParserForm'; // Adjust path if needed

type PlayerListZoneProps = {
  state: {
    players: Player[];
    settings?: {
      playerListSort?: {
        secondarySort: SortableField;
        secondaryDirection: 'asc' | 'desc';
        tertiarySort: SortableField;
        tertiaryDirection: 'asc' | 'desc';
      };
      // Include other settings properties that might exist
      [key: string]: any;
    };
    // Include other state properties that might exist
    [key: string]: any;
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
      color: '#475569',
      description: 'All players'
    },
    { 
      value: 'waiting', 
      label: 'Waiting', 
      icon: <HourglassEmptyIcon />,
      color: '#64748b',
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
    { 
      value: 'paid', 
      label: 'Paid', 
      icon: <PaidIcon />,
      color: '#22C55E', // 🆕 Green color for paid players
      description: 'Players who have paid'
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
      return players.filter(player => !player.paymentInfo?.hasPaid);
    
    case 'waiting':
      return players.filter(player => 
        player.status.length === 0 && !player.paymentInfo?.hasPaid
      );
    
    case 'queued':
      return players.filter(player => {
        const hasQueue = player.status.some(s => s.startsWith('queue-'));
        const isPaid = player.paymentInfo?.hasPaid;
        return hasQueue && !isPaid;
      });
    
    case 'on-court':
      return players.filter(player => {
        const hasCourt = player.status.some(s => s.startsWith('court-'));
        const isPaid = player.paymentInfo?.hasPaid;
        return hasCourt && !isPaid;
      });

    case 'paid':
      return players.filter(player => {
        return player.paymentInfo?.hasPaid === true;
      });
    
    default:
      return players;
  }
};

  const comparePlayersByField = (
    a: Player, 
    b: Player, 
    field: SortableField, 
    direction: 'asc' | 'desc'
  ): number => {
    let comparison = 0;

    switch (field) {
      case 'timeEntered':
        comparison = a.timeEntered - b.timeEntered;
        break;
      case 'gamesPlayed':
        comparison = a.gamesPlayed - b.gamesPlayed;
        break;
      case 'skillLevel':
        // Convert skill levels to numeric values for comparison
        const skillOrder: Record<string, number> = { 'S': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6 };
        const aSkill = skillOrder[a.skillLevel] ?? 999;
        const bSkill = skillOrder[b.skillLevel] ?? 999;
        comparison = aSkill - bSkill;
        break;
      default:
        comparison = 0;
    }

    // Apply direction (desc reverses the comparison)
    return direction === 'desc' ? -comparison : comparison;
  };

const PlayerListZone: React.FC<PlayerListZoneProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [openAddPlayers, setOpenAddPlayers] = useState(false);

  const theme = useTheme();

  const isUltraWide = useMediaQuery('(min-width: 1830px)');
  const shouldUseIcons = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate tab counts for badges
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    tabs.forEach(tab => {
      const filteredPlayers = filterPlayersByTab(state.players, tab.value);
      counts[tab.value] = filteredPlayers.length;
    });
    
    return counts;
  }, [state.players]);

  const filteredAndSortedPlayers = useMemo(() => {
    // First filter by tab selection
    let tabFiltered = filterPlayersByTab(state.players, activeTab);
    
    // Then filter by search query
    const searchFiltered = tabFiltered.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    // Get sorting configuration from state settings
    const sortConfig = state.settings?.playerListSort || {
      secondarySort: 'gamesPlayed' as SortableField,
      secondaryDirection: 'asc' as 'asc' | 'desc',
      tertiarySort: 'timeEntered' as SortableField,
      tertiaryDirection: 'asc' as 'asc' | 'desc'
    };

    // Then sort the filtered results
    return searchFiltered.sort((a, b) => {

      if (activeTab === 'paid') {
        const aPaidAt = a.paymentInfo?.paidAt || 0;
        const bPaidAt = b.paymentInfo?.paidAt || 0;
        if (aPaidAt !== bPaidAt) {
          return bPaidAt - aPaidAt; // Most recent payments first
        }
      }
      // 1st level: Always sort by visual zone status (Court → Queue → Waiting)
      const zoneA = determineVisualZone(a);
      const zoneB = determineVisualZone(b);

      if (statusOrder[zoneA] !== statusOrder[zoneB]) {
        return statusOrder[zoneA] - statusOrder[zoneB];
      }

      // 2nd level: Use configured secondary sort
      const secondaryComparison = comparePlayersByField(a, b, sortConfig.secondarySort, sortConfig.secondaryDirection);
      if (secondaryComparison !== 0) {
        return secondaryComparison;
      }

      // 3rd level: Use configured tertiary sort
      const tertiaryComparison = comparePlayersByField(a, b, sortConfig.tertiarySort, sortConfig.tertiaryDirection);
      return tertiaryComparison;
    });
  }, [state.players, searchQuery, activeTab, state.settings?.playerListSort]);

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
      case 'paid':
        return "No players have been marked as paid yet.";
      default:
        return "No players found.";
    }
  }, [searchQuery, activeTab]);

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
          variant="fullWidth"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minHeight: { xs: 48, sm: 40 },
              fontSize: '0.75rem',
              textTransform: 'none',
              fontWeight: 500,
              minWidth: 'auto',
              px: { xs: 0.5, sm: 1, md: 2 },
              position: 'relative',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1e293b',
            },
            '& .Mui-selected': {
              color: '#1e293b !important',
              fontWeight: 600,
            },
            '& .MuiTabs-scroller': {
              marginLeft: 0,
              paddingLeft: 0,
            },
            '& .MuiTabs-flexContainer': {
              paddingLeft: 0,
              marginLeft: 0,
            },
          }}
        >
          {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                sx={{
                  ...(tab.value === 'paid' && {
                    '&.Mui-selected': {
                      color: '#22C55E !important',
                    },
                  }),
                }}
                label={
                  <Badge 
                    badgeContent={mounted ? tabCounts[tab.value] : 0}
                    max={99}
                    suppressHydrationWarning
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: { xs: '0.65rem', sm: '0.6rem' },
                        minWidth: { xs: '18px', sm: '16px' },
                        height: { xs: '18px', sm: '16px' },
                        right: { xs: 3, sm: 0 },
                        top: { xs: -6, sm: -4 },
                        backgroundColor: 'transparent',
                        color: '#1e293b',
                        border: 'none',
                        fontWeight: 'bold',
                        textShadow: { xs: '0 0 2px rgba(255,255,255,0.8)', sm: 'none' },
                      }
                    }}
                  >
                    {shouldUseIcons ? (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: tab.color,
                        width: '100%',
                        minHeight: { xs: 32, sm: 24 }
                      }}>
                        {React.cloneElement(tab.icon, { sx: { xs: '1.2rem', sm: '1.1rem' } })}
                      </Box>
                    ) : (
                      // Desktop/Laptop: Color dot + label
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.75,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        width: '100%',
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
                  <SearchIcon sx={{ color: '#64748b', fontSize: '1.2rem' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <ClearIcon
                    sx={{ 
                      color: '#64748b', 
                      fontSize: '1rem', 
                      cursor: 'pointer',
                      '&:hover': { color: '#475569' }
                    }}
                    onClick={handleClearSearch}
                  />
                </InputAdornment>
              ),
              sx: {
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff', // White background
                  borderRadius: 1.5,
                  '& fieldset': {
                    borderColor: '#cbd5e1', // Soft gray border
                  },
                  '&:hover fieldset': {
                    borderColor: '#94a3b8',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3b82f6', // Blue accent when focused
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#1e293b', // Dark navy text
                  fontSize: '0.875rem',
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#64748b', // Gray placeholder
                  opacity: 1,
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
          backgroundColor: '#f1f5f9',
          borderRadius: 2,
          px: 2,
          py: 1,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          minHeight: '200px',
          position: 'relative',
          transition: 'all 0.3s ease',
          '&::before': {
            content: activeTab === 'paid' 
              ? '"Paid players are shown here. Use \\"Mark Unpaid\\" to move them back to waiting."'
              : '"Drop players here to return them to the player list"',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#94a3b8',
            fontSize: '0.85rem',
            fontStyle: 'italic',
            textAlign: 'center',
            pointerEvents: 'none',
            opacity: shouldShowDropMessage ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 1,
          },
          '&:hover': {
            borderColor: '#94a3b8',
            backgroundColor: '#f8fafc', // Very light gray on hover
          },
          ...(activeTab === 'paid' && {
            backgroundColor: '#f0fdf4', // Light green background
            borderColor: '#bbf7d0',
            '&:hover': {
              borderColor: '#86efac',
              backgroundColor: '#ecfdf5',
            },
          }),
        }}
      >
        <Grid 
          container 
          spacing={{ xs: 0.5, sm: 1 }} 
          justifyContent="center"
        >
          {mounted && filteredAndSortedPlayers.length === 0 ? (
            // Show empty message in a Grid item to maintain structure
            <Grid size={12}>
              {/* Enhanced empty state for "All" tab when no search query */}
              {activeTab === 'all' && !searchQuery.trim() ? (
                <Stack 
                  spacing={2} 
                  alignItems="center" 
                  sx={{ 
                    py: 4, 
                    px: 2, 
                    textAlign: 'center',
                  }}
                >
                  {/* Friendly icon */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1,
                    }}
                  >
                    <GroupAddIcon 
                      sx={{ 
                        fontSize: '1.5rem', 
                        color: 'primary.main'
                      }} 
                    />
                  </Box>

                  {/* Main message */}
                  <Typography 
                    variant="h6"
                    sx={{ 
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#374151',
                      mb: 0.5,
                    }}
                  >
                    No Players Yet
                  </Typography>

                  {/* Helpful description */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#6B7280',
                      fontSize: '0.85rem',
                      maxWidth: 280,
                      lineHeight: 1.4,
                      mb: 1,
                    }}
                  >
                    Get started by adding players to your queue. You can add them individually or paste a list of names.
                  </Typography>

                  {/* Call to action button */}
                  <Button
                    variant="contained"
                    color="primary"
                    size="medium"
                    startIcon={<GroupAddIcon />}
                    onClick={() => setOpenAddPlayers(true)}
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 2,
                      px: 2.5,
                      py: 1,
                      boxShadow: '0 3px 10px rgba(59, 130, 246, 0.3)',
                      '&:hover': {
                        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    Add Players
                  </Button>

                  {/* Helper text */}
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#9CA3AF',
                      fontSize: '0.75rem',
                      mt: 0.5,
                    }}
                  >
                    You can also use the{' '}
                    <GroupAddIcon sx={{ fontSize: '0.9rem', verticalAlign: 'middle', mx: 0.3 }} />
                    {' '}icon in the toolbar
                  </Typography>
                </Stack>
              ) : (
                // Simple message for other tabs or when searching
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#555555', 
                    textAlign: 'center', 
                    py: 2 
                  }}
                  suppressHydrationWarning
                >
                  {emptyMessage}
                </Typography>
              )}
            </Grid>
          ) : mounted ? (
            // Show player cards when mounted and has players
            filteredAndSortedPlayers.map((player) => (
              <Grid 
                key={player.id} 
                size={{ xs: 6, sm: 12, md: 12, lg: 6, xl: isUltraWide ? 4 : 6 }}
              >
                <PlayerCard player={player} zone="all" />
              </Grid>
            ))
          ) : (
            // Show nothing initially to prevent hydration mismatch
            null
          )}
        </Grid>
      </DroppableZone>
      <PlayerParserForm 
        open={openAddPlayers} 
        onClose={() => setOpenAddPlayers(false)} 
      />
    </Box>
  );
};

export default PlayerListZone;