import React, { useState, useContext } from 'react';
import {
  Box,
  IconButton,
  Badge,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ListIcon from '@mui/icons-material/List';
import AttachMoneyIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import { AppContext } from '../BadmintonQueueUI';
import PlayerParserForm from './input/PlayerParserForm';
import PlayerListModal from './input/PlayerListModal';
import CourtControlPanel from './CourtControlPanel';
import SettingsModal from './input/SettingsModal';
import PaymentModal from './input/PaymentModal';
import CourtAddIcon from './input/CourtAddIcon';
import Popover from '@mui/material/Popover';

// Match the exact icons from Dashboard header
const tabs = [
  { 
    value: 'add-players', 
    icon: <GroupAddIcon />,
    description: 'Add Players',
    action: 'parser'
  },
  { 
    value: 'player-list', 
    icon: <ListIcon />,
    description: 'View Player List & Skills',
    action: 'playerList'
  },
  { 
    value: 'court-settings', 
    icon: <CourtAddIcon />,
    description: 'Court Settings',
    action: 'courtControl'
  },
  { 
    value: 'payment', 
    icon: <AttachMoneyIcon />,
    description: 'Payment Summary',
    action: 'payment'
  },
  { 
    value: 'settings', 
    icon: <SettingsIcon />,
    description: 'App Settings',
    action: 'settings'
  }
];

const MobileFooter: React.FC = () => {
  const { state } = useContext(AppContext);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // State for modals and active tab
  const [openParser, setOpenParser] = useState(false);
  const [openPlayerList, setOpenPlayerList] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [courtAnchorEl, setCourtAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  // Don't render on non-mobile devices
  if (!isMobile) {
    return null;
  }
  
  // Handlers
  const handleOpenParser = () => setOpenParser(true);
  const handleCloseParser = () => setOpenParser(false);

  const handleOpenPlayerList = () => setOpenPlayerList(true);
  const handleClosePlayerList = () => setOpenPlayerList(false);
  
  const handleOpenSettings = () => setOpenSettings(true);
  const handleCloseSettings = () => setOpenSettings(false);
  
  const handleOpenPayment = () => setOpenPayment(true);
  const handleClosePayment = () => setOpenPayment(false);
  
  const handleOpenCourtControl = (event: React.MouseEvent<HTMLElement>) => {
    setCourtAnchorEl(event.currentTarget);
  };
  const handleCloseCourtControl = () => setCourtAnchorEl(null);
  
  const handleTabClick = (action: string, event?: React.MouseEvent<HTMLElement>) => {
    switch (action) {
      case 'parser':
        handleOpenParser();
        break;
      case 'playerList':
        handleOpenPlayerList();
        break;
      case 'courtControl':
        if (event) {
          handleOpenCourtControl(event);
        }
        break;
      case 'payment':
        handleOpenPayment();
        break;
      case 'settings':
        handleOpenSettings();
        break;
      default:
        break;
    }
  };
  
  return (
    <>
      {/* Fixed Footer Navigation Bar */}
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
          boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
          zIndex: 1300,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          px: 1,
        }}
      >
        {tabs.map((tab) => (
          <Tooltip key={tab.value} title={tab.description} placement="top">
            <IconButton
              onClick={(event) => handleTabClick(tab.action, event)}
              sx={{
                color: 'text.secondary',
                backgroundColor: 'transparent',
                borderRadius: 1,
                minWidth: 40,
                height: 40,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'text.primary',
                },
              }}
            >
              {React.cloneElement(tab.icon, { 
                sx: { fontSize: '1.2rem' }
              })}
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      {/* Add bottom padding to body to prevent content from being hidden behind fixed footer */}
      <Box sx={{ height: 60 }} />
      
      {/* Modals and Popovers */}
      <PlayerParserForm open={openParser} onClose={handleCloseParser} />
      <PlayerListModal open={openPlayerList} onClose={handleClosePlayerList} />
      <SettingsModal open={openSettings} onClose={handleCloseSettings} />
      <PaymentModal open={openPayment} onClose={handleClosePayment} />
      
      {/* Court Control Popover */}
      <Popover
        open={Boolean(courtAnchorEl)}
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
              p: 2,
              borderRadius: 2,
              maxWidth: '90vw',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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