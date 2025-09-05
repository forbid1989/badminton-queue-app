import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import { Card, Button , Typography, Box, TextField, IconButton, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Player } from './types/Player';
import DroppableZone from './DroppableZone';
import PlayerCard from './PlayerCard';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../lib/store/Action';
import { PlayerStatus } from './types/Player';

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
const MatchFormatChip = React.memo<{ format: string; playerCount: number }>(
  ({ format, playerCount }) => {
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
        label={format === 'Empty' ? 'Available' : `${format} (${playerCount}/${format === '1v1' ? '2' : '4'})`}
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
const POSITION_LABELS = ['P1', 'P2', 'P3', 'P4'];

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
  onEndGame 
}) => {
  
  // Memoized match format calculation
  const matchFormat = useMemo(() => getMatchFormat(players), [players]);
  
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
      size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: 4 }}
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
                <>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                      fontWeight: 'bold',
                      color: 'white',
                      padding: '2px 4px',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                    }}
                    onClick={handleStartEdit}
                    title="Click to edit court name"
                  >
                    🏸 {courtName}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleStartEdit}
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      padding: '2px',
                      '&:hover': {
                        color: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                    title="Edit court name"
                  >
                    <EditIcon sx={{ fontSize: '0.75rem' }} />
                  </IconButton>
                </>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MatchFormatChip format={matchFormat.format} playerCount={players.length} />
              
              {players.length > 0 && (
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

const CourtZone: React.FC<CourtZoneProps> = ({ courtCount }) => {
  const { state, dispatch } = useContext(AppContext);
  
  // State for court name editing
  const [editingCourt, setEditingCourt] = useState<string | null>(null);
  const [courtNames, setCourtNames] = useState<Record<string, string>>(() => {
    const defaultNames: Record<string, string> = {};
    for (let i = 0; i < courtCount; i++) {
      defaultNames[`court-${i}`] = `Court ${i + 1}`;
    }
    return defaultNames;
  });
  
  // Memoized court data calculation
  const courtData = useMemo(() => {
    const courts: Array<{ courtId: string; players: Player[]; index: number }> = [];
    
    for (let index = 0; index < courtCount; index++) {
      const courtId = `court-${index}`;
      
      // Use the pre-calculated zone mapping instead of filtering players
      const courtPlayers = state.courts.playersByCourt[courtId] || [];
      
      // Debug: Log court players and their order
      console.log(`🏟️ Court ${courtId} players:`, courtPlayers.map(p => `${p.name} (order: ${p.courtOrder})`));
      
      courts.push({ courtId, players: courtPlayers, index });
    }
    
    return courts;
  }, [state.courts.playersByCourt, courtCount]);

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

  // Memoized court items
  const courtItems = useMemo(() => 
    courtData.map(({ courtId, players, index }) => (
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
      />
    )), 
    [courtData, courtNames, editingCourt, handleStartEdit, handleCourtNameChange, handleSubmitEdit, handleCancelEdit, handleEndGame]
  );

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
      {courtItems}
    </Grid>
  );
};

export default CourtZone;