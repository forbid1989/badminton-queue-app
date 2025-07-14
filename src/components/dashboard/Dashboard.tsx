import React, { useContext, useState  } from 'react';
import { Typography, IconButton, Box, Divider, useTheme  } from '@mui/material';
import AddIcon from '@mui/icons-material/GroupAdd'; // new
import { AppContext } from '../../BadmintonQueueUI';
import CourtZone from '../CourtZone';
import QueueZone from '../QueueZone';
import UnqueuedZone from '../UnqueuedZone';
import PlayerParserForm from '../input/PlayerParserForm';
import CourtControlPanel from '../CourtControlPanel';
import Popover from '@mui/material/Popover';
import AddRoadIcon from '@mui/icons-material/AddRoad';

const Dashboard: React.FC = () => {
  const { state } = useContext(AppContext);
  const theme = useTheme();

  const [openParser, setOpenParser] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClosePopover = () => {
    setAnchorEl(null);
  };
  const isPopoverOpen = Boolean(anchorEl)

  const totalPlayers =
    state.unqueued.players.length +
    Object.values(state.queue.playersByQueue).flat().length +
    Object.values(state.courts.playersByCourt).flat().length;

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
          p: 1,
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

          }}
        >
          <Typography variant="subtitle1" sx={{ fontSize: '0.95rem' }}>
            Total Players: {totalPlayers}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => setOpenParser(true)} title="Add Players">
              <AddIcon />
            </IconButton>
            <IconButton onClick={handleOpenPopover} title="Court Settings">
              <AddRoadIcon />
            </IconButton>
          </Box>
        </Box>
        <UnqueuedZone state={state} />

        <Popover
          open={isPopoverOpen}
          anchorEl={anchorEl}
          onClose={handleClosePopover}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          slotProps={{
            paper: {
              sx: {
                p: 2,
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[3],
              },
            },
          }}
        >
          <CourtControlPanel onClose={handleClosePopover} />
        </Popover>
      </Box>

      {/* Right Main Area */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 2 }}>
        {/* Courts Section */}
        <CourtZone
          playersByCourt={state.courts.playersByCourt}
          courtCount={state.courts.count}
        />

        <Divider sx={{ my: 1 }} />

        {/* Queue Section */}
        <QueueZone
          playersByQueue={state.queue.playersByQueue}
          courtCount={state.courts.count}
        />

        <Divider sx={{ my: 1 }} />

        {/* Player Parser */}
        <PlayerParserForm open={openParser} onClose={() => setOpenParser(false)} />
      </Box>
    </Box>
  );
};

export default Dashboard;
