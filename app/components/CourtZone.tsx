import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { Card, Button , Typography, Box, TextField, IconButton, Chip, useMediaQuery } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
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
  isEditing: boolean;
  onStartEdit: (courtId: string) => void;
  onNameChange: (courtId: string, name: string) => void;
  onSubmitEdit: (courtId: string) => void;
  onCancelEdit: () => void;
  onEndGame: (courtId: string) => void;
  onUndoGame: (courtId: string) => void;
  onRemoveCourt: (courtId: string) => void; 
  canRemove: boolean; 
  mounted: boolean;
  undoData?: UndoGameData;
  isUltraWide: boolean;
}>(({ 
  courtId, 
  index, 
  players, 
  courtName, 
  isEditing, 
  onStartEdit, 
  onNameChange, 
  onSubmitEdit, 
  onCancelEdit, 
  onEndGame,
  onUndoGame,
  onRemoveCourt,
  canRemove,
  mounted,
  undoData,
  isUltraWide,
}) => {
  
  const { state, dispatch } = useContext(AppContext);
  
  // Memoized match format calculation
  const matchFormat = useMemo(() => {
    if (!mounted) {
      return { format: 'Empty', teams: [] };
    }
    return getMatchFormat(players);
  }, [players, mounted]);
  
  // Memoized event handlers
  const handleStartEdit = useCallback(() => {
    onStartEdit(courtId);
  }, [courtId, onStartEdit]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onNameChange(courtId, e.target.value);
  }, [courtId, onNameChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmitEdit(courtId);
    }
    if (e.key === 'Escape') {
      onCancelEdit();
    }
  }, [courtId, onSubmitEdit, onCancelEdit]);

  const handleBlur = useCallback(() => {
    onSubmitEdit(courtId);
  }, [courtId, onSubmitEdit]);

  const handleEndGame = useCallback(() => {
    onEndGame(courtId);
  }, [courtId, onEndGame]);

  const handleUndoGame = useCallback(() => {
    onUndoGame(courtId);
  }, [courtId, onUndoGame]);

  const handleRemoveCourt = useCallback(() => {
    onRemoveCourt(courtId);
  }, [courtId, onRemoveCourt]);

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
              {isEditing ? (
                <TextField
                  value={courtName}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  autoFocus
                  variant="standard"
                  size="small"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                      fontWeight: 'bold',
                      color: 'white',
                      padding: '2px 4px',
                    },
                    '& .MuiInputBase-root': {
                      '&:before': {
                        borderBottomColor: 'rgba(255,255,255,0.5)',
                      },
                      '&:after': {
                        borderBottomColor: 'white',
                      },
                    },
                  }}
                />
              ) : (
                <Typography
                    variant="h6"
                    sx={{
                      fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                      fontWeight: 'bold',
                      color: 'white',
                      padding: '2px 4px',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                    onClick={handleStartEdit}
                    title="Click to edit court name"
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
              )}
              {mounted && canRemove && (
                <IconButton
                  size="small"
                  onClick={handleRemoveCourt}
                  sx={{
                    padding: '2px',
                    backgroundColor: 'rgba(244,67,54,0.8)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(244,67,54,0.9)',
                    },
                  }}
                  title="Remove this court"
                >
                  <CloseIcon sx={{ fontSize: '0.7rem' }} />
                </IconButton>
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

  // State for court name editing
  const [editingCourt, setEditingCourt] = useState<string | null>(null);
  const [courtNames, setCourtNames] = useState<Record<string, string>>(() => {
    const defaultNames: Record<string, string> = {};
    for (let i = 0; i < courtCount; i++) {
      defaultNames[`court-${i}`] = `Court ${i + 1}`;
    }
    return defaultNames;
  });

  const handleUndoGame = useCallback((courtId: string) => {
    dispatch(Action.undoEndGame(courtId));
  }, [dispatch]);

  useEffect(() => {
    setMounted(true);
  }, []);
  
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
  
  // Memoized event handlers
  const handleStartEdit = useCallback((courtId: string) => {
    setEditingCourt(courtId);
  }, []);

  const handleCourtNameChange = useCallback((courtId: string, newName: string) => {
    setCourtNames(prev => ({
      ...prev,
      [courtId]: newName
    }));
  }, []);
  
  const handleSubmitEdit = useCallback((courtId: string) => {
    setEditingCourt(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingCourt(null);
  }, []);

  const handleEndGame = useCallback((courtId: string) => {
    dispatch(Action.endGame(courtId));
  }, [dispatch]);

  // Add court handler
  const handleAddCourt = useCallback(() => {
    dispatch(Action.setCourtCount(courtCount + 1));
  }, [dispatch, courtCount]);

  // Remove court handler
  const handleRemoveCourt = useCallback((courtId: string) => {
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

  // Memoized court items
  const courtItems = useMemo(() => 
    courtData.map(({ courtId, players, index, undoData }) => (
      <CourtItem
        key={courtId}
        courtId={courtId}
        index={index}
        players={players}
        courtName={courtNames[courtId] || `Court ${index + 1}`}
        isEditing={editingCourt === courtId}
        onStartEdit={handleStartEdit}
        onNameChange={handleCourtNameChange}
        onSubmitEdit={handleSubmitEdit}
        onCancelEdit={handleCancelEdit}
        onEndGame={handleEndGame}
        onUndoGame={handleUndoGame}
        onRemoveCourt={handleRemoveCourt}
        canRemove={canRemoveCourts}
        mounted={mounted}
        undoData={undoData}
        isUltraWide={isUltraWide}
      />
    )), 
    [courtData, courtNames, editingCourt, handleStartEdit, handleCourtNameChange, handleSubmitEdit, handleCancelEdit, handleEndGame, mounted, handleUndoGame, isUltraWide,canRemoveCourts, handleRemoveCourt  ]
  );

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
      {courtItems}
      <AddCourtButton onAddCourt={handleAddCourt} isUltraWide={isUltraWide} />
    </Grid>
  );
};

export default CourtZone;