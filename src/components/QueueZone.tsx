import React, { useContext, useMemo, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { Typography, Button, Box, Chip } from '@mui/material';
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

// Helper function to determine queue format and organize players
const getQueueFormat = (players: Player[]) => {
  const playerCount = players.length;
  
  if (playerCount === 0) {
    return { format: 'Empty', teams: [] };
  } else if (playerCount === 1) {
    return { format: 'Solo', teams: [players] };
  } else if (playerCount === 2) {
    return { format: '1v1 Ready', teams: [players.slice(0, 1), players.slice(1, 2)] };
  } else if (playerCount === 3) {
    return { format: '2v1 Ready', teams: [players.slice(0, 2), players.slice(2, 3)] };
  } else if (playerCount === 4) {
    return { format: '2v2 Ready', teams: [players.slice(0, 2), players.slice(2, 4)] };
  } else {
    return { format: 'Overflow', teams: [players] };
  }
};

// Match format chip component for queues
const QueueFormatChip = React.memo<{ format: string; playerCount: number }>(
  ({ format, playerCount }) => {
    const getChipColor = () => {
      switch (format) {
        case 'Empty': return { bg: 'rgba(255,255,255,0.3)', text: 'rgba(0,0,0,0.6)' };
        case 'Solo': return { bg: 'rgba(255,193,7,0.9)', text: '#000' };
        case '1v1 Ready': return { bg: 'rgba(76,175,80,0.9)', text: 'white' };
        case '2v1 Ready': return { bg: 'rgba(255,152,0,0.9)', text: 'white' };
        case '2v2 Ready': return { bg: 'rgba(33,150,243,0.9)', text: 'white' };
        case 'Overflow': return { bg: 'rgba(244,67,54,0.9)', text: 'white' };
        default: return { bg: 'rgba(255,255,255,0.3)', text: 'rgba(0,0,0,0.6)' };
      }
    };

    const colors = getChipColor();
    const displayText = format === 'Empty' ? 'Waiting' : `${format} (${playerCount}/4)`;

    return (
      <Chip
        label={displayText}
        size="small"
        sx={{
          backgroundColor: colors.bg,
          color: colors.text,
          fontSize: '0.6rem',
          height: '20px',
          fontWeight: 'bold',
          border: '1px solid rgba(0,0,0,0.2)',
        }}
      />
    );
  }
);

QueueFormatChip.displayName = 'QueueFormatChip';

// Team display component for queues
const QueueTeamDisplay = React.memo<{
  players: Player[];
  queueId: string;
  teamLabel: string;
}>(({ players, queueId, teamLabel }) => (
  <Box
    sx={{
      flex: 1,
      minHeight: '50px',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 1,
      border: '2px dashed rgba(0,0,0,0.2)',
      p: 0.5,
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
    }}
  >
    <Typography
      variant="caption"
      sx={{
        fontSize: '0.55rem',
        color: 'rgba(0,0,0,0.7)',
        textAlign: 'center',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {teamLabel}
    </Typography>
    
    {players.length === 0 ? (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.55rem',
            color: 'rgba(0,0,0,0.5)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Waiting
        </Typography>
      </Box>
    ) : (
      <Grid container spacing={0.25}>
        {players.map((player) => (
          <Grid key={player.id} size={{ xs: 12 }}>
            <PlayerCard player={player} zone={queueId} />
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
));

QueueTeamDisplay.displayName = 'QueueTeamDisplay';

// Memoized queue item component
const QueueItem = React.memo<{
  queueId: string;
  index: number;
  players: Player[];
  courtCount: number;
  courtOccupancy: Record<string, number>;
  onTransferToCourt: (queueId: string) => void;
}>(({ queueId, index, players, courtCount, courtOccupancy, onTransferToCourt }) => {
  
  // Memoized queue format calculation
  const queueFormat = useMemo(() => getQueueFormat(players), [players]);
  
  // Memoized the disabled state calculation with more robust logic
  const isTransferDisabled = useMemo(() => {
    if (players.length === 0) return true;
    
    // Check if any player is already on court
    const hasPlayerOnCourt = players.some((player) =>
      player.status.some((s) => s.startsWith('court-'))
    );
    
    if (hasPlayerOnCourt) return true;
    
    // More robust check: see if there's any court with space
    const hasAvailableCourt = Array.from({ length: courtCount }).some((_, i) => {
      const courtId = `court-${i}`;
      const currentOccupancy = courtOccupancy[courtId] || 0;
      return currentOccupancy < MAX_PLAYERS_PER_COURT;
    });
    
    return !hasAvailableCourt;
  }, [players, courtCount, courtOccupancy]);

  // Memoized the transfer handler
  const handleTransfer = useCallback(() => {
    onTransferToCourt(queueId);
  }, [queueId, onTransferToCourt]);

  // Memoized the flip key for animations
  const flipKey = useMemo(() => 
    players.map(p => p.id).join(','), 
    [players]
  );

  // Memoized the empty message
  const emptyMessage = useMemo(() => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
        border: '2px dashed rgba(0,0,0,0.2)',
      }}
    >
      <Typography 
        variant="body2" 
        sx={{ 
          fontSize: '0.7rem', 
          color: 'rgba(0,0,0,0.6)',
          textAlign: 'center',
        }}
      >
        ⏳ Queue Available
        <br />
        <Box component="span" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
          Drag players to queue for next game
        </Box>
      </Typography>
    </Box>
  ), []);

  // Memoized the queue display
  const queueDisplay = useMemo(() => {
    if (queueFormat.format === 'Empty') {
      return emptyMessage;
    }

    if (queueFormat.format === 'Solo' || queueFormat.format === 'Overflow') {
      return (
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
      );
    }

    // For organized queues (1v1 Ready, 2v1 Ready, 2v2 Ready) - Remove VS label
    return (
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'stretch' }}>
        <QueueTeamDisplay
          players={queueFormat.teams[0] || []}
          queueId={queueId}
          teamLabel="Team A"
        />
        
        <QueueTeamDisplay
          players={queueFormat.teams[1] || []}
          queueId={queueId}
          teamLabel="Team B"
        />
      </Box>
    );
  }, [queueFormat, players, queueId, flipKey, emptyMessage]);

  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <DroppableZone
        zone={queueId}
        players={players}
        sx={{ 
          backgroundColor: '#FBC02D',
          minHeight: '120px',
          background: 'linear-gradient(135deg, #FBC02D 0%, #F9A825 100%)',
        }}
      >
        {/* Header: Queue title, format chip, and transfer button */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
          flexWrap="wrap"
          gap={0.5}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                fontWeight: 'bold',
                color: '#333',
                padding: '2px 4px',
              }}
            >
              ⏳ Queue {index + 1}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <QueueFormatChip format={queueFormat.format} playerCount={players.length} />
            
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
                  '&:disabled': {
                    backgroundColor: 'rgba(0,0,0,0.12)',
                    color: 'rgba(0,0,0,0.26)',
                  },
                }}
                title={
                  isTransferDisabled
                    ? players.some(p => p.status.some(s => s.startsWith('court-')))
                      ? "Players already on court"
                      : "All courts are full"
                    : `Transfer to available court (${Object.values(courtOccupancy).filter(count => count < MAX_PLAYERS_PER_COURT).length} courts available)`
                }
              >
                Transfer to Court
              </Button>
            )}
          </Box>
        </Box>

        {/* Queue display area */}
        {queueDisplay}
      </DroppableZone>
    </Grid>
  );
});

QueueItem.displayName = 'QueueItem';

const QueueZone: React.FC<QueueZoneProps> = ({ courtCount }) => {
  const { state, dispatch } = useContext(AppContext);

  // Memoize court occupancy calculation to avoid recalculating on every render
  // Use the same logic as the actual player filtering to ensure consistency
  const courtOccupancy = useMemo(() => {
    const occupancy: Record<string, number> = {};
    
    // Initialize all courts
    for (let i = 0; i < courtCount; i++) {
      const courtId = `court-${i}`;
      
      // Count players actually assigned to this court using the same logic as the app
      const playersInCourt = state.players.filter((p) => {
        const hasThisCourt = p.status.includes(courtId as PlayerStatus);
        const courtAssignments = p.status.filter((s) => s.startsWith('court-')).length;
        const queueAssignments = p.status.filter((s) => s.startsWith('queue-')).length;

        const isValid =
          hasThisCourt &&
          courtAssignments <= 1 &&
          queueAssignments <= 1;

        return isValid;
      });
      
      occupancy[courtId] = playersInCourt.length;
    }
    
    return occupancy;
  }, [state.players, courtCount]);

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