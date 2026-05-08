/**
 * MultiSignalChart
 * Combined overlay visualization for HR + HRV + Activity Intensity.
 */
import { useMemo, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SectionHeader } from './VitalsComponents';
import { BarChart2 } from 'lucide-react';

const SIGNALS = [
  { id: 'hr', label: 'HR', color: 'var(--color-pulse-cyan)', unit: 'bpm' },
  { id: 'hrv', label: 'HRV', color: 'var(--color-pulse-green)', unit: 'ms' },
  { id: 'intensity', label: 'Intensity', color: '#fbbf24', unit: '%' },
];

const MultiTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 text-xs font-mono border border-white/10 min-w-[150px]">
      <div className="text-gray-400 mb-2 text-[9px] uppercase">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 items-center mb-0.5">
          <span className="text-[10px]" style={{ color: p.color }}>{p.name.toUpperCase()}</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
};

export default function MultiSignalChart({ hrHistory, hrvHistory, intensityHistory, timeWindow }) {
  const [activeSignals, setActiveSignals] = useState(['hr', 'hrv', 'intensity']);
  const data = useMemo(() => {
    const len = Math.min(timeWindow, hrHistory.length);
    return Array.from({ length: len }, (_, i) => {
      const idx = hrHistory.length - len + i;
      return { label: i === len - 1 ? 'Now' : `-${len - 1 - i}s`, hr: hrHistory[idx], hrv: hrvHistory[idx], intensity: intensityHistory[idx] };
    });
  }, [hrHistory, hrvHistory, intensityHistory, timeWindow]);

  const toggleSignal = (id) => {
    setActiveSignals(prev => prev.includes(id) ? prev.length > 1 ? prev.filter(s => s !== id) : prev : [...prev, id]);
  };

  return (
    <div className="glass-card rounded-3xl p-5 relative overflow-hidden vitals-slide-up" style={{ animationDelay: '0.3s' }}>
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: 'linear-gradient(90deg, var(--color-pulse-cyan), var(--color-pulse-green), #fbbf24, transparent)' }} />
      <div className="flex justify-between items-start mb-4">
        <SectionHeader icon={BarChart2} title="Multi-Signal View" subtitle="Overlay all biometric channels" color="var(--color-pulse-cyan)" />
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        {SIGNALS.map(s => (
          <button key={s.id} onClick={() => toggleSignal(s.id)} className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold font-mono uppercase transition-all" style={{ color: activeSignals.includes(s.id) ? s.color : '#4b5563', borderColor: activeSignals.includes(s.id) ? `${s.color}40` : 'rgba(255,255,255,0.08)', backgroundColor: activeSignals.includes(s.id) ? `${s.color}12` : 'transparent' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color, opacity: activeSignals.includes(s.id) ? 1 : 0.3 }} />{s.label}
          </button>
        ))}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hrGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-pulse-cyan)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-pulse-cyan)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis yAxisId="hr" domain={['auto', 'auto']} hide />
            <YAxis yAxisId="hrv" domain={['auto', 'auto']} hide orientation="right" />
            <Tooltip content={<MultiTooltip />} />
            {activeSignals.includes('hr') && <Area yAxisId="hr" type="monotone" dataKey="hr" name="HR" stroke="var(--color-pulse-cyan)" strokeWidth={2.5} fill="url(#hrGrad2)" fillOpacity={1} dot={false} isAnimationActive={false} />}
            {activeSignals.includes('hrv') && <Line yAxisId="hr" type="monotone" dataKey="hrv" name="HRV" stroke="var(--color-pulse-green)" strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="0" />}
            {activeSignals.includes('intensity') && <Line yAxisId="hrv" type="monotone" dataKey="intensity" name="Intensity" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="5 3" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
        <div className="flex gap-4">
          {SIGNALS.map(s => (
            <span key={s.id} className="flex items-center gap-1.5 text-[9px] font-mono uppercase transition-all" style={{ color: activeSignals.includes(s.id) ? s.color : '#4b5563' }}>
              <span className="w-2 h-px inline-block" style={{ backgroundColor: s.color, opacity: activeSignals.includes(s.id) ? 1 : 0.3 }} />{s.label} ({s.unit})
            </span>
          ))}
        </div>
        <span className="text-[9px] font-mono text-gray-600">Click to toggle</span>
      </div>
    </div>
  );
}
