import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for managing WebSocket connection to the ADEO backend.
 * @param {string} url - The WebSocket URL (e.g., 'ws://localhost:8000/ws')
 */
export function useSocket(url = 'ws://localhost:8000/ws') {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Create WebSocket connection
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to ADEO Backend');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setData(payload);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from ADEO Backend');
      setIsConnected(false);
      // Optional: implement reconnection logic here
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url]);

  // Function to send commands to the backend (e.g., override routes)
  const sendCommand = (type, payload) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  return { data, isConnected, sendCommand };
}
