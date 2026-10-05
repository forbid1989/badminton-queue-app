import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface AnnouncementDialogProps {
  open: boolean;
  onClose: () => void;
  onGiveFeedback: () => void;
}

// Temporary message: delete this file and its usage in BadmintonQueueUI when no longer needed
const AnnouncementDialog: React.FC<AnnouncementDialogProps> = ({ open, onClose, onGiveFeedback }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Queue Maestro is turning 1! 🏸</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Thank you to everyone who has used the app to run their games this past year.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          I&apos;m exploring advanced features for groups, such as leaderboards, rankings, auto-queueing and win
          records. These may become an optional paid plan, and I&apos;d like your input before I build anything.
        </Typography>
        <Typography sx={{ fontWeight: 600, mb: 2 }}>
          The current core queue features will remain free.
        </Typography>
        <Typography>
          Thank you,
          <br />
          Carl Meyrick Cheng
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Maybe later</Button>
        <Button variant="contained" onClick={onGiveFeedback}>
          Share feedback
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AnnouncementDialog;
