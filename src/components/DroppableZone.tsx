import React, { useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import { Player } from '../types/Player';

type DroppableZoneProps = {
  zone: string;
  players: Player[];
  children?: React.ReactNode;
  sx?: object
};

const DroppableZone: React.FC<DroppableZoneProps> = React.memo(({ zone, players, children, sx }) => {
  const { dispatch } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  
  // Use refs to store current values for event handlers
  const zoneRef = useRef(zone);
  const isFullRef = useRef(false);
  
  // Memoize isFull calculation
  const isFull = useMemo(() => players.length >= 4, [players.length]);
  
  // Update refs when values change
  useEffect(() => {
    zoneRef.current = zone;
    isFullRef.current = isFull;
  }, [zone, isFull]);

  // Memoized zone background calculation
  const zoneBackground = useMemo(() => {
    if (zone.startsWith('court')) return '#DFF0D8';
    if (zone.startsWith('queue')) return '#FFF8DC';
    if (zone === 'all') return '#F5EFE6';
    return '#FAFAFA';
  }, [zone]);

  // Memoized border color calculation
  const borderColor = useMemo(() => {
    if (isFull) return '#D5C96A';
    if (isHovered) return '#4CAF50';
    return '#CAD4CC';
  }, [isFull, isHovered]);

  // Memoized background color calculation
  const backgroundColor = useMemo(() => {
    return isHovered ? '#E8F5E9' : zoneBackground;
  }, [isHovered, zoneBackground]);

  // Memoized transform calculation
  const transform = useMemo(() => {
    return isHovered ? 'scale(1.02)' : 'scale(1)';
  }, [isHovered]);

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
    '&.touch-hover': {
      backgroundColor: '#E8F5E9',
      borderColor: '#4CAF50',
      transform: 'scale(1.02)',
    },
    ...sx
  }), [borderColor, backgroundColor, transform, sx]);

  // Optimized drag handlers with useCallback
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    
    const json = e.dataTransfer.getData('player/json');
    if (!json) return;

    try {
      const player: Player = JSON.parse(json);
      const from = e.dataTransfer.getData('player/source');

      if (from === zoneRef.current) return; // no-op if dropped into same zone

      dispatch(Action.movePlayer(player.id, from, zoneRef.current));
    } catch (error) {
      console.error('Error parsing player data:', error);
    }
  }, [dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isFullRef.current) {
      setIsHovered(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Optimized touch handlers with useCallback and refs
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const droppableZone = elementBelow?.closest('[data-droppable-zone]');
    
    // Remove hover from all zones (optimized selector)
    const allZones = document.querySelectorAll('[data-droppable-zone]');
    allZones.forEach(el => {
      el.classList.remove('touch-hover');
    });
    
    // Add hover to current zone if it's not full
    if (droppableZone && 
        droppableZone.getAttribute('data-droppable-zone') === zoneRef.current && 
        !isFullRef.current) {
      droppableZone.classList.add('touch-hover');
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Remove all hover states (cached selector)
    const allZones = document.querySelectorAll('[data-droppable-zone]');
    allZones.forEach(el => {
      el.classList.remove('touch-hover');
    });
  }, []);

  // Optimized effect with proper cleanup and memoized handlers
  useEffect(() => {
    const touchMoveHandler = handleTouchMove;
    const touchEndHandler = handleTouchEnd;

    document.addEventListener('touchmove', touchMoveHandler, { passive: true });
    document.addEventListener('touchend', touchEndHandler, { passive: true });
    
    return () => {
      document.removeEventListener('touchmove', touchMoveHandler);
      document.removeEventListener('touchend', touchEndHandler);
    };
  }, [handleTouchMove, handleTouchEnd]);

  return (
    <Box
      data-droppable-zone={zone}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={combinedSx}
    >
      {children}
    </Box>
  );
});

DroppableZone.displayName = 'DroppableZone';

export default DroppableZone;