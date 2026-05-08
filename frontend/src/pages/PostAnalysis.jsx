import React, { useState, useEffect } from 'react';
import { useGlobalSocket } from '../context/SocketContext';

const StatCard = ({ label, value, sub, color }) => (
  <div className="bg-surface-panel border border-surface-border p-6 flex flex-col justify-between">
    <div className="text-[10px] text-surface-muted font-bold uppercase tracking-[0.2em] mb-4">{label}</div>
    <div className={`text-4xl font-black ${color || 'text-surface-foreground'} font-mono mb-2`}>{value}</div>
    <div className="text-[10px] text-surface-muted font-mono tracking-tighter">{sub}</div>
  </div>
);

export default function PostAnalysis() {
  const { data } = useGlobalSocket();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/simulation-summary');
      const result = await res.json();
      setSummary(result);
      setError(null);
    } catch (err) {
      setError("Failed to fetch simulation summary. Ensure the backend is running.");
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const refreshId = setInterval(() => fetchSummary(false), 10000);
    return () => clearInterval(refreshId);
  }, []);

  useEffect(() => {
    if (!data) return;
    setSummary(prev => {
      const current = prev || { metrics: {}, events: [], summary: '', recommendation: '' };
      return {
        ...current,
        metrics: {
          total_ticks: data.tick ?? current.metrics.total_ticks ?? 0,
          zones_evacuated: data.evacuated_zones_count ?? current.metrics.zones_evacuated ?? 0,
          replan_count: data.replan_events?.length ?? current.metrics.replan_count ?? 0,
          avg_risk: data.simulation_state?.avg_risk ?? current.metrics.avg_risk ?? 0,
        },
        events: data.replan_events || current.events,
      };
    });
  }, [data]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <span className="text-[10px] font-bold text-primary animate-pulse tracking-widest uppercase">Analyzing Tactical Data...</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 pb-20">
      <div className="flex justify-between items-end border-b border-surface-border pb-4">
        <div>
          <h1 className="text-3xl font-black text-surface-foreground tracking-tight uppercase">Simulation Summary</h1>
          <p className="text-[10px] text-surface-muted font-mono tracking-widest mt-1">POST_EVENT_RECON // ID_{Math.floor(Math.random() * 9000) + 1000}</p>
        </div>
        <button
          onClick={fetchSummary}
          className="px-6 py-2 bg-primary/10 text-primary border border-primary/30 text-[10px] font-bold tracking-widest uppercase hover:bg-primary hover:text-black transition-all"
        >
          Refresh Analysis
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
          ERROR: {error}
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="Execution Time"
          value={summary?.metrics?.total_ticks || 0}
          sub="TOTAL SIMULATION TICKS"
          color="text-emerald-400"
        />
        <StatCard
          label="Zones Evacuated"
          value={summary?.metrics?.zones_evacuated || 0}
          sub="COMPLETED EXTRACTIONS"
          color="text-blue-400"
        />
        <StatCard
          label="System Replans"
          value={summary?.metrics?.replan_count || 0}
          sub="AUTONOMOUS RECALCULATIONS"
          color="text-orange-400"
        />
        <StatCard
          label="Avg Risk"
          value={(summary?.metrics?.avg_risk || 0).toFixed(1)}
          sub="MAX_SCALE: 10.0"
          color="text-yellow-400"
        />
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="bg-surface-panel border border-surface-border p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="text-8xl font-black">AI</span>
            </div>
            <h2 className="text-sm font-bold text-surface-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></span>
              Tactical LLM Evaluation
            </h2>
            <div className="prose prose-invert max-w-none">
              <div className="text-surface-foreground font-serif text-lg leading-relaxed space-y-4">
                {summary?.summary?.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                )) || "No summary generated yet."}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-panel border border-surface-border p-6">
            <h2 className="text-[10px] font-bold text-surface-muted uppercase tracking-widest mb-4">Critical Events Log</h2>
            <div className="space-y-4 overflow-y-auto max-h-[400px] no-scrollbar">
              {summary?.events?.length > 0 ? summary.events.map((ev, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-4 py-1">
                  <div className="text-[9px] text-surface-muted font-mono mb-1">TICK {ev.tick}</div>
                  <div className="text-[10px] text-surface-foreground font-bold leading-tight">{ev.message}</div>
                </div>
              )) : (
                <div className="text-[10px] text-surface-muted italic">No critical events reported.</div>
              )}
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 p-6">
            <h2 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Final Recommendation</h2>
            <p className="text-[11px] text-surface-muted leading-relaxed italic">
              {summary?.recommendation || "System recommends immediate debriefing based on current metrics."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
