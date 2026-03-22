import { useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useWebSocket(onMessage) {
  const ws = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return ws.current;
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessageRef.current(data);
      } catch {}
    };
    ws.current = socket;
    return socket;
  }, []);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    return () => ws.current?.close();
  }, []);

  return { connect, send, ws };
}
