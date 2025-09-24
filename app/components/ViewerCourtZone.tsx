'use client'

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Grid, Box, Typography, Chip, useMediaQuery } from '@mui/material';
import { AppContext } from '../lib/AppContext';
import { Player } from './types/Player';
import { UndoGameData } from '../lib/store/rootState';

// Match format chip component (same as original)
const MatchFormatChip = React.memo<{ format: string; playerCount: number; mounted: boolean }>(
  ({ format, playerCount, mounted }) => {
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

// Badminton court background SVG (same as original)
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
      opacity: 0.15,
    }}
    preserveAspectRatio="none"
  >
    <rect x="25" y="25" width="250" height="100" fill="none" stroke="white" strokeWidth="2" />
    <line x1="150" y1="25" x2="150" y2="125" stroke="white" strokeWidth="1.5" />
    <line x1="25" y1="100" x2="275" y2="100" stroke="white" strokeWidth="1.5" />
    <line x1="50" y1="25" x2="50" y2="125" stroke="white" strokeWidth="1.5" />
    <line x1="250" y1="25" x2="250" y2="125" stroke="white" strokeWidth="1.5" />
  </svg>
));

BadmintonCourtBackground.displayName = 'BadmintonCourtBackground';

// Position labels for court grid
const POSITION_LABELS = ['Team A P1', 'Team B P1', 'Team A P2', 'Team B P2'];

// Helper function to get match format
const getMatchFormat = (playerCount: number) => {
  if (playerCount === 0) return 'Empty';
  if (playerCount === 1) return 'Waiting';
  if (playerCount === 2) return '1v1';
  if (playerCount === 3) return '2v1';
  if (playerCount === 4) return '2v2';
  return 'Overflow';
};

// Viewer Court Item Component (READ-ONLY VERSION)
const ViewerCourtItem = React.memo<{
  courtId: string;
  index: number;
  players: Player[];
  courtName: string;
  mounted: boolean;
  undoData?: UndoGameData;
  isUltraWide: boolean;
}>(({ 
  courtId, 
  players, 
  courtName,
  mounted,
  undoData,
  isUltraWide
}) => {

  // Memoized match format calculation
  const matchFormat = useMemo(() => getMatchFormat(players.length), [players.length]);

  // Create 2x2 grid for court positions
  const courtPositionGrid = useMemo(() => {
    const gridPlayers = Array(4).fill(null);
    
    // Sort players by court order and fill positions
    const sortedPlayers = [...players].sort((a, b) => {
      const orderA = a.courtOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.courtOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    sortedPlayers.forEach((player) => {
      if (player.courtOrder !== null && player.courtOrder >= 0 && player.courtOrder < 4) {
        gridPlayers[player.courtOrder] = player;
      }
    });

    return (
      <Grid container spacing={0.5} sx={{ flex: 1, minHeight: 0 }}>
        {POSITION_LABELS.map((label, index) => (
          <Grid size={6} key={`${courtId}-position-${index}`}>
            <Box
              sx={{
                minHeight: '30px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 1,
                backgroundColor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {gridPlayers[index] ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    minHeight: '28px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 4px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
                    {gridPlayers[index].name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.55rem', opacity: 0.7 }}>
                    {gridPlayers[index].gamesPlayed}G
                  </Typography>
                </Box>
              ) : (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.4)', 
                    fontSize: '0.6rem',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  }, [players, courtId]);

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
      {/* Removed DroppableZone wrapper - just display content */}
      <Box
        sx={{
          minHeight: '140px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
          borderRadius: 2,
          border: '1px solid rgba(59, 130, 246, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <BadmintonCourtBackground />
        
        {/* Header */}
        <Box 
          sx={{ 
            position: 'relative', 
            zIndex: 1, 
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)',
                fontWeight: 'bold',
                color: '#E3F2FD',
                padding: '2px 4px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {courtName}
            </Typography>
            
            <MatchFormatChip 
              format={matchFormat} 
              playerCount={players.length} 
              mounted={mounted}
            />
          </Box>
          
          {/* NO ACTION BUTTONS IN VIEWER MODE */}
        </Box>

        {/* Court Position Grid - Always show the 2x2 grid */}
        <Box sx={{ flex: 1, p: 1, display: 'flex' }}>
          {courtPositionGrid}
        </Box>
      </Box>
    </Grid>
  );
});

ViewerCourtItem.displayName = 'ViewerCourtItem';

// Viewer Court Zone Component
const ViewerCourtZone: React.FC = () => {
  const { state } = useContext(AppContext);
  const [mounted, setMounted] = useState(false);
  const isUltraWide = useMediaQuery('(min-width: 1830px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized court data calculation
  const courtData = useMemo(() => {
    const courts: Array<{ courtId: string; players: Player[]; index: number; undoData?: UndoGameData }> = [];
    
    for (let index = 0; index < state.courts.count; index++) {
      const courtId = `court-${index}`;
      const courtPlayers = state.courts.playersByCourt[courtId] || [];
      const undoData = state.undoableGames[courtId];
      
      courts.push({ courtId, players: courtPlayers, index, undoData });
    }
    
    return courts;
  }, [state.courts.playersByCourt, state.undoableGames, state.courts.count]);

  // Memoized court items (viewer mode)
  const courtItems = useMemo(() => 
    courtData.map(({ courtId, players, index, undoData }) => (
      <ViewerCourtItem
        key={courtId}
        courtId={courtId}
        index={index}
        players={players}
        courtName={`Court ${parseInt(courtId.split('-')[1]) + 1}`}
        mounted={mounted}
        undoData={undoData}
        isUltraWide={isUltraWide}
      />
    )), 
    [courtData, mounted, isUltraWide]
  );

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
      {courtItems}
      {/* NO ADD COURT BUTTON IN VIEWER MODE */}
    </Grid>
  );
};

export default ViewerCourtZone;
