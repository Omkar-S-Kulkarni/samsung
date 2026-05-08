import React, { useState, useEffect } from 'react';
import { useGlobalSocket } from '../context/SocketContext';

export default function AnalysisPanel({ isOpen, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const { simulationState } = useGlobalSocket();

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/simulation-summary');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch simulation summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, simulationState?.tick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-surface-navbar backdrop-blur-2xl border-l border-surface-border z-[60] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col transition-all animate-in slide-in-from-right duration-500">
      {/* Header */}
      <div className="p-6 border-b border-surface-border flex items-center justify-between bg-surface-muted/50">
        <div>
          <h2 className="text-sm font-black text-surface-foreground tracking-[0.2em] uppercase">Intelligence Analysis</h2>
          <p className="text-[9px] text-surface-muted font-mono mt-1">REAL-TIME_EVENT_LOGGING_STREAM</p>
        </div>
        <button 
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-surface-muted hover:text-surface-foreground transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {loading && !summary ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
             <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
             <span className="text-[10px] font-bold text-primary tracking-widest uppercase animate-pulse">Processing Insights...</span>
          </div>
        ) : (
          <>
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-muted border border-surface-border p-4 rounded-lg">
                <div className="text-[9px] text-surface-muted uppercase font-bold mb-1">Replans</div>
                <div className="text-2xl font-black text-orange-400 font-mono">{summary?.metrics?.replan_count || 0}</div>
              </div>
              <div className="bg-surface-muted border border-surface-border p-4 rounded-lg">
                <div className="text-[9px] text-surface-muted uppercase font-bold mb-1">Total Ticks</div>
                <div className="text-2xl font-black text-emerald-400 font-mono">{summary?.metrics?.total_ticks || 0}</div>
              </div>
            </div>

            {/* AI Summary Section */}
            <div className="space-y-3">
               <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
                 System Insight Summary
               </h3>
               <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl relative overflow-hidden">
                  <div className="text-[11px] text-surface-foreground leading-relaxed font-serif italic">
                    {summary?.summary || "Analyzing current simulation state for strategic patterns..."}
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-10 text-[40px] font-black -mb-2 -mr-2 text-indigo-500 select-none">AI</div>
               </div>
            </div>

            {/* Events Timeline */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-bold text-surface-muted uppercase tracking-widest">Decision Timeline</h3>
               <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-surface-border">
                  {summary?.events?.length > 0 ? summary.events.slice().reverse().map((ev, i) => (
                    <div key={i} className="relative pl-6">
                      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-surface border border-surface-border flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                      </div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-mono text-surface-muted">TICK {ev.tick}</span>
                        <span className="text-[8px] px-1.5 py-0.5 bg-surface-muted text-surface-muted rounded uppercase font-bold">Event</span>
                      </div>
                      <p className="text-[10px] text-surface-foreground font-medium leading-tight">
                        {ev.message}
                      </p>
                    </div>
                  )) : (
                    <div className="text-[10px] text-surface-muted italic pl-6">No strategic events recorded yet.</div>
                  )}
               </div>
            </div>

            {/* Recommendations */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-xl">
               <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Tactical Guidance</h3>
               <p className="text-[11px] text-surface-muted leading-relaxed">
                 {summary?.recommendation || "Maintain current operational parameters until further data validation."}
               </p>
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-surface-border bg-surface-muted/30">
        <button 
          onClick={fetchSummary}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black py-3 rounded-lg uppercase tracking-widest transition-all active:scale-[0.98] shadow-[0_10px_20px_rgba(79,70,229,0.2)]"
        >
          Refresh Analysis Stream
        </button>
      </div>
    </div>
  );
}
