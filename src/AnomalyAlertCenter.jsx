import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, Activity, Brain, Clock, ShieldAlert, AlertCircle, Info, ChevronRight, Zap, Target
} from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

const API = 'http://localhost:8000';
const C = { cyan:'#00E5FF', green:'#39FF6A', amber:'#FF9A3C', red:'#f87171', bg:'#080C14', cardBg:'rgba(255,255,255,0.03)' };

export default function AnomalyAlertCenter({ user_id = 'react_user_1' }) {
  const [alerts, setAlerts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch Alerts
      const alertsRes = await fetch(`${API}/alerts/${user_id}`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
      
      // Fetch Anomalies History
      const anomRes = await fetch(`${API}/anomalies/${user_id}`);
      if (anomRes.ok) {
        const anomData = await anomRes.json();
        setAnomalies(anomData.anomalies || []);
        if (anomData.anomalies?.length > 0 && !selectedAnomaly) {
          setSelectedAnomaly(anomData.anomalies[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch anomaly data", err);
    }
  }, [user_id, selectedAnomaly]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (selectedAnomaly) {
      fetchExplanation(selectedAnomaly);
    }
  }, [selectedAnomaly]);

  const fetchExplanation = async (anomaly) => {
    setLoadingExplanation(true);
    setExplanation(null);
    try {
      const res = await fetch(`${API}/anomalies/${user_id}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          anomaly_id: anomaly.id,
          rule: anomaly.rule,
          metrics: anomaly.metrics
        })
      });
      if (res.ok) {
        const data = await res.json();
        setExplanation(data);
      }
    } catch (err) {
      console.error("Failed to fetch explanation", err);
    }
    setLoadingExplanation(false);
  };

  const getSeverityColor = (sev) => {
    if (sev === 'CRITICAL') return C.red;
    if (sev === 'WARNING') return C.amber;
    if (sev === 'INFO') return C.cyan;
    return C.green;
  };

  const getSeverityIcon = (sev) => {
    if (sev === 'CRITICAL') return <ShieldAlert size={16} />;
    if (sev === 'WARNING') return <AlertTriangle size={16} />;
    return <Info size={16} />;
  };

  // Format data for ScatterChart timeline
  const timelineData = anomalies.map(a => {
    const d = new Date(a.timestamp);
    return {
      ...a,
      timeValue: d.getTime(),
      timeString: a.timestamp.split(' ')[1],
      risk: a.risk_score,
      color: getSeverityColor(a.severity)
    };
  }).sort((a,b) => a.timeValue - b.timeValue);

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar w-full max-w-5xl mx-auto">
      
      {/* ── HEADER ── */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono uppercase flex items-center gap-2">
            <AlertTriangle className="text-[var(--color-pulse-cyan)]" /> Anomaly & Alert Center
          </h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">
            Powered by IsolationForest & Gemma3 LLM
          </p>
        </div>
      </div>

      {/* ── TOP: ALERT NOTIFICATION PANEL ── */}
      <div className="mb-6">
        <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap size={14} className="text-amber-400" /> Active System Alerts
        </h2>
        {alerts.length === 0 ? (
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 border-l-2 border-[var(--color-pulse-green)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-pulse-green)]/10 flex items-center justify-center text-[var(--color-pulse-green)]">
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-white font-mono">System Normal</p>
              <p className="text-xs text-gray-400 font-mono">No critical or warning alerts detected from the RuleEngine.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="glass-card rounded-xl p-4 flex items-center gap-4 relative overflow-hidden" style={{borderLeft: `3px solid ${getSeverityColor(alert.severity)}`}}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5" style={{backgroundColor: getSeverityColor(alert.severity), filter: 'blur(20px)'}}/>
                <div className="w-10 h-10 rounded-full flex items-center justify-center z-10" style={{backgroundColor: `${getSeverityColor(alert.severity)}15`, color: getSeverityColor(alert.severity)}}>
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="z-10 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full" style={{backgroundColor: `${getSeverityColor(alert.severity)}20`, color: getSeverityColor(alert.severity)}}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{alert.rule.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-white font-medium">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── LEFT COLUMN: TIMELINE & ANOMALY LIST ── */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Timeline Chart */}
          <div className="glass-card rounded-2xl p-5">
             <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={14} className="text-[var(--color-pulse-cyan)]" /> Anomaly Timeline
            </h2>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: -10, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="timeValue" 
                    domain={['auto', 'auto']} 
                    tickFormatter={(tick) => {
                      const d = new Date(tick);
                      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                    }}
                    tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis type="number" dataKey="risk" domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <ZAxis type="number" range={[40, 100]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0f172a] border border-white/10 rounded-lg p-2 shadow-xl">
                            <p className="text-xs font-bold text-white font-mono mb-1">{data.rule.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{data.timeString} • Risk: {data.risk}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {timelineData.map((entry, index) => (
                    <Scatter key={index} data={[entry]} fill={entry.color} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomalies List */}
          <div className="glass-card rounded-2xl p-5 flex-1 flex flex-col h-full max-h-[400px]">
            <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} className="text-[var(--color-pulse-cyan)]" /> Detected Anomalies
            </h2>
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2 pr-1">
              {anomalies.map(anom => {
                const isSelected = selectedAnomaly?.id === anom.id;
                const col = getSeverityColor(anom.severity);
                return (
                  <button 
                    key={anom.id} 
                    onClick={() => setSelectedAnomaly(anom)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${isSelected ? 'bg-white/10 border-white/20' : 'bg-[rgba(255,255,255,0.02)] border-white/5 hover:bg-white/5'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{anom.rule.replace(/_/g, ' ')}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{backgroundColor: `${col}20`, color: col}}>{anom.severity}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                      <span>{anom.timestamp}</span>
                      <span>Risk: {anom.risk_score}%</span>
                    </div>
                  </button>
                );
              })}
              {anomalies.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-xs font-mono">No recent anomalies detected.</div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: ANOMALY DETAILS PANE ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedAnomaly ? (
            <>
              {/* Context Header */}
              <div className="glass-card rounded-2xl p-6 relative overflow-hidden" style={{ borderTop: `3px solid ${getSeverityColor(selectedAnomaly.severity)}` }}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5" style={{backgroundColor: getSeverityColor(selectedAnomaly.severity), filter: 'blur(30px)'}}/>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg" style={{backgroundColor: `${getSeverityColor(selectedAnomaly.severity)}15`, color: getSeverityColor(selectedAnomaly.severity)}}>
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">{selectedAnomaly.rule.replace(/_/g, ' ')}</h2>
                    <p className="text-[10px] text-gray-400 font-mono">{selectedAnomaly.timestamp} • Risk Score: {selectedAnomaly.risk_score}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                  {Object.entries(selectedAnomaly.metrics).map(([key, val]) => (
                    <div key={key} className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                      <p className="text-lg font-bold text-white font-mono">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* LLM Explanation & Actions */}
              <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col">
                <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Brain size={14} className="text-[#c084fc]" /> Intelligent Diagnosis (gemma3:12b)
                </h2>
                
                {loadingExplanation ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3 py-10">
                    <div className="w-6 h-6 border-2 border-t-transparent border-[#c084fc] rounded-full animate-spin" />
                    <p className="text-xs font-mono animate-pulse">Synthesizing clinical explanation...</p>
                  </div>
                ) : explanation ? (
                  <div className="flex flex-col gap-6">
                    {/* Why this happened */}
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <Info size={16} className="text-[var(--color-pulse-cyan)]" /> Why this happened
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                        {explanation.explanation}
                      </p>
                    </div>

                    {/* Contributing Factors Breakdown */}
                    <div>
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Target size={16} className="text-amber-400" /> Contributing Factors
                      </h3>
                      <div className="space-y-3">
                        {explanation.factors?.map((f, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-gray-400 w-24 truncate">{f.metric}</span>
                            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-amber-400/80 transition-all duration-1000" style={{ width: `${f.contribution}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-white w-8">{f.contribution}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggested Actions */}
                    <div>
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Zap size={16} className="text-[var(--color-pulse-green)]" /> Suggested Actions
                      </h3>
                      <ul className="space-y-2">
                        {explanation.actions?.map((action, i) => (
                          <li key={i} className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
                            <ChevronRight size={14} className="text-[var(--color-pulse-green)] mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-200">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-xs font-mono">
                    Could not generate explanation.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="glass-card rounded-2xl flex-1 flex flex-col items-center justify-center p-10 border-dashed border-white/10">
              <ShieldAlert size={48} className="text-gray-600 mb-4 opacity-50" />
              <p className="text-lg font-bold text-gray-400 mb-2">No Anomaly Selected</p>
              <p className="text-xs text-gray-500 font-mono text-center max-w-sm">
                Select an anomaly from the timeline or list to view an intelligent breakdown of why it occurred and how to resolve it.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
