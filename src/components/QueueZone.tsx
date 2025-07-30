import React, { useContext, useMemo, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { Typography, Button, Box, Chip, IconButton } from '@mui/material';
import { Flipper, Flipped } from 'react-flip-toolkit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
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
  canRemove: boolean;
  onTransferToCourt: (queueId: string) => void;
  onRemoveQueue: (queueId: string) => void;
}>(({ queueId, index, players, courtCount, courtOccupancy, canRemove, onTransferToCourt, onRemoveQueue }) => {
  
  // Memoized queue format calculation
  const queueFormat = useMemo(() => getQueueFormat(players), [players]);
  
  // Memoized the disabled state calculation with more robust logic
  const isTransferDisabled = useMemo(() => {
    if (players.length === 0) return true;
    
    // FIXED: Check if any player is on court BUT NOT in this queue (non-advanced queue players)
    // Advanced queue players (teal) have both court and queue status and should be transferable
    const hasNonTransferablePlayer = players.some((player) => {
      const hasCourtStatus = player.status.some((s) => s.startsWith('court-'));
      const hasThisQueueStatus = player.status.includes(queueId as PlayerStatus);
      
      // Block transfer only if player is on court but NOT in this specific queue
      // This means they're playing but not actually queued for this transfer
      return hasCourtStatus && !hasThisQueueStatus;
    });
    
    if (hasNonTransferablePlayer) return true;
    
    // More robust check: see if there's any court with space
    const hasAvailableCourt = Array.from({ length: courtCount }).some((_, i) => {
      const courtId = `court-${i}`;
      const currentOccupancy = courtOccupancy[courtId] || 0;
      return currentOccupancy < MAX_PLAYERS_PER_COURT;
    });
    
    return !hasAvailableCourt;
  }, [players, courtCount, courtOccupancy, queueId]);

  // Memoized the transfer handler
  const handleTransfer = useCallback(() => {
    onTransferToCourt(queueId);
  }, [queueId, onTransferToCourt]);

  // Memoized the remove handler
  const handleRemove = useCallback(() => {
    onRemoveQueue(queueId);
  }, [queueId, onRemoveQueue]);

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
        {/* Header: Queue title, format chip, remove button, and transfer button */}
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
            
            {/* Remove queue button - only show if we can remove */}
            {canRemove && (
              <IconButton
                size="small"
                onClick={handleRemove}
                sx={{
                  padding: '2px',
                  backgroundColor: 'rgba(244,67,54,0.8)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(244,67,54,0.9)',
                  },
                }}
                title="Remove this queue"
              >
                <CloseIcon sx={{ fontSize: '0.7rem' }} />
              </IconButton>
            )}
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

// Add Queue Button Component
const AddQueueButton = React.memo<{ onAddQueue: () => void }>(({ onAddQueue }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Box
      onClick={onAddQueue}
      sx={{
        minHeight: '120px',
        backgroundColor: '#E8F5E9',
        borderRadius: 2,
        border: '2px dashed #4CAF50',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#C8E6C9',
          transform: 'scale(1.02)',
        },
      }}
    >
      <AddIcon
        sx={{
          fontSize: '2rem',
          color: '#4CAF50',
          marginBottom: '8px',
        }}
      />
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.8rem',
          color: '#2E7D32',
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        Add Queue
      </Typography>
    </Box>
  </Grid>
));

AddQueueButton.displayName = 'AddQueueButton';

const QueueZone: React.FC<QueueZoneProps> = ({ courtCount }) => {
  const { state, dispatch } = useContext(AppContext);

  // Memoize court occupancy calculation - use pre-calculated zone mappings
  const courtOccupancy = useMemo(() => {
    const occupancy: Record<string, number> = {};
    
    // Initialize all courts and use the pre-calculated mappings
    for (let i = 0; i < courtCount; i++) {
      const courtId = `court-${i}`;
      const playersInCourt = state.courts.playersByCourt[courtId] || [];
      occupancy[courtId] = playersInCourt.length;
    }
    
    return occupancy;
  }, [state.courts.playersByCourt, courtCount]);

  // Memoize queue data calculation - use direct zone mappings
  const queueData = useMemo(() => {
    const queues: Array<{ queueId: string; players: Player[] }> = [];
    
    // Use actual queue IDs from state and get players directly from the zone mappings
    const queueIds = Object.keys(state.queue.playersByQueue);
    
    queueIds.forEach((queueId) => {
      // Use the pre-calculated zone mapping instead of filtering players
      const queuePlayers = state.queue.playersByQueue[queueId] || [];
      queues.push({ queueId, players: queuePlayers });
    });
    
    return queues;
  }, [state.queue.playersByQueue]);

  // Memoized event handlers
  const handleTransferToCourt = useCallback((queueId: string) => {
    dispatch(Action.transferQueueToCourt(queueId));
  }, [dispatch]);

  // Add queue handler
  const handleAddQueue = useCallback(() => {
    dispatch(Action.createQueue());
  }, [dispatch]);

  // Remove queue handler
  const handleRemoveQueue = useCallback((queueId: string) => {
    dispatch(Action.removeQueue(queueId));
  }, [dispatch]);

  // Determine if queues can be removed (need at least 1)
  const canRemoveQueues = useMemo(() => queueData.length > 1, [queueData.length]);

  // Memoized the queue items
  const queueItems = useMemo(() => 
    queueData.map(({ queueId, players }, index) => (
      <QueueItem
        key={queueId}
        queueId={queueId}
        index={index}
        players={players}
        courtCount={courtCount}
        courtOccupancy={courtOccupancy}
        canRemove={canRemoveQueues}
        onTransferToCourt={handleTransferToCourt}
        onRemoveQueue={handleRemoveQueue}
      />
    )), 
    [queueData, courtCount, courtOccupancy, canRemoveQueues, handleTransferToCourt, handleRemoveQueue]
  );

  return (
    <Grid container spacing={2}>
      {queueItems}
      {/* Add Queue Button */}
      <AddQueueButton onAddQueue={handleAddQueue} />
    </Grid>
  );
};

export default QueueZone;