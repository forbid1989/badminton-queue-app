import React, { useContext, useMemo, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { Typography, Button, Box } from '@mui/material';
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

// Memoized queue item component to prevent unnecessary re-renders
const QueueItem = React.memo<{
  queueId: string;
  index: number;
  players: Player[];
  courtCount: number;
  courtOccupancy: Record<string, number>;
  onTransferToCourt: (queueId: string) => void;
}>(({ queueId, index, players, courtCount, courtOccupancy, onTransferToCourt }) => {
  
  // Memoize the disabled state calculation
  const isTransferDisabled = useMemo(() => {
    if (players.length === 0) return true;
    
    // Check if any player is already on court
    const hasPlayerOnCourt = players.some((player) =>
      player.status.some((s) => s.startsWith('court-'))
    );
    
    if (hasPlayerOnCourt) return true;
    
    // Check if all courts are full
    const allCourtsFull = Array.from({ length: courtCount }).every((_, i) => {
      const courtId = `court-${i}`;
      return (courtOccupancy[courtId] || 0) >= MAX_PLAYERS_PER_COURT;
    });
    
    return allCourtsFull;
  }, [players, courtCount, courtOccupancy]);

  // Memoize the transfer handler
  const handleTransfer = useCallback(() => {
    onTransferToCourt(queueId);
  }, [queueId, onTransferToCourt]);

  // Memoize the flip key for animations
  const flipKey = useMemo(() => 
    players.map(p => p.id).join(','), 
    [players]
  );

  // Memoize the empty message
  const emptyMessage = useMemo(() => (
    <Typography 
      variant="body2" 
      color="text.secondary" 
      sx={{ fontSize: '0.7rem', paddingLeft: '4px' }}
    >
      No players in queue.
    </Typography>
  ), []);

  // Memoize the player grid
  const playerGrid = useMemo(() => (
    <Flipper flipKey={flipKey}>
      <Grid container spacing={1}>
        {players.map((player) => (
          <Flipped key={player.id} flipId={player.id}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <PlayerCard player={player} zone={queueId} />
            </Grid>
          </Flipped>
        ))}
      </Grid>
    </Flipper>
  ), [players, queueId, flipKey]);

  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <DroppableZone
        zone={queueId}
        players={players}
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

          {players.length > 0 && (
            <Button
              variant="contained"
              size="small"
              disabled={isTransferDisabled}
              onClick={handleTransfer}
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
        {players.length === 0 ? emptyMessage : playerGrid}
      </DroppableZone>
    </Grid>
  );
});

QueueItem.displayName = 'QueueItem';

const QueueZone: React.FC<QueueZoneProps> = ({ courtCount }) => {
  const { state, dispatch } = useContext(AppContext);

  // Memoize court occupancy calculation to avoid recalculating on every render
  const courtOccupancy = useMemo(() => {
    const occupancy: Record<string, number> = {};
    
    // Initialize all courts
    for (let i = 0; i < courtCount; i++) {
      const courtId = `court-${i}`;
      occupancy[courtId] = state.courts.playersByCourt[courtId]?.length || 0;
    }
    
    return occupancy;
  }, [state.courts.playersByCourt, courtCount]);

  // Memoize queue data calculation
  const queueData = useMemo(() => {
    const queues: Array<{ queueId: string; players: Player[] }> = [];
    
    for (let index = 0; index < courtCount; index++) {
      const queueId = `queue-${index}`;
      
      // Filter players for this specific queue
      const queuePlayers = state.players.filter((p) => {
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

      queues.push({ queueId, players: queuePlayers });
    }
    
    return queues;
  }, [state.players, courtCount]);

  // Memoize the transfer handler
  const handleTransferToCourt = useCallback((queueId: string) => {
    dispatch(Action.transferQueueToCourt(queueId));
  }, [dispatch]);

  // Memoize the queue items
  const queueItems = useMemo(() => 
    queueData.map(({ queueId, players }, index) => (
      <QueueItem
        key={queueId}
        queueId={queueId}
        index={index}
        players={players}
        courtCount={courtCount}
        courtOccupancy={courtOccupancy}
        onTransferToCourt={handleTransferToCourt}
      />
    )), 
    [queueData, courtCount, courtOccupancy, handleTransferToCourt]
  );

  return (
    <Grid container spacing={2}>
      {queueItems}
    </Grid>
  );
};

export default QueueZone;