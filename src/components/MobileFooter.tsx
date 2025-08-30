import React, { useState, useContext } from 'react';
import {
  Box,
  IconButton,
  Badge,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddRoadIcon from '@mui/icons-material/AddRoad';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import { AppContext } from '../BadmintonQueueUI';
import PlayerParserForm from './input/PlayerParserForm';
import CourtControlPanel from './CourtControlPanel';
import SettingsModal from './input/SettingsModal';
import PaymentModal from './input/PaymentModal';
import Popover from '@mui/material/Popover';

const MobileFooter: React.FC = () => {
  const { state } = useContext(AppContext);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // State for modals and popovers
  const [openParser, setOpenParser] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [courtAnchorEl, setCourtAnchorEl] = useState<null | HTMLElement>(null);
  
  // Don't render on non-mobile devices
  if (!isMobile) {
    return null;
  }
  
  const totalPlayers = state.players.length;
  const courtCount = state.courts.count;
  const queueCount = state.queue.count;
  
  // Handlers
  const handleOpenParser = () => setOpenParser(true);
  const handleCloseParser = () => setOpenParser(false);
  
  const handleOpenSettings = () => setOpenSettings(true);
  const handleCloseSettings = () => setOpenSettings(false);
  
  const handleOpenPayment = () => setOpenPayment(true);
  const handleClosePayment = () => setOpenPayment(false);
  
  const handleOpenCourtControl = (event: React.MouseEvent<HTMLElement>) => {
    setCourtAnchorEl(event.currentTarget);
  };
  const handleCloseCourtControl = () => setCourtAnchorEl(null);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const isCourtPopoverOpen = Boolean(courtAnchorEl);
  
  return (
    <>
      {/* Footer Navigation Bar */}
      <Box
        id="mobile-footer"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -2px 4px rgba(0,0,0,0.1)',
          zIndex: 1300,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          px: 2,
        }}
      >
        {/* Home/Scroll to Top Button */}
        <Tooltip title="Scroll to Top" placement="top">
          <IconButton
            onClick={scrollToTop}
            sx={{
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white',
              },
            }}
          >
            <HomeIcon />
          </IconButton>
        </Tooltip>
        
        {/* Add Players Button */}
        <Tooltip title="Add Players" placement="top">
          <IconButton
            onClick={handleOpenParser}
            sx={{
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white',
              },
            }}
          >
            <Badge badgeContent={totalPlayers} color="secondary" max={99}>
              <GroupAddIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        {/* Court Management Button */}
        <Tooltip title="Manage Courts" placement="top">
          <IconButton
            onClick={handleOpenCourtControl}
            sx={{
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white',
              },
            }}
          >
            <Badge 
              badgeContent={`${courtCount}C/${queueCount}Q`} 
              color="secondary"
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  minWidth: '32px',
                  padding: '0 4px',
                },
              }}
            >
              <AddRoadIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        {/* Payment Button */}
        <Tooltip title="Payment Tracking" placement="top">
          <IconButton
            onClick={handleOpenPayment}
            sx={{
              color: 'success.main',
              '&:hover': {
                backgroundColor: 'success.light',
                color: 'white',
              },
            }}
          >
            <PaymentIcon />
          </IconButton>
        </Tooltip>
        
        {/* Settings Button */}
        <Tooltip title="Settings" placement="top">
          <IconButton
            onClick={handleOpenSettings}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Modals and Popovers */}
      <PlayerParserForm open={openParser} onClose={handleCloseParser} />
      <SettingsModal open={openSettings} onClose={handleCloseSettings} />
      <PaymentModal open={openPayment} onClose={handleClosePayment} />
      
      {/* Court Control Popover */}
      <Popover
        open={isCourtPopoverOpen}
        anchorEl={courtAnchorEl}
        onClose={handleCloseCourtControl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              padding: 2,
              minWidth: '280px',
              maxWidth: '90vw',
              marginBottom: 1,
            },
          },
        }}
      >
        <CourtControlPanel onClose={handleCloseCourtControl} />
      </Popover>
    </>
  );
};

export default MobileFooter;