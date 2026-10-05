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
      <DialogTitle>Thank you for a great first year! 🏸</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Queue Maestro launched last year, and I&apos;m grateful to everyone who has used it to run their games.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          I&apos;m planning to take the app further with features like leaderboards, MMR rankings, auto-queueing and
          win rates, and I&apos;d like your help shaping the roadmap. Please tell me which features you&apos;d like and
          any feedback you have.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Building these takes time and will incur server costs, so I&apos;m planning an optional paid tier. I&apos;m
          asking the community to help me price it so it stays affordable for every group. If you have a price in
          mind, include it in your feedback.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          To send feedback, click <strong>Feedback</strong> at the bottom of the player list, or press the button below.
        </Typography>
        <Typography sx={{ fontWeight: 600, mb: 2 }}>
          The core features of the app, everything you use today, will always remain free.
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
