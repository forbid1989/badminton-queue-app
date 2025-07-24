import React, { useMemo, useCallback } from 'react';
import { Typography, Grid } from '@mui/material';
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
  // ✅ Memoize the sorting operation to only run when players array changes
  const sortedPlayers = useMemo(() => {
    // Create a shallow copy to avoid mutating the original array
    return [...state.players].sort((a, b) => {
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
  }, [state.players]);

  // ✅ Memoize the empty state message to avoid unnecessary re-renders
  const emptyMessage = useMemo(() => (
    <Typography variant="body2" sx={{ color: '#555555' }}>
      No players found.
    </Typography>
  ), []);

  // ✅ Memoize the player grid to avoid re-rendering when players haven't changed
  const playerGrid = useMemo(() => (
    <Grid container spacing={1}>
      {sortedPlayers.map((player) => (
        <Grid key={player.id} size={{ xs: 12, sm: 6 }}>
          {/* IMPORTANT: Always pass "all" as the zone for cards in PlayerListZone */}
          <PlayerCard player={player} zone="all" />
        </Grid>
      ))}
    </Grid>
  ), [sortedPlayers]);

  return (
    <DroppableZone
      zone="all"
      players={sortedPlayers}
      sx={{
        backgroundColor: '#F5EFE6',
        borderRadius: 2,
        px: 2,
        py: 1,
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.04)',
        borderTop: '2px dashed #d8c9aa',
      }}
    >
      {sortedPlayers.length === 0 ? emptyMessage : playerGrid}
    </DroppableZone>
  );
};

export default PlayerListZone;