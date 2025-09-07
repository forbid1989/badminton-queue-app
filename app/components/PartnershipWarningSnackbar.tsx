import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  Typography,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  People as PeopleIcon,
  SportsTennis as SportsIcon,
} from '@mui/icons-material';
import { PartnershipAnalysis } from '../lib/utils/partnershipAnalysis';

export interface PartnershipWarning {
  id: string;
  type: 'partnership' | 'opponent';
  severity: 'warning' | 'error';
  message: string;
  details: string[];
  timestamp: number;
  playerNames: string[];
  zone: string;
}

interface PartnershipWarningSnackbarProps {
  warnings: PartnershipWarning[];
  onDismiss: (warningId: string) => void;
  onDismissAll: () => void;
}

const PartnershipWarningSnackbar: React.FC<PartnershipWarningSnackbarProps> = ({
  warnings,
  onDismiss,
  onDismissAll,
}) => {
  const [currentWarning, setCurrentWarning] = useState<PartnershipWarning | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [queue, setQueue] = useState<PartnershipWarning[]>([]);

  useEffect(() => {
    if (warnings.length > 0 && !currentWarning) {
      // Show the most recent warning
      const latest = warnings.reduce((latest, warning) => 
        warning.timestamp > latest.timestamp ? warning : latest
      );
      setCurrentWarning(latest);
      setQueue(warnings.filter(w => w.id !== latest.id));
    }
  }, [warnings, currentWarning]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    
    if (currentWarning) {
      onDismiss(currentWarning.id);
      setCurrentWarning(null);
      setExpanded(false);
      
      // Show next warning in queue
      if (queue.length > 0) {
        setTimeout(() => {
          setCurrentWarning(queue[0]);
          setQueue(prev => prev.slice(1));
        }, 300);
      }
    }
  };

  const getAlertSeverity = (severity: 'warning' | 'error') => {
    return severity === 'error' ? 'error' : 'warning';
  };

  const getWarningIcon = (type: 'partnership' | 'opponent') => {
    return type === 'partnership' ? <PeopleIcon /> : <SportsIcon />;
  };

  const getWarningColor = (severity: 'warning' | 'error') => {
    return severity === 'error' ? '#d32f2f' : '#ed6c02';
  };

  if (!currentWarning) {
    return null;
  }

  return (
    <Snackbar
      open={Boolean(currentWarning)}
      autoHideDuration={8000} // 8 seconds for important warnings
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      sx={{
        mt: 8, // Position below app bar
        ml: 2,
        maxWidth: '500px',
        '& .MuiSnackbarContent-root': {
          padding: 0,
        },
      }}
    >
      <Alert
        severity={getAlertSeverity(currentWarning.severity)}
        onClose={handleClose}
        sx={{
          width: '100%',
          alignItems: 'flex-start',
          '& .MuiAlert-icon': {
            marginTop: '2px',
          },
          '& .MuiAlert-action': {
            padding: 0,
            marginRight: 0,
          },
        }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {queue.length > 0 && (
              <Chip
                label={`+${queue.length} more`}
                size="small"
                color={currentWarning.severity === 'error' ? 'error' : 'warning'}
                sx={{ fontSize: '0.7rem', height: '20px' }}
              />
            )}
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                color: getWarningColor(currentWarning.severity),
                padding: '2px',
              }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        }
      >
        <AlertTitle sx={{ fontSize: '0.9rem', fontWeight: 'bold', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getWarningIcon(currentWarning.type)}
            {currentWarning.type === 'partnership' ? 'Partnership Alert' : 'Opponent Alert'}
            <Chip
              label={currentWarning.zone}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: '18px' }}
            />
          </Box>
        </AlertTitle>
        
        <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
          {currentWarning.message}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, mb: expanded ? 1 : 0, flexWrap: 'wrap' }}>
          {currentWarning.playerNames.map((name, index) => (
            <Chip
              key={index}
              label={name}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: '20px' }}
            />
          ))}
        </Box>

        <Collapse in={expanded}>
          <List dense sx={{ pt: 0 }}>
            {currentWarning.details.map((detail, index) => (
              <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                <ListItemIcon sx={{ minWidth: '20px' }}>
                  {currentWarning.severity === 'error' ? (
                    <ErrorIcon sx={{ fontSize: '0.8rem', color: 'error.main' }} />
                  ) : (
                    <WarningIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={detail}
                  primaryTypographyProps={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
          
          {queue.length > 0 && (
            <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {queue.length} more warning{queue.length !== 1 ? 's' : ''} pending...
              </Typography>
            </Box>
          )}
        </Collapse>
      </Alert>
    </Snackbar>
  );
};

export default PartnershipWarningSnackbar;