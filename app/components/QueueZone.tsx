import React, { useContext, useMemo, useCallback, useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import { Typography, Button, Box, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { Player } from './types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';
import { Action } from '../lib/store/Action';
import { AppContext } from '../BadmintonQueueUI';
import { PlayerStatus } from './types/Player';

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
          backdropFilter: 'blur(4px)',
        }}
      />
    );
  }
);

QueueFormatChip.displayName = 'QueueFormatChip';

// Position labels for queue grid
const QUEUE_POSITION_LABELS = ['Team A P1', 'Team B P1', 'Team A P2', 'Team B P2'];

// ✨ Memoized Queue Background SVG Component (similar to court)
const QueueBackground = React.memo(() => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 100"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
      opacity: 0.2,
    }}
    preserveAspectRatio="none"
  >
    {/* Queue waiting area outline */}
    <rect
      x="20"
      y="20"
      width="260"
      height="60"
      fill="none"
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="2"
      strokeDasharray="8,4"
      rx="8"
    />
    
    {/* Queue direction arrow */}
    <path
      d="M 40 50 L 80 50 M 70 40 L 80 50 L 70 60"
      stroke="rgba(0,0,0,0.3)"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    
    {/* Waiting positions indicators */}
    <circle cx="120" cy="35" r="3" fill="rgba(0,0,0,0.2)" />
    <circle cx="160" cy="35" r="3" fill="rgba(0,0,0,0.2)" />
    <circle cx="120" cy="65" r="3" fill="rgba(0,0,0,0.2)" />
    <circle cx="160" cy="65" r="3" fill="rgba(0,0,0,0.2)" />
    
    {/* Queue text */}
    <text x="220" y="55" fontSize="12" fill="rgba(0,0,0,0.3)" fontFamily="Arial, sans-serif">
      QUEUE
    </text>
  </svg>
));

QueueBackground.displayName = 'QueueBackground';

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
  mounted: boolean;
}>(({ queueId, index, players, courtCount, courtOccupancy, canRemove, onTransferToCourt, onRemoveQueue, mounted }) => {
  
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

  // Memoized the remove handler
  const handleRemove = useCallback(() => {
    onRemoveQueue(queueId);
  }, [queueId, onRemoveQueue]);

  // Memoized 2x2 position grid for queue
  const queuePositionGrid = useMemo(() => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 0.5,
        height: '60px',
        width: '100%',
      }}
    >
      {[0, 1, 2, 3].map((position) => {
        // ✅ FIXED: Find player assigned to this position based on queueOrder
        // AND ensure they are actually assigned to THIS queue
        const playerInPosition = players.find(p => 
          p.queueOrder === position && 
          p.status.includes(queueId as any) // Ensure player is actually in this queue
        );
        
        console.log(`🔍 Queue ${queueId} Position ${position}:`, playerInPosition ? `${playerInPosition.name} (order: ${playerInPosition.queueOrder})` : 'Empty');
        
        return (
          <DroppableZone
            key={`${queueId}-position-${position}`}
            zone={queueId} // ✨ Use regular zone name, not "queue-0-pos-2"
            position={position} // ✨ Pass position as prop
            players={playerInPosition ? [playerInPosition] : []}
          >
            {playerInPosition ? (
              <PlayerCard player={playerInPosition} zone={queueId} />
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.45rem', 
                  color: 'rgba(0,0,0,0.5)',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {QUEUE_POSITION_LABELS[position]}
              </Typography>
            )}
          </DroppableZone>
        );
      })}
    </Box>
  ), [queueId, players]);

  return (
    <Grid 
      size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 4 }}
      sx={{
        '@media (min-width: 600px) and (max-width: 1024px) and (orientation: portrait)': {
          width: '100% !important',
          maxWidth: '100% !important',
          flexBasis: '100% !important',
        }
      }}
    >
      <DroppableZone
        zone={queueId}
        players={players}
        sx={{ 
          backgroundColor: '#FBC02D',
          color: '#333',
          position: 'relative',
          minHeight: '140px',
          background: 'linear-gradient(135deg, #FBC02D 0%, #F9A825 100%)',
        }}
      >
        <QueueBackground />
        
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            width: '100%',
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
                  textShadow: '1px 1px 2px rgba(255,255,255,0.3)',
                }}
              >
                ⏳ Queue {index + 1}
              </Typography>
              
              {/* Remove queue button - only show if we can remove */}
              {mounted && canRemove && (
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
                    backgroundColor: 'rgba(74, 63, 28, 0.8)',
                    textTransform: 'none',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(0,0,0,0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(58, 50, 26, 0.9)',
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

          {/* Queue Position Grid - Always show the 2x2 grid */}
          {queuePositionGrid}
        </Box>
      </DroppableZone>
    </Grid>
  );
});

QueueItem.displayName = 'QueueItem';

// Add Queue Button Component
const AddQueueButton = React.memo<{ onAddQueue: () => void }>(({ onAddQueue }) => (
  <Grid 
    size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 4 }}
    sx={{
      '@media (min-width: 600px) and (max-width: 1024px) and (orientation: portrait)': {
        width: '100% !important',
        maxWidth: '100% !important', 
        flexBasis: '100% !important',
      }
    }}
  >
    <Box
      onClick={onAddQueue}
      sx={{
        minHeight: '140px',
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

  const [mounted, setMounted] = useState(false);
  const { state, dispatch } = useContext(AppContext);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      
      // Debug: Log queue players and their order
      console.log(`⏳ Queue ${queueId} players:`, queuePlayers.map(p => `${p.name} (order: ${p.queueOrder})`));
      
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
  const canRemoveQueues = useMemo(() => {
    // On server or before hydration, always return false to prevent showing remove buttons
    if (!mounted) return false;
    return queueData.length > 1;
  }, [queueData.length, mounted]);

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
        mounted={mounted}
      />
    )), 
    [queueData, courtCount, courtOccupancy, canRemoveQueues, handleTransferToCourt, handleRemoveQueue, mounted]
  );

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }} className="court-queue-medium-screen">
      {queueItems}
      {/* Add Queue Button */}
      <AddQueueButton onAddQueue={handleAddQueue} />
    </Grid>
  );
};

export default QueueZone;