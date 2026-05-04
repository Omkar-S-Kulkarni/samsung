import React, { useState } from 'react';
import { Activity, Shield, Zap, Info, Play } from 'lucide-react';

const TwinMetric = ({ label, value, color, max = 100 }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-end">
      <span className="text-xs text-gray-400 uppercase font-mono">{label}</span>
      <span className="text-xl font-bold text-white font-mono">{value.toFixed(1)}</span>
    </div>
    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-1000" 
        style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
      ></div>
    </div>
  </div>
);

export default function DigitalTwin({ twin, onSimulate }) {
  const [scenario, setScenario] = useState({ sleep_delta: 0, extra_load: 0 });
  const [simResults, setSimResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const twinData = twin || {
    readiness_score: 82.4,
    fatigue_index: 18.5,
    stress_resilience: 76.0,
    recovery_status: 'optimal'
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    // Simulated delay
    setTimeout(() => {
      const predReadiness = twinData.readiness_score + (scenario.sleep_delta * 8) - (scenario.extra_load * 0.2);
      setSimResults({
        predicted_readiness: Math.max(0, Math.min(100, predReadiness)),
        impact: predReadiness < twinData.readiness_score ? 'Risk Detected' : 'Improvement Expected'
      });
      setIsSimulating(false);
    }, 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Digital Twin</h1>
        <div className="flex items-center gap-1.5 bg-[var(--color-pulse-bg)]/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full">
          <Shield size={12} className="text-[var(--color-pulse-cyan)]" />
          <span className="text-[10px] font-medium tracking-wide text-[var(--color-pulse-cyan)] uppercase">Sync: Optimal</span>
        </div>
      </div>

      {/* Main Twin Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--color-pulse-cyan)]/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-pulse-green)] animate-pulse"></div>
              <span className="text-xs text-[var(--color-pulse-green)] font-bold uppercase tracking-widest">Model: Active</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Readiness: {twinData.readiness_score.toFixed(1)}</h2>
            
            <div className="space-y-6">
              <TwinMetric label="Body Readiness" value={twinData.readiness_score} color="var(--color-pulse-cyan)" />
              <TwinMetric label="Fatigue Index" value={twinData.fatigue_index} color="var(--color-pulse-amber)" />
              <TwinMetric label="Stress Resilience" value={twinData.stress_resilience} color="var(--color-pulse-green)" />
            </div>
          </div>
          
          <div className="flex justify-center">
             <div className="relative w-48 h-48 md:w-64 md:h-64">
                {/* Simulated Human Outline Visualization */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-white/10 fill-current drop-shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                  <path d="M50 10 C55 10 58 15 58 20 C58 25 55 30 50 30 C45 30 42 25 42 20 C42 15 45 10 50 10 M30 40 L70 40 L75 70 L25 70 Z M40 70 L35 95 M60 70 L65 95" stroke="var(--color-pulse-cyan)" strokeWidth="1" fill="none" />
                </svg>
                {/* Floating particles */}
                <div className="absolute inset-0 animate-spin-slow opacity-50">
                  <div className="absolute top-0 left-1/2 w-1 h-1 bg-[var(--color-pulse-cyan)] rounded-full shadow-[0_0_8px_var(--color-pulse-cyan)]"></div>
                  <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-[var(--color-pulse-green)] rounded-full shadow-[0_0_8px_var(--color-pulse-green)]"></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* What-If Simulator */}
      <div className="mb-8">
        <h2 className="text-xs text-[var(--color-pulse-cyan)] uppercase tracking-widest mb-4 font-mono">What-If Simulation Engine</h2>
        <div className="glass-card rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-mono">Scenario: Sleep Change (Hours)</label>
              <input 
                type="range" min="-4" max="4" step="0.5" 
                value={scenario.sleep_delta} 
                onChange={(e) => setScenario({...scenario, sleep_delta: parseFloat(e.target.value)})}
                className="w-full accent-[var(--color-pulse-cyan)]"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>-4 hrs</span>
                <span className="text-white">{scenario.sleep_delta > 0 ? '+' : ''}{scenario.sleep_delta} hrs</span>
                <span>+4 hrs</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-mono">Scenario: Extra Load (Intensity)</label>
              <input 
                type="range" min="0" max="100" 
                value={scenario.extra_load} 
                onChange={(e) => setScenario({...scenario, extra_load: parseInt(e.target.value)})}
                className="w-full accent-[var(--color-pulse-amber)]"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>Low</span>
                <span className="text-white">{scenario.extra_load}%</span>
                <span>High</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSimulate}
            disabled={isSimulating}
            className="w-full bg-[var(--color-pulse-cyan)]/20 hover:bg-[var(--color-pulse-cyan)]/30 text-[var(--color-pulse-cyan)] border border-[var(--color-pulse-cyan)]/30 rounded-xl py-3 flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50"
          >
            {isSimulating ? <div className="typing-dot"></div> : <><Zap size={16} fill="currentColor" /> Run Simulation</>}
          </button>

          {simResults && (
            <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-500 uppercase font-mono">Predicted Readiness</span>
                  <div className="text-2xl font-bold text-white font-mono">{simResults.predicted_readiness.toFixed(1)}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 uppercase font-mono">Assessment</span>
                  <div className={`text-sm font-bold uppercase ${simResults.predicted_readiness < twinData.readiness_score ? 'text-red-400' : 'text-green-400'}`}>
                    {simResults.impact}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
