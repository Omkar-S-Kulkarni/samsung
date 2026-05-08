import React, { useState, useEffect } from 'react';
import { Timer, Signal, HelpCircle, Activity, WifiOff, Shield, BarChart3, CloudOff, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function SystemLayer({ section, simState, updateSim }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (section === '12_perf') {
    const perfData = Array.from({ length: 20 }, (_, i) => ({
      time: i,
      cpu: 30 + Math.sin(i + tick)*10 + Math.random()*5,
      latency: 45 + Math.random()*15,
      mem: 2.1 + (i*0.01)
    }));

    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Timer className="text-[var(--color-pulse-cyan)]" /> System Performance Metrics
        </h2>
        <div className="flex-1 grid grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-mono text-sm text-[var(--color-pulse-cyan)] mb-4 flex items-center gap-2"><Activity size={16}/> Hardware Utilization (CPU/RAM)</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <YAxis yAxisId="left" stroke="gray" fontSize={10} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="gray" fontSize={10} domain={[0, 4]} />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid var(--color-pulse-cyan)' }} />
                  <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="var(--color-pulse-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} name="CPU %" />
                  <Line yAxisId="right" type="step" dataKey="mem" stroke="#c084fc" strokeWidth={2} dot={false} isAnimationActive={false} name="Memory (GB)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col justify-center">
               <h3 className="font-mono text-sm text-[#FF9A3C] mb-2">E2E Inference Latency</h3>
               <div className="flex items-baseline gap-2">
                 <span className="text-5xl font-bold font-mono text-white">{Math.round(perfData[19].latency)}</span>
                 <span className="text-gray-500 font-mono">ms</span>
               </div>
               <div className="mt-4 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full bg-[#FF9A3C] transition-all duration-300" style={{ width: `${perfData[19].latency}%` }} />
               </div>
            </div>
            
            <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col justify-center">
               <h3 className="font-mono text-sm text-[var(--color-pulse-green)] mb-2">Token Generation Speed</h3>
               <div className="flex items-baseline gap-2">
                 <span className="text-5xl font-bold font-mono text-white">48.2</span>
                 <span className="text-gray-500 font-mono">tokens/sec</span>
               </div>
               <p className="text-[10px] text-gray-400 mt-2 font-mono">Using Llama 3 8B (4-bit Quantized)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === '13_edge') {
    const isOffline = simState.networkStatus === 'offline';
    
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Signal className="text-[#c084fc]" /> Edge AI Architecture
        </h2>
        
        <div className="flex gap-4 mb-8">
           <button 
             onClick={() => updateSim('networkStatus', 'online')}
             className={`px-6 py-2 rounded-xl border text-xs font-bold uppercase transition-all ${!isOffline ? 'bg-[var(--color-pulse-cyan)]/20 border-[var(--color-pulse-cyan)] text-[var(--color-pulse-cyan)]' : 'bg-black/30 border-white/10 text-gray-500'}`}
           >
             Cloud Connected
           </button>
           <button 
             onClick={() => updateSim('networkStatus', 'offline')}
             className={`px-6 py-2 rounded-xl border text-xs font-bold uppercase transition-all ${isOffline ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/30 border-white/10 text-gray-500'}`}
           >
             Simulate Offline Mode
           </button>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-6">
          <div className="col-span-2 glass-card rounded-2xl p-8 flex items-center justify-center relative overflow-hidden">
             {isOffline ? (
               <div className="absolute inset-0 bg-red-500/5 flex flex-col items-center justify-center z-0">
                 <CloudOff size={120} className="text-red-500/10 absolute" />
               </div>
             ) : (
               <div className="absolute inset-0 bg-[var(--color-pulse-cyan)]/5 flex flex-col items-center justify-center z-0">
                 <div className="w-full h-[1px] bg-[var(--color-pulse-cyan)]/20 absolute top-1/2 shadow-[0_0_20px_#00E5FF] animate-[pulse_2s_infinite]" />
               </div>
             )}
             
             <div className="relative z-10 flex gap-12 items-center">
                <div className="w-32 h-48 bg-black/80 border-2 border-white/20 rounded-3xl flex flex-col items-center p-4 shadow-xl">
                  <div className="w-16 h-2 bg-gray-800 rounded-full mb-6" />
                  <Shield size={32} className="text-[#c084fc] mb-2" />
                  <span className="text-[10px] font-mono text-white text-center">Local Edge<br/>NPU Core</span>
                  <div className="mt-auto w-full flex justify-between px-2 text-[8px] text-gray-500">
                    <span>RAM: 4GB</span>
                    <span>Load: 80%</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="w-32 h-[2px] bg-gradient-to-r from-[#c084fc] to-gray-600 relative overflow-hidden">
                    {!isOffline && <div className="absolute top-0 left-0 h-full w-1/3 bg-white animate-[slide_1s_infinite] opacity-50" />}
                  </div>
                  {isOffline ? <WifiOff size={16} className="text-red-400" /> : <span className="text-[10px] text-gray-400 font-mono">Syncing...</span>}
                </div>

                <div className={`w-32 h-48 bg-black/80 border-2 rounded-3xl flex flex-col items-center p-4 shadow-xl transition-all ${isOffline ? 'border-red-900/30 opacity-30 blur-sm' : 'border-[#00E5FF]/30'}`}>
                  <Database size={32} className="text-[#00E5FF] mb-2 mt-4" />
                  <span className="text-[10px] font-mono text-white text-center">Global Cloud<br/>Brain</span>
                </div>
             </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
             <h3 className="font-mono text-sm text-[#c084fc]">Offline Capabilities</h3>
             <ul className="space-y-3 text-xs text-gray-300 font-mono">
               <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[var(--color-pulse-green)]" /> Biometric Ingestion</li>
               <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[var(--color-pulse-green)]" /> Anomaly Detection (CNN)</li>
               <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[var(--color-pulse-green)]" /> Local Risk Scoring</li>
               <li className={`flex items-center gap-2 ${isOffline ? 'text-red-400' : ''}`}><Lock size={14} className={isOffline ? "text-red-400" : "text-[var(--color-pulse-green)]"} /> LLM Report Gen</li>
             </ul>
             <div className="mt-auto p-3 bg-black/40 border border-white/5 rounded-lg text-[10px] text-gray-400">
               When offline, ADEO falls back to smaller quantized models and delays global syncing until connection is restored.
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === '14_explain') {
    const features = [
      { name: 'HR Trend', importance: 85, color: '#00E5FF' },
      { name: 'Sleep Deficit', importance: 70, color: '#c084fc' },
      { name: 'Stress Index', importance: simState.stressMode ? 95 : 40, color: '#ef4444' },
      { name: 'Workout Strain', importance: simState.workoutMode ? 88 : 20, color: '#FF9A3C' },
      { name: 'SpO2 Deviation', importance: 15, color: '#39FF6A' },
    ].sort((a,b) => b.importance - a.importance);

    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <HelpCircle className="text-[var(--color-pulse-green)]" /> Explainable AI (XAI) Panel
        </h2>
        <div className="grid grid-cols-2 gap-8 flex-1">
          <div className="glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-mono text-sm text-[var(--color-pulse-green)] mb-6 flex items-center gap-2">
              <BarChart3 size={16} /> Feature Importance
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={features} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'white', fontSize: 10, fontFamily: 'monospace' }} width={100} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #39FF6A' }} />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]} isAnimationActive={true}>
                    {features.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
             <h3 className="font-mono text-sm text-white">Why was this recommendation made?</h3>
             
             <div className="p-4 bg-[var(--color-pulse-cyan)]/10 border border-[var(--color-pulse-cyan)]/20 rounded-xl">
               <span className="text-[10px] text-[var(--color-pulse-cyan)] font-mono uppercase block mb-2">Primary Driver</span>
               <p className="text-sm text-gray-200">The most influential factor in current predictions is the <strong className="text-white">"{features[0].name}"</strong>, accounting for {features[0].importance}% of the model's decision weight.</p>
             </div>

             <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
               <span className="text-[10px] text-gray-500 font-mono uppercase block mb-2">Confidence Level</span>
               <div className="flex items-center gap-3">
                 <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-[var(--color-pulse-green)]" style={{ width: '92%' }} />
                 </div>
                 <span className="font-mono text-sm text-[var(--color-pulse-green)]">92.4%</span>
               </div>
             </div>

             <div className="mt-auto flex items-center gap-2 text-[10px] font-mono text-gray-500 bg-black/20 p-2 rounded-lg border border-white/5">
               <Shield size={12} className="text-[#c084fc]" />
               Model decisions audited by ADEO Ethics Layer
             </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
