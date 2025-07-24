import React, { useContext, useState, useCallback, useMemo } from 'react';
import { Typography, IconButton, Box, Divider, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/GroupAdd';
import { AppContext } from '../../BadmintonQueueUI';
import CourtZone from '../CourtZone';
import QueueZone from '../QueueZone';
import UnqueuedZone from '../PlayerListZone';
import PlayerParserForm from '../input/PlayerParserForm';
import CourtControlPanel from '../CourtControlPanel';
import Popover from '@mui/material/Popover';
import AddRoadIcon from '@mui/icons-material/AddRoad';

const Dashboard: React.FC = React.memo(() => {
  const { state } = useContext(AppContext);
  const theme = useTheme();

  // State management
  const [openParser, setOpenParser] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Memoized calculations
  const totalPlayers = useMemo(() => state.players.length, [state.players.length]);
  const courtCount = useMemo(() => state.courts.count, [state.courts.count]);
  const isPopoverOpen = useMemo(() => Boolean(anchorEl), [anchorEl]);

  // Memoized event handlers
  const handleOpenParser = useCallback(() => {
    setOpenParser(true);
  }, []);

  const handleCloseParser = useCallback(() => {
    setOpenParser(false);
  }, []);

  const handleOpenPopover = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClosePopover = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Memoized style objects
  const containerSx = useMemo(() => ({
    display: 'flex', 
    height: 'calc(100vh - 64px)', 
    overflow: 'hidden', 
    p: 2, 
    gap: 2,
    bgcolor: theme.palette.background.default,
  }), [theme.palette.background.default]);

  const leftSidebarSx = useMemo(() => ({
    width: '35%',
    maxHeight: '100%',
    overflowY: 'auto',
    p: 1,
    flexShrink: 0,
    minWidth: 300,
    bgcolor: theme.palette.background.paper,
    borderRadius: 2,
    boxShadow: theme.shadows[2],
  }), [theme.palette.background.paper, theme.shadows]);

  const rightAreaSx = useMemo(() => ({
    flexGrow: 1, 
    overflowY: 'auto', 
    pr: 2
  }), []);

  const headerSx = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }), []);

  const buttonGroupSx = useMemo(() => ({
    display: 'flex', 
    gap: 1
  }), []);

  const popoverPaperSx = useMemo(() => ({
    p: 2,
    borderRadius: 2,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[3],
  }), [theme.palette.background.paper, theme.shadows]);

  const dividerSx = useMemo(() => ({
    my: 1
  }), []);

  // Memoized popover configuration
  const popoverConfig = useMemo(() => ({
    anchorOrigin: {
      vertical: 'bottom' as const,
      horizontal: 'right' as const,
    },
    transformOrigin: {
      vertical: 'top' as const,
      horizontal: 'right' as const,
    },
  }), []);

  // Memoized header content
  const headerContent = useMemo(() => (
    <Box sx={headerSx}>
      <Typography variant="subtitle1" sx={{ fontSize: '0.95rem' }}>
        Total Players: {totalPlayers}
      </Typography>
      <Box sx={buttonGroupSx}>
        <IconButton onClick={handleOpenParser} title="Add Players">
          <AddIcon />
        </IconButton>
        <IconButton onClick={handleOpenPopover} title="Court Settings">
          <AddRoadIcon />
        </IconButton>
      </Box>
    </Box>
  ), [totalPlayers, headerSx, buttonGroupSx, handleOpenParser, handleOpenPopover]);

  // Memoized popover content
  const popoverContent = useMemo(() => (
    <Popover
      open={isPopoverOpen}
      anchorEl={anchorEl}
      onClose={handleClosePopover}
      anchorOrigin={popoverConfig.anchorOrigin}
      transformOrigin={popoverConfig.transformOrigin}
      slotProps={{
        paper: {
          sx: popoverPaperSx,
        },
      }}
    >
      <CourtControlPanel onClose={handleClosePopover} />
    </Popover>
  ), [
    isPopoverOpen, 
    anchorEl, 
    handleClosePopover, 
    popoverConfig, 
    popoverPaperSx
  ]);

  return (
    <Box sx={containerSx}>
      {/* Left Sidebar - Unqueued List */}
      <Box sx={leftSidebarSx}>
        {headerContent}
        <UnqueuedZone state={state} />
        {popoverContent}
      </Box>

      {/* Right Main Area */}
      <Box sx={rightAreaSx}>
        {/* Courts Section */}
        <CourtZone courtCount={courtCount} />

        <Divider sx={dividerSx} />

        {/* Queue Section */}
        <QueueZone courtCount={courtCount} />

        <Divider sx={dividerSx} />

        {/* Player Parser Modal */}
        <PlayerParserForm open={openParser} onClose={handleCloseParser} />
      </Box>
    </Box>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;