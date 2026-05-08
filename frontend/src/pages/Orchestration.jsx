import React, { useState, useEffect } from 'react';
import cityData from '../data/city-model.json';
import { useGlobalSocket } from '../context/SocketContext';

const formatK = (num) => {
  if (!num) return "0";
  const k = num / 1000;
  return k % 1 === 0 ? k.toLocaleString() + 'k' : k.toFixed(1) + 'k';
};

const getRiskConfig = (risk) => {
  if (risk >= 9) return { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50', bar: 'bg-red-500', action: 'EVACUATE' };
  if (risk >= 7) return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50', bar: 'bg-orange-500', action: 'STANDBY' };
  if (risk >= 4) return { label: 'MOD', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', bar: 'bg-yellow-500', action: 'STANDBY' };
  return { label: 'STABLE', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', bar: 'bg-emerald-500', action: 'SAFE' };
};

const getLlmLevelBadge = (level) => {
  if (!level) return null;
  const configs = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    moderate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    minimal: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  };
  const c = configs[level] || configs.moderate;
  return (
    <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${c.bg} ${c.text} ${c.border} uppercase tracking-wider`}>
      AI:{level}
    </span>
  );
};

const ZoneCard = ({ zone, liveRisk, llmData }) => {
  const risk = liveRisk !== undefined ? liveRisk : zone.flood_risk_base;
  const config = getRiskConfig(risk);
  const [showInsight, setShowInsight] = useState(false);

  const hasLlm = llmData && llmData.reasoning;

  return (
    <div
      className={`p-4 border-l-2 ${config.border} bg-surface-panel hover:bg-surface-accent transition-all group cursor-pointer relative`}
      onClick={() => hasLlm && setShowInsight(!showInsight)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] text-surface-muted font-mono tracking-tighter">ZONE_{zone.id.replace('Z', '0')}</span>
        <div className="flex items-center gap-1">
          {hasLlm && getLlmLevelBadge(llmData.risk_level)}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${config.bg} ${config.color} border border-current/20`}>
            {config.label}
          </span>
        </div>
      </div>
      <div className="text-sm font-bold text-surface-foreground uppercase tracking-wide mb-1 truncate">
        {zone.name.replace(' ', '_')}
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-black text-surface-foreground font-mono leading-none">
          {risk?.toFixed(1) || "0.0"}
        </div>
        <div className="text-[10px] font-bold text-surface-muted uppercase tracking-widest pb-1 self-end group-hover:text-surface-foreground">
          {config.action}
        </div>
      </div>
      {/* Decorative mini bar at bottom */}
      <div className="mt-3 h-0.5 bg-surface-border w-full overflow-hidden">
        <div className={`h-full ${config.bar} transition-all duration-700`} style={{ width: `${Math.min(100, risk * 10)}%` }}></div>
      </div>
      {/* LLM Source indicator */}
      {hasLlm && (
        <div className="mt-1.5 flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${llmData.source === 'llm' ? 'bg-violet-500' : 'bg-surface-border'}`}></div>
          <span className="text-[8px] text-surface-muted font-mono tracking-wider uppercase">
            {llmData.source === 'llm' ? 'AI ANALYZED' : 'RULE-BASED'}
          </span>
        </div>
      )}
      {/* Expandable LLM Insight */}
      {showInsight && hasLlm && (
        <div className="mt-3 p-2.5 bg-violet-500/5 border border-violet-500/20 rounded text-[10px] text-surface-muted leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-violet-400 font-bold tracking-wider text-[9px] uppercase">AI Insight</span>
          </div>
          <p className="text-surface-foreground/80">{llmData.reasoning}</p>
          {llmData.recommendation && (
            <p className="text-violet-300/80 italic">{llmData.recommendation}</p>
          )}
        </div>
      )}
    </div>
  );
};

const ColorLegend = () => (
  <div className="flex items-center gap-4 px-3 py-1.5 bg-surface-panel border border-surface-border rounded-sm">
    <span className="text-[9px] font-bold text-surface-muted uppercase tracking-widest mr-1">Scale:</span>
    {[
      { label: 'Critical', color: 'bg-red-500' },
      { label: 'High', color: 'bg-orange-500' },
      { label: 'Moderate', color: 'bg-yellow-500' },
      { label: 'Stable', color: 'bg-emerald-500' }
    ].map(item => (
      <div key={item.label} className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 ${item.color}`}></div>
        <span className="text-[8px] text-surface-muted uppercase font-mono">{item.label}</span>
      </div>
    ))}
  </div>
);

const RationalePanel = ({ topOrder }) => {
  if (!topOrder) return (
    <div className="h-full flex items-center justify-center text-surface-muted italic text-[10px]">
      Awaiting priority sequence...
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-surface-foreground uppercase tracking-tight">{topOrder.zone_name}</span>
        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">PRIORITY 01</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-muted p-2 border border-surface-border">
          <div className="text-[8px] text-surface-muted uppercase mb-1">Risk Score</div>
          <div className="text-xl font-mono font-bold text-surface-foreground">{topOrder.risk_score?.toFixed(1) || '0.0'}</div>
        </div>
        <div className="bg-surface-muted p-2 border border-surface-border">
          <div className="text-[8px] text-surface-muted uppercase mb-1">Vulnerability</div>
          <div className="text-xl font-mono font-bold text-surface-foreground">{topOrder.vulnerability_score?.toFixed(1) || '0.0'}</div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="text-[8px] text-surface-muted uppercase tracking-widest font-bold">Tactical Rationale</div>
        <p className="text-[10px] text-surface-muted leading-relaxed font-serif italic border-l-2 border-violet-500/40 pl-3 py-1 bg-violet-500/5">
          "{topOrder.llm_rationale || topOrder.rationale || 'Pending tactical analysis...'}"
        </p>
      </div>
    </div>
  );
};

const ReplanLog = ({ events }) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
    {events && events.length > 0 ? (
      events.slice().reverse().map((event, i) => (
        <div key={i} className="text-[9px] border-b border-surface-border pb-2 last:border-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-orange-500 font-bold uppercase tracking-tighter">TRG::{event.trigger_type}</span>
            <span className="text-surface-muted text-[8px]">{new Date(event.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="text-surface-muted leading-tight">
            Tick {event.tick}: {event.details || `Forced recalculation on ${event.affected_zone_id}`}
          </div>
        </div>
      ))
    ) : (
      <div className="text-[10px] text-surface-muted italic">No replanning events recorded.</div>
    )}
  </div>
);

const EvacuationSequence = ({ sequence, isAiActive }) => {
  const topOrders = sequence.slice(0, 10);
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono">
      {topOrders.length > 0 ? (
        topOrders.map((order, i) => {
          const statusColor = order.assigned_route ? 'text-emerald-400' : 'text-orange-400';
          const statusLabel = order.assigned_route ? 'ROUTING' : 'NO ROUTE';
          return (
            <div key={i} className="flex items-center gap-4 text-[10px] border-b border-surface-border pb-1.5 last:border-0">
              <span className="text-red-500 font-bold w-3">{order.rank}</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="font-bold text-surface-foreground uppercase truncate max-w-[80px]">{order.zone_name}</span>
                <span className="text-surface-muted text-[8px]">-&gt;</span>
                <span className="font-bold text-surface-muted truncate max-w-[60px]">{order.assigned_shelter || '---'}</span>
              </div>
              <span className="text-surface-muted text-[8px]">{order.priority_score.toFixed(1)}</span>
              <span className={`font-bold ${statusColor} text-[8px] tracking-tighter`}>{statusLabel}</span>
            </div>
          );
        })
      ) : (
        <div className="text-[10px] text-surface-muted italic">No sequence data.</div>
      )}
    </div>
  );
};

const OllamaStatusBadge = ({ status }) => {
  if (!status) return null;
  const isActive = status.available && status.enabled;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-violet-500 animate-pulse' : 'bg-surface-border'}`}></div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-violet-400' : 'text-surface-muted'}`}>
        {isActive ? `AI: ${status.active_model || 'ACTIVE'}` : 'AI: OFFLINE'}
      </span>
    </div>
  );
};

export default function Orchestration() {
  const { data, sendCommand, globalLogs } = useGlobalSocket();
  const [tick, setTick] = useState(0);
  const [zones] = useState(cityData.zones);
  const [riskScores, setRiskScores] = useState({});
  const [evacPlan, setEvacPlan] = useState(null);
  const [zoneStates, setZoneStates] = useState([]);
  const [selectedRoad, setSelectedRoad] = useState('');
  const [emergencyInputs, setEmergencyInputs] = useState({
    prioritizeZone: '',
    changePathFrom: '',
    changePathTo: '',
    changePathVia: '',
    useShelter: '',
    shelterSize: ''
  });
  const [llmAnalysis, setLlmAnalysis] = useState({});
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [replanEvents, setReplanEvents] = useState([]);

  useEffect(() => {
    if (data && data.tick !== undefined) {
      setTick(data.tick);

      if (data.risk_scores) {
        setRiskScores(data.risk_scores);
      }

      if (data.evacuation_plan) {
        setEvacPlan(data.evacuation_plan);
      }

      if (data.zone_states) {
        setZoneStates(data.zone_states);
      }

      if (data.llm_analysis) {
        setLlmAnalysis(data.llm_analysis);
      }

      if (data.ollama_status) {
        setOllamaStatus(data.ollama_status);
      }

      if (data.replan_events) {
        setReplanEvents(data.replan_events);
      }
    }
  }, [data]);

  const getLiveRisk = (zone) => {
    const rs = riskScores[zone.name];
    return rs !== undefined ? rs : undefined;
  };

  const getLlmData = (zone) => {
    return llmAnalysis[zone.name] || null;
  };

  const evacSequence = evacPlan?.evacuation_sequence || [];
  const topEvacOrders = evacSequence.slice(0, 5);

  const vulnerabilityRanked = [...zoneStates]
    .sort((a, b) => (b.vulnerability_score || 0) - (a.vulnerability_score || 0))
    .slice(0, 5);

  const shelterUsage = {};
  for (const entry of evacSequence) {
    if (entry.assigned_shelter) {
      const zone = cityData.zones.find(z => z.id === entry.zone_id || z.name === entry.zone_name);
      const pop = zone?.population || 0;
      shelterUsage[entry.assigned_shelter] = (shelterUsage[entry.assigned_shelter] || 0) + pop;
    }
  }
  const sheltersFromModel = cityData.shelters || [];

  const handleManualOverride = () => {
    if (!selectedRoad) return;
    const parts = selectedRoad.split("|");
    if (parts.length === 2) {
      sendCommand("MANUAL_BLOCK", {
        from: parts[0],
        to: parts[1],
        reason: "Human Evaluator Override via Dashboard"
      });
      setSelectedRoad('');
    }
  };

  const isAiActive = ollamaStatus?.available && ollamaStatus?.enabled;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between border-b border-surface-border pb-2">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
            Decision Governor: ACTIVE
          </span>
          <div className="h-4 w-px bg-surface-border"></div>
          <span className="text-[10px] font-mono text-surface-muted uppercase tracking-widest">
            Live_Tick: {tick}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ColorLegend />
          <OllamaStatusBadge status={ollamaStatus} />
          <div className="h-4 w-px bg-surface-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] text-surface-muted font-bold uppercase">CONNECTED</span>
          </div>
          <div className="text-[10px] font-mono text-surface-muted tracking-widest">
            REFRESH: 2s
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex-[3] flex flex-col gap-6 overflow-y-auto no-scrollbar">

          <div className="grid grid-cols-4 gap-4">
            {zones.map(zone => (
              <ZoneCard key={zone.id} zone={zone} liveRisk={getLiveRisk(zone)} llmData={getLlmData(zone)} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 h-64 min-h-[16rem]">
            <div className="flex flex-col border border-surface-border bg-surface-panel">
              <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between">
                <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">Detailed Strategy Analysis</span>
                {evacSequence.length > 0 && (
                  <span className="text-[8px] font-mono text-surface-muted uppercase">Focus: {evacSequence[0].zone_name}</span>
                )}
              </div>
              <RationalePanel topOrder={evacSequence[0]} />
            </div>

            <div className="flex flex-col border border-surface-border bg-surface-panel">
              <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between">
                <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">Replanning History</span>
                <span className="text-[10px] text-surface-muted font-mono">{replanEvents.length} events</span>
              </div>
              <ReplanLog events={replanEvents} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 h-48 min-h-[12rem]">
            <div className="flex flex-col border border-surface-border bg-surface-panel">
              <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between">
                <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">Evacuation Sequence</span>
                <span className="text-[10px] text-emerald-500 font-mono">{evacSequence.length} ZONES</span>
              </div>
              <EvacuationSequence sequence={evacSequence} isAiActive={isAiActive} />
            </div>

            <div className="flex flex-col border border-surface-border bg-surface-panel">
              <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between">
                <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">Global System Log</span>
                <span className="text-[10px] text-surface-muted font-mono">{globalLogs.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono">
                {globalLogs.length > 0 ? (
                  globalLogs.slice(0, 8).map((log, i) => (
                    <div key={i} className="flex gap-3 text-[9px] leading-relaxed">
                      <span className="text-emerald-500/60 shrink-0">{log.time}</span>
                      <span className={log.color + " truncate"}>{log.msg}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[9px] text-surface-muted italic">Waiting...</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6">

          {/* AI Status Panel */}
          <div className="flex flex-col border border-surface-border bg-surface-panel">
            <div className="px-4 py-2 border-b border-surface-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">AI Engine Status</span>
              <div className={`w-2 h-2 rounded-full ${isAiActive ? 'bg-violet-500 animate-pulse' : 'bg-surface-border'}`}></div>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-surface-muted font-mono">MODEL</span>
                <span className={`font-bold ${isAiActive ? 'text-violet-300' : 'text-surface-muted'} font-mono`}>
                  {ollamaStatus?.active_model || 'NONE'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-surface-muted font-mono">STATUS</span>
                <span className={`font-bold uppercase tracking-wider ${isAiActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isAiActive ? 'ACTIVE' : 'FALLBACK MODE'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-surface-muted font-mono">CACHE</span>
                <span className="font-bold text-surface-muted font-mono">{ollamaStatus?.cache_size || 0} items</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-surface-muted font-mono">MODE</span>
                <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded ${isAiActive ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-surface-muted text-surface-muted border border-surface-border'}`}>
                  {isAiActive ? 'LLM-DRIVEN' : 'RULE-BASED'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col border border-surface-border bg-surface-panel">
            <div className="px-4 py-2 border-b border-surface-border">
              <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">Manual Override</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <p className="text-[10px] text-surface-muted tracking-wide mb-1">Select a route to mark as impassable.</p>
              <select
                value={selectedRoad}
                onChange={(e) => setSelectedRoad(e.target.value)}
                className="w-full bg-surface-muted border border-surface-border text-surface-foreground text-xs p-2 rounded focus:outline-none focus:border-red-500">
                <option value="">-- Select Road Segment --</option>
                {cityData.road_network.edges.map((edge, i) => {
                  // Extract names from Zone IDs by looking up
                  const z1 = cityData.zones.find(z => z.id === edge[0])?.name || edge[0];
                  const z2 = cityData.zones.find(z => z.id === edge[1])?.name || edge[1];
                  return (
                    <option key={i} value={`${z1}|${z2}`}>{edge[3]}</option>
                  )
                })}
              </select>
              <button
                onClick={handleManualOverride}
                disabled={!selectedRoad}
                className="w-full bg-red-600/10 text-red-500 border border-red-600/30 hover:bg-red-600 hover:text-white transition-all text-[10px] font-bold tracking-widest py-2 rounded uppercase disabled:opacity-50 disabled:cursor-not-allowed mb-2">
                Flood Route Segment
              </button>

              <div className="border-t border-surface-border pt-3">
                <p className="text-[10px] text-surface-muted tracking-wide mb-2">Emergency Replan Options:</p>
                <div className="space-y-2">
                  <select
                    value={emergencyInputs.prioritizeZone}
                    onChange={(e) => setEmergencyInputs({ ...emergencyInputs, prioritizeZone: e.target.value })}
                    className="w-full bg-surface-muted border border-surface-border text-surface-foreground text-xs p-2 rounded focus:outline-none focus:border-orange-500">
                    <option value="">-- Prioritize Zone --</option>
                    {zones.map(zone => (
                      <option key={zone.id} value={zone.name}>{zone.name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 gap-1">
                    <select
                      value={emergencyInputs.changePathFrom}
                      onChange={(e) => setEmergencyInputs({ ...emergencyInputs, changePathFrom: e.target.value })}
                      className="bg-surface-muted border border-surface-border text-surface-foreground text-xs p-1 rounded focus:outline-none focus:border-orange-500">
                      <option value="">From</option>
                      {zones.map(zone => (
                        <option key={zone.id} value={zone.name}>{zone.name}</option>
                      ))}
                    </select>
                    <select
                      value={emergencyInputs.changePathTo}
                      onChange={(e) => setEmergencyInputs({ ...emergencyInputs, changePathTo: e.target.value })}
                      className="bg-surface-muted border border-surface-border text-surface-foreground text-xs p-1 rounded focus:outline-none focus:border-orange-500">
                      <option value="">To Shelter</option>
                      {sheltersFromModel.map(shelter => (
                        <option key={shelter.id} value={shelter.id}>{shelter.name}</option>
                      ))}
                    </select>
                    <select
                      value={emergencyInputs.changePathVia}
                      onChange={(e) => setEmergencyInputs({ ...emergencyInputs, changePathVia: e.target.value })}
                      className="bg-surface-muted border border-surface-border text-surface-foreground text-xs p-1 rounded focus:outline-none focus:border-orange-500">
                      <option value="">Via</option>
                      {zones.map(zone => (
                        <option key={zone.id} value={zone.name}>{zone.name}</option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={emergencyInputs.useShelter}
                    onChange={(e) => setEmergencyInputs({ ...emergencyInputs, useShelter: e.target.value })}
                    className="w-full bg-surface-muted border border-surface-border text-surface-foreground text-xs p-2 rounded focus:outline-none focus:border-orange-500">
                    <option value="">-- Use Shelter Instead --</option>
                    {sheltersFromModel.map(shelter => (
                      <option key={shelter.id} value={shelter.id}>{shelter.name}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Change Shelter Size"
                    value={emergencyInputs.shelterSize}
                    onChange={(e) => setEmergencyInputs({ ...emergencyInputs, shelterSize: e.target.value })}
                    className="w-full bg-surface-muted border border-surface-border text-surface-foreground text-xs p-2 rounded focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                onClick={() => sendCommand("EMERGENCY_REPLAN", emergencyInputs)}
                className="w-full bg-orange-600/20 text-orange-500 border border-orange-600/50 hover:bg-orange-600 hover:text-white transition-all text-[10px] font-bold tracking-widest py-2 rounded uppercase">
                Emergency Replan (Global)
              </button>
            </div>
          </div>

          <div className="flex flex-col border border-surface-border bg-surface-panel">
            <div className="px-4 py-2 border-b border-surface-border">
              <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">Vulnerability Ranking</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-[10px] font-mono">
                <thead>
                  <tr className="text-surface-muted border-b border-surface-border pb-1">
                    <th className="font-normal py-1 uppercase">RN</th>
                    <th className="font-normal py-1 uppercase">Zone</th>
                    <th className="font-normal py-1 uppercase">Risk</th>
                    <th className="font-normal py-1 text-right uppercase">Vuln</th>
                  </tr>
                </thead>
                <tbody className="text-surface-muted">
                  {vulnerabilityRanked.length > 0 ? (
                    vulnerabilityRanked.map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 group transition-colors">
                        <td className="py-2 text-red-500 font-bold">{String(i + 1).padStart(2, '0')}</td>
                        <td className="py-2 font-bold group-hover:text-surface-foreground uppercase">{row.zone_name}</td>
                        <td className="py-2 font-mono">{(row.risk_score || 0).toFixed(1)}</td>
                        <td className="py-2 text-right font-bold group-hover:text-surface-foreground">{(row.vulnerability_score || 0).toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="py-4 text-surface-muted italic text-center">Awaiting data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col border border-surface-border bg-surface-panel">
            <div className="px-4 py-2 border-b border-surface-border">
              <span className="text-[10px] font-bold text-surface-muted tracking-[0.1em] uppercase">Shelter Occupancy</span>
            </div>
            <div className="p-4 space-y-5">
              {sheltersFromModel.map((shelter, i) => {
                const assigned = shelterUsage[shelter.id] || 0;
                const occ = shelter.current_occupancy + assigned;
                const pct = shelter.capacity > 0 ? Math.min(Math.round((occ / shelter.capacity) * 100), 100) : 0;
                const barColor = pct > 90 ? 'bg-red-400' : pct > 60 ? 'bg-orange-400' : 'bg-emerald-400';
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-surface-foreground font-bold uppercase">{shelter.name}</span>
                      <span className="text-surface-muted font-bold tracking-tighter">{pct}%</span>
                    </div>
                    <div className="h-1 bg-surface-muted w-full overflow-hidden rounded-full">
                      <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="text-[9px] text-surface-muted font-mono tracking-tighter">
                      {formatK(occ)} / {formatK(shelter.capacity)} CAPACITY
                      {shelter.has_medical && <span className="ml-2 text-emerald-500">+ MEDICAL</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}