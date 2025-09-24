'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { RootState } from '../store/rootState';

interface WebSocketContextType {
  isHost: boolean;
  isViewer: boolean;
  sessionId: string | null;
  viewerCount: number;
  shareLink: string | null;
  qrCodeUrl: string | null;
  createSession: () => Promise<string>;
  joinSession: (sessionId: string) => void;
  endSession: () => void;
  broadcastState: (state: RootState) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  onStateUpdate?: (state: RootState) => void;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  onStateUpdate 
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const generateSessionId = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateQRCode = async (url: string): Promise<string> => {
    // Using QR Server API - works in both dev and production
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const endSession = useCallback(() => {
    if (socket && isHost) {
      socket.send(JSON.stringify({
        type: 'host_disconnected',
        sessionId,
        timestamp: Date.now()
      }));
    }
    
    if (socket) {
      socket.close();
    }
    
    setSocket(null);
    setIsHost(false);
    setIsViewer(false);
    setSessionId(null);
    setViewerCount(0);
    setShareLink(null);
    setQrCodeUrl(null);
  }, [socket, isHost, sessionId]);

  const broadcastState = useCallback((state: RootState) => {
    if (socket && isHost && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'state_update',
        state,
        timestamp: Date.now()
      }));
    }
  }, [socket, isHost]);

    const connectWebSocket = useCallback((sessionId: string, isHostConnection: boolean) => {
        // Skip WebSocket connection in development or if service is unavailable
        if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
            console.log('WebSocket disabled in development mode');
            // Still set up the session for UI testing
            if (isHostConnection) {
            console.log('Mock host session created');
            } else {
            console.log('Mock viewer session joined');
            }
            return;
        }

        // Try multiple WebSocket services as fallbacks
        const wsServices = [
            `wss://socketsbay.com/wss/v2/1/${sessionId}/`,
            `wss://ws.postman-echo.com/raw`, // Alternative service
            // Add more fallbacks as needed
        ];

        let currentServiceIndex = 0;

        const tryConnection = () => {
            if (currentServiceIndex >= wsServices.length) {
            console.error('All WebSocket services failed');
            // Fall back to mock functionality
            if (isHostConnection) {
                console.log('Using mock host mode due to WebSocket failures');
            }
            return;
            }

            const wsUrl = wsServices[currentServiceIndex];
            
            try {
            const ws = new WebSocket(wsUrl);
            
            // Set a connection timeout
            const connectionTimeout = setTimeout(() => {
                ws.close();
                console.log(`WebSocket service ${currentServiceIndex + 1} timed out, trying next...`);
                currentServiceIndex++;
                tryConnection();
            }, 5000); // 5 second timeout

            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log(`WebSocket connected to service ${currentServiceIndex + 1}`);
                setSocket(ws);
                
                // Send initial message
                ws.send(JSON.stringify({
                type: isHostConnection ? 'host_join' : 'viewer_join',
                sessionId,
                timestamp: Date.now()
                }));
            };

            ws.onmessage = (event) => {
                try {
                const message = JSON.parse(event.data);
                
                switch (message.type) {
                    case 'state_update':
                    if (!isHostConnection && onStateUpdate) {
                        onStateUpdate(message.state);
                    }
                    break;
                    case 'viewer_joined':
                    if (isHostConnection) {
                        setViewerCount(prev => prev + 1);
                    }
                    break;
                    case 'viewer_left':
                    if (isHostConnection) {
                        setViewerCount(prev => Math.max(0, prev - 1));
                    }
                    break;
                    case 'host_disconnected':
                    if (!isHostConnection) {
                        alert('Session ended by host');
                        endSession();
                    }
                    break;
                }
                } catch (error) {
                console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                clearTimeout(connectionTimeout);
                console.log('WebSocket disconnected');
                setSocket(null);
            };

            ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error(`WebSocket service ${currentServiceIndex + 1} failed:`, error);
                // Try next service
                currentServiceIndex++;
                tryConnection();
            };

            } catch (error) {
            console.error(`Failed to connect to WebSocket service ${currentServiceIndex + 1}:`, error);
            currentServiceIndex++;
            tryConnection();
            }
        };

        tryConnection();
    }, [onStateUpdate, endSession]);

    const createSession = useCallback(async (): Promise<string> => {
        const newSessionId = generateSessionId();
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/view/${newSessionId}`;
        const qrCode = await generateQRCode(link);
        
        setSessionId(newSessionId);
        setIsHost(true);
        setShareLink(link);
        setQrCodeUrl(qrCode);
        setViewerCount(0);
        
        connectWebSocket(newSessionId, true);
        
        return newSessionId;
    }, [connectWebSocket]);

    const joinSession = useCallback((sessionId: string) => {
        setSessionId(sessionId);
        setIsViewer(true);
        connectWebSocket(sessionId, false);
    }, [connectWebSocket]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return (
    <WebSocketContext.Provider value={{
      isHost,
      isViewer,
      sessionId,
      viewerCount,
      shareLink,
      qrCodeUrl,
      createSession,
      joinSession,
      endSession,
      broadcastState
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};