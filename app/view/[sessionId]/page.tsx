'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Box, Chip, Typography, Alert, CircularProgress } from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { WebSocketProvider, useWebSocket } from '../../lib/contexts/WebSocketContext';
import { AppContext } from '../../lib/AppContext';
import { useReducer } from 'react';
import Reducer from '../../lib/store/Reducer';
import { RootState } from '../../lib/store/rootState';
import InitialState from '../../lib/store/InitialState';
import ViewerCourtZone from '../../components/ViewerCourtZone';
import ViewerQueueZone from '../../components/ViewerQueueZone';

// Viewer Mode Content Component
const ViewerModeContent: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { joinSession, isViewer } = useWebSocket();
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const connectToSession = async () => {
      try {
        await joinSession(sessionId);
        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to join session:', error);
        setConnectionError(true);
        setIsConnecting(false);
      }
    };

    connectToSession();
  }, [sessionId, joinSession]);

  if (isConnecting) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Connecting to session {sessionId}...</Typography>
      </Box>
    );
  }

  if (connectionError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to connect to session {sessionId}. The session may have ended or doesn't exist.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Viewer Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        mb: 3,
        p: 2,
        backgroundColor: '#f0f9ff',
        borderRadius: 2,
        border: '1px solid #0ea5e9'
      }}>
        <ViewIcon sx={{ mr: 1, color: '#0ea5e9' }} />
        <Typography variant="h6" sx={{ color: '#0ea5e9', fontWeight: 600 }}>
          Viewing Session: {sessionId}
        </Typography>
        <Chip 
          label="Live" 
          size="small" 
          sx={{ 
            ml: 2, 
            backgroundColor: '#dc2626', 
            color: 'white',
            animation: 'pulse 2s infinite'
          }} 
        />
      </Box>

      {/* Courts Section - Read Only */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#1f2937' }}>
          Courts
        </Typography>
        <ViewerCourtZone />
      </Box>

      {/* Queues Section - Read Only */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2, color: '#1f2937' }}>
          Queues
        </Typography>
        <ViewerQueueZone />
      </Box>
    </Box>
  );
};

// Main Viewer Page Component
const ViewerModeWrapper: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [state, dispatch] = useReducer(Reducer, InitialState);

  const handleStateUpdate = (newState: any) => {
    // Update the local state when receiving updates from host
    dispatch({ type: 'replaceViewerState', payload: newState });
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <WebSocketProvider onStateUpdate={handleStateUpdate}>
        <ViewerModeContent sessionId={sessionId} />
      </WebSocketProvider>
    </AppContext.Provider>
  );
};

export default function ViewSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  return <ViewerModeWrapper sessionId={sessionId} />;
}