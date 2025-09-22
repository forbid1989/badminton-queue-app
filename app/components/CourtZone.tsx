import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { Button , Typography, Box, TextField, IconButton, Chip, useMediaQuery, Popover, Modal, Paper, FormControl, InputLabel, Select, MenuItem   } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SettingsIcon from '@mui/icons-material/Settings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import QueueIcon from '@mui/icons-material/Queue';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import WarningIcon from '@mui/icons-material/Warning';
import { Player } from './types/Player';
import DroppableZone from './DroppableZone';
import PlayerCard from './PlayerCard';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../lib/store/Action';
import { UndoGameData } from '../lib/store/rootState';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';

type CourtZoneProps = {
  courtCount: number;
};

// Helper function to determine match format and organize players
const getMatchFormat = (players: Player[]) => {
  const playerCount = players.length;
  
  if (playerCount === 0) {
    return { format: 'Empty', teams: [] };
  } else if (playerCount === 1) {
    return { format: 'Waiting', teams: [players] };
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

// Memoized Badminton Court SVG Component
const BadmintonCourtBackground = React.memo(() => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 300 150"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
      opacity: 0.3,
    }}
    preserveAspectRatio="none"
  >
    {/* Outer court boundary */}
    <rect
      x="25"
      y="25"
      width="250"
      height="100"
      fill="none"
      stroke="white"
      strokeWidth="2"
    />
    
    {/* Center net line */}
    <line
      x1="150"
      y1="25"
      x2="150"
      y2="125"
      stroke="white"
      strokeWidth="2"
      strokeDasharray="5,5"
    />
    
    {/* Short service lines */}
    <line
      x1="25"
      y1="50"
      x2="275"
      y2="50"
      stroke="white"
      strokeWidth="1.5"
    />
    <line
      x1="25"
      y1="100"
      x2="275"
      y2="100"
      stroke="white"
      strokeWidth="1.5"
    />
    
    {/* Singles sidelines */}
    <line
      x1="50"
      y1="25"
      x2="50"
      y2="125"
      stroke="white"
      strokeWidth="1.5"
    />
    <line
      x1="250"
      y1="25"
      x2="250"
      y2="125"
      stroke="white"
      strokeWidth="1.5"
    />
  </svg>
));

BadmintonCourtBackground.displayName = 'BadmintonCourtBackground';

// Match format chip component
const MatchFormatChip = React.memo<{ format: string; playerCount: number; mounted: boolean }>(
  ({ format, playerCount , mounted }) => {
    const getChipColor = () => {
      switch (format) {
        case 'Empty': return { bg: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.7)' };
        case 'Waiting': return { bg: 'rgba(255,193,7,0.8)', text: '#000' };
        case '1v1': return { bg: 'rgba(76,175,80,0.9)', text: 'white' };
        case '2v1': return { bg: 'rgba(255,152,0,0.9)', text: 'white' };
        case '2v2': return { bg: 'rgba(33,150,243,0.9)', text: 'white' };
        case 'Overflow': return { bg: 'rgba(244,67,54,0.9)', text: 'white' };
        default: return { bg: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.7)' };
      }
    };

    const colors = getChipColor();

    return (
      <Chip
        label={mounted ? 
          (format === 'Empty' ? 'Available' : `${format} (${playerCount}/${format === '1v1' ? '2' : '4'})`) :
          'Available'
        }
        suppressHydrationWarning
        size="small"
        sx={{
          backgroundColor: colors.bg,
          color: colors.text,
          fontSize: '0.6rem',
          height: '20px',
          fontWeight: 'bold',
          border: '1px solid rgba(255,255,255,0.3)',
          backdropFilter: 'blur(4px)',
        }}
      />
    );
  }
);

MatchFormatChip.displayName = 'MatchFormatChip';

// Position labels for court grid
const POSITION_LABELS = ['Team A P1', 'Team B P1', 'Team A P2', 'Team B P2'];

