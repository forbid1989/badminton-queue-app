import React, { useContext } from 'react';
import Grid from '@mui/material/Grid';
import { Card, Button , Typography, Box } from '@mui/material';
import { Player } from '../types/Player';
import DroppableZone from './DroppableZone';
import PlayerCard from './PlayerCard';
import { AppContext } from '../BadmintonQueueUI'; // ✅ Context
import { Action } from '../app/Action'; // ✅ Action creators

type CourtZoneProps = {
  playersByCourt: Record<string, Player[]>;
  courtCount: number;
};

const CourtZone: React.FC<CourtZoneProps> = ({ playersByCourt, courtCount }) =>  {

	const { dispatch } = useContext(AppContext); // ✅ Get dispatch from context
	
	return (
    <Grid container spacing={2}>
      {Array.from({ length: courtCount }, (_, index) => {
        const courtId = `court-${index}`;
        const courtPlayers = playersByCourt[courtId] || [];

        return (
          <Grid size={{ xs: 12, sm: 6 }} key={courtId}>
            <DroppableZone zone={courtId} players={courtPlayers} sx={{backgroundColor: '#00936a', color: '#fff',}}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',  // Smaller font
                    fontWeight: 'bold',
                    color: 'white',
                    padding: '2px 4px'
                  }}
                >
                  Court {index + 1}
                </Typography>
                {courtPlayers.length > 0 && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => dispatch(Action.endGame(courtId))}
                    sx={{
                      fontSize: '0.65rem', // Smaller font
                      padding: '2px 6px', // Smaller button padding
                      backgroundColor: '#365F2C',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#2d4f24',
                      },
                    }}
                  >
                    End Game
                  </Button>
                )}
              </Box>

              {courtPlayers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem', paddingLeft: '4px' }}>
                  No players assigned.
                </Typography>
              ) : (
                <Grid container spacing={1}>
                  {courtPlayers.map((player) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={player.id}>
                      <PlayerCard player={player} zone={courtId} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </DroppableZone>
          </Grid>
        );
      })}
    </Grid>
	);
}

export default CourtZone


