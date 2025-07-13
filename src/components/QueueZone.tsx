import React, { useContext } from 'react';
import Grid from '@mui/material/Grid';
import { Stack, Typography, Button, Box } from '@mui/material';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { Player } from '../types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';
import { Action } from '../app/Action';
import { AppContext } from '../BadmintonQueueUI';


type QueueZoneProps = {
  playersByQueue: Record<string, Player[]>;
  courtCount: number;
};

const MAX_PLAYERS_PER_COURT = 4;

const QueueZone: React.FC<QueueZoneProps> = ({ playersByQueue, courtCount }) => {
  const { state, dispatch } = useContext(AppContext);

  return (
    <Grid container spacing={2}>
      {Array.from({ length: courtCount }, (_, index) => {
        const queueId = `queue-${index}`;
        const queuePlayers = playersByQueue[queueId] || [];

        return (
          <Grid key={queueId} size={{ xs: 12, sm: 6 }}>
            <DroppableZone
              zone={queueId}
              players={queuePlayers}
              sx={{ backgroundColor: '#FBC02D' }}
            >
              {/* Header: Queue title + button */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 'bold', color: '#333' }}
                >
                  Queue {index + 1}
                </Typography>

                {queuePlayers.length > 0 && (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={
                      queuePlayers.length === 0 ||
                      Object.values(state.courts.playersByCourt).every(
                        (players) => players.length >= MAX_PLAYERS_PER_COURT
                      )
                    }
                    onClick={() => dispatch(Action.transferQueueToCourt(queueId))}
                    sx={{
                      backgroundColor: '#4A3F1C',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#3A321A',
                      },
                    }}
                  >
                    Transfer to Court
                  </Button>
                )}
              </Box>

              {/* Body content */}
              {queuePlayers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No players in queue.
                </Typography>
              ) : (
                <Flipper flipKey={queuePlayers.map(p => p.id).join(',')}>
                  <Grid container spacing={1}>
                    {queuePlayers.map((player) => (
                      <Flipped key={player.id} flipId={player.id}>
                        <Grid size={{ xs: 12, sm: 6, }}>
                          <PlayerCard player={player} zone={queueId} />
                        </Grid>
                      </Flipped>
                    ))}
                  </Grid>
                </Flipper>
              )}
            </DroppableZone>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default QueueZone;
