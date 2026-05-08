import React, { useState, useEffect } from 'react';

export default function DailyReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/simulation-summary');
        if (res.ok) {
          const data = await res.json();
          setReportData(data);
        }
      } catch (err) {
        console.error("Failed to fetch report:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchReport, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ADEO_Report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !reportData) {
    return (
      <div className="flex flex-col h-full items-center justify-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
        <div className="text-sm font-mono text-surface-muted uppercase">Compiling AI Report...</div>
      </div>
    );
  }

  const defaultMetrics = { total_ticks: 0, zones_evacuated: 0, replan_count: 0, avg_risk: 0 };
  const metrics = reportData?.metrics || defaultMetrics;
  const summary = reportData?.summary || "AI coordination report is currently unavailable. No significant operations have been recorded in the current timeframe.";
  const highlights = reportData?.highlights || [];
  const recommendations = reportData?.recommendations || [];

  return (
    <div className="flex flex-col h-full space-y-6 overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-surface-border pb-2 shrink-0">
         <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
            Daily & Weekly Reports
          </span>
          <div className="h-4 w-px bg-surface-border"></div>
          <span className="text-[10px] font-mono text-surface-muted uppercase tracking-widest">
            Analysis_Export_Module
          </span>
        </div>
        <div>
          <button 
            onClick={handleDownload}
            disabled={!reportData}
            className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-surface transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 shrink-0">
        {/* Top Summaries */}
        <div className="bg-surface-panel border border-surface-border p-5 relative overflow-hidden col-span-1">
           <div className="absolute top-0 right-0 p-4 opacity-10">
             <span className="material-symbols-outlined text-6xl">today</span>
           </div>
           <span className="text-[10px] font-bold text-surface-muted uppercase tracking-[0.1em] relative z-10">Simulation Metrics</span>
           <div className="mt-4 relative z-10 space-y-2">
              <div className="flex justify-between items-center">
                 <span className="text-xs text-surface-muted">Total Ticks</span>
                 <span className="text-sm font-black font-mono text-surface-foreground">{metrics.total_ticks}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-xs text-surface-muted">Avg City Risk</span>
                 <span className="text-sm font-black font-mono text-red-500">{metrics.avg_risk} / 10</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-xs text-surface-muted">Zones Evacuated</span>
                 <span className="text-sm font-black font-mono text-primary">{metrics.zones_evacuated}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-xs text-surface-muted">Replan Events</span>
                 <span className="text-sm font-black font-mono text-orange-400">{metrics.replan_count}</span>
              </div>
           </div>
        </div>

        <div className="bg-surface-panel border border-surface-border p-5 relative overflow-hidden col-span-2 flex flex-col justify-between">
           <div className="flex justify-between items-start">
             <div>
               <span className="text-[10px] font-bold text-primary uppercase tracking-[0.1em]">Weekly AI Report</span>
               <h3 className="text-lg font-black mt-1">Operational Efficiency Analysis</h3>
             </div>
             <span className="bg-primary text-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wider">Week {getWeekNumber()}</span>
           </div>
           <div className="text-sm text-surface-muted mt-4 w-full leading-relaxed overflow-y-auto max-h-24">
             {summary}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* Key Highlights */}
          <div className="bg-surface-panel border border-surface-border flex flex-col flex-1 overflow-hidden">
             <div className="px-4 py-3 border-b border-surface-border bg-surface-muted flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-yellow-500">star</span>
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Key Highlights</span>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
               {highlights.length === 0 && (
                 <div className="text-surface-muted text-xs">No highlights available yet.</div>
               )}
               {highlights.map((hl, idx) => (
                 <div key={idx} className="flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                   <div>
                     <h4 className="text-xs font-bold text-surface-foreground">{hl.title || 'Highlight'}</h4>
                     <p className="text-[11px] text-surface-muted mt-1">{hl.description || hl}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 overflow-hidden">
           {/* Progress Insights */}
           <div className="bg-surface-panel border border-surface-border flex flex-col shrink-0">
             <div className="px-4 py-3 border-b border-surface-border bg-surface-muted">
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Progress Insights</span>
            </div>
            <div className="p-4 space-y-5">
               <div>
                 <div className="flex justify-between text-xs mb-1">
                   <span className="text-surface-muted">Evacuated Zones Progress</span>
                   <span className="font-mono font-bold">{Math.round((metrics.zones_evacuated / 12) * 100)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                   <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.round((metrics.zones_evacuated / 12) * 100))}%` }}></div>
                 </div>
               </div>
               <div>
                 <div className="flex justify-between text-xs mb-1">
                   <span className="text-surface-muted">System Stability</span>
                   <span className="font-mono font-bold">{Math.max(0, 100 - metrics.replan_count * 5)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, 100 - metrics.replan_count * 5)}%` }}></div>
                 </div>
               </div>
            </div>
          </div>

          {/* Recommendations Summary */}
          <div className="bg-surface-panel border border-surface-border flex flex-col flex-1 overflow-hidden">
             <div className="px-4 py-3 border-b border-surface-border bg-surface-muted flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-blue-400">lightbulb</span>
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Recommendations Summary</span>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
               {recommendations.length === 0 && (
                 <div className="text-surface-muted text-xs">No specific recommendations at this time.</div>
               )}
               {recommendations.map((rec, idx) => (
                 <div key={idx} className="bg-surface border border-surface-border p-3 border-l-2 border-l-blue-400">
                    <h4 className="text-xs font-bold text-surface-foreground">{rec.action || 'Recommendation'}</h4>
                    <p className="text-[10px] text-surface-muted mt-1">{rec.reasoning || rec}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeekNumber() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}
