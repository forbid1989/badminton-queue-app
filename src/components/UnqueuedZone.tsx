import React from 'react';
import { Typography, Grid  } from '@mui/material';
import { Player } from '../types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';

type UnqueuedZoneProps = {
  players: Player[];
};

const UnqueuedZone: React.FC<UnqueuedZoneProps> = ({ players }) => {

  const sortedPlayers = [...players]
    .filter((p) => p.status === 'rest')
    .sort((a, b) => {
      if (a.gamesPlayed !== b.gamesPlayed) {
        return a.gamesPlayed - b.gamesPlayed; // Primary: fewest games
      }
      return a.timeEntered - b.timeEntered;   // Secondary: longest rest
    });

  return (
    <DroppableZone 
      zone="rest" 
      players={players}
      sx={{ 
        backgroundColor: '#F5EFE6',
        borderRadius: 2,
        px: 2,
        py: 1,
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.04)', // Optional depth
        borderTop: '2px dashed #d8c9aa',
      }}
    >
      {players.length === 0 ? (
        <Typography variant="body2" sx={{ color: '#555555' }}>
          No players currently resting.
        </Typography>
      ) : (
        <Grid container spacing={1}>
          {sortedPlayers.map((player) => (
            <Grid size={{ xs: 12, sm: 6, }} key={player.id}>
              <PlayerCard player={player} zone="rest" />
            </Grid>
          ))}
        </Grid>
      )}
    </DroppableZone>
  );
};

export default UnqueuedZone;
