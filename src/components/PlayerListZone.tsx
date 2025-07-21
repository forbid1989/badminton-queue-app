import React from 'react';
import { Typography, Grid } from '@mui/material';
import { Player } from '../types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';

type PlayerListZoneProps = {
  state: {
    players: Player[];
  };
};

// 🔢 Visual priority for card colors
const statusOrder = {
  rest: 0,
  queue: 1,
  court: 2,
  'court-queued': 3,
};

// 🎯 Determine the player's card color zone
function determineVisualZone(player: Player): 'rest' | 'queue' | 'court' | 'court-queued' {
  const hasCourt = player.status.some((s) => s.startsWith('court-'));
  const hasQueue = player.status.some((s) => s.startsWith('queue-'));

  if (hasCourt && hasQueue) return 'court-queued'; // 🟧 Condition #6
  if (hasCourt) return 'court';                    // 🟩 Condition #4
  if (hasQueue) return 'queue';                    // 🟨 Condition #2 or #3
  return 'rest';                                   // 🤍 Condition #1
}

const PlayerListZone: React.FC<PlayerListZoneProps> = ({ state }) => {
  const allPlayers = state.players;

  const sortedPlayers = allPlayers.sort((a, b) => {
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
      {sortedPlayers.length === 0 ? (
        <Typography variant="body2" sx={{ color: '#555555' }}>
          No players found.
        </Typography>
      ) : (
        <Grid container spacing={1}>
          {sortedPlayers.map((player) => (
            <Grid size={{ xs: 12, sm: 6, }}>
              <PlayerCard player={player} zone={determineVisualZone(player)} />
            </Grid>
          ))}
        </Grid>
      )}
    </DroppableZone>
  );
};

export default PlayerListZone;
