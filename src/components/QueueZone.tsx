import React, { useContext } from 'react';
import Grid from '@mui/material/Grid';
import { Stack, Typography, Button, Box } from '@mui/material';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { Player } from '../types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';
import { Action } from '../app/Action';
import { AppContext } from '../BadmintonQueueUI';
import { PlayerStatus } from '../types/Player';


type QueueZoneProps = {
  courtCount: number;
};

const MAX_PLAYERS_PER_COURT = 4;

const QueueZone: React.FC<QueueZoneProps> = ({courtCount }) => {
  const { state, dispatch } = useContext(AppContext);
  const players = state.players;

  return (
    <Grid container spacing={2}>
      {Array.from({ length: courtCount }, (_, index) => {
        const queueId = `queue-${index}`;
        const queuePlayers = players.filter((p) => {
          const hasThisQueue = p.status.includes(queueId as PlayerStatus);
          const queueCount = p.status.filter((s) => s.startsWith('queue-')).length;
          const courtCount = p.status.filter((s) => s.startsWith('court-')).length;

          // ✅ Allow status: ['queue-*'] or ['court-*', 'queue-*']
          const isValid =
            hasThisQueue &&
            queueCount <= 1 &&
            courtCount <= 1 &&
            !(courtCount > 1 || queueCount > 1);
          return isValid;
        });

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
                  sx={{
                    fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                    fontWeight: 'bold',
                    color: '#333',
                    padding: '2px 4px',
                  }}
                >
                  Queue {index + 1}
                </Typography>

                {queuePlayers.length > 0 && (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={
                      queuePlayers.length === 0 ||
                      // 🔴 Any player already on court should disable the button
                      queuePlayers.some((player) =>
                        player.status.some((s) => s.startsWith('court-'))
                      ) ||
                      // 🔴 All courts are full
                      Array.from({ length: courtCount }).every((_, i) => {
                        const courtId = `court-${i}`;
                        const courtPlayers = state.courts.playersByCourt[courtId] || [];
                        return courtPlayers.length >= MAX_PLAYERS_PER_COURT;
                      })
                    }
                    onClick={() => dispatch(Action.transferQueueToCourt(queueId))}
                    sx={{
                      fontSize: '0.65rem',
                      padding: '2px 6px',
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
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', paddingLeft: '4px' }}>
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
