import React, { useContext } from 'react';
import { Box, Typography } from '@mui/material';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../app/Action';
import { Player } from '../types/Player';

type DroppableZoneProps = {
  zone: string; // ✅ changed from 'court' | 'queue' | 'rest' to string
  players: Player[];
  children?: React.ReactNode;
  sx?: object
};
const DroppableZone: React.FC<DroppableZoneProps> = ({ zone, players, children, sx }) => {
  const { dispatch } = useContext(AppContext);
  const isFull = players.length >= 4;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const json = e.dataTransfer.getData('player/json');
    if (!json) return;

    const player: Player = JSON.parse(json);
    const from = e.dataTransfer.getData('player/source') as 'court' | 'queue' | 'rest';

    

    if (from === zone) return; // no-op if dropped into same zone

    dispatch(Action.movePlayer(player.id, from, zone));
  };

  const zoneBackground =
    zone.startsWith('court')
      ? '#DFF0D8' // very light green (if you want court zones lighter too)
      : zone.startsWith('queue')
      ? '#FFF8DC' // light cream for queues
      : zone === 'rest'
      ? '#F5EFE6' // ✅ light beige for resting zone
      : '#FAFAFA'; // fallback

  return (
    <Box
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      sx={{
        border: `2px dashed ${isFull ? '#D5C96A' : '#CAD4CC'}`,
        borderRadius: 2,
        padding: 2,
        marginBottom: 3,
        backgroundColor: zoneBackground,
        minHeight: 80,
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

export default DroppableZone;
