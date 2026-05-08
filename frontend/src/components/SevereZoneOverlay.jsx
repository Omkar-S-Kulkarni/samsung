import React from 'react';
import { useGlobalSocket } from '../context/SocketContext';
import cityData from '../data/city-model.json';

const getRiskConfig = (risk) => {
  if (risk >= 9) return { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50', bar: 'bg-red-500' };
  if (risk >= 7) return { label: 'HIGH', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50', bar: 'bg-orange-500' };
  if (risk >= 5) return { label: 'ELEVATED', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', bar: 'bg-yellow-500' };
  return { label: 'STABLE', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', bar: 'bg-emerald-500' };
};

export default function SevereZoneOverlay({ isOpen, onClose }) {
  const { data } = useGlobalSocket();
  const riskScores = data?.risk_scores || {};

  if (!isOpen) return null;

  const severeZones = cityData.zones.filter(zone => {
    const risk = riskScores[zone.name] !== undefined ? riskScores[zone.name] : zone.flood_risk_base;
    return risk >= 5;
  }).sort((a, b) => {
    const riskA = riskScores[a.name] !== undefined ? riskScores[a.name] : a.flood_risk_base;
    const riskB = riskScores[b.name] !== undefined ? riskScores[b.name] : b.flood_risk_base;
    return riskB - riskA;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-surface-panel border border-red-500/30 rounded-2xl shadow-[0_0_100px_rgba(239,68,68,0.2)] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-red-500 text-black text-[10px] font-black tracking-[0.2em] uppercase rounded-sm animate-pulse">
              SEVERE FLOOD ALERT
            </div>
            <div className="h-6 w-px bg-surface-border"></div>
            <div>
              <h2 className="text-xl font-black text-surface-foreground tracking-tight uppercase">High-Risk Zone Analysis</h2>
              <p className="text-[10px] text-surface-muted font-mono tracking-widest mt-0.5">FILTER_CRITERIA: RISK_SCORE &gt;= 5.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-surface-border text-surface-muted hover:text-surface-foreground hover:border-surface-foreground transition-all rounded-full"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {severeZones.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {severeZones.map((zone) => {
                const risk = riskScores[zone.name] !== undefined ? riskScores[zone.name] : zone.flood_risk_base;
                const config = getRiskConfig(risk);
                return (
                  <div key={zone.id} className="group relative bg-surface-muted border border-surface-border hover:border-red-500/50 transition-all duration-500 p-6 rounded-xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${config.bg} ${config.color} ${config.border}`}>
                        {config.label}
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-surface-muted tracking-tighter uppercase">Identifier: {zone.id}</span>
                        <h3 className="text-xl font-black text-surface-foreground group-hover:text-red-400 transition-colors uppercase tracking-tight">{zone.name}</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-border">
                        <div>
                          <p className="text-[8px] text-surface-muted uppercase tracking-widest mb-1">Risk Index</p>
                          <p className={`text-2xl font-black font-mono ${config.color}`}>{risk.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-surface-muted uppercase tracking-widest mb-1">Population</p>
                          <p className="text-2xl font-black font-mono text-surface-foreground">{zone.population.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-surface-muted font-bold uppercase">Exposure Level</span>
                          <span className="text-[10px] text-surface-foreground font-mono">{(risk * 10).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-surface-panel rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.bar} transition-all duration-1000 ease-out`}
                            style={{ width: `${risk * 10}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-surface-muted uppercase">Elderly</span>
                          <span className="text-xs font-bold text-surface-muted">{zone.elderly_percent}%</span>
                        </div>
                        <div className="h-4 w-px bg-surface-border"></div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-surface-muted uppercase">Hospital</span>
                          <span className="text-xs font-bold text-surface-muted">{zone.has_hospital ? 'YES' : 'NO'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all duration-500"></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
              <div className="w-16 h-16 border-2 border-dashed border-surface-border rounded-full flex items-center justify-center text-surface-muted text-2xl font-black">
                !
              </div>
              <div>
                <h3 className="text-lg font-bold text-surface-muted uppercase tracking-widest">No Critical Zones Detected</h3>
                <p className="text-sm text-surface-muted font-mono mt-2 uppercase">All regions currently below emergency threshold (5.0)</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-border bg-surface-panel flex items-center justify-between">
          <div className="flex items-center gap-6 text-[9px] font-mono text-surface-muted">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500"></div>
              <span>CRITICAL (9.0+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500"></div>
              <span>HIGH (7.0-8.9)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-yellow-500"></div>
              <span>ELEVATED (5.0-6.9)</span>
            </div>
          </div>
          <p className="text-[10px] text-surface-muted uppercase tracking-widest font-black">
            System Status: <span className="text-emerald-500">Operational</span>
          </p>
        </div>
      </div>
    </div>
  );
}
