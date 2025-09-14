import React, { useContext, useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Typography,
  Box,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { AppContext } from '../BadmintonQueueUI';
import { Action } from '../lib/store/Action';
import { clearLocalStorage, saveToLocalStorage } from '../lib/utils/localStorage';

const DataManagement: React.FC = () => {
  const { state, dispatch } = useContext(AppContext);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Add useEffect to handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontSize: '0.85rem' }}>
        Data Management
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={handleManualSave}
          sx={{ fontSize: '0.7rem' }}
        >
          Save Now
        </Button>
        
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setClearDialogOpen(true)}
          sx={{ fontSize: '0.7rem' }}
        >
          Clear All Data
        </Button>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ fontSize: '0.7rem', py: 0 }}>
          Data saved successfully!
        </Alert>
      )}

      <Typography 
        variant="caption" 
        sx={{ display: 'block', mt: 1, fontSize: '0.65rem', opacity: 0.7 }}
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
    </Box>
  );
};

export default DataManagement;