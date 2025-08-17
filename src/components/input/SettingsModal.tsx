import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Paper,
  Box,
  Typography,
  IconButton,
  Divider,
  Slider,
  FormControlLabel,
  Switch,
  Button,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  
  // Zoom levels: 75%, 85%, 100%, 110%, 125%, 150%
  const zoomLevels = [75, 85, 100, 110, 125, 150];
  const [zoomLevel, setZoomLevel] = useState(100);
  const [playerCooldowns, setPlayerCooldowns] = useState(false);

  // Apply responsive font scaling to CSS root variables
  const applyFontScale = useCallback((level: number) => {
    const root = document.documentElement;
    
    // Calculate scale factor (100% = 1.0, 125% = 1.25, etc.)
    const scaleFactor = level / 100;
    
    // Set CSS custom properties for responsive scaling
    root.style.setProperty('--app-font-scale', scaleFactor.toString());
    root.style.setProperty('--app-base-font-size', `${14 * scaleFactor}px`);
    root.style.setProperty('--app-small-font-size', `${12 * scaleFactor}px`);
    root.style.setProperty('--app-large-font-size', `${16 * scaleFactor}px`);
    root.style.setProperty('--app-spacing-scale', scaleFactor.toString());
    
    // Store in localStorage
    localStorage.setItem('badminton-app-font-scale', level.toString());
  }, []);

  // Load saved font scale level on mount
  useEffect(() => {
    const savedScale = localStorage.getItem('badminton-app-font-scale');
    if (savedScale) {
      const level = parseInt(savedScale);
      if (zoomLevels.includes(level)) {
        setZoomLevel(level);
        applyFontScale(level);
      }
    }
  }, [applyFontScale, zoomLevels]);

  // Handle font scale change from slider
  const handleFontScaleChange = (event: Event, newValue: number | number[]) => {
    const level = newValue as number;
    setZoomLevel(level);
    applyFontScale(level);
  };

  const modalSx = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90%', sm: 400 },
    maxWidth: 450,
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="settings-modal-title"
    >
      <Paper sx={modalSx}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography 
            id="settings-modal-title" 
            variant="h6" 
            sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            App Settings
          </Typography>
          <IconButton 
            onClick={onClose}
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Settings Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* App Size Setting */}
          <Box>
            <Typography 
              variant="subtitle2" 
              sx={{ fontSize: '0.9rem', fontWeight: 'medium', mb: 1 }}
            >
              App Size
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}
            >
              Adjust the size of the entire app (currently {zoomLevel}%)
            </Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                value={zoomLevel}
                onChange={handleFontScaleChange}
                min={75}
                max={150}
                step={null}
                marks={[
                  { value: 75, label: 'Small' },
                  { value: 85, label: '' },
                  { value: 100, label: 'Normal' },
                  { value: 110, label: '' },
                  { value: 125, label: '' },
                  { value: 150, label: 'Large' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.7rem',
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: theme.palette.primary.main,
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: theme.palette.grey[300],
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: theme.palette.primary.main,
                  },
                  '& .MuiSlider-thumb': {
                    backgroundColor: theme.palette.primary.main,
                    '&:hover': {
                      boxShadow: `0 0 0 8px ${theme.palette.primary.main}20`,
                    },
                  },
                }}
              />
            </Box>
          </Box>

          <Divider />

          {/* Player Cooldowns Setting */}
          <Box>
            <Typography 
              variant="subtitle2" 
              sx={{ fontSize: '0.9rem', fontWeight: 'medium', mb: 1 }}
            >
              Player Features
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={playerCooldowns}
                  onChange={(e) => setPlayerCooldowns(e.target.checked)}
                  size="medium"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                    Enable Player Cooldowns
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    Prevent players from rejoining games too quickly
                  </Typography>
                </Box>
              }
              sx={{ 
                alignItems: 'flex-start',
                '& .MuiFormControlLabel-label': {
                  paddingTop: '2px',
                },
              }}
            />
          </Box>

          <Divider />

          {/* Close Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontSize: '0.85rem',
                px: 3,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              Done
            </Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
};

export default SettingsModal;