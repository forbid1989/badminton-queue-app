import React, { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Typography, IconButton, Box, Divider, useTheme, useMediaQuery, Tabs, Tab, CircularProgress, Button   } from '@mui/material';
import { ViewModule as AllIcon, Queue as QueueIcon, SportsTennis as CourtsIcon, ContentCopy as ContentCopyIcon, Close as CloseIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/GroupAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import AttachMoneyIcon from '@mui/icons-material/Payment';
import ListIcon from '@mui/icons-material/List';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useSSE } from '../../lib/contexts/SSEContext';
import { AppContext } from '../../BadmintonQueueUI';
import CourtZone from '../CourtZone';
import QueueZone from '../QueueZone';
import UnqueuedZone from '../PlayerListZone';
import PlayerParserForm from '../input/PlayerParserForm';
import CourtControlPanel from '../CourtControlPanel';
import SettingsModal from '../input/SettingsModal';
import Popover from '@mui/material/Popover';
import PlayerListModal from '../input/PlayerListModal';
import PaymentModal from '../input/PaymentModal';

type DashboardProps = {
  onShowTutorial?: () => void;
};

const Dashboard: React.FC<DashboardProps> = React.memo(({ onShowTutorial }) => {
  const { state } = useContext(AppContext);
  const {
    isHost,
    sessionId,
    viewerCount,
    shareLink,
    qrCodeUrl,
    createSession,
    endSession
  } = useSSE();

  const theme = useTheme();
  const isPortraitMobile = useMediaQuery('(max-width: 768px) and (orientation: portrait) and (max-height: 900px)');
  const isVerySmallScreen = useMediaQuery('(max-width: 600px)');
  const isMobile = isPortraitMobile || isVerySmallScreen;

  // State management
  const [openParser, setOpenParser] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openPlayerList, setOpenPlayerList] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState(0);
  const [showSmartHints, setShowSmartHints] = useState(false);

  // Add sharing-related state
  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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

  const handleOpenShare = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setShareAnchorEl(event.currentTarget);
  }, []);

  const handleCloseShare = useCallback(() => {
    setShareAnchorEl(null);
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopySuccess(true);
        // Auto-clear after 3 seconds
        setTimeout(() => setCopySuccess(false), 3000);
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    }
  }, [shareLink]);

  const handleEndSession = useCallback(() => {
    endSession();
    handleCloseShare();
  }, [endSession, handleCloseShare]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const hasSeenDragHints = localStorage.getItem('dragHintsSeen');
    const hasSeenTutorial = localStorage.getItem('dragTutorialSeen');
    const hasPlayers = totalPlayers >= 3;
    const hasEmptyCourts = Object.values(state.courts.playersByCourt || {}).some(
      (court: any) => Array.isArray(court) && court.length === 0
    );
    
    // Show subtle hints if user has players but hasn't used drag & drop
    if (!hasSeenDragHints && !hasSeenTutorial && hasPlayers && hasEmptyCourts) {
      const timer = setTimeout(() => {
        setShowSmartHints(true);
        // Auto-hide after 10 seconds
        setTimeout(() => setShowSmartHints(false), 10000);
      }, 5000); // Show after 5 seconds of inactivity
      
      return () => clearTimeout(timer);
    }
  }, [totalPlayers, state.courts.playersByCourt]);

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
        <IconButton onClick={handleOpenShare} title="Share Live Session" disabled={isCreatingSession}>
          {isCreatingSession ? <CircularProgress size={20} /> : <QrCodeIcon />}
        </IconButton>
        <IconButton onClick={handleOpenPayment} title="Payment Summary">
          <AttachMoneyIcon />
        </IconButton>
        <IconButton onClick={handleOpenSettings} title="App Settings">
          <SettingsIcon />
        </IconButton>
      </Box>
    </Box>
  ), [totalPlayers, headerSx, buttonGroupSx, mounted, handleOpenParser, handleOpenPlayerList, handleOpenPayment, handleOpenSettings, handleOpenShare, isCreatingSession]);

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

  const sharePopoverContent = useMemo(() => (
    <Popover
      open={Boolean(shareAnchorEl)}
      anchorEl={shareAnchorEl}
      onClose={handleCloseShare}
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
            p: 3,
            borderRadius: 3,
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.08)',
            minWidth: 320,
            maxWidth: 400,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Share Live Session
          </Typography>
          <IconButton size="small" onClick={handleCloseShare}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Show message when not sharing */}
        {!isHost && !sessionId && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Click "Start Live Sharing" to generate a QR code and link that others can use to view your courts and queues in real-time.
          </Typography>
        )}

        {/* Session Info - Always show when session exists */}
        {sessionId && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Session ID
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
              {sessionId}
            </Typography>
          </Box>
        )}

        {/* QR Code - Always show when session exists */}
        {qrCodeUrl && (
          <>
            <Divider />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <QrCodeIcon fontSize="small" />
                Scan to view
              </Typography>
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                style={{ 
                  width: 160, 
                  height: 160, 
                  border: '1px solid #e0e0e0',
                  borderRadius: 8 
                }} 
              />
            </Box>
          </>
        )}

        {/* Share Link - Always show when session exists */}
        {shareLink && (
          <>
            <Divider />
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Share Link
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box
                  sx={{
                    flex: 1,
                    p: 1,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    backgroundColor: '#f5f5f5',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {shareLink}
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleCopyLink}
                  startIcon={<ContentCopyIcon />}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  Copy
                </Button>
              </Box>
              
              {/* Copy success message */}
              {copySuccess && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'success.main', 
                    textAlign: 'center', 
                    fontSize: '0.8rem', 
                    fontWeight: 500,
                    mt: 1
                  }}
                >
                  ✓ Link copied to clipboard!
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Viewer Count */}
        {viewerCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <VisibilityIcon color="primary" fontSize="small" />
            <Typography variant="body2" color="primary">
              {viewerCount} viewer{viewerCount !== 1 ? 's' : ''} connected
            </Typography>
          </Box>
        )}

        {/* Actions - Always show */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button variant="outlined" fullWidth onClick={handleCloseShare}>
            Close
          </Button>
          <Button 
            variant="contained" 
            color={isHost ? 'error' : 'primary'}
            fullWidth 
            onClick={isHost ? handleEndSession : async () => {
              setIsCreatingSession(true);
              try {
                await createSession();
              } catch (error) {
                console.error('Failed to create session:', error);
              } finally {
                setIsCreatingSession(false);
              }
            }}
            disabled={isCreatingSession}
          >
            {isCreatingSession ? (
              <CircularProgress size={20} />
            ) : isHost ? (
              'End Live Sharing'
            ) : (
              'Start Live Sharing'
            )}
          </Button>
        </Box>
      </Box>
    </Popover>
  ), [shareAnchorEl, handleCloseShare, sessionId, isHost, qrCodeUrl, shareLink, viewerCount, handleCopyLink, handleEndSession, isCreatingSession, createSession, copySuccess]);

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

      {showSmartHints && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            bgcolor: 'rgba(33, 150, 243, 0.9)',
            color: 'white',
            p: 2,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: 300,
            textAlign: 'center',
            animation: 'fadeIn 0.5s ease-in-out'
          }}
          onClick={() => setShowSmartHints(false)}
        >
          <Typography variant="h6" sx={{ mb: 1, fontSize: '0.9rem' }}>
            💡 Quick Tip
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
            {isMobile ? "Hold and drag" : "Drag"} players from the list to courts to organize matches!
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
            Tap to dismiss
          </Typography>
        </Box>
      )}
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

        {/* Developer Credits */}
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.65rem', 
            color: 'text.secondary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 0.5,
            pt: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}
        >
          © {new Date().getFullYear()}{' '}
          <Typography
            component="a"
            href="https://www.linkedin.com/in/carlmeyrickcheng/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'primary.main',
              textDecoration: 'none',
              fontSize: '0.65rem',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              }
            }}
          >
            Carl Meyrick Cheng
          </Typography>
          {' • '}
          <Typography
            component="a"
            href="mailto:carlmeyrickcheng@gmail.com"
            sx={{
              color: 'primary.main',
              textDecoration: 'none',
              fontSize: '0.65rem',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'underline',
              }
            }}
          >
            Contact
          </Typography>
        </Typography>
      </Box>
      {popoverContent}
      {sharePopoverContent}
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
      <SettingsModal open={openSettings} onClose={handleCloseSettings} onShowTutorial={onShowTutorial}/>

      {/* Payment Modal */}
      <PaymentModal open={openPayment} onClose={handleClosePayment} />
    </Box>
  </Box>
);
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;