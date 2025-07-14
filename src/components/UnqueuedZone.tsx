import React from 'react';
import { Typography, Grid, Badge, Box } from '@mui/material';
import { Player } from '../types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';
import MailIcon from '@mui/icons-material/Mail';

type UnqueuedZoneProps = {
  state: any; // ideally you'd define a proper type
};

type AppState = {
  courts: {
    playersByCourt: Record<string, Player[]>;
  };
  queue: {
    playersByQueue: Record<string, Player[]>;
  };
  unqueued: {
    players: Player[];
  };
};

function getPlayerStatus(player: Player, state: AppState): "court" | "queue" | "rest" {
  const inCourt = Object.values(state.courts.playersByCourt).some(court =>
    (court as Player[]).some(p => p.id === player.id)
  );
  if (inCourt) return "court";

  const inQueue = Object.values(state.queue.playersByQueue).some(queue =>
    (queue as Player[]).some(p => p.id === player.id)
  );
  if (inQueue) return "queue";

  return "rest";
}

const UnqueuedZone: React.FC<UnqueuedZoneProps> = ({ state  }) => {

  const allPlayers: Player[] = [
    ...state.unqueued.players,
    ...Object.values(state.queue.playersByQueue).flat(),
    ...Object.values(state.courts.playersByCourt).flat()
  ];

  const uniquePlayers = Array.from(new Map(allPlayers.map(p => [p.id, p])).values());

  const statusOrder = { rest: 0, queue: 1, court: 2 };

  const sortedPlayers = [...uniquePlayers].sort((a, b) => {
    const statusA = getPlayerStatus(a, state);
    const statusB = getPlayerStatus(b, state);

    // First sort by status priority: rest < queue < court
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }

    // Then by games played (ascending)
    if (a.gamesPlayed !== b.gamesPlayed) {
      return a.gamesPlayed - b.gamesPlayed;
    }

    // Finally by time entered (ascending)
    return a.timeEntered - b.timeEntered;
  });


  return (
    <DroppableZone 
      zone="rest" 
      players={uniquePlayers}
      sx={{ 
        backgroundColor: '#F5EFE6',
        borderRadius: 2,
        px: 2,
        py: 1,
        boxShadow: 'inset 0 0 4px rgba(0,0,0,0.04)', // Optional depth
        borderTop: '2px dashed #d8c9aa',
      }}
    >
      {uniquePlayers.length === 0 ? (
        <Typography variant="body2" sx={{ color: '#555555' }}>
          No players currently resting.
        </Typography>
      ) : (
        <Grid container spacing={1}>
          {sortedPlayers.map((player) => {
            const status = getPlayerStatus(player, state);
            const label = status === "court" ? "Court" : status === "queue" ? "Queue" : "";

            return (
              <Grid size={{ xs: 12, sm: 6, }} key={player.id}>
                <PlayerCard player={player} zone={status} />
              </Grid>
            );
          })}
        </Grid>
      )}
    </DroppableZone>
  );
};

export default UnqueuedZone;
