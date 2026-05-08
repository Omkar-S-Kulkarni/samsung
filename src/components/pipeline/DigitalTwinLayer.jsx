import React, { useState, useEffect } from 'react';
import { Lightbulb, User, ShieldCheck, Activity, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DigitalTwinLayer({ section, simState, updateSim }) {
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      if (section === '11_safety' && Math.random() > 0.7) {
        setLogs(prev => {
          const newLogs = [...prev, {
            time: new Date().toLocaleTimeString(),
            level: Math.random() > 0.9 ? 'WARN' : 'INFO',
            msg: Math.random() > 0.5 ? 'Evaluated output against constraint [HR_MAX_SAFE]' : 'Checking prompt toxicity filters... PASSED'
          }];
          return newLogs.slice(-8);
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [section]);

  if (section === '9_prediction') {
    const riskBase = simState.stressMode ? 70 : (simState.workoutMode ? 40 : 15);
    const predictionData = Array.from({ length: 24 }, (_, i) => ({
      hour: `+${i}h`,
      risk: Math.min(100, Math.max(0, riskBase + (i * (simState.stressMode ? 2 : -1)) + Math.sin(i)*5))
    }));

    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Lightbulb className="text-yellow-400" /> Predictive Forecasting Engine
        </h2>
        <div className="flex-1 glass-card rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="font-mono text-sm text-yellow-400">24-Hour Risk & Fatigue Projection</h3>
              <p className="text-xs text-gray-500 mt-1">Simulating future physiological states based on current trajectory.</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-gray-500 block">Peak Predicted Risk</span>
              <span className="text-2xl font-bold font-mono text-red-400">{Math.round(Math.max(...predictionData.map(d => d.risk)))}%</span>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictionData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="gray" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="gray" fontSize={10} fontFamily="monospace" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #ef4444' }} />
                <Area type="monotone" dataKey="risk" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  if (section === '10_twin') {
    const twinHealth = 100 - (simState.hrShift * 0.5) - (simState.stressMode ? 30 : 0) - (simState.workoutMode ? 10 : 0);
    const color = twinHealth > 70 ? 'var(--color-pulse-green)' : twinHealth > 40 ? '#FF9A3C' : '#ef4444';

    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <User className="text-[#00E5FF]" /> Digital Twin Simulation
        </h2>
        <div className="flex-1 grid grid-cols-2 gap-8">
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #00E5FF 0%, transparent 70%)' }} />
             
             <div className="relative w-48 h-64 flex flex-col items-center justify-center">
               <div className="w-16 h-20 border-2 rounded-full mb-2 flex items-center justify-center relative" style={{ borderColor: color }}>
                 <div className="w-2 h-2 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" style={{ backgroundColor: color }} />
               </div>
               <div className="w-24 h-32 border-2 rounded-3xl relative flex items-center justify-center" style={{ borderColor: color }}>
                  <Heart size={24} className="animate-pulse" color={color} />
               </div>
             </div>

             <div className="mt-6 text-center z-10">
               <span className="text-[10px] uppercase font-mono text-gray-500 block mb-1">Systemic Vitality Score</span>
               <span className="text-4xl font-bold font-mono" style={{ color }}>{Math.round(twinHealth)}%</span>
             </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex flex-col">
             <h3 className="font-mono text-sm mb-6 text-[#00E5FF]">"What-If" Interventions</h3>
             <div className="space-y-6 flex-1">
               <div>
                 <div className="flex justify-between mb-2">
                   <span className="text-xs font-mono text-gray-400">What if hydration improves?</span>
                   <span className="text-xs font-mono text-[var(--color-pulse-green)]">+15% Recovery</span>
                 </div>
                 <input type="range" min="0" max="100" defaultValue="50" className="w-full accent-[var(--color-pulse-cyan)]" />
               </div>
               <div>
                 <div className="flex justify-between mb-2">
                   <span className="text-xs font-mono text-gray-400">What if sleep decreases by 2h?</span>
                   <span className="text-xs font-mono text-red-400">-22% Readiness</span>
                 </div>
                 <input type="range" min="0" max="100" defaultValue="20" className="w-full accent-red-500" />
               </div>
               <div className="p-4 bg-[var(--color-pulse-cyan)]/10 border border-[var(--color-pulse-cyan)]/30 rounded-xl mt-auto">
                 <span className="text-[10px] font-mono text-[#00E5FF] uppercase block mb-1">Projected Outcome</span>
                 <p className="text-xs text-gray-300">If current interventions are applied, the twin model predicts a return to homeostasis within 4.2 hours.</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === '11_safety') {
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <ShieldCheck className="text-[var(--color-pulse-green)]" /> Safety & Rule Engine
        </h2>
        <div className="grid grid-cols-3 gap-6 flex-1">
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="font-mono text-sm text-[var(--color-pulse-green)]">Active Constraints</h3>
            {[
              'HR_MAX_SAFE < 185',
              'SPO2_MIN_SAFE > 92',
              'MEDICAL_DISCLAIMER_REQ',
              'PREVENT_DIAGNOSIS_OUTPUT'
            ].map(rule => (
              <div key={rule} className="flex items-center gap-2 p-2 bg-black/30 border border-white/5 rounded-lg">
                <CheckCircle2 size={14} className="text-[var(--color-pulse-green)]" />
                <span className="text-[10px] font-mono text-gray-300">{rule}</span>
              </div>
            ))}
          </div>

          <div className="col-span-2 glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-mono text-sm text-gray-400 mb-4 flex items-center gap-2">
              <Activity size={16} /> Real-time Verification Logs
            </h3>
            <div className="flex-1 bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-xs overflow-hidden flex flex-col justify-end">
              {logs.map((log, i) => (
                <div key={i} className="mb-2 flex items-start gap-3 animate-[fade-in_0.3s_ease-out]">
                  <span className="text-gray-500 shrink-0">{log.time}</span>
                  <span className={`shrink-0 w-10 ${log.level === 'WARN' ? 'text-yellow-400' : 'text-blue-400'}`}>[{log.level}]</span>
                  <span className={log.level === 'WARN' ? 'text-yellow-100' : 'text-gray-300'}>{log.msg}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center gap-2 text-gray-500">
                <ChevronRight size={14} className="animate-pulse text-[var(--color-pulse-green)]" />
                <span className="animate-pulse">Awaiting next evaluation cycle...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
