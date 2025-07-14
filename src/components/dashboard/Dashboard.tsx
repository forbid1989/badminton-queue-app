import React, { useContext, useState  } from 'react';
import { Typography, IconButton, Box, Divider, useTheme  } from '@mui/material';
import AddIcon from '@mui/icons-material/GroupAdd'; // new
import { AppContext } from '../../BadmintonQueueUI';
import CourtZone from '../CourtZone';
import QueueZone from '../QueueZone';
import UnqueuedZone from '../UnqueuedZone';
import PlayerParserForm from '../input/PlayerParserForm';

const Dashboard: React.FC = () => {
  const { state } = useContext(AppContext);
  const theme = useTheme();

  const [openParser, setOpenParser] = useState(false);

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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6">Resting Players</Typography>
          <IconButton onClick={() => setOpenParser(true)} title="Add Players">
            <AddIcon />
          </IconButton>
        </Box>
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
        <PlayerParserForm open={openParser} onClose={() => setOpenParser(false)} />
      </Box>
    </Box>
  );
};

export default Dashboard;
