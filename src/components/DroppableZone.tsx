import React, { useContext, useState } from 'react';
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

const DroppableZone: React.FC<DroppableZoneProps> = ({ zone, players, children, sx }) => {
  const { dispatch } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  const isFull = players.length >= 4;

  // Desktop drag handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovered(false);
    
    const json = e.dataTransfer.getData('player/json');
    if (!json) return;

    const player: Player = JSON.parse(json);
    const from = e.dataTransfer.getData('player/source');

    if (from === zone) return; // no-op if dropped into same zone

    dispatch(Action.movePlayer(player.id, from, zone));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isFull) {
      setIsHovered(true);
    }
  };

  const handleDragLeave = () => {
    setIsHovered(false);
  };

  // Touch event handlers for mobile
  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const droppableZone = elementBelow?.closest('[data-droppable-zone]');
    
    // Remove hover from all zones
    document.querySelectorAll('[data-droppable-zone]').forEach(el => {
      el.classList.remove('touch-hover');
    });
    
    // Add hover to current zone if it's not full
    if (droppableZone && droppableZone.getAttribute('data-droppable-zone') === zone && !isFull) {
      droppableZone.classList.add('touch-hover');
    }
  };

  const handleTouchEnd = () => {
    // Remove all hover states
    document.querySelectorAll('[data-droppable-zone]').forEach(el => {
      el.classList.remove('touch-hover');
    });
  };

  // Add/remove global touch event listeners
  React.useEffect(() => {
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [zone, isFull]);

  const zoneBackground =
    zone.startsWith('court')
      ? '#DFF0D8'
      : zone.startsWith('queue')
      ? '#FFF8DC'
      : zone === 'all'
      ? '#F5EFE6'
      : '#FAFAFA';

  return (
    <Box
      data-droppable-zone={zone}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        border: `2px dashed ${isFull ? '#D5C96A' : isHovered ? '#4CAF50' : '#CAD4CC'}`,
        borderRadius: 2,
        padding: 2,
        marginBottom: 3,
        backgroundColor: isHovered ? '#E8F5E9' : zoneBackground,
        minHeight: 80,
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        '&.touch-hover': {
          backgroundColor: '#E8F5E9',
          borderColor: '#4CAF50',
          transform: 'scale(1.02)',
        },
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

export default DroppableZone;