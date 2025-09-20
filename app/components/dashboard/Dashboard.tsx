import React, { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Typography, IconButton, Box, Divider, useTheme, useMediaQuery, Tabs, Tab, Chip  } from '@mui/material';
import { ViewModule as AllIcon, Queue as QueueIcon, SportsTennis as CourtsIcon } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/GroupAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import AttachMoneyIcon from '@mui/icons-material/Payment';
import ListIcon from '@mui/icons-material/List';
import { AppContext } from '../../BadmintonQueueUI';
import CourtZone from '../CourtZone';
import QueueZone from '../QueueZone';
import UnqueuedZone from '../PlayerListZone';
import PlayerParserForm from '../input/PlayerParserForm';
import CourtControlPanel from '../CourtControlPanel';
import SettingsModal from '../input/SettingsModal';
import Popover from '@mui/material/Popover';
import PlayerListModal from '../input/PlayerListModal';
import CourtAddIcon from '../input/CourtAddIcon';
import PaymentModal from '../input/PaymentModal';

const Dashboard: React.FC = React.memo(() => {
  const { state } = useContext(AppContext);
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // State management
  const [openParser, setOpenParser] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openPlayerList, setOpenPlayerList] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState(0);

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

  const handleOpenSettings = useCallback(() => {
    setOpenSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setOpenSettings(false);
  }, []);

  const handleOpenPayment = useCallback(() => {
    setOpenPayment(true);
  }, []);

  const handleClosePayment = useCallback(() => {
    setOpenPayment(false);
  }, []);

  const handleOpenPlayerList = useCallback(() => {
    setOpenPlayerList(true);
  }, []);

  const handleClosePlayerList = useCallback(() => {
    setOpenPlayerList(false);
  }, []);

  const handleMobileTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setMobileActiveTab(newValue);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized style objects with responsive breakpoints
  const containerSx = useMemo(() => ({
    display: 'flex', 
    height: 'calc(100vh - 64px)', 
    overflow: 'hidden', 
    p: { xs: 1, sm: 1.5, md: 2 }, // Responsive padding
    gap: { xs: 1, sm: 1.5, md: 2 }, // Responsive gap
    bgcolor: theme.palette.background.default,
    flexDirection: { xs: 'column', sm: 'row' },
  }), [theme.palette.background.default]);

  const leftSidebarSx = useMemo(() => ({
    width: { 
      xs: '100%', 
      sm: '22%',  // Reduced from 38% to 30% to give more space to courts/queues
      md: '23%',  // Reduced from 35% to 28%
      lg: '32%'   // Reduced from 32% to 25%
    },
    maxHeight: { xs: '40vh', sm: '100%' }, // Limit height when stacked
    overflowY: 'auto',
    p: { xs: 0.5, sm: 1 }, // Less padding on smaller screens
    flexShrink: 0,
    minWidth: { xs: 'auto', sm: 240, md: 260 }, // Reduced min widths
    bgcolor: theme.palette.background.paper,
    borderRadius: 2,
    boxShadow: theme.shadows[2],
    order: { xs: 2, sm: 0 },
    height: { xs: '40vh', sm: 'auto' }
  }), [theme.palette.background.paper, theme.shadows]);

  const rightAreaSx = useMemo(() => ({
    flexGrow: 1, 
    overflowY: 'auto', 
    pr: 2,
    order: { xs: 1, sm: 0 },
  }), []);

  const headerSx = useMemo(() => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: { xs: 'flex-start', sm: 'flex-start', md: 'flex-start', lg: 'center', xl: 'center' },
    flexDirection: { xs: 'column', sm: 'column', md: 'flex-start', lg: 'row', xl: 'row' }, // Stack vertically on small screens, row on larger
    gap: { xs: 1, sm: 0 }, // Add gap when stacked
  }), []);

  const buttonGroupSx = useMemo(() => ({
    display: 'flex', 
    gap: 1,
    flexWrap: 'nowrap',
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

  const headerContent = useMemo(() => (
    <Box 
      sx={headerSx}
    >
      <Typography variant="subtitle1" sx={{ fontSize: '0.95rem' }} suppressHydrationWarning>
        Total Players: {mounted ? totalPlayers : 0}
      </Typography>
      <Box sx={buttonGroupSx}>
        <IconButton onClick={handleOpenParser} title="Add Players">
          <AddIcon />
        </IconButton>
        <IconButton onClick={handleOpenPlayerList} title="View Player List & Skills">
          <ListIcon />
        </IconButton>
        <IconButton onClick={handleOpenPopover} title="Court Settings">
          <CourtAddIcon />
        </IconButton>
        <IconButton onClick={handleOpenPayment} title="Payment Summary">
          <AttachMoneyIcon />
        </IconButton>
        <IconButton onClick={handleOpenSettings} title="App Settings">
          <SettingsIcon />
        </IconButton>
      </Box>
    </Box>
  ), [totalPlayers, headerSx, buttonGroupSx, mounted, handleOpenParser, handleOpenPlayerList, handleOpenPopover, handleOpenPayment, handleOpenSettings]);

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
    {/* Mobile Tabs - Only show on mobile */}
    {isMobile && (
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        mb: 2,
        mx: -1 // Offset container padding
      }}>
        <Tabs
          value={mobileActiveTab}
          onChange={handleMobileTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.75rem',
              textTransform: 'none',
              fontWeight: 600,
            },
            '& .MuiTabs-indicator': {
              height: 3,
            },
          }}
        >
          <Tab 
            icon={<AllIcon sx={{ fontSize: '1.1rem' }} />}
            label="All"
            iconPosition="start"
          />
          <Tab 
            icon={<QueueIcon sx={{ fontSize: '1.1rem' }} />}
            label="Queues"
            iconPosition="start"
          />
          <Tab 
            icon={<CourtsIcon sx={{ fontSize: '1.1rem' }} />}
            label="Courts"
            iconPosition="start"
          />
        </Tabs>
      </Box>
    )}

    {/* Left Sidebar - Unqueued List */}
    <Box sx={leftSidebarSx}>
      {!isMobile ? headerContent : <></>}
      <UnqueuedZone state={state} />
      
      <Box sx={{ 
        mt: 1, 
        p: 1, 
        textAlign: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.7rem', 
            color: 'text.secondary',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5
          }}
        >
          Data management & clear options are in <SettingsIcon sx={{ fontSize: '0.8rem' }} /> Settings
        </Typography>
      </Box>
      {popoverContent}
    </Box>

    {/* Right Main Area */}
    <Box sx={rightAreaSx}>
      {/* Show content based on mobile tab selection */}
      {(!isMobile || mobileActiveTab === 0 || mobileActiveTab === 2) && (
        <>
          {/* Courts Section */}
          <CourtZone courtCount={courtCount} />
          {(!isMobile || mobileActiveTab === 0) && <Divider sx={dividerSx} />}
        </>
      )}

      {(!isMobile || mobileActiveTab === 0 || mobileActiveTab === 1) && (
        <>
          {/* Queue Section */}
          <QueueZone courtCount={courtCount} />
          <Divider sx={dividerSx} />
        </>
      )}

      {/* Player Parser Modal */}
      <PlayerParserForm open={openParser} onClose={handleCloseParser} />

      {/* Player List Modal */}
      <PlayerListModal open={openPlayerList} onClose={handleClosePlayerList} />
      
      {/* Settings Modal */}
      <SettingsModal open={openSettings} onClose={handleCloseSettings} />

      {/* Payment Modal */}
      <PaymentModal open={openPayment} onClose={handleClosePayment} />
    </Box>
  </Box>
);
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;