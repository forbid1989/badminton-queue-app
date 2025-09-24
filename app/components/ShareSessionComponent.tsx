'use client'

import React, { useState } from 'react';
import {
  Box,
  Button,
  Popover,
  Typography,
  IconButton,
  Divider,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Visibility as ViewersIcon,
  QrCode as QrCodeIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useSSE } from '../lib/contexts/SSEContext';

interface ShareSessionComponentProps {
  isUltraWide: boolean;
}

const ShareSessionComponent: React.FC<ShareSessionComponentProps> = ({ 
  isUltraWide 
}) => {
  const {
    isHost,
    sessionId,
    viewerCount,
    shareLink,
    qrCodeUrl,
    createSession,
    endSession
 } = useSSE();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleShare = async (event: React.MouseEvent<HTMLElement>) => {
    if (isHost) {
      setAnchorEl(event.currentTarget);
    } else {
      setIsCreating(true);
      try {
        await createSession();
        setAnchorEl(event.currentTarget);
      } catch (error) {
        console.error('Failed to create session:', error);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCopyLink = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopySuccess(true);
      } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
      }
    }
  };

  const handleEndSession = () => {
    endSession();
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <Grid 
      size={{ xs: 12, sm: 12, md: 6, lg: 6, xl: isUltraWide ? 4 : 6 }}
      sx={{
        '@media (min-width: 600px) and (max-width: 1024px) and (orientation: portrait)': {
          width: '100% !important',
          maxWidth: '100% !important', 
          flexBasis: '100% !important',
        }
      }}
    >
      {/* Share Button - Full Width */}
      <Box
        onClick={handleShare}
        sx={{
          width: '100%',
          height: '80px',
          backgroundColor: isHost ? '#dcfce7' : '#dbeafe',
          borderRadius: 2,
          border: `2px solid ${isHost ? '#16a34a' : '#3b82f6'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          '&:hover': {
            backgroundColor: isHost ? '#bbf7d0' : '#bfdbfe',
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {isCreating ? (
          <CircularProgress size={20} />
        ) : (
          <>
            <ShareIcon
              sx={{
                fontSize: '1.5rem',
                color: isHost ? '#16a34a' : '#3b82f6',
                marginBottom: '4px',
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.75rem',
                color: isHost ? '#16a34a' : '#3b82f6',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {isHost ? 'Session Active' : 'Share Session'}
            </Typography>
            {isHost && viewerCount > 0 && (
              <Chip
                label={`${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}`}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  height: 18,
                  fontSize: '0.65rem',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            )}
          </>
        )}
      </Box>

      {/* Share Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
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
              Share Session
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Session Info */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Session ID
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
              {sessionId}
            </Typography>
          </Box>

          <Divider />

          {/* QR Code */}
          {qrCodeUrl && (
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
          )}

          <Divider />

          {/* Share Link */}
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
                startIcon={<CopyIcon />}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                Copy
              </Button>
            </Box>
          </Box>

          {/* Viewer Count */}
          {viewerCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <ViewersIcon color="primary" fontSize="small" />
              <Typography variant="body2" color="primary">
                {viewerCount} viewer{viewerCount !== 1 ? 's' : ''} connected
              </Typography>
            </Box>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="outlined" fullWidth onClick={handleClose}>
              Close
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              fullWidth 
              onClick={handleEndSession}
            >
              End Session
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setCopySuccess(false)}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default ShareSessionComponent;