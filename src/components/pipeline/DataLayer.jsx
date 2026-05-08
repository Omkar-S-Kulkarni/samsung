import React, { useState, useEffect } from 'react';
import { Network, Activity, Cpu, Shield, Brain, Zap, Database, ArrowRight, CheckCircle2, ChevronRight, Sliders, Layers } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DataLayer({ section, simState, updateSim }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hrBase = 65 + simState.hrShift + (simState.stressMode ? 20 : 0) + (simState.workoutMode ? 60 : 0);
  
  const generateNoisyData = () => Array.from({ length: 30 }, (_, i) => ({
    time: i,
    raw: hrBase + (Math.random() * 20 - 10) + Math.sin(i + tick) * 5,
    clean: hrBase + Math.sin(i + tick) * 5
  }));

  const liveData = generateNoisyData();

  if (section === '1_main') {
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Network className="text-[var(--color-pulse-cyan)]" /> System Architecture
        </h2>
        <div className="flex-1 grid grid-cols-3 gap-6 relative">
          {['1. Ingestion', '2. Preprocessing', '3. Edge ML', '4. Core Fusion', '5. Digital Twin', '6. RAG DB', '7. LLM Engine', '8. Safety Layer', '9. Final Report'].map((title, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 flex flex-col items-center justify-center border border-white/10 hover:border-[var(--color-pulse-cyan)]/50 transition-all relative overflow-hidden group">
              <div className="absolute inset-0 bg-[var(--color-pulse-cyan)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Activity size={24} className="text-[var(--color-pulse-cyan)] mb-2" />
              <span className="font-mono text-sm font-bold">{title}</span>
              <div className="flex items-center gap-1.5 mt-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-pulse-green)] animate-pulse" />
                <span className="text-[10px] text-[var(--color-pulse-green)] uppercase">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === '2_sensors') {
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Activity className="text-[var(--color-pulse-cyan)]" /> Live Sensor Input Simulation
        </h2>
        
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="font-mono text-sm font-bold text-[var(--color-pulse-cyan)]">Simulation Controls</h3>
            
            <label className="text-xs font-mono text-gray-400">Heart Rate Base Shift: {simState.hrShift}bpm</label>
            <input type="range" min="-20" max="60" value={simState.hrShift} onChange={(e) => updateSim('hrShift', Number(e.target.value))} className="w-full accent-[var(--color-pulse-cyan)]" />
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-mono text-gray-400">Workout Mode</span>
              <input type="checkbox" checked={simState.workoutMode} onChange={(e) => updateSim('workoutMode', e.target.checked)} className="accent-[#FF9A3C]" />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-mono text-gray-400">Stress Mode</span>
              <input type="checkbox" checked={simState.stressMode} onChange={(e) => updateSim('stressMode', e.target.checked)} className="accent-red-500" />
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-2xl col-span-2">
            <h3 className="font-mono text-sm font-bold text-white mb-4">Live PPG Signal (Simulated)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveData}>
                  <defs>
                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-pulse-cyan)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-pulse-cyan)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="clean" stroke="var(--color-pulse-cyan)" fillOpacity={1} fill="url(#colorHr)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === '3_preprocess') {
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Layers className="text-[var(--color-pulse-cyan)]" /> Signal Preprocessing
        </h2>
        <div className="grid grid-cols-2 gap-8 flex-1">
          <div className="glass-card p-6 rounded-2xl border-red-500/20">
            <h3 className="font-mono text-sm text-red-400 mb-4">Raw Sensor Input (Noisy)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={liveData}>
                <Line type="step" dataKey="raw" stroke="#f87171" strokeWidth={1} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs font-mono text-gray-400 space-y-1">
              <p>{'>'} High frequency noise detected</p>
              <p>{'>'} Motion artifacts present</p>
            </div>
          </div>
          <div className="glass-card p-6 rounded-2xl border-[var(--color-pulse-cyan)]/20">
            <h3 className="font-mono text-sm text-[var(--color-pulse-cyan)] mb-4">Post-Kalman Filter (Clean)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={liveData}>
                <Line type="monotone" dataKey="clean" stroke="var(--color-pulse-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs font-mono text-gray-400 space-y-1">
              <p>{'>'} Butterworth low-pass applied</p>
              <p>{'>'} Missing values interpolated</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === '4_features') {
    const featureData = [
      { subject: 'HRV Baseline', A: 80 + Math.random()*20, fullMark: 100 },
      { subject: 'Sleep Debt', A: 60 + Math.random()*20, fullMark: 100 },
      { subject: 'Strain', A: simState.workoutMode ? 95 : 30, fullMark: 100 },
      { subject: 'Stress Load', A: simState.stressMode ? 90 : 40, fullMark: 100 },
      { subject: 'Recovery', A: simState.workoutMode ? 40 : 85, fullMark: 100 },
      { subject: 'Circadian Sync', A: 75, fullMark: 100 },
    ];
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Radar className="text-[var(--color-pulse-cyan)]" /> Feature Engineering Space
        </h2>
        <div className="flex-1 flex gap-8">
          <div className="w-1/3 glass-card rounded-2xl p-6">
            <h3 className="font-mono text-sm mb-4">Extracted Temporal Features</h3>
            <ul className="space-y-4">
              {featureData.map(f => (
                <li key={f.subject} className="text-xs font-mono">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">{f.subject}</span>
                    <span className="text-[var(--color-pulse-cyan)]">{Math.round(f.A)}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-pulse-cyan)] transition-all duration-1000" style={{ width: `${f.A}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 glass-card rounded-2xl p-6 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={featureData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'gray', fontSize: 10, fontFamily: 'monospace' }} />
                <Radar name="User Features" dataKey="A" stroke="var(--color-pulse-cyan)" fill="var(--color-pulse-cyan)" fillOpacity={0.4} isAnimationActive={true} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
