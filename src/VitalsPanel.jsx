import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Heart, Activity, Zap, Footprints, Droplets, Info, Wifi, WifiOff, AlertCircle } from 'lucide-react';

const VitalsPanel = ({ hr, hrData, steps, spO2 = 98, hrv = 52, activityIntensity = 45 }) => {
  const [activeView, setActiveView] = useState('overview'); // overview, detailed, combined
  const [signalQuality, setSignalQuality] = useState(100);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Mock data for HRV and Intensity if not provided in real-time stream
  const mockHrvData = Array.from({ length: 20 }, (_, i) => ({ 
    time: i, 
    value: hrv + Math.sin(i / 2) * 5 + Math.random() * 3 
  }));
  
  const mockIntensityData = Array.from({ length: 20 }, (_, i) => ({ 
    time: i, 
    value: activityIntensity + Math.cos(i / 3) * 10 + Math.random() * 5 
  }));

  const combinedData = hrData.map((d, i) => ({
    time: i,
    hr: d.value,
    hrv: mockHrvData[i]?.value || 50,
    intensity: mockIntensityData[i]?.value || 40
  }));

  useEffect(() => {
    // Simulate slight signal quality fluctuations
    const interval = setInterval(() => {
      setSignalQuality(prev => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.min(100, Math.max(90, next));
      });
      setLastUpdate(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-6xl mx-auto space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-mono uppercase">Vitals Intelligence</h1>
          <p className="text-xs text-gray-500 font-mono tracking-widest mt-1">
            REAL-TIME SENSOR FUSION ENGINE • {formatTime(lastUpdate)}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Signal Quality</span>
            <span className="text-sm font-mono font-bold text-[var(--color-pulse-green)]">{signalQuality}%</span>
          </div>
          {signalQuality > 95 ? (
            <Wifi size={20} className="text-[var(--color-pulse-green)]" />
          ) : (
            <WifiOff size={20} className="text-amber-400" />
          )}
        </div>
      </div>

      {/* Main Real-time Graph (Combined/Large) */}
      <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-pulse-cyan)] to-transparent" />
        
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-pulse-cyan)]/10 rounded-xl">
              <Activity className="text-[var(--color-pulse-cyan)]" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Live Multi-Signal Stream</h3>
              <span className="text-[10px] text-gray-500 font-mono">Syncing 3 biometric channels</span>
            </div>
          </div>
          
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {['overview', 'combined'].map(view => (
              <button 
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeView === view ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeView === 'combined' ? combinedData : hrData}>
              <defs>
                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-pulse-cyan)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-pulse-cyan)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorHrv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-pulse-green)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--color-pulse-green)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(8,12,20,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey={activeView === 'combined' ? 'hr' : 'value'} 
                stroke="var(--color-pulse-cyan)" 
                fillOpacity={1} 
                fill="url(#colorHr)" 
                strokeWidth={3}
                isAnimationActive={false}
              />
              {activeView === 'combined' && (
                <>
                  <Area 
                    type="monotone" 
                    dataKey="hrv" 
                    stroke="var(--color-pulse-green)" 
                    fillOpacity={1} 
                    fill="url(#colorHrv)" 
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="intensity" 
                    stroke="#c084fc" 
                    strokeWidth={2} 
                    dot={false}
                    strokeDasharray="5 5"
                    isAnimationActive={false}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex justify-between items-center text-[10px] font-mono text-gray-500 border-t border-white/5 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-pulse-cyan)]"></span> HR</div>
            {activeView === 'combined' && (
              <>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-pulse-green)]"></span> HRV</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#c084fc]"></span> Intensity</div>
              </>
            )}
          </div>
          <span>Latency: 12ms</span>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className="glass-card rounded-2xl p-4 border-b-2 border-[var(--color-pulse-cyan)]">
          <div className="flex justify-between items-start mb-4">
            <Heart size={20} className="text-[var(--color-pulse-cyan)] animate-pulse" />
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-400 font-mono">Live</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white font-mono">{hr}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold">bpm</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            Stable Range: <span className="text-gray-200">60 - 85</span>
          </div>
        </div>

        {/* HRV */}
        <div className="glass-card rounded-2xl p-4 border-b-2 border-[var(--color-pulse-green)]">
          <div className="flex justify-between items-start mb-4">
            <Activity size={20} className="text-[var(--color-pulse-green)]" />
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-400 font-mono">Variability</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white font-mono">{hrv}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold">ms</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            Current Stress: <span className="text-[var(--color-pulse-green)]">Low</span>
          </div>
        </div>

        {/* SpO2 */}
        <div className="glass-card rounded-2xl p-4 border-b-2 border-[var(--color-pulse-amber)]">
          <div className="flex justify-between items-start mb-4">
            <Droplets size={20} className="text-[var(--color-pulse-amber)]" />
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-400 font-mono">O2 Sat</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white font-mono">{spO2}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold">%</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            Respiratory: <span className="text-gray-200">Optimal</span>
          </div>
        </div>

        {/* Steps */}
        <div className="glass-card rounded-2xl p-4 border-b-2 border-purple-500">
          <div className="flex justify-between items-start mb-4">
            <Footprints size={20} className="text-purple-500" />
            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-400 font-mono">Daily</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white font-mono">{steps.toLocaleString()}</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold">steps</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400">
            Goal: <span className="text-gray-200">60% complete</span>
          </div>
        </div>
      </div>

      {/* Activity Intensity Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card rounded-3xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-amber-400" />
              <h3 className="font-bold text-white uppercase tracking-tight">Activity Intensity</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-500 uppercase">Load: {activityIntensity}%</span>
          </div>
          
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockIntensityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Area type="stepAfter" dataKey="value" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={20} className="text-[var(--color-pulse-cyan)]" />
            <h3 className="font-bold text-white uppercase tracking-tight text-sm">Neural Insights</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                <span className="text-[var(--color-pulse-cyan)] font-bold">SYNC MATCH:</span> Heart Rate and Activity Intensity are perfectly correlated. Metabolic efficiency is high.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                <span className="text-[var(--color-pulse-green)] font-bold">HRV STABILITY:</span> Parasympathetic activity is dominant. Optimal recovery state detected.
              </p>
            </div>
          </div>
          
          <button className="mt-4 w-full bg-[var(--color-pulse-cyan)]/10 hover:bg-[var(--color-pulse-cyan)]/20 text-[var(--color-pulse-cyan)] text-[10px] font-bold uppercase py-2.5 rounded-xl transition-all border border-[var(--color-pulse-cyan)]/20">
            Download Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default VitalsPanel;
