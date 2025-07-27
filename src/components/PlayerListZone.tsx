import React, { useMemo, useState } from 'react';
import { Typography, Grid, TextField, Box, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Player } from '../types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';

type PlayerListZoneProps = {
  state: {
    players: Player[];
  };
};

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

const PlayerListZone: React.FC<PlayerListZoneProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Memoize the filtering and sorting operation
  const filteredAndSortedPlayers = useMemo(() => {
    // First filter by search query
    const filtered = state.players.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    // Then sort the filtered results
    return filtered.sort((a, b) => {
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
  }, [state.players, searchQuery]);

  // Handle clearing the search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // ✅ Memoize the empty state message
  const emptyMessage = useMemo(() => {
    const isSearching = searchQuery.trim() !== '';
    return (
      <Typography variant="body2" sx={{ color: '#555555', textAlign: 'center', py: 2 }}>
        {isSearching 
          ? `No players found matching "${searchQuery}"`
          : "No players found."
        }
      </Typography>
    );
  }, [searchQuery]);

  // ✅ Memoize the player grid to avoid re-rendering when players haven't changed
  const playerGrid = useMemo(() => (
    <Grid container spacing={1}>
      {filteredAndSortedPlayers.map((player) => (
        <Grid key={player.id} size={{ xs: 12, sm: 6 }}>
          {/* IMPORTANT: Always pass "all" as the zone for cards in PlayerListZone */}
          <PlayerCard player={player} zone="all" />
        </Grid>
      ))}
    </Grid>
  ), [filteredAndSortedPlayers]);

  return (
    <Box>
      {/* Search Filter */}
      <Box sx={{ mb: 1.5, px: 1 }}>
        <TextField
          size="small"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          fullWidth
          InputProps={{
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
            {filteredAndSortedPlayers.length} of {state.players.length} players
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
          maxHeight: 'calc(100vh - 300px)', // Limit height to allow scrolling
          overflowY: 'auto', // Add vertical scrollbar when needed
          // Ensure scrollbar is visible and styled
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#5C4033',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: '#3E2723',
            },
          },
          // For Firefox
          scrollbarWidth: 'thin',
          scrollbarColor: '#5C4033 rgba(0,0,0,0.1)',
        }}
      >
        {filteredAndSortedPlayers.length === 0 ? emptyMessage : playerGrid}
      </DroppableZone>
    </Box>
  );
};

export default PlayerListZone;