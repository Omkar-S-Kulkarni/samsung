import React from 'react';
import { useGlobalSocket } from '../context/SocketContext';

export default function ReplanLog() {
  const { globalLogs } = useGlobalSocket();

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between border-b border-surface-border pb-2">
         <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
            Historical Decision Ledger
          </span>
          <div className="h-4 w-px bg-surface-border"></div>
          <span className="text-[10px] font-mono text-surface-muted uppercase tracking-widest">
            Decision_Governor // Event Logs
          </span>
        </div>
        <div className="text-[10px] text-surface-muted font-mono tracking-widest">
          {globalLogs.length} ENTRIES RECORDED
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-panel border border-surface-border p-6 space-y-2 font-mono">
        {globalLogs.length > 0 ? (
           globalLogs.map((log, i) => (
             <div key={i} className="flex gap-6 text-xs leading-relaxed py-2 border-b border-surface-border hover:bg-surface-accent transition-colors group">
                <div className="flex flex-col min-w-[120px]">
                  <span className="text-emerald-500/80 font-bold">{log.time}</span>
                  <span className="text-[10px] text-surface-muted tracking-widest">TICK {log.tick}</span>
                </div>
                <div className="flex flex-col flex-1">
                  <span className={`${log.color} text-sm font-bold tracking-tight`}>
                    {log.msg.includes('MANUAL OVERRIDE') ? '🔥 ' + log.msg : log.msg}
                  </span>
                </div>
                <div className="text-[10px] text-surface-muted uppercase group-hover:text-primary transition-colors cursor-crosshair">
                   [INSPECT_STATE]
                </div>
             </div>
           ))
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-gray-600 italic gap-4">
              <span className="text-4xl opacity-20">🗄️</span>
              <span className="text-xs font-mono uppercase tracking-widest">Awaiting Simulation Ticks...</span>
           </div>
        )}
      </div>
    </div>
  );
}