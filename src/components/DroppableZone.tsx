import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import { Player } from '../types/Player';

type DroppableZoneProps = {
  zone: string;
  players: Player[];
  children?: React.ReactNode;
  sx?: object;
};

const DroppableZone: React.FC<DroppableZoneProps> = React.memo(({ zone, players, children, sx }) => {
  // Memoize isFull calculation
  const isFull = useMemo(() => players.length >= 4, [players.length]);

  // DND-Kit droppable hook
  const { isOver, setNodeRef } = useDroppable({
    id: zone,
    data: {
      type: 'zone',
      zone,
      playerCount: players.length,
      isFull,
    },
    disabled: isFull && zone !== 'all' && zone !== 'rest', // Allow drops to 'all' and 'rest' even when "full"
  });

  // Memoized zone background calculation
  const zoneBackground = useMemo(() => {
    if (zone.startsWith('court')) return '#DFF0D8';
    if (zone.startsWith('queue')) return '#FFF8DC';
    if (zone === 'all') return '#F5EFE6';
    return '#FAFAFA';
  }, [zone]);

  // Memoized border color calculation
  const borderColor = useMemo(() => {
    if (isFull && zone !== 'all' && zone !== 'rest') return '#D5C96A';
    if (isOver) return '#4CAF50';
    return '#CAD4CC';
  }, [isFull, isOver, zone]);

  // Memoized background color calculation
  const backgroundColor = useMemo(() => {
    return isOver ? '#E8F5E9' : zoneBackground;
  }, [isOver, zoneBackground]);

  // Memoized transform calculation
  const transform = useMemo(() => {
    return isOver ? 'scale(1.02)' : 'scale(1)';
  }, [isOver]);

  // Memoized combined styles
  const combinedSx = useMemo(() => ({
    border: `2px dashed ${borderColor}`,
    borderRadius: 2,
    padding: 2,
    marginBottom: 3,
    backgroundColor,
    minHeight: 80,
    transition: 'all 0.2s ease',
    transform,
    position: 'relative',
    '&::before': isOver ? {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderRadius: 2,
      pointerEvents: 'none',
    } : {},
    ...sx
  }), [borderColor, backgroundColor, transform, isOver, sx]);

  return (
    <Box
      ref={setNodeRef}
      data-droppable-zone={zone}
      sx={combinedSx}
    >
      {children}
    </Box>
  );
});

DroppableZone.displayName = 'DroppableZone';

export default DroppableZone;