import React, { useContext, useMemo, useCallback, useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import { Typography, Button, Box, Chip, IconButton, useMediaQuery, Popover, Modal, Paper, FormControl, InputLabel, Select, MenuItem, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SportsIcon from '@mui/icons-material/Sports';
import { Player } from './types/Player';
import PlayerCard from './PlayerCard';
import DroppableZone from './DroppableZone';
import { Action } from '../lib/store/Action';
import { AppContext } from '../BadmintonQueueUI';
import QueueIcon from '@mui/icons-material/Queue';


type QueueZoneProps = {
  courtCount: number;
};

// Helper function to determine queue format and organize players
const getQueueFormat = (players: Player[]) => {
  const playerCount = players.length;
  
  if (playerCount === 0) {
    return { format: 'Empty', teams: [] };
  } else if (playerCount === 1) {
    return { format: 'Solo', teams: [players] };
  } else if (playerCount === 2) {
    return { format: '1v1', teams: [players.slice(0, 1), players.slice(1, 2)] };
  } else if (playerCount === 3) {
    return { format: '2v1', teams: [players.slice(0, 2), players.slice(2, 3)] };
  } else if (playerCount === 4) {
    return { format: '2v2', teams: [players.slice(0, 2), players.slice(2, 4)] };
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
        case '1v1': return { bg: 'rgba(76,175,80,0.9)', text: 'white' };
        case '2v1': return { bg: 'rgba(255,152,0,0.9)', text: 'white' };
        case '2v2': return { bg: 'rgba(33,150,243,0.9)', text: 'white' };
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

const EnhancedTransferButton = React.memo<{
  queueId: string;
  players: Player[];
  courtCount: number;
  courtOccupancy: Record<string, number>;
  onTransferToCourt: (queueId: string) => void;
  onTransferToSpecificCourt: (queueId: string, courtId: string) => void;
}>(({ queueId, players, courtCount, courtOccupancy, onTransferToCourt, onTransferToSpecificCourt }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState('');

  const MAX_PLAYERS_PER_COURT = 4;

  // Calculate available courts and transfer logic
  const { availableCourts, canTransfer, disabledReason, hasMultipleOptions } = useMemo(() => {
    if (players.length === 0) {
      return {
        availableCourts: [],
        canTransfer: false,
        disabledReason: 'No players in queue',
        hasMultipleOptions: false,
      };
    }

    // Check if any player is already on court
    const hasPlayerOnCourt = players.some((player) =>
      player.status.some((s) => s.startsWith('court-'))
    );

    if (hasPlayerOnCourt) {
      return {
        availableCourts: [],
        canTransfer: false,
        disabledReason: 'Players already on court',
        hasMultipleOptions: false,
      };
    }

    // Find available courts
    const available: Array<{ courtId: string; courtNumber: number; currentPlayers: number }> = [];
    for (let i = 0; i < courtCount; i++) {
      const courtId = `court-${i}`;
      const currentPlayers = courtOccupancy[courtId] || 0;
      if (currentPlayers + players.length <= MAX_PLAYERS_PER_COURT) {
        available.push({
          courtId,
          courtNumber: i + 1,
          currentPlayers,
        });
      }
    }

    return {
      availableCourts: available,
      canTransfer: available.length > 0,
      disabledReason: available.length === 0 ? 'All courts are full' : '',
      hasMultipleOptions: available.length > 1,
    };
  }, [players, courtCount, courtOccupancy]);

  const handleTransferClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!canTransfer) return;

    if (hasMultipleOptions) {
      // Multiple courts available - show selection UI
      if (isMobile) {
        setModalOpen(true);
      } else {
        setAnchorEl(event.currentTarget);
      }
    } else {
      // Single court available - direct transfer
      onTransferToCourt(queueId);
    }
  };

  const handleSelectCourt = useCallback((courtId: string) => {
    onTransferToSpecificCourt(queueId, courtId);
    setSelectedCourt('');
    setAnchorEl(null);
    setModalOpen(false);
  }, [queueId, onTransferToSpecificCourt]);

  const handleConfirm = () => {
    if (selectedCourt) {
      handleSelectCourt(selectedCourt);
    }
  };

  const handleClose = () => {
    setSelectedCourt('');
    setAnchorEl(null);
    setModalOpen(false);
  };

  const buttonText = 'Transfer to Court';

  return (
    <>
      <Button
        variant="contained"
        size="small"
        disabled={!canTransfer}
        onClick={handleTransferClick}
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
          canTransfer
            ? hasMultipleOptions
              ? 'Choose from available courts'
              : `Transfer to Court ${availableCourts[0]?.courtNumber}`
            : disabledReason
        }
      >
        {buttonText}
      </Button>

      {/* Desktop Popover */}
      {!isMobile && (
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          slotProps={{
            paper: {
              sx: {
                p: 2.5,
                borderRadius: 2,
                minWidth: 280,
                maxWidth: 320,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600, 
                color: 'primary.main',
                fontSize: '0.95rem',
                textAlign: 'center'
              }}
            >
              Select Court
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary', 
                fontSize: '0.8rem',
                textAlign: 'center',
                mb: 1
              }}
            >
              Transfer {players.length} player{players.length > 1 ? 's' : ''} to:
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.85rem' }}>Available Court</InputLabel>
              <Select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                label="Available Court"
                sx={{ fontSize: '0.85rem' }}
              >
                {availableCourts.map(({ courtId, courtNumber, currentPlayers }) => (
                  <MenuItem
                    key={courtId}
                    value={courtId}
                    sx={{
                      fontSize: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SportsIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                      <span>Court {courtNumber}</span>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 'bold',
                        fontSize: '0.7rem',
                      }}
                    >
                      ({currentPlayers + players.length}/4)
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                onClick={handleClose}
                variant="outlined"
                size="small"
                fullWidth
                sx={{ fontSize: '0.8rem' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                variant="contained"
                size="small"
                fullWidth
                disabled={!selectedCourt}
                sx={{ fontSize: '0.8rem' }}
              >
                Transfer
              </Button>
            </Box>
          </Box>
        </Popover>
      )}

      {/* Mobile Modal */}
      {isMobile && (
        <Modal 
          open={modalOpen} 
          onClose={handleClose}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            sx={{
              width: '90%',
              maxWidth: '400px',
              bgcolor: 'background.paper',
              borderRadius: 2,
              p: 3,
              maxHeight: '80vh',
              overflowY: 'auto',
              mx: 2,
            }}
          >
            {/* Modal Header */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'primary.main',
                }}
              >
                Select Court
              </Typography>
              <IconButton 
                onClick={handleClose}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Modal Content */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'text.primary', 
                  fontSize: '0.9rem',
                  textAlign: 'center',
                }}
              >
                Transfer {players.length} player{players.length > 1 ? 's' : ''} to available court:
              </Typography>

              <FormControl fullWidth>
                <InputLabel sx={{ fontSize: '0.9rem' }}>Available Court</InputLabel>
                <Select
                  value={selectedCourt}
                  onChange={(e) => setSelectedCourt(e.target.value)}
                  label="Available Court"
                  sx={{ fontSize: '0.9rem' }}
                >
                  {availableCourts.map(({ courtId, courtNumber, currentPlayers }) => (
                    <MenuItem
                      key={courtId}
                      value={courtId}
                      sx={{
                        fontSize: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SportsIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                        <span>Court {courtNumber}</span>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                        }}
                      >
                        ({currentPlayers + players.length}/4)
                      </Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  size="medium"
                  fullWidth
                  sx={{ fontSize: '0.9rem', py: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  variant="contained"
                  size="medium"
                  fullWidth
                  disabled={!selectedCourt}
                  sx={{ fontSize: '0.9rem', py: 1 }}
                >
                  Transfer
                </Button>
              </Box>
            </Box>
          </Paper>
        </Modal>
      )}
    </>
  );
});

EnhancedTransferButton.displayName = 'EnhancedTransferButton';

// Memoized queue item component
const QueueItem = React.memo<{
  queueId: string;
  index: number;
  players: Player[];
  courtCount: number;
  courtOccupancy: Record<string, number>;
  canRemove: boolean;
  onTransferToCourt: (queueId: string) => void;
  onTransferToSpecificCourt: (queueId: string, courtId: string) => void; // 🆕 New prop
  onRemoveQueue: (queueId: string) => void;
  mounted: boolean;
  isUltraWide: boolean;
}>(({ queueId, index, players, courtCount, courtOccupancy, canRemove, onTransferToCourt, onTransferToSpecificCourt, onRemoveQueue, mounted, isUltraWide,  }) => {
  
  // Memoized queue format calculation
  const queueFormat = useMemo(() => getQueueFormat(players), [players]);

  // Memoized the remove handler
  const handleRemove = useCallback(() => {
    onRemoveQueue(queueId);
  }, [queueId, onRemoveQueue]);

  // Memoized 2x2 position grid for queue (keeping existing implementation)
  const queuePositionGrid = useMemo(() => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 0.5,
        height: '80px',
        width: '100%',
      }}
    >
      {[0, 1, 2, 3].map((position) => {
        const playerInPosition = players.find(p => 
          p.queueOrder === position && 
          p.status.includes(queueId as any)
        );
        
        return (
          <DroppableZone
            key={`${queueId}-position-${position}`}
            zone={queueId}
            position={position}
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
      size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: isUltraWide ? 4 : 6 }}
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
          {/* Header with Enhanced Transfer Button */}
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
                  color: '#4A3C1C',
                  padding: '2px 4px',
                  textShadow: '1px 1px 2px rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <QueueIcon 
                  sx={{ 
                    fontSize: '0.9rem',
                    color: '#4A3C1C', 
                    filter: 'drop-shadow(1px 1px 1px rgba(255,255,255,0.6))',
                  }} 
                />
                Queue {index + 1}
              </Typography>
              
              {/* Remove queue button */}
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
              
              {/* Enhanced Transfer Button - replaces old Transfer button */}
              {players.length > 0 && (
                <EnhancedTransferButton
                  queueId={queueId}
                  players={players}
                  courtCount={courtCount}
                  courtOccupancy={courtOccupancy}
                  onTransferToCourt={onTransferToCourt}
                  onTransferToSpecificCourt={onTransferToSpecificCourt}
                />
              )}
            </Box>
          </Box>

          {/* Queue Position Grid */}
          {queuePositionGrid}
        </Box>
      </DroppableZone>
    </Grid>
  );
});

QueueItem.displayName = 'QueueItem';

// Add Queue Button Component
const AddQueueButton = React.memo<{ onAddQueue: () => void; isUltraWide: boolean; }>(({ onAddQueue, isUltraWide  }) => (
  <Grid 
    size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: isUltraWide ? 4 : 6  }}
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
        minHeight: '80px',
        backgroundColor: '#f1f5f9',
        borderRadius: 2,
        border: '2px dashed #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        '&:hover': {
          borderStyle: 'solid',  
          backgroundColor: '#e2e8f0',
          borderColor: '#94a3b8',
          transform: 'translateY(-1px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <AddIcon
        sx={{
          fontSize: '1.5rem',
          color: '#64748b',
          marginBottom: '4px',
        }}
      />
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.75rem',
          color: '#475569',
          fontWeight: 600,
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

  const isUltraWide = useMediaQuery('(min-width: 1830px)');

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

  const handleTransferToSpecificCourt = useCallback((queueId: string, courtId: string) => {
    dispatch(Action.transferQueueToSpecificCourt(queueId, courtId));
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
        onTransferToSpecificCourt={handleTransferToSpecificCourt}
        onRemoveQueue={handleRemoveQueue}
        mounted={mounted}
        isUltraWide={isUltraWide}
      />
    )), 
    [queueData, courtCount, courtOccupancy, canRemoveQueues, handleTransferToCourt, handleTransferToSpecificCourt, handleRemoveQueue, mounted, isUltraWide]
  );

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }} className="court-queue-medium-screen">
      {queueItems}
      {/* Add Queue Button */}
      <AddQueueButton onAddQueue={handleAddQueue} isUltraWide={isUltraWide} />
    </Grid>
  );
};

export default QueueZone;