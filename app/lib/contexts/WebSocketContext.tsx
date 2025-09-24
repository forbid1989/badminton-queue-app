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
    // Using QR Server API for simplicity - in production, consider using a library
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    return qrUrl;
  };

  const connectWebSocket = useCallback((sessionId: string, isHost: boolean) => {
    // For demo purposes, using a mock WebSocket simulation
    // In production, replace with actual WebSocket server URL
    const ws = new WebSocket(`wss://your-websocket-server.com/session/${sessionId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        type: isHost ? 'host_join' : 'viewer_join',
        sessionId
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'state_update':
          if (isViewer && onStateUpdate) {
            onStateUpdate(message.state);
          }
          break;
        case 'viewer_count':
          setViewerCount(message.count);
          break;
        case 'session_ended':
          endSession();
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);
  }, [onStateUpdate]);

  const createSession = useCallback(async (): Promise<string> => {
    const newSessionId = generateSessionId();
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/view/${newSessionId}`;
    const qrCode = await generateQRCode(link);
    
    setSessionId(newSessionId);
    setIsHost(true);
    setShareLink(link);
    setQrCodeUrl(qrCode);
    
    connectWebSocket(newSessionId, true);
    
    return newSessionId;
  }, [connectWebSocket]);

  const joinSession = useCallback((sessionId: string) => {
    setSessionId(sessionId);
    setIsViewer(true);
    connectWebSocket(sessionId, false);
  }, [connectWebSocket]);

  const endSession = useCallback(() => {
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
  }, [socket]);

  const broadcastState = useCallback((state: RootState) => {
    if (socket && isHost && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'state_update',
        state
      }));
    }
  }, [socket, isHost]);

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