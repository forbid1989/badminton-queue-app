'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { RootState } from '../store/rootState';

interface SSEContextType {
  isHost: boolean;
  isViewer: boolean;
  sessionId: string | null;
  viewerCount: number;
  shareLink: string | null;
  qrCodeUrl: string | null;
  connectionStatus: 'connecting' | 'connected' | 'failed' | 'disconnected';
  createSession: () => Promise<string>;
  joinSession: (sessionId: string) => void;
  endSession: () => void;
  broadcastState: (state: RootState) => void;
}

const SSEContext = createContext<SSEContextType | null>(null);

interface SSEProviderProps {
  children: ReactNode;
  onStateUpdate?: (state: RootState) => void;
}

export const SSEProvider: React.FC<SSEProviderProps> = ({ 
  children, 
  onStateUpdate 
}) => {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'failed' | 'disconnected'>('disconnected');
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  const generateSessionId = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateQRCode = async (url: string): Promise<string> => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const endSession = useCallback(() => {
    console.log('🔚 Ending session...');
    
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      setRetryTimeout(null);
    }
    
    setIsHost(false);
    setIsViewer(false);
    setSessionId(null);
    setViewerCount(0);
    setShareLink(null);
    setQrCodeUrl(null);
    setConnectionStatus('disconnected');
    setRetryCount(0);
  }, [eventSource, retryTimeout]);

  const broadcastState = useCallback(async (state: RootState) => {
    if (isHost && sessionId) {
      try {
        console.log('📡 Broadcasting state via SSE:', { sessionId });
        const response = await fetch(`/api/sse/${sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            state,
            type: 'state_update'
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setViewerCount(result.viewerCount || 0);
          console.log(`✅ State broadcasted to ${result.viewerCount} viewers`);
        } else {
          console.error('❌ Failed to broadcast state:', response.statusText);
        }
      } catch (error) {
        console.error('❌ Error broadcasting state:', error);
      }
    }
  }, [isHost, sessionId]);

  const connectSSE = useCallback((sessionId: string, isHostConnection: boolean) => {
    // Enhanced development mode handling
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode - SSE will work but with extra logging');
    }

    // Only viewers need to connect to SSE
    if (!isHostConnection) {
      setConnectionStatus('connecting');
      console.log('👁️ Connecting to SSE for session:', sessionId);

      try {
        const es = new EventSource(`/api/sse/${sessionId}`);
        
        es.onopen = () => {
          console.log('✅ SSE connection established');
          setConnectionStatus('connected');
          setEventSource(es);
          setRetryCount(0); // Reset retry count on successful connection
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Received SSE message:', data.type);

            switch (data.type) {
              case 'state_update':
                if (onStateUpdate) {
                  console.log('🔄 Updating viewer state');
                  onStateUpdate(data.state);
                }
                break;
              case 'viewer_count_update':
                console.log('👥 Viewer count updated:', data.viewerCount);
                // Note: We don't set viewerCount here for viewers, only hosts track this
                break;
              case 'heartbeat':
                // Keep connection alive - no action needed
                console.log('💓 Heartbeat received');
                break;
              default:
                console.log('📨 Unknown SSE message type:', data.type);
            }
          } catch (error) {
            console.error('❌ Error parsing SSE message:', error);
          }
        };

        es.onerror = (error) => {
          console.error('❌ SSE connection error:', error);
          setConnectionStatus('failed');
          es.close();
          
          // Implement exponential backoff for retries
          if (retryCount < 5) { // Max 5 retries
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Cap at 30 seconds
            console.log(`🔄 Retrying SSE connection in ${delay}ms (attempt ${retryCount + 1}/5)`);
            
            const timeout = setTimeout(() => {
              setRetryCount(prev => prev + 1);
              connectSSE(sessionId, false);
            }, delay);
            
            setRetryTimeout(timeout);
          } else {
            console.error('❌ Max SSE retry attempts reached');
            setConnectionStatus('failed');
          }
        };

      } catch (error) {
        console.error('❌ Failed to create SSE connection:', error);
        setConnectionStatus('failed');
      }
    } else {
      // Host doesn't need SSE connection, just set as connected
      setConnectionStatus('connected');
      console.log('🏠 Host session created - ready to broadcast');
    }
  }, [onStateUpdate, retryCount]);

  const createSession = useCallback(async (): Promise<string> => {
    const newSessionId = generateSessionId();
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/view/${newSessionId}`;
    const qrCode = await generateQRCode(link);
    
    console.log('🏠 Creating host session:', newSessionId);
    
    setSessionId(newSessionId);
    setIsHost(true);
    setShareLink(link);
    setQrCodeUrl(qrCode);
    setViewerCount(0);
    
    connectSSE(newSessionId, true);
    
    return newSessionId;
  }, [connectSSE]);

  const joinSession = useCallback((sessionId: string) => {
    console.log('👁️ Joining viewer session:', sessionId);
    setSessionId(sessionId);
    setIsViewer(true);
    connectSSE(sessionId, false);
  }, [connectSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [eventSource, retryTimeout]);

  return (
    <SSEContext.Provider value={{
      isHost,
      isViewer,
      sessionId,
      viewerCount,
      shareLink,
      qrCodeUrl,
      connectionStatus,
      createSession,
      joinSession,
      endSession,
      broadcastState
    }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE must be used within a SSEProvider');
  }
  return context;
};