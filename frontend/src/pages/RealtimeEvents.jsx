import React, { useState, useEffect } from 'react';
import { useGlobalSocket } from '../context/SocketContext';

export default function RealtimeEvents() {
  const { data, simulationState } = useGlobalSocket();
  const [events, setEvents] = useState([]);
  const [actions, setActions] = useState([]);
  const [decisions, setDecisions] = useState([]);

  useEffect(() => {
    if (data) {
      // 1. Live Event Feed from system_logs
      if (data.system_logs) {
        const newEvents = data.system_logs.map((log, idx) => {
          let type = 'info';
          let source = 'System Log';
          if (log.type === 'replan_event') {
            type = 'critical';
            source = 'Decision Governor';
          } else if (log.type === 'evacuation_update') {
            type = 'warning';
            source = 'Mobility Agent';
          } else if (log.type === 'evacuation_success') {
            type = 'info';
            source = 'Simulation Engine';
          } else if (log.type === 'route_blocked') {
            type = 'critical';
            source = 'Mobility Agent';
          }

          // Convert timestamp to readable time
          let timeStr = log.timestamp;
          if (timeStr) {
            try {
              const dt = new Date(timeStr);
              timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch (e) {}
          } else {
             timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          return {
            id: `log-${log.tick}-${idx}`,
            time: timeStr,
            type: type,
            message: log.message,
            source: source,
            tick: log.tick
          };
        });
        
        // Reverse to show newest first
        setEvents(newEvents.reverse().slice(0, 50));
      }

      // 2. Event-triggered actions from replan_events
      if (data.replan_events) {
        const newActions = data.replan_events.map((ev, idx) => {
           let timeStr = ev.timestamp;
           if (timeStr) {
             try {
               const dt = new Date(timeStr);
               timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
             } catch (e) {}
           } else {
             timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
           }

           let actionText = `Replan triggered by ${ev.trigger_type} for zone ${ev.affected_zone_id}`;
           if (ev.details) actionText += ` (${ev.details})`;

           return {
             id: `action-${ev.tick}-${idx}`,
             time: timeStr,
             action: actionText,
             status: 'Completed'
           };
        });
        setActions(newActions.reverse().slice(0, 20));
      }

      // 3. System decisions log from llm_analysis and evacuation_plan
      const newDecisions = [];
      let decId = 0;
      
      if (data.llm_analysis) {
        Object.entries(data.llm_analysis).forEach(([zone, analysis]) => {
          if (analysis.reasoning || analysis.recommendation) {
            newDecisions.push({
              id: `dec-${decId++}`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              decision: `[${zone}] ${analysis.recommendation || analysis.reasoning}`,
              confidence: analysis.source === 'ollama' || analysis.source === 'openrouter' ? '98%' : '85%',
              source: analysis.source
            });
          }
        });
      }
      
      setDecisions(newDecisions.slice(0, 20));
    }
  }, [data]);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-surface-border pb-2">
         <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
            Real-Time Events Panel
          </span>
          <div className="h-4 w-px bg-surface-border"></div>
          <span className="text-[10px] font-mono text-surface-muted uppercase tracking-widest">
            Live_Telemetry_Feed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Left Column: Feed & Timeline */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Live Event Feed */}
          <div className="bg-surface-panel border border-surface-border flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border flex justify-between items-center bg-surface-muted">
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Live Event Feed</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[9px] font-mono text-red-500 uppercase">Live</span>
              </div>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              {events.length === 0 && (
                <div className="text-surface-muted text-xs text-center py-4">No events recorded yet...</div>
              )}
              {events.map((evt) => (
                <div key={evt.id} className="flex gap-3 border-b border-surface-border pb-3 last:border-0 last:pb-0">
                  <div className="mt-1">
                    <span className={`material-symbols-outlined text-[16px] ${
                      evt.type === 'critical' ? 'text-red-500' : 
                      evt.type === 'warning' ? 'text-orange-400' : 'text-primary'
                    }`}>
                      {evt.type === 'critical' ? 'warning' : evt.type === 'warning' ? 'error_outline' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${
                        evt.type === 'critical' ? 'text-red-400' : 
                        evt.type === 'warning' ? 'text-orange-300' : 'text-primary'
                      }`}>{evt.message}</span>
                      <span className="text-[10px] font-mono text-surface-muted whitespace-nowrap ml-2">{evt.time}</span>
                    </div>
                    <div className="text-[10px] text-surface-muted uppercase tracking-wider mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">sensors</span>
                      {evt.source} {evt.tick ? `(Tick: ${evt.tick})` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="bg-surface-panel border border-surface-border flex flex-col h-1/3">
             <div className="px-4 py-3 border-b border-surface-border bg-surface-muted">
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Event Timeline Overview</span>
            </div>
            <div className="p-4 flex-1 flex items-center justify-center relative">
              {/* Fake visual timeline using recent events */}
              <div className="absolute w-full h-px bg-surface-border top-1/2"></div>
              <div className="flex justify-between w-full px-8 relative">
                 {events.length === 0 ? (
                    <div className="text-surface-muted text-xs text-center w-full z-10 bg-surface-panel px-2">Awaiting events...</div>
                 ) : (
                    [...events].reverse().slice(-4).map((evt, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="text-[9px] font-mono text-surface-muted bg-surface-panel px-1">{evt.time}</div>
                        <div className={`w-3 h-3 rounded-full border-2 border-surface ${
                          evt.type === 'critical' ? 'bg-red-500' : 
                          evt.type === 'warning' ? 'bg-orange-500' : 'bg-primary'
                        } z-10`}></div>
                        <div className="text-[9px] text-surface-foreground max-w-[80px] text-center truncate bg-surface-panel px-1" title={evt.source}>{evt.source}</div>
                      </div>
                    ))
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Decisions */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Event-triggered actions */}
          <div className="bg-surface-panel border border-surface-border flex flex-col flex-1 overflow-hidden">
             <div className="px-4 py-3 border-b border-surface-border bg-surface-muted">
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Event-Triggered Actions</span>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
               {actions.length === 0 && (
                 <div className="text-surface-muted text-xs text-center py-4">No actions triggered yet...</div>
               )}
               {actions.map((act) => (
                 <div key={act.id} className="bg-surface border border-surface-border p-3 rounded-sm border-l-2 border-l-primary relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between mb-2 relative z-10">
                      <span className="text-[9px] font-mono text-surface-muted">{act.time}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                        act.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'
                      }`}>
                        {act.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-surface-foreground relative z-10">{act.action}</p>
                 </div>
               ))}
            </div>
          </div>

          {/* System decisions log */}
          <div className="bg-surface-panel border border-surface-border flex flex-col flex-1 overflow-hidden">
             <div className="px-4 py-3 border-b border-surface-border bg-surface-muted flex justify-between items-center">
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">System Decisions Log</span>
              <span className="material-symbols-outlined text-[14px] text-primary">smart_toy</span>
            </div>
            <div className="p-4 overflow-y-auto space-y-3">
              {decisions.length === 0 && (
                 <div className="text-surface-muted text-xs text-center py-4">Awaiting system decisions...</div>
              )}
              {decisions.map((dec) => (
                 <div key={dec.id} className="flex gap-3 border-b border-surface-border pb-3 last:border-0 last:pb-0">
                  <div className="mt-0.5 text-primary">
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                  </div>
                  <div>
                    <p className="text-xs text-surface-foreground font-medium leading-relaxed">{dec.decision}</p>
                    <div className="flex justify-between mt-2">
                       <span className="text-[9px] font-mono text-surface-muted">{dec.time}</span>
                       <span className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">CONF: {dec.confidence} | {dec.source}</span>
                    </div>
                  </div>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
