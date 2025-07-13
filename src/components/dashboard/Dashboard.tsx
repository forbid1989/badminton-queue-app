import React, { useContext } from 'react';
import { Typography, Grid, Box, Divider, useTheme  } from '@mui/material';

import { AppContext } from '../../BadmintonQueueUI';
import CourtZone from '../CourtZone';
import QueueZone from '../QueueZone';
import UnqueuedZone from '../UnqueuedZone';
import PlayerParserForm from '../input/PlayerParserForm';

const Dashboard: React.FC = () => {
  const { state } = useContext(AppContext);
  const theme = useTheme();

  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 64px)', 
      overflow: 'hidden', 
      p: 2, 
      gap: 2,
      bgcolor: theme.palette.background.default, // from theme.ts
    }}>
      
      {/* Left Sidebar - Unqueued List */}
      <Box
        sx={{
          width: '35%',
          maxHeight: '100%',
          overflowY: 'auto',
          p: 2,
          flexShrink: 0,
          minWidth: 300,
          bgcolor: theme.palette.background.paper, // ☕ from theme
          borderRadius: 2,
          boxShadow: theme.shadows[2],
        }}
      >
        <UnqueuedZone players={state.unqueued.players} />
      </Box>

      {/* Right Main Area */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 2 }}>
        {/* Courts Section */}
        <CourtZone
          playersByCourt={state.courts.playersByCourt}
          courtCount={state.courts.count}
        />

        <Divider sx={{ my: 3 }} />

        {/* Queue Section */}
        <QueueZone
          playersByQueue={state.queue.playersByQueue}
          courtCount={state.courts.count}
        />

        <Divider sx={{ my: 3 }} />

        {/* Player Parser */}
        <PlayerParserForm />
      </Box>
    </Box>
  );
};

export default Dashboard;