// Memoized Court Item Component
const CourtItem = React.memo<{
  courtId: string;
  index: number;
  players: Player[];
  courtName: string;
  onEndGame: (courtId: string) => void;
  onUndoGame: (courtId: string) => void;
  onRemoveCourt: (courtId: string) => void; 
  canRemove: boolean; 
  mounted: boolean;
  undoData?: UndoGameData;
  isUltraWide: boolean;
  courtMenuAnchorEl: Record<string, HTMLElement | null>;
  editingCourtName: Record<string, string>;
  onOpenCourtMenu: (courtId: string, event: React.MouseEvent<HTMLElement>) => void;
  onCloseCourtMenu: (courtId: string) => void;
  onCourtNameEditChange: (courtId: string, value: string) => void;
  onCourtNameKeyDown: (courtId: string, e: React.KeyboardEvent) => void;
  onCourtNameBlur: (courtId: string) => void;
  onDeleteCourt: (courtId: string) => void;
  courtCount: number;
  swapCourtAnchorEl: Record<string, HTMLElement | null>;
  selectedTargetCourt: Record<string, string>;
  onOpenSwapCourt: (courtId: string, event: React.MouseEvent<HTMLElement>) => void;
  onCloseSwapCourt: (courtId: string) => void;
  onTargetCourtChange: (sourceCourtId: string, targetCourtId: string) => void;
  onConfirmSwap: (sourceCourtId: string) => void;
  courtNames: Record<string, string>;
  state: any; // Pass full state for access to queue data
  transferQueueAnchorEl: Record<string, HTMLElement | null>;
  selectedQueueId: Record<string, string>;
  onOpenTransferQueue: (courtId: string, event: React.MouseEvent<HTMLElement>) => void;
  onCloseTransferQueue: (courtId: string) => void;
  onQueueSelection: (courtId: string, queueId: string) => void;
  onConfirmTransfer: (courtId: string) => void;
}>(({ 
  courtId, 
  players, 
  courtName, 
  onEndGame,
  onUndoGame,
  canRemove,
  mounted,
  undoData,
  isUltraWide,
  courtMenuAnchorEl,
  editingCourtName,
  onOpenCourtMenu,
  onCloseCourtMenu,
  onCourtNameEditChange,
  onCourtNameKeyDown,
  onCourtNameBlur,
  onDeleteCourt,
  courtCount,
  swapCourtAnchorEl,
  selectedTargetCourt,
  onOpenSwapCourt,
  onCloseSwapCourt,
  onTargetCourtChange,
  onConfirmSwap,
  courtNames,
  state,
  transferQueueAnchorEl,
  selectedQueueId,
  onOpenTransferQueue,
  onCloseTransferQueue,
  onQueueSelection,
  onConfirmTransfer,
}) => { 
  
  const {dispatch } = useContext(AppContext);

  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Memoized match format calculation
  const matchFormat = useMemo(() => {
    if (!mounted) {
      return { format: 'Empty', teams: [] };
    }
    return getMatchFormat(players);
  }, [players, mounted]);

  const handleEndGame = useCallback(() => {
    onEndGame(courtId);
  }, [courtId, onEndGame]);

  const handleUndoGame = useCallback(() => {
    onUndoGame(courtId);
  }, [courtId, onUndoGame]);


  // 🆕 Enhanced logic to check if court composition has changed from when game was ended
  const courtHasChanged = useMemo(() => {
    if (!undoData) return false;
    
    // Check if court composition has changed since game ended
    const originalPlayerIds = undoData.playersData.map(p => p.id).sort();
    const currentPlayerIds = players.map(p => p.id).sort();
    
    // Special case: If court is now empty but we have undo data, 
    // this is the expected state after ending a game - don't clear undo data
    if (currentPlayerIds.length === 0 && originalPlayerIds.length > 0) {
      return false; // Don't consider this a "change" that should clear undo data
    }
    
    // For all other cases, check if composition actually changed
    return originalPlayerIds.length !== currentPlayerIds.length || 
      !originalPlayerIds.every((id, index) => id === currentPlayerIds[index]);
  }, [undoData, players]);

  const hasValidQueuesForTransfer = useMemo(() => {
    const currentCourtCount = (state.courts.playersByCourt[courtId] || []).length;
    return Object.entries(state.queue.playersByQueue as Record<string, Player[]>).some(([queueId, players]) => {
      return players.length > 0 && (currentCourtCount + players.length <= 4);
    });
  }, [state.queue.playersByQueue, state.courts.playersByCourt, courtId]);

  useEffect(() => {
    if (undoData && courtHasChanged) {
      console.log(`Court ${courtId} composition changed, clearing undo data`);
      dispatch(Action.clearCourtUndo(courtId));
    }
  }, [courtHasChanged, undoData, courtId, dispatch]);

  // Memoized 2x2 position grid for court
  const courtPositionGrid = useMemo(() => (
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
        // ✅ FIXED: Find player assigned to this position based on courtOrder
        // AND ensure they are actually assigned to THIS court
        const playerInPosition = players.find(p => 
          p.courtOrder === position && 
          p.status.includes(courtId as any) // Ensure player is actually on this court
        );
        
        console.log(`🔍 Court ${courtId} Position ${position}:`, playerInPosition ? `${playerInPosition.name} (order: ${playerInPosition.courtOrder})` : 'Empty');
        
        return (
          <DroppableZone
            key={`${courtId}-position-${position}`}
            zone={courtId} // ✨ Use regular zone name, not "court-0-pos-2"
            position={position} // ✨ Pass position as prop
            players={playerInPosition ? [playerInPosition] : []}
          >
            {playerInPosition ? (
              <PlayerCard player={playerInPosition} zone={courtId} />
            ) : (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.5rem', 
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                {POSITION_LABELS[position]}
              </Typography>
            )}
          </DroppableZone>
        );
      })}
    </Box>
  ), [courtId, players]);

  return (
    <Grid 
      size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: isUltraWide ? 4 : 6 }}
      sx={{
        '@media (min-width: 600px) and (max-width: 1024px) and (orientation: portrait)': {
          width: '100% !important',
          maxWidth: '100% !important',
          flexBasis: '100% !important',
        },
      }}
    >
      <DroppableZone 
        zone={courtId} 
        players={players} 
        sx={{
          backgroundColor: '#00936a',
          color: '#fff',
          position: 'relative',
          minHeight: '140px',
          background: 'linear-gradient(135deg, #00936a 0%, #007055 100%)',
        }}
      >
        <BadmintonCourtBackground />
        
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            width: '100%',
          }}
        >
          {/* Header with court name, format chip, and end game button */}
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
                  color: 'white',
                  padding: '2px 4px',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <SportsTennisIcon 
                  sx={{ 
                    fontSize: '0.9rem',
                    color: 'white',
                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.7))',
                  }} 
                />
                {courtName}
              </Typography>
              {mounted && canRemove && (
              <>
                <IconButton
                  size="small"
                  onClick={(e) => onOpenCourtMenu(courtId, e)}
                  sx={{
                    padding: '2px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.4)',
                    },
                  }}
                  title="Court options"
                >
                  <MoreVertIcon sx={{ fontSize: '0.7rem' }} />
                </IconButton>

                {/* Court Menu - Conditional Modal/Popover */}
                {isMobile ? (
                  // Mobile Modal Implementation
                  <Modal 
                    open={Boolean(courtMenuAnchorEl[courtId])} 
                    onClose={() => onCloseCourtMenu(courtId)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Paper
                      sx={{
                        width: '95%',
                        maxWidth: '400px',
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        p: 0,
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        mx: 2,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Modal Header */}
                      <Box sx={{ 
                        px: 2, 
                        py: 1.5, 
                        backgroundColor: '#1e293b',
                        color: 'white',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center'
                      }}>
                        <Typography variant="subtitle2" sx={{ 
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          <SettingsIcon sx={{ fontSize: '1rem' }} />
                          {courtName}
                        </Typography>
                        <IconButton 
                          onClick={() => onCloseCourtMenu(courtId)}
                          sx={{ 
                            color: 'white',
                            padding: '4px',
                            '&:hover': {
                              backgroundColor: 'rgba(255,255,255,0.1)',
                            }
                          }}
                          size="small"
                        >
                          <CloseIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Box>

                      {/* Modal Content */}
                      <Box sx={{ p: 3 }}>
                        {/* Court Name Edit Section */}
                        <Box sx={{ mb: 3 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary', 
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              mb: 1.5,
                              display: 'block'
                            }}
                          >
                            EDIT NAME
                          </Typography>
                          <TextField
                            value={editingCourtName[courtId] || ''}
                            onChange={(e) => onCourtNameEditChange(courtId, e.target.value)}
                            onBlur={() => onCourtNameBlur(courtId)}
                            onKeyDown={(e) => onCourtNameKeyDown(courtId, e)}
                            placeholder="Enter court name"
                            size="medium"
                            fullWidth
                            autoFocus
                            variant="outlined"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                fontSize: '0.9rem',
                              }
                            }}
                          />
                        </Box>

                        <Box sx={{ mb: 3 }}>
                          <Button
                            onClick={(e) => onOpenSwapCourt(courtId, e)}
                            startIcon={<SwapHorizIcon sx={{ fontSize: '1rem' }} />}
                            variant="outlined"
                            fullWidth
                            sx={{
                              textTransform: 'none',
                              py: 1.5,
                              borderRadius: 2,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              '&:hover': {
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                              }
                            }}
                          >
                            Swap Court Players
                          </Button>

                          {/* Swap Court Selection Popover */}
                          <Popover
                            open={Boolean(swapCourtAnchorEl[courtId])}
                            anchorEl={swapCourtAnchorEl[courtId]}
                            onClose={() => onCloseSwapCourt(courtId)}
                            anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'center', horizontal: 'left' }}
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
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 1
                                }}
                              >
                                <SwapHorizIcon sx={{ fontSize: '1.1rem' }} />
                                Swap Court Players
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
                                Swap all players between courts while retaining positions
                              </Typography>

                              <FormControl fullWidth>
                                <InputLabel sx={{ fontSize: '0.9rem' }}>Target Court</InputLabel>
                                <Select
                                  value={selectedTargetCourt[courtId] || ''}
                                  onChange={(e) => onTargetCourtChange(courtId, e.target.value)}
                                  label="Target Court"
                                  sx={{ fontSize: '0.9rem' }}
                                >
                                  {Array.from({ length: courtCount }, (_, i) => `court-${i}`)
                                    .filter(id => id !== courtId)
                                    .map((targetCourtId) => {
                                      const courtNumber = parseInt(targetCourtId.split('-')[1]) + 1;
                                      const targetCourtName = courtNames[targetCourtId] || `Court ${courtNumber}`;
                                      return (
                                        <MenuItem
                                          key={targetCourtId}
                                          value={targetCourtId}
                                          sx={{
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 1.5,
                                          }}
                                        >
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <SwapHorizIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                                            <span>{targetCourtName}</span>
                                          </Box>
                                        </MenuItem>
                                      );
                                    })}
                                </Select>
                              </FormControl>

                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  onClick={() => onCloseSwapCourt(courtId)}
                                  variant="outlined"
                                  sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    py: 1,
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => onConfirmSwap(courtId)}
                                  variant="contained"
                                  disabled={!selectedTargetCourt[courtId]}
                                  sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    py: 1,
                                    fontWeight: 600,
                                  }}
                                >
                                  Swap
                                </Button>
                              </Box>
                            </Box>
                          </Popover>
                        </Box>

                        <Box sx={{ mb: 3 }}>
                          <Button
                            onClick={(e) => onOpenTransferQueue(courtId, e)}
                            startIcon={<TransferWithinAStationIcon sx={{ fontSize: '1rem' }} />}
                            variant="outlined"
                            fullWidth
                            disabled={!hasValidQueuesForTransfer}
                            sx={{
                              textTransform: 'none',
                              py: 1.5,
                              borderRadius: 2,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              opacity: hasValidQueuesForTransfer ? 1 : 0.6,
                              '&:hover': hasValidQueuesForTransfer ? {
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                              } : {},
                            }}
                          >
                            Transfer Queue to Court
                          </Button>

                          {/* Transfer Queue Selection Popover */}
                          <Popover
                            open={Boolean(transferQueueAnchorEl[courtId])}
                            anchorEl={transferQueueAnchorEl[courtId]}
                            onClose={() => onCloseTransferQueue(courtId)}
                            anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'center', horizontal: 'left' }}
                            slotProps={{
                              paper: {
                                sx: {
                                  p: 2.5,
                                  borderRadius: 2,
                                  minWidth: 320,
                                  maxWidth: 400,
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
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 1
                                }}
                              >
                                <TransferWithinAStationIcon sx={{ fontSize: '1.1rem' }} />
                                Transfer Queue to Court
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
                                Select a queue to transfer all its players to this court
                              </Typography>

                              {/* Court Status Info */}
                              <Box sx={{ 
                                p: 1.5, 
                                backgroundColor: (state.courts.playersByCourt[courtId] || []).length > 0 
                                  ? 'rgba(255, 152, 0, 0.1)' 
                                  : 'rgba(76, 175, 80, 0.1)',
                                borderRadius: 1,
                                mb: 1
                              }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                  Current Court Status: {(state.courts.playersByCourt[courtId] || []).length}/4 players
                                </Typography>
                                {(state.courts.playersByCourt[courtId] || []).length > 0 ? (
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                    Existing players will be preserved in their positions
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                    Court is empty - ready for queue transfer
                                  </Typography>
                                )}
                              </Box>

                              {/* Available Queues or No Queues Message */}
                              {(() => {
                                const currentCourtCount = (state.courts.playersByCourt[courtId] || []).length;
                                const availableQueues = Object.entries(state.queue.playersByQueue as Record<string, Player[]>)
                                  .filter(([, players]) => players.length > 0)
                                  .map(([queueId, players]) => ({
                                    queueId,
                                    players,
                                    playerCount: players.length,
                                    canFit: currentCourtCount + players.length <= 4,
                                    totalAfterTransfer: currentCourtCount + players.length
                                  }));

                                const validQueues = availableQueues.filter(q => q.canFit);

                                if (availableQueues.length === 0) {
                                  return (
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                      <QueueIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                        No queues with players available
                                      </Typography>
                                    </Box>
                                  );
                                }

                                if (validQueues.length === 0) {
                                  return (
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                      <WarningIcon sx={{ fontSize: '2rem', color: 'warning.main', mb: 1 }} />
                                      <Typography variant="body2" sx={{ color: 'warning.main', fontSize: '0.8rem', fontWeight: 600 }}>
                                        No Valid Transfers Available
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        All queues would cause court overflow (max 4 players)
                                      </Typography>
                                      
                                      {/* Show why each queue can't be transferred */}
                                      <Box sx={{ mt: 2, textAlign: 'left' }}>
                                        {availableQueues.map(({ queueId, playerCount, totalAfterTransfer }) => {
                                          const queueNumber = parseInt(queueId.split('-')[1]) + 1;
                                          return (
                                            <Box key={queueId} sx={{ 
                                              display: 'flex', 
                                              justifyContent: 'space-between', 
                                              alignItems: 'center',
                                              py: 0.5,
                                              px: 1,
                                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                              borderRadius: 1,
                                              mb: 0.5
                                            }}>
                                              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                Queue {queueNumber} ({playerCount} players)
                                              </Typography>
                                              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'error.main', fontWeight: 600 }}>
                                                Would be {totalAfterTransfer}/4
                                              </Typography>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  );
                                }

                                return (
                                  <>
                                    <FormControl fullWidth>
                                      <InputLabel sx={{ fontSize: '0.9rem' }}>Select Queue</InputLabel>
                                      <Select
                                        value={selectedQueueId[courtId] || ''}
                                        onChange={(e) => onQueueSelection(courtId, e.target.value)}
                                        label="Select Queue"
                                        sx={{ fontSize: '0.9rem' }}
                                      >
                                        {validQueues.map(({ queueId, players, playerCount, totalAfterTransfer }) => {
                                          const queueNumber = parseInt(queueId.split('-')[1]) + 1;
                                          
                                          return (
                                            <MenuItem
                                              key={queueId}
                                              value={queueId}
                                              sx={{
                                                fontSize: '0.9rem',
                                                py: 1.5,
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                              }}
                                            >
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                                <QueueIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                                                <Box sx={{ flex: 1 }}>
                                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Queue {queueNumber}
                                                  </Typography>
                                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    {playerCount} players • Final total: {totalAfterTransfer}/4
                                                  </Typography>
                                                </Box>
                                                <Box sx={{ 
                                                  backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                                                  borderRadius: 1, 
                                                  px: 1, 
                                                  py: 0.25 
                                                }}>
                                                  <Typography variant="caption" sx={{ 
                                                    color: 'success.main', 
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600 
                                                  }}>
                                                    ✓ FITS
                                                  </Typography>
                                                </Box>
                                              </Box>
                                              
                                              {/* Show player names */}
                                              <Box sx={{ mt: 0.5, pl: 3 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                                  Players: {players.map(p => p.name).join(', ')}
                                                </Typography>
                                              </Box>
                                            </MenuItem>
                                          );
                                        })}
                                      </Select>
                                    </FormControl>

                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        onClick={() => onCloseTransferQueue(courtId)}
                                        variant="outlined"
                                        sx={{
                                          flex: 1,
                                          textTransform: 'none',
                                          fontSize: '0.85rem',
                                          py: 1,
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => onConfirmTransfer(courtId)}
                                        variant="contained"
                                        disabled={!selectedQueueId[courtId]}
                                        sx={{
                                          flex: 1,
                                          textTransform: 'none',
                                          fontSize: '0.85rem',
                                          py: 1,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Transfer
                                      </Button>
                                    </Box>
                                  </>
                                );
                              })()}
                            </Box>
                          </Popover>
                        </Box>

                        {/* Delete Section */}
                        <Button
                          onClick={() => onDeleteCourt(courtId)}
                          startIcon={<DeleteIcon sx={{ fontSize: '1rem' }} />}
                          variant="outlined"
                          color="error"
                          fullWidth
                          sx={{
                            textTransform: 'none',
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            '&:hover': {
                              boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)',
                            }
                          }}
                        >
                          Delete Court
                        </Button>
                      </Box>
                    </Paper>
                  </Modal>
                ) : (
                  // Desktop/Tablet Popover Implementation
                  <Popover
                    open={Boolean(courtMenuAnchorEl[courtId])}
                    anchorEl={courtMenuAnchorEl[courtId]}
                    onClose={() => onCloseCourtMenu(courtId)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        sx: {
                          p: 0,
                          borderRadius: 3,
                          boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
                          border: '1px solid rgba(0,0,0,0.08)',
                          minWidth: 200,
                          overflow: 'hidden',
                        },
                      },
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ 
                      px: 2, 
                      py: 1.5, 
                      backgroundColor: '#1e293b',
                      color: 'white'
                    }}>
                      <Typography variant="subtitle2" sx={{ 
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <SettingsIcon sx={{ fontSize: '1rem' }} />
                        {courtName}
                      </Typography>
                    </Box>

                    {/* Content */}
                    <Box sx={{ p: 2 }}>
                      {/* Court Name Edit Section */}
                      <Box sx={{ mb: 2 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary', 
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            mb: 1,
                            display: 'block'
                          }}
                        >
                          EDIT NAME
                        </Typography>
                        <TextField
                          value={editingCourtName[courtId] || ''}
                          onChange={(e) => onCourtNameEditChange(courtId, e.target.value)}
                          onBlur={() => onCourtNameBlur(courtId)}
                          onKeyDown={(e) => onCourtNameKeyDown(courtId, e)}
                          placeholder="Enter court name"
                          size="small"
                          fullWidth
                          autoFocus
                          variant="outlined"
                          slotProps={{
                            input: {
                              sx: { 
                                fontSize: '0.8rem',
                              }
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            }
                          }}
                        />
                      </Box>

                      <Box sx={{ mb: 3 }}>
                          <Button
                            onClick={(e) => onOpenSwapCourt(courtId, e)}
                            startIcon={<SwapHorizIcon sx={{ fontSize: '1rem' }} />}
                            variant="outlined"
                            fullWidth
                            sx={{
                              textTransform: 'none',
                              py: 1.5,
                              borderRadius: 2,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              '&:hover': {
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                              }
                            }}
                          >
                            Swap Court Players
                          </Button>

                          {/* Swap Court Selection Popover */}
                          <Popover
                            open={Boolean(swapCourtAnchorEl[courtId])}
                            anchorEl={swapCourtAnchorEl[courtId]}
                            onClose={() => onCloseSwapCourt(courtId)}
                            anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'center', horizontal: 'left' }}
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
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 1
                                }}
                              >
                                <SwapHorizIcon sx={{ fontSize: '1.1rem' }} />
                                Swap Court Players
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
                                Swap all players between courts while retaining positions
                              </Typography>

                              <FormControl fullWidth>
                                <InputLabel sx={{ fontSize: '0.9rem' }}>Target Court</InputLabel>
                                <Select
                                  value={selectedTargetCourt[courtId] || ''}
                                  onChange={(e) => onTargetCourtChange(courtId, e.target.value)}
                                  label="Target Court"
                                  sx={{ fontSize: '0.9rem' }}
                                >
                                  {Array.from({ length: courtCount }, (_, i) => `court-${i}`)
                                    .filter(id => id !== courtId)
                                    .map((targetCourtId) => {
                                      const courtNumber = parseInt(targetCourtId.split('-')[1]) + 1;
                                      const targetCourtName = courtNames[targetCourtId] || `Court ${courtNumber}`;
                                      return (
                                        <MenuItem
                                          key={targetCourtId}
                                          value={targetCourtId}
                                          sx={{
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 1.5,
                                          }}
                                        >
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <SwapHorizIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                                            <span>{targetCourtName}</span>
                                          </Box>
                                        </MenuItem>
                                      );
                                    })}
                                </Select>
                              </FormControl>

                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  onClick={() => onCloseSwapCourt(courtId)}
                                  variant="outlined"
                                  sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    py: 1,
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => onConfirmSwap(courtId)}
                                  variant="contained"
                                  disabled={!selectedTargetCourt[courtId]}
                                  sx={{
                                    flex: 1,
                                    textTransform: 'none',
                                    fontSize: '0.85rem',
                                    py: 1,
                                    fontWeight: 600,
                                  }}
                                >
                                  Swap
                                </Button>
                              </Box>
                            </Box>
                          </Popover>
                        </Box>

                        <Box sx={{ mb: 3 }}>
                          <Button
                            onClick={(e) => onOpenTransferQueue(courtId, e)}
                            startIcon={<TransferWithinAStationIcon sx={{ fontSize: '1rem' }} />}
                            variant="outlined"
                            fullWidth
                            disabled={!hasValidQueuesForTransfer}
                            sx={{
                              textTransform: 'none',
                              py: 1.5,
                              borderRadius: 2,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              opacity: hasValidQueuesForTransfer ? 1 : 0.6,
                              '&:hover': hasValidQueuesForTransfer ? {
                                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                              } : {},
                            }}
                          >
                            Transfer Queue to Court
                          </Button>

                          {/* Transfer Queue Selection Popover */}
                          <Popover
                            open={Boolean(transferQueueAnchorEl[courtId])}
                            anchorEl={transferQueueAnchorEl[courtId]}
                            onClose={() => onCloseTransferQueue(courtId)}
                            anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'center', horizontal: 'left' }}
                            slotProps={{
                              paper: {
                                sx: {
                                  p: 2.5,
                                  borderRadius: 2,
                                  minWidth: 320,
                                  maxWidth: 400,
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
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 1
                                }}
                              >
                                <TransferWithinAStationIcon sx={{ fontSize: '1.1rem' }} />
                                Transfer Queue to Court
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
                                Select a queue to transfer all its players to this court
                              </Typography>

                              {/* Court Status Info */}
                              <Box sx={{ 
                                p: 1.5, 
                                backgroundColor: (state.courts.playersByCourt[courtId] || []).length > 0 
                                  ? 'rgba(255, 152, 0, 0.1)' 
                                  : 'rgba(76, 175, 80, 0.1)',
                                borderRadius: 1,
                                mb: 1
                              }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                  Current Court Status: {(state.courts.playersByCourt[courtId] || []).length}/4 players
                                </Typography>
                                {(state.courts.playersByCourt[courtId] || []).length > 0 ? (
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                    Existing players will be preserved in their positions
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                    Court is empty - ready for queue transfer
                                  </Typography>
                                )}
                              </Box>

                              {/* Available Queues or No Queues Message */}
                              {(() => {
                                const currentCourtCount = (state.courts.playersByCourt[courtId] || []).length;
                                const availableQueues = Object.entries(state.queue.playersByQueue as Record<string, Player[]>)
                                  .filter(([, players]) => players.length > 0)
                                  .map(([queueId, players]) => ({
                                    queueId,
                                    players,
                                    playerCount: players.length,
                                    canFit: currentCourtCount + players.length <= 4,
                                    totalAfterTransfer: currentCourtCount + players.length
                                  }));

                                const validQueues = availableQueues.filter(q => q.canFit);

                                if (availableQueues.length === 0) {
                                  return (
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                      <QueueIcon sx={{ fontSize: '2rem', color: 'text.disabled', mb: 1 }} />
                                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                        No queues with players available
                                      </Typography>
                                    </Box>
                                  );
                                }

                                if (validQueues.length === 0) {
                                  return (
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                      <WarningIcon sx={{ fontSize: '2rem', color: 'warning.main', mb: 1 }} />
                                      <Typography variant="body2" sx={{ color: 'warning.main', fontSize: '0.8rem', fontWeight: 600 }}>
                                        No Valid Transfers Available
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                        All queues would cause court overflow (max 4 players)
                                      </Typography>
                                      
                                      {/* Show why each queue can't be transferred */}
                                      <Box sx={{ mt: 2, textAlign: 'left' }}>
                                        {availableQueues.map(({ queueId, playerCount, totalAfterTransfer }) => {
                                          const queueNumber = parseInt(queueId.split('-')[1]) + 1;
                                          return (
                                            <Box key={queueId} sx={{ 
                                              display: 'flex', 
                                              justifyContent: 'space-between', 
                                              alignItems: 'center',
                                              py: 0.5,
                                              px: 1,
                                              backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                              borderRadius: 1,
                                              mb: 0.5
                                            }}>
                                              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                                Queue {queueNumber} ({playerCount} players)
                                              </Typography>
                                              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'error.main', fontWeight: 600 }}>
                                                Would be {totalAfterTransfer}/4
                                              </Typography>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  );
                                }

                                return (
                                  <>
                                    <FormControl fullWidth>
                                      <InputLabel sx={{ fontSize: '0.9rem' }}>Select Queue</InputLabel>
                                      <Select
                                        value={selectedQueueId[courtId] || ''}
                                        onChange={(e) => onQueueSelection(courtId, e.target.value)}
                                        label="Select Queue"
                                        sx={{ fontSize: '0.9rem' }}
                                      >
                                        {validQueues.map(({ queueId, players, playerCount, totalAfterTransfer }) => {
                                          const queueNumber = parseInt(queueId.split('-')[1]) + 1;
                                          
                                          return (
                                            <MenuItem
                                              key={queueId}
                                              value={queueId}
                                              sx={{
                                                fontSize: '0.9rem',
                                                py: 1.5,
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                              }}
                                            >
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                                <QueueIcon sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
                                                <Box sx={{ flex: 1 }}>
                                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Queue {queueNumber}
                                                  </Typography>
                                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                    {playerCount} players • Final total: {totalAfterTransfer}/4
                                                  </Typography>
                                                </Box>
                                                <Box sx={{ 
                                                  backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                                                  borderRadius: 1, 
                                                  px: 1, 
                                                  py: 0.25 
                                                }}>
                                                  <Typography variant="caption" sx={{ 
                                                    color: 'success.main', 
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600 
                                                  }}>
                                                    ✓ FITS
                                                  </Typography>
                                                </Box>
                                              </Box>
                                              
                                              {/* Show player names */}
                                              <Box sx={{ mt: 0.5, pl: 3 }}>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                                  Players: {players.map(p => p.name).join(', ')}
                                                </Typography>
                                              </Box>
                                            </MenuItem>
                                          );
                                        })}
                                      </Select>
                                    </FormControl>

                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                      <Button
                                        onClick={() => onCloseTransferQueue(courtId)}
                                        variant="outlined"
                                        sx={{
                                          flex: 1,
                                          textTransform: 'none',
                                          fontSize: '0.85rem',
                                          py: 1,
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={() => onConfirmTransfer(courtId)}
                                        variant="contained"
                                        disabled={!selectedQueueId[courtId]}
                                        sx={{
                                          flex: 1,
                                          textTransform: 'none',
                                          fontSize: '0.85rem',
                                          py: 1,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Transfer
                                      </Button>
                                    </Box>
                                  </>
                                );
                              })()}
                            </Box>
                          </Popover>
                        </Box>

                      {/* Delete Section */}
                      <Button
                        onClick={() => onDeleteCourt(courtId)}
                        startIcon={<DeleteIcon sx={{ fontSize: '1rem' }} />}
                        variant="outlined"
                        color="error"
                        fullWidth
                        sx={{
                          textTransform: 'none',
                          py: 1,
                          borderRadius: 2,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          '&:hover': {
                            boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)',
                          }
                        }}
                      >
                        Delete Court
                      </Button>
                    </Box>
                  </Popover>
                )}
              </>
            )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MatchFormatChip 
                format={matchFormat.format} 
                playerCount={mounted ? players.length : 0} 
                mounted={mounted}
              />
              
              {mounted && players.length > 0 && !undoData &&  (
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleEndGame}
                  sx={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    backgroundColor: 'rgba(0, 147, 106, 0.8)',
                    textTransform: 'none',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 112, 85, 0.9)',
                    },
                  }}
                >
                  End Game
                </Button>
              )}

                {mounted && undoData && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleUndoGame}
                    sx={{
                      fontSize: '0.65rem',
                      padding: '2px 8px',
                      backgroundColor: 'rgba(88, 72, 46, 0.8)',
                      color: '#fff',
                      textTransform: 'none',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(245, 124, 0, 0.9)',
                      },
                    }}
                    title="Undo game"
                  >
                    Undo
                  </Button>
                )}
            </Box>
          </Box>

          {/* Court Position Grid - Always show the 2x2 grid */}
          {courtPositionGrid}
        </Box>
      </DroppableZone>
    </Grid>
  );
});

