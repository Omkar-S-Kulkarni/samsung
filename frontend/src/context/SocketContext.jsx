import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SocketContext = createContext(null);

export function SocketProvider({ children, url = 'ws://localhost:8000/ws' }) {
    const [data, setData] = useState(null);
    const [simulationState, setSimulationState] = useState({
        tick: 0,
        isRunning: false,
        scenario: "moderate_flood",
        manual_step: false
    });
    const [isConnected, setIsConnected] = useState(false);
    const [globalLogs, setGlobalLogs] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        const socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('Connected to ADEO Backend');
            setIsConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                
                if (payload.type === 'STATE_SYNC') {
                    setSimulationState(payload.payload.simulation_state);
                } else if (payload.type === 'TICK_UPDATE') {
                    setData(payload.payload);
                    if (payload.payload.simulation_state) {
                         setSimulationState(payload.payload.simulation_state);
                    }
                    
                    // Auto-generate logs from evacuation plan top priority
                    if (payload.payload.evacuation_plan && payload.payload.evacuation_plan.evacuation_sequence) {
                        const seq = payload.payload.evacuation_plan.evacuation_sequence;
                        if (seq.length > 0) {
                            const topZone = seq[0];
                            const logEntry = {
                                time: new Date().toLocaleTimeString('en-GB'),
                                tick: payload.payload.tick,
                                msg: `Top priority: ${topZone.zone_name} (score ${topZone.priority_score.toFixed(2)}) -> Shelter ${topZone.assigned_shelter || 'NONE'}`,
                                color: topZone.priority_score > 5 ? 'text-orange-500/80' : 'text-gray-400',
                            };
                            setGlobalLogs(prev => {
                                if (prev.length > 0 && prev[0].msg === logEntry.msg) return prev;
                                return [logEntry, ...prev].slice(0, 100);
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err);
            }
        };

        socket.onclose = () => {
            console.log('Disconnected from ADEO Backend');
            setIsConnected(false);
        };

        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [url]);

    const sendCommand = (type, payload) => {
        if (socketRef.current && isConnected) {
            socketRef.current.send(JSON.stringify({ type, payload }));
            
            if (type === 'MANUAL_BLOCK') {
                const logEntry = { 
                    time: new Date().toLocaleTimeString('en-GB'), 
                    tick: simulationState.tick,
                    msg: `MANUAL OVERRIDE: Link blocked between ${payload.from} and ${payload.to}`, 
                    color: 'text-red-500 font-bold' 
                };
                setGlobalLogs(prev => [logEntry, ...prev].slice(0, 100));
            }

            // Optimistic update for some commands
            setSimulationState(prev => {
                const newState = { ...prev };
                if (type === 'PAUSE_SIMULATION') newState.isRunning = false;
                if (type === 'PLAY_SIMULATION' || type === 'RESUME_SIMULATION') newState.isRunning = true;
                if (type === 'CHANGE_SCENARIO') {
                    newState.scenario = payload;
                    newState.isRunning = false;
                    newState.tick = 0;
                    setGlobalLogs([]); // Clear logs on scenario change
                }
                return newState;
            });
        }
    };

    return (
        <SocketContext.Provider value={{ data, isConnected, sendCommand, simulationState, globalLogs }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useGlobalSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useGlobalSocket must be used within a SocketProvider');
    }
    return context;
}
