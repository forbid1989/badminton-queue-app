import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
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
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SortIcon from '@mui/icons-material/Sort';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { SortableField } from '../types/Settings';
import { AppContext } from '../../BadmintonQueueUI';
import { Action } from '../../lib/store/Action';
import { PlayerListSortConfig } from '../types/Settings';
import { saveToLocalStorage } from '../../lib/utils/localStorage';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { state, dispatch } = useContext(AppContext);
  
  // Zoom levels: 75%, 85%, 100%, 110%, 125%, 150%
  const zoomLevels = useMemo(() => [75, 85, 100, 110, 125, 150], []);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [playerCooldowns, setPlayerCooldowns] = useState(state.settings.playerCooldowns || false);
  
  // Data Management states
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const sortFieldLabels: Record<SortableField, string> = {
    timeEntered: 'Time Entered (When player joined)',
    gamesPlayed: 'Games Played',
    skillLevel: 'Skill Level (S > A > B > C > D > E > F)'
  };

  const sortDirectionLabels = {
    asc: 'Ascending (Low to High)',
    desc: 'Descending (High to Low)'
  };

  const sortConfig = state.settings?.playerListSort || {
    secondarySort: 'gamesPlayed' as SortableField,
    secondaryDirection: 'asc' as 'asc' | 'desc',
    tertiarySort: 'timeEntered' as SortableField,
    tertiaryDirection: 'asc' as 'asc' | 'desc'
  };

  // Add useEffect to handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Sync cooldown state with global state
  useEffect(() => {
    setPlayerCooldowns(state.settings.playerCooldowns || false);
  }, [state.settings.playerCooldowns]);

  // Handle cooldown toggle
  const handleCooldownToggle = (checked: boolean) => {
    setPlayerCooldowns(checked);
    dispatch(Action.togglePlayerCooldowns());
  };

  // Handle font scale change from slider
  const handleFontScaleChange = (event: Event, newValue: number | number[]) => {
    const level = newValue as number;
    setZoomLevel(level);
    applyFontScale(level);
  };

  const handleSortConfigChange = (sortConfig: PlayerListSortConfig) => {
    dispatch(Action.updatePlayerListSort(sortConfig));
  };

  const handleSecondaryFieldChange = (field: SortableField) => {
    handleSortConfigChange({
      ...sortConfig,
      secondarySort: field
    });
  };

  const handleSecondaryDirectionChange = (direction: 'asc' | 'desc') => {
    handleSortConfigChange({
      ...sortConfig,
      secondaryDirection: direction
    });
  };

  const handleTertiaryFieldChange = (field: SortableField) => {
    handleSortConfigChange({
      ...sortConfig,
      tertiarySort: field
    });
  };

  const handleTertiaryDirectionChange = (direction: 'asc' | 'desc') => {
    handleSortConfigChange({
      ...sortConfig,
      tertiaryDirection: direction
    });
  };

  // Data Management handlers
  const handleManualSave = () => {
    try {
      saveToLocalStorage(state);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Manual save failed:', error);
    }
  };

  const handleClearData = () => {
    dispatch(Action.clearAllData());
    setClearDialogOpen(false);
  };

  // Calculate stats only after mounting to prevent hydration mismatch
  const totalPlayers = mounted ? state.players.length : 0;
  const playersOnCourt = mounted ? state.players.filter(p => 
    p.status.some(s => s.startsWith('court-'))
  ).length : 0;
  const playersInQueue = mounted ? state.players.filter(p => 
    p.status.some(s => s.startsWith('queue-'))
  ).length : 0;

  const modalSx = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: { xs: '90%', sm: 450 },
    maxWidth: 500,
    maxHeight: '85vh',
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 0,
    overflow: 'hidden',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="settings-modal-title"
    >
      <Paper sx={modalSx}>
        {/* Fixed Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 3,
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1
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

        {/* Scrollable Content */}
        <Box sx={{ 
          maxHeight: 'calc(85vh - 140px)',
          overflowY: 'auto',
          p: 3,
          pt: 2
        }}>
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

            {/* Gameplay Settings */}
            <Box>
              <Typography 
                variant="subtitle2" 
                sx={{ fontSize: '0.9rem', fontWeight: 'medium', mb: 2 }}
              >
                Gameplay Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={playerCooldowns}
                    onChange={(e) => handleCooldownToggle(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Player Cooldowns
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      Prevent players from playing consecutive games
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Divider />

            {/* Player List Sorting */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SortIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
                <Typography 
                  variant="subtitle2" 
                  sx={{ fontSize: '0.9rem', fontWeight: 'medium' }}
                >
                  Player List Sorting
                </Typography>
              </Box>
              
              <Typography 
                variant="body2" 
                sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 3 }}
              >
                All players are always sorted by Status first (Court → Queue → Waiting).
                Configure the 2nd and 3rd level sorting criteria below.
              </Typography>

              {/* 2nd Level Sort */}
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, fontSize: '0.85rem' }}>
                2nd Level Sort
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>Sort By</InputLabel>
                  <Select
                    value={sortConfig.secondarySort}
                    label="Sort By"
                    onChange={(e) => handleSecondaryFieldChange(e.target.value as SortableField)}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {Object.entries(sortFieldLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value} sx={{ fontSize: '0.8rem' }}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>Direction</InputLabel>
                  <Select
                    value={sortConfig.secondaryDirection}
                    label="Direction"
                    onChange={(e) => handleSecondaryDirectionChange(e.target.value as 'asc' | 'desc')}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {Object.entries(sortDirectionLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value} sx={{ fontSize: '0.8rem' }}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* 3rd Level Sort */}
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, fontSize: '0.85rem' }}>
                3rd Level Sort (Tiebreaker)
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>Sort By</InputLabel>
                  <Select
                    value={sortConfig.tertiarySort}
                    label="Sort By"
                    onChange={(e) => handleTertiaryFieldChange(e.target.value as SortableField)}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {Object.entries(sortFieldLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value} sx={{ fontSize: '0.8rem' }}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>Direction</InputLabel>
                  <Select
                    value={sortConfig.tertiaryDirection}
                    label="Direction"
                    onChange={(e) => handleTertiaryDirectionChange(e.target.value as 'asc' | 'desc')}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {Object.entries(sortDirectionLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value} sx={{ fontSize: '0.8rem' }}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Preview */}
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  <strong>Current sorting order:</strong><br />
                  1st: Status (Court → Queue → Waiting)<br />
                  2nd: {sortFieldLabels[sortConfig.secondarySort]} ({sortConfig.secondaryDirection === 'asc' ? 'Low to High' : 'High to Low'})<br />
                  3rd: {sortFieldLabels[sortConfig.tertiarySort]} ({sortConfig.tertiaryDirection === 'asc' ? 'Low to High' : 'High to Low'})
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Data Management Section */}
            <Box>
              <Typography 
                variant="subtitle2" 
                sx={{ fontSize: '0.9rem', fontWeight: 'medium', mb: 2 }}
              >
                Data Management
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleManualSave}
                  sx={{ fontSize: '0.8rem' }}
                >
                  Save Now
                </Button>
                
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setClearDialogOpen(true)}
                  sx={{ fontSize: '0.8rem' }}
                >
                  Clear All Data
                </Button>
              </Box>

              {saveSuccess && (
                <Alert severity="success" sx={{ fontSize: '0.8rem', py: 0.5, mb: 2 }}>
                  Data saved successfully!
                </Alert>
              )}

              <Typography 
                variant="caption" 
                sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary' }}
                suppressHydrationWarning
              >
                {mounted ? (
                  <>
                    Stats: {totalPlayers} total • {playersOnCourt} on court • {playersInQueue} in queue
                    <br />
                    Data auto-saves every 1 second when changes are made
                  </>
                ) : (
                  <>
                    Stats: Loading...
                    <br />
                    Data auto-saves every 1 second when changes are made
                  </>
                )}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Fixed Footer */}
        <Box sx={{ 
          p: 3, 
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex', 
          justifyContent: 'flex-end'
        }}>
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

        {/* Clear Data Confirmation Dialog */}
        <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
          <DialogTitle sx={{ fontSize: '0.9rem' }}>Clear All Data?</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: '0.8rem' }}>
              This will permanently delete all players, court assignments, and queue data.
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setClearDialogOpen(false)}
              sx={{ fontSize: '0.75rem' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleClearData}
              color="error"
              variant="contained"
              sx={{ fontSize: '0.75rem' }}
            >
              Clear Data
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Modal>
  );
};

export default SettingsModal;