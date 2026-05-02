import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const signalData = {
  hr: [
    { day: 'Mon', value: 71 }, { day: 'Tue', value: 68 }, { day: 'Wed', value: 72 },
    { day: 'Thu', value: 75 }, { day: 'Fri', value: 70 }, { day: 'Sat', value: 69 }, { day: 'Sun', value: 73 }
  ],
  hrv: [
    { day: 'Mon', value: 48 }, { day: 'Tue', value: 55 }, { day: 'Wed', value: 52 },
    { day: 'Thu', value: 45 }, { day: 'Fri', value: 50 }, { day: 'Sat', value: 58 }, { day: 'Sun', value: 54 }
  ],
  sleep: [
    { day: 'Mon', value: 85 }, { day: 'Tue', value: 78 }, { day: 'Wed', value: 82 },
    { day: 'Thu', value: 70 }, { day: 'Fri', value: 88 }, { day: 'Sat', value: 92 }, { day: 'Sun', value: 81 }
  ],
  activity: [
    { day: 'Mon', value: 45 }, { day: 'Tue', value: 65 }, { day: 'Wed', value: 80 },
    { day: 'Thu', value: 55 }, { day: 'Fri', value: 70 }, { day: 'Sat', value: 90 }, { day: 'Sun', value: 85 }
  ]
};

const signalColors = {
  hr: 'var(--color-pulse-cyan)',
  hrv: 'var(--color-pulse-green)',
  sleep: 'var(--color-pulse-amber)',
  activity: '#c084fc'
};

export default function Signals() {
  const [activeSignal, setActiveSignal] = useState('hr');
  const tabs = [
    { id: 'hr', label: 'HR' },
    { id: 'hrv', label: 'HRV' },
    { id: 'sleep', label: 'Sleep' },
    { id: 'activity', label: 'Activity' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Signals</h1>
      </div>

      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl glass-card border-none shadow-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSignal(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeSignal === tab.id ? "bg-white/10 text-white shadow" : "text-gray-400 hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4 md:p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 capitalize text-white">{activeSignal} - 7 Day Trend</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={signalData[activeSignal]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`color-${activeSignal}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={signalColors[activeSignal]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={signalColors[activeSignal]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(8,12,20,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                itemStyle={{ color: signalColors[activeSignal], fontWeight: 'bold' }}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={signalColors[activeSignal]} 
                fillOpacity={1} 
                fill={`url(#color-${activeSignal})`} 
                strokeWidth={3} 
                activeDot={{ r: 6, fill: signalColors[activeSignal], stroke: '#080C14', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {activeSignal === 'sleep' && (
        <div className="glass-card rounded-2xl p-5 md:p-6">
          <h3 className="text-sm text-gray-400 mb-4 font-medium uppercase tracking-widest">Last Night's Sleep Stages</h3>
          <div className="flex w-full h-8 rounded-full overflow-hidden mb-4 shadow-inner bg-black/20">
            <div className="bg-purple-500 w-[22%] transition-all duration-1000" title="REM (22%)"></div>
            <div className="bg-blue-500 w-[18%] transition-all duration-1000" title="Deep (18%)"></div>
            <div className="bg-teal-400 w-[45%] transition-all duration-1000" title="Light (45%)"></div>
            <div className="bg-orange-400 w-[15%] transition-all duration-1000" title="Awake (15%)"></div>
          </div>
          <div className="flex justify-between text-[10px] md:text-xs text-gray-300 font-mono flex-wrap gap-2">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.5)]"></span> REM 22%</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span> Deep 18%</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_5px_rgba(45,212,191,0.5)]"></span> Light 45%</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_5px_rgba(251,146,60,0.5)]"></span> Awake 15%</div>
          </div>
        </div>
      )}
    </div>
  );
}