CourtItem.displayName = 'CourtItem';

const AddCourtButton = React.memo<{ onAddCourt: () => void; isUltraWide: boolean; }>(({ onAddCourt, isUltraWide }) => (
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
    <Box
      onClick={onAddCourt}
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
          backgroundColor: '#e2e8f0',
          borderColor: '#94a3b8',
          borderStyle: 'solid',
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
        Add Court
      </Typography>
    </Box>
  </Grid>
));

AddCourtButton.displayName = 'AddCourtButton';

const CourtZone: React.FC<CourtZoneProps> = ({ courtCount }) => {
  const { state, dispatch } = useContext(AppContext);
  
  const [mounted, setMounted] = useState(false);
  const isUltraWide = useMediaQuery('(min-width: 1830px)');
  const [courtMenuAnchorEl, setCourtMenuAnchorEl] = useState<Record<string, HTMLElement | null>>({});
  const [editingCourtName, setEditingCourtName] = useState<Record<string, string>>({});
  const [swapCourtAnchorEl, setSwapCourtAnchorEl] = useState<Record<string, HTMLElement | null>>({});
  const [selectedTargetCourt, setSelectedTargetCourt] = useState<Record<string, string>>({});
  const [transferQueueAnchorEl, setTransferQueueAnchorEl] = useState<Record<string, HTMLElement | null>>({});
  const [selectedQueueId, setSelectedQueueId] = useState<Record<string, string>>({});

  // State for court name editing
  const [courtNames, setCourtNames] = useState<Record<string, string>>(() => {
    const defaultNames: Record<string, string> = {};
    for (let i = 0; i < courtCount; i++) {
      defaultNames[`court-${i}`] = `Court ${i + 1}`;
    }
    return defaultNames;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

    // Update court names when court count changes
  useEffect(() => {
    setCourtNames(prev => {
      const updated = { ...prev };
      for (let i = 0; i < courtCount; i++) {
        const courtId = `court-${i}`;
        if (!updated[courtId]) {
          updated[courtId] = `Court ${i + 1}`;
        }
      }
      return updated;
    });
  }, [courtCount]);
  
  // Memoized court data calculation
  const courtData = useMemo(() => {
    const courts: Array<{ courtId: string; players: Player[]; index: number; undoData?: UndoGameData; }> = [];
    
    for (let index = 0; index < courtCount; index++) {
      const courtId = `court-${index}`;
      
      // Use the pre-calculated zone mapping instead of filtering players
      const courtPlayers = state.courts.playersByCourt[courtId] || [];
      const undoData = state.undoableGames[courtId];
      
      // Debug: Log court players and their order
      console.log(`🏟️ Court ${courtId} players:`, courtPlayers.map(p => `${p.name} (order: ${p.courtOrder})`));
      
      courts.push({ courtId, players: courtPlayers, index, undoData });
    }
    
    return courts;
  }, [state.courts.playersByCourt, state.undoableGames, courtCount]);

  const handleEndGame = useCallback((courtId: string) => {
    dispatch(Action.endGame(courtId));
  }, [dispatch]);

  // Add court handler
  const handleAddCourt = useCallback(() => {
    dispatch(Action.setCourtCount(courtCount + 1));
  }, [dispatch, courtCount]);

  // Remove court handler
  const handleRemoveCourt = useCallback(() => {
    // Only allow removal if we have more than 1 court
    if (courtCount > 1) {
      dispatch(Action.setCourtCount(courtCount - 1));
    }
  }, [dispatch, courtCount]);

  const canRemoveCourts = useMemo(() => {
    // On server or before hydration, always return false to prevent showing remove buttons
    if (!mounted) return false;
    return courtCount > 1;
  }, [courtCount, mounted]);

  // Court menu handlers
  const handleOpenCourtMenu = useCallback((courtId: string, event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCourtMenuAnchorEl(prev => ({
      ...prev,
      [courtId]: event.currentTarget
    }));
    // Initialize the editing value with current court name
    setEditingCourtName(prev => ({
      ...prev,
      [courtId]: courtNames[courtId] || `Court ${courtId.split('-')[1] + 1}`
    }));
  }, [courtNames]);

  const handleCloseCourtMenu = useCallback((courtId: string) => {
    setCourtMenuAnchorEl(prev => ({
      ...prev,
      [courtId]: null
    }));
  }, []);

  const handleCourtNameEditChange = useCallback((courtId: string, value: string) => {
    setEditingCourtName(prev => ({
      ...prev,
      [courtId]: value
    }));
  }, []);

  const handleCourtNameSave = useCallback((courtId: string) => {
    const newName = editingCourtName[courtId]?.trim();
    if (newName && newName !== courtNames[courtId]) {
      setCourtNames(prev => ({
        ...prev,
        [courtId]: newName
      }));
    }
  }, [editingCourtName, courtNames]);

  const handleCourtNameKeyDown = useCallback((courtId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCourtNameSave(courtId);
    } else if (e.key === 'Escape') {
      handleCloseCourtMenu(courtId);
    }
  }, [handleCourtNameSave, handleCloseCourtMenu]);

  const handleCourtNameBlur = useCallback((courtId: string) => {
    handleCourtNameSave(courtId);
  }, [handleCourtNameSave]);

  const handleDeleteCourt = useCallback((courtId: string) => {
    handleRemoveCourt();
    handleCloseCourtMenu(courtId);
  }, [handleCloseCourtMenu, handleRemoveCourt]);
  
  const handleUndoGame = useCallback((courtId: string) => {
    dispatch(Action.undoEndGame(courtId));
  }, [dispatch]);

  const handleOpenSwapCourt = useCallback((courtId: string, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setSwapCourtAnchorEl(prev => ({
      ...prev,
      [courtId]: event.currentTarget
    }));
  }, []);

  const handleCloseSwapCourt = useCallback((courtId: string) => {
    setSwapCourtAnchorEl(prev => ({
      ...prev,
      [courtId]: null
    }));
    setSelectedTargetCourt(prev => ({
      ...prev,
      [courtId]: ''
    }));
  }, []);

  const handleSwapCourtPlayers = useCallback((sourceCourtId: string, targetCourtId: string) => {
    dispatch(Action.swapCourtPlayers(sourceCourtId, targetCourtId));
  }, [dispatch]);

  const handleTargetCourtChange = useCallback((sourceCourtId: string, targetCourtId: string) => {
    setSelectedTargetCourt(prev => ({
      ...prev,
      [sourceCourtId]: targetCourtId
    }));
  }, []);

  const handleConfirmSwap = useCallback((sourceCourtId: string) => {
    const targetCourtId = selectedTargetCourt[sourceCourtId];
    if (targetCourtId) {
      handleSwapCourtPlayers(sourceCourtId, targetCourtId);

      // Close the swap court popover
      handleCloseSwapCourt(sourceCourtId);
      
      // Close the main court menu modal/popover  
      handleCloseCourtMenu(sourceCourtId);
    }
  }, [selectedTargetCourt, handleSwapCourtPlayers, handleCloseSwapCourt, handleCloseCourtMenu]);

  const handleOpenTransferQueue = useCallback((courtId: string, event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setTransferQueueAnchorEl(prev => ({
      ...prev,
      [courtId]: event.currentTarget
    }));
  }, []);

  const handleCloseTransferQueue = useCallback((courtId: string) => {
    setTransferQueueAnchorEl(prev => ({
      ...prev,
      [courtId]: null
    }));
    setSelectedQueueId(prev => ({
      ...prev,
      [courtId]: ''
    }));
  }, []);

  const handleQueueSelection = useCallback((courtId: string, queueId: string) => {
    setSelectedQueueId(prev => ({
      ...prev,
      [courtId]: queueId
    }));
  }, []);

  const handleConfirmTransfer = useCallback((courtId: string) => {
    const queueId = selectedQueueId[courtId];
    if (queueId) {
      dispatch(Action.transferQueueToSpecificCourtFromSubmenu(queueId, courtId));
      handleCloseTransferQueue(courtId);
      handleCloseCourtMenu(courtId);
    }
  }, [selectedQueueId, dispatch, handleCloseTransferQueue, handleCloseCourtMenu]);

  // Memoized court items
  const courtItems = useMemo(() => 
    courtData.map(({ courtId, players, index, undoData }) => (
      <CourtItem
        key={courtId}
        courtId={courtId}
        index={index}
        players={players}
        courtName={courtNames[courtId] || `Court ${index + 1}`}
        onEndGame={handleEndGame}
        onUndoGame={handleUndoGame}
        onRemoveCourt={handleRemoveCourt}
        canRemove={canRemoveCourts}
        mounted={mounted}
        undoData={undoData}
        isUltraWide={isUltraWide}
        courtMenuAnchorEl={courtMenuAnchorEl}
        editingCourtName={editingCourtName}
        onOpenCourtMenu={handleOpenCourtMenu}
        onCloseCourtMenu={handleCloseCourtMenu}
        onCourtNameEditChange={handleCourtNameEditChange}
        onCourtNameKeyDown={handleCourtNameKeyDown}
        onCourtNameBlur={handleCourtNameBlur}
        onDeleteCourt={handleDeleteCourt}
        courtCount={courtCount}
        swapCourtAnchorEl={swapCourtAnchorEl}
        selectedTargetCourt={selectedTargetCourt}
        onOpenSwapCourt={handleOpenSwapCourt}
        onCloseSwapCourt={handleCloseSwapCourt}
        onTargetCourtChange={handleTargetCourtChange}
        onConfirmSwap={handleConfirmSwap}
        courtNames={courtNames}
        state={state}
        transferQueueAnchorEl={transferQueueAnchorEl}
        selectedQueueId={selectedQueueId}
        onOpenTransferQueue={handleOpenTransferQueue}
        onCloseTransferQueue={handleCloseTransferQueue}
        onQueueSelection={handleQueueSelection}
        onConfirmTransfer={handleConfirmTransfer}
      />
    )), 
    [
      courtData, 
      courtNames,  
      handleEndGame, 
      mounted, 
      handleUndoGame, 
      isUltraWide, 
      canRemoveCourts, 
      handleRemoveCourt, 
      courtMenuAnchorEl, 
      editingCourtName, 
      handleOpenCourtMenu, 
      handleCloseCourtMenu, 
      handleCourtNameEditChange, 
      handleCourtNameKeyDown, 
      handleCourtNameBlur, 
      handleDeleteCourt,
      courtCount,
      swapCourtAnchorEl,
      selectedTargetCourt,
      handleOpenSwapCourt,
      handleCloseSwapCourt,
      handleTargetCourtChange,
      handleConfirmSwap,
      state,
      transferQueueAnchorEl,
      selectedQueueId,
      handleOpenTransferQueue,
      handleCloseTransferQueue,
      handleQueueSelection,
      handleConfirmTransfer
    ]
  );

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
      {courtItems}
      <AddCourtButton onAddCourt={handleAddCourt} isUltraWide={isUltraWide} />
    </Grid>
  );
};

export default CourtZone;