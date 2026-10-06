import React, { useEffect, useRef } from 'react';
import { Paper, Typography, Button, Box, Fade, useMediaQuery } from '@mui/material';

interface FeedbackPromptCardProps {
  open: boolean;
  onShare: () => void;
  onLater: () => void; // also called when the card times out
}

const AUTO_HIDE_MS = 12000;

// Small non-modal prompt. It is deliberately not part of the notistack queue so it can never
// push out or be dismissed with live game warnings, and it never covers the courts for long.
const FeedbackPromptCard: React.FC<FeedbackPromptCardProps> = ({ open, onShare, onLater }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // The parent re-renders constantly during play; keep the latest callback in a ref so the
  // auto-hide timer only depends on `open` and is never reset by those re-renders.
  const onLaterRef = useRef(onLater);
  onLaterRef.current = onLater;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => onLaterRef.current(), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Fade in={open} unmountOnExit>
      <Paper
        role="status"
        aria-live="polite"
        elevation={6}
        sx={{
          position: 'fixed',
          right: 16,
          // keep clear of the 60px fixed footer on phones
          bottom: isMobile ? 76 : 16,
          width: { xs: 'calc(100vw - 32px)', sm: 320 },
          maxWidth: 360,
          p: 2,
          borderRadius: 2,
          // above page content, below modals (MUI modal is 1300)
          zIndex: 1250,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Help shape Queue Maestro
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Tell me which features you want and what you&apos;d pay for them. It takes about 2 minutes.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button size="small" onClick={onLater}>
            Later
          </Button>
          <Button size="small" variant="contained" onClick={onShare}>
            Share feedback
          </Button>
        </Box>
      </Paper>
    </Fade>
  );
};

export default FeedbackPromptCard;
