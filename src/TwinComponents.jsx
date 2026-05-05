import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const C = { cyan:'#00E5FF', green:'#39FF6A', amber:'#FF9A3C', purple:'#c084fc', red:'#f87171', bg:'#080C14' };

/* ── Confidence Ring ── */
export function ConfidenceRing({ score = 82, level = 'HIGH' }) {
  const r = 42, circ = 2 * Math.PI * r;
  const col = score >= 75 ? C.green : score >= 50 ? C.amber : C.red;
  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
        <circle cx="55" cy="55" r={r} fill="none" stroke={col} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)}
          strokeLinecap="round" transform="rotate(-90 55 55)"
          style={{transition:'stroke-dashoffset 1s ease'}}/>
        <text x="55" y="51" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="monospace">{score}</text>
        <text x="55" y="65" textAnchor="middle" fill={col} fontSize="9" fontFamily="monospace">CONFIDENCE</text>
      </svg>
      <span className="text-[10px] font-mono mt-1" style={{color:col}}>{level}</span>
    </div>
  );
}

/* ── Baseline Bar ── */
export function BaselineBar({ label, current, baseline, optimal, unit, lowerBetter }) {
  const maxVal = Math.max(current, baseline, optimal) * 1.15;
  const pct = v => Math.min(100, (v / maxVal) * 100);
  const good = lowerBetter ? current <= optimal : current >= optimal * 0.85;
  const col = good ? C.green : C.amber;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-mono">baseline {baseline}{unit}</span>
          <span className="text-sm font-bold font-mono" style={{color:col}}>{current}{unit}</span>
        </div>
      </div>
      <div className="relative h-3 bg-black/40 rounded-full overflow-hidden">
        <div className="absolute h-full rounded-full transition-all duration-1000" style={{width:`${pct(current)}%`, backgroundColor:col+'99'}}/>
        <div className="absolute h-full w-0.5 bg-white/30" style={{left:`${pct(baseline)}%`}}/>
        <div className="absolute h-full w-0.5" style={{left:`${pct(optimal)}%`, backgroundColor:C.cyan}}/>
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-gray-600 font-mono">0</span>
        <span className="text-[9px] font-mono" style={{color:C.cyan}}>● optimal {optimal}{unit}</span>
      </div>
    </div>
  );
}

/* ── Radar Comparison ── */
export function RadarComparison({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} margin={{top:10,right:20,bottom:10,left:20}}>
        <PolarGrid stroke="rgba(255,255,255,0.08)"/>
        <PolarAngleAxis dataKey="dimension" tick={{fill:'#9ca3af',fontSize:10,fontFamily:'monospace'}}/>
        <Radar name="Optimal" dataKey="optimal" stroke={C.cyan} fill={C.cyan} fillOpacity={0.08} strokeWidth={1} strokeDasharray="4 2"/>
        <Radar name="Current" dataKey="current" stroke={C.green} fill={C.green} fillOpacity={0.15} strokeWidth={2}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* ── Timeline Area Chart ── */
export function TimelineChart({ data, optimal }) {
  const merged = data.map((d,i) => ({...d, optimalReadiness: optimal?.[i]?.readiness ?? 90}));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={merged} margin={{top:5,right:10,left:-20,bottom:0}}>
        <defs>
          <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.cyan} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={C.cyan} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.green} stopOpacity={0.15}/>
            <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
        <XAxis dataKey="label" tick={{fill:'#6b7280',fontSize:9,fontFamily:'monospace'}} interval={3}/>
        <YAxis domain={[0,100]} tick={{fill:'#6b7280',fontSize:9}} width={30}/>
        <Tooltip contentStyle={{background:'#0f172a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:11}}
          labelStyle={{color:'#9ca3af'}} itemStyle={{color:'white'}}/>
        <Area type="monotone" dataKey="optimalReadiness" stroke={C.cyan} strokeWidth={1}
          strokeDasharray="4 2" fill="url(#tg2)" name="Optimal"/>
        <Area type="monotone" dataKey="readiness" stroke={C.green} strokeWidth={2} fill="url(#tg1)" name="Predicted"/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Delta Card ── */
export function DeltaCard({ label, current, predicted, delta, unit='', icon }) {
  const positive = delta >= 0;
  const col = positive ? C.green : C.red;
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10" style={{backgroundColor:col}}/>
      <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold font-mono text-white">{predicted}{unit}</span>
        <span className="text-sm font-mono mb-1" style={{color:col}}>
          {positive?'+':''}{delta}{unit}
        </span>
      </div>
      <div className="text-[10px] text-gray-500 font-mono">was {current}{unit}</div>
      <div className="absolute bottom-2 right-3 text-lg">{icon}</div>
    </div>
  );
}

/* ── Intervention Bar ── */
export function InterventionBar({ name, impact, rank }) {
  const col = impact >= 12 ? C.green : impact >= 8 ? C.cyan : C.amber;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] text-gray-600 font-mono w-4">{rank}</span>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-white font-medium">{name}</span>
          <span className="text-xs font-mono font-bold" style={{color:col}}>+{impact}%</span>
        </div>
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.min(100,impact*6)}%`,backgroundColor:col}}/>
        </div>
      </div>
    </div>
  );
}

/* ── Scenario Pill ── */
export function ScenarioPill({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider transition-all border"
      style={active
        ? {backgroundColor:`${color}22`,borderColor:`${color}60`,color:color}
        : {backgroundColor:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)',color:'#6b7280'}}>
      {label}
    </button>
  );
}

/* ── Section Header ── */
export function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{title}</span>
      {badge && <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase" style={{backgroundColor:`${C.cyan}15`,color:C.cyan,border:`1px solid ${C.cyan}30`}}>{badge}</span>}
      <div className="flex-1 h-px bg-white/5"/>
    </div>
  );
}
