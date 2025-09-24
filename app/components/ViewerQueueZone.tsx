'use client'

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Grid, Box, Typography, Chip, useMediaQuery } from '@mui/material';
import { AppContext } from '../lib/AppContext';
import { Player } from './types/Player';

const QueueFormatChip = React.memo<{ format: string; playerCount: number; mounted: boolean }>(
  ({ format, playerCount, mounted }) => {
    const getChipColor = () => {
      switch (format) {
        case 'Empty': return { bg: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.7)' };
        case 'Waiting': return { bg: 'rgba(255,193,7,0.8)', text: '#000' };
        case '2v2': return { bg: 'rgba(76,175,80,0.9)', text: 'white' };
        case 'Mixed': return { bg: 'rgba(255,152,0,0.9)', text: 'white' };
        case 'Full': return { bg: 'rgba(33,150,243,0.9)', text: 'white' };
        default: return { bg: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.7)' };
      }
    };

    const colors = getChipColor();

    // Display text logic
    const displayText = !mounted || format === 'Empty' ? 
      'Waiting' : `${format} (${playerCount}/4)`;

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

// Queue background SVG (same as original)
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
    <rect x="20" y="20" width="260" height="60" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeDasharray="8,4" rx="8" />
    <path d="M 40 50 L 80 50 M 70 40 L 80 50 L 70 60" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="120" cy="35" r="3" fill="rgba(0,0,0,0.2)" />
    <circle cx="160" cy="35" r="3" fill="rgba(0,0,0,0.2)" />
    <circle cx="120" cy="65" r="3" fill="rgba(0,0,0,0.2)" />
    <circle cx="160" cy="65" r="3" fill="rgba(0,0,0,0.2)" />
    <text x="220" y="55" fontSize="12" fill="rgba(0,0,0,0.3)" fontFamily="Arial, sans-serif">QUEUE</text>
  </svg>
));

QueueBackground.displayName = 'QueueBackground';

// Helper function to get queue format
const getQueueFormat = (players: Player[]) => {
  if (players.length === 0) return { format: 'Empty' };
  if (players.length === 1) return { format: 'Waiting' };
  if (players.length === 4) return { format: '2v2' };
  if (players.length > 4) return { format: 'Full' };
  return { format: 'Mixed' };
};

// Viewer Queue Item Component (READ-ONLY VERSION)
const ViewerQueueItem = React.memo<{
  queueId: string;
  index: number;
  players: Player[];
  mounted: boolean;
  isUltraWide: boolean;
}>(({ queueId, index, players, mounted, isUltraWide }) => {
  
  // Memoized queue format calculation
  const queueFormat = useMemo(() => getQueueFormat(players), [players]);

  // Create 2x2 grid for queue positions
  const queuePositionGrid = useMemo(() => {
    const gridPlayers = Array(4).fill(null);
    
    // Sort players by queue order and fill positions
    const sortedPlayers = [...players].sort((a, b) => {
      const orderA = a.queueOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.queueOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    sortedPlayers.forEach((player, idx) => {
      if (idx < 4) {
        gridPlayers[idx] = player;
      }
    });

    return (
      <Grid container spacing={0.5} sx={{ flex: 1, minHeight: 0 }}>
        {QUEUE_POSITION_LABELS.map((label, index) => (
          <Grid size={6} key={`${queueId}-position-${index}`}>
            <Box
              sx={{
                minHeight: '30px',
                border: '1px solid rgba(0,0,0,0.15)',
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
                    color: 'rgba(0,0,0,0.4)', 
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
  }, [players, queueId]);

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
          background: 'linear-gradient(135deg, #92400e 0%, #b45309 100%)',
          borderRadius: 2,
          border: '1px solid rgba(217, 119, 6, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <QueueBackground />
        
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
                color: '#4A3C1C',
                padding: '2px 4px',
                textShadow: '1px 1px 2px rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              Queue {index + 1}
            </Typography>
            
            {/* NO REMOVE BUTTON IN VIEWER MODE */}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <QueueFormatChip format={queueFormat.format} playerCount={players.length} mounted={mounted} />
            
            {/* NO TRANSFER BUTTON IN VIEWER MODE */}
          </Box>
        </Box>

        {/* Queue Position Grid */}
        <Box sx={{ flex: 1, p: 1, display: 'flex' }}>
          {queuePositionGrid}
        </Box>
      </Box>
    </Grid>
  );
});

ViewerQueueItem.displayName = 'ViewerQueueItem';

// Viewer Queue Zone Component
export const ViewerQueueZone: React.FC = () => {
  const { state } = useContext(AppContext);
  const [mounted, setMounted] = useState(false);
  const isUltraWide = useMediaQuery('(min-width: 1830px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize queue data calculation
  const queueData = useMemo(() => {
    const queues: Array<{ queueId: string; players: Player[] }> = [];
    
    const queueIds = Object.keys(state.queue.playersByQueue);
    
    queueIds.forEach((queueId) => {
      const queuePlayers = state.queue.playersByQueue[queueId] || [];
      queues.push({ queueId, players: queuePlayers });
    });
    
    return queues;
  }, [state.queue.playersByQueue]);

  // Memoized queue items (viewer mode)
  const queueItems = useMemo(() => 
    queueData.map(({ queueId, players }, index) => (
      <ViewerQueueItem
        key={queueId}
        queueId={queueId}
        index={index}
        players={players}
        mounted={mounted}
        isUltraWide={isUltraWide}
      />
    )), 
    [queueData, mounted, isUltraWide]
  );

  return (
    <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }} className="court-queue-medium-screen">
      {queueItems}
      {/* NO ADD QUEUE BUTTON IN VIEWER MODE */}
    </Grid>
  );
};

export default ViewerQueueZone;