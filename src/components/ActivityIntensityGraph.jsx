/**
 * ActivityIntensityGraph
 * Visualizes activity zones with color-coded area chart.
 */
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SectionHeader, ZoneBadge, LiveBadge } from './VitalsComponents';
import { Zap } from 'lucide-react';

const ZONES = [
  { name: 'Rest', max: 15, color: '#60a5fa' },
  { name: 'Light', max: 35, color: '#34d399' },
  { name: 'Moderate', max: 60, color: '#fbbf24' },
  { name: 'High', max: 80, color: '#f87171' },
  { name: 'Peak', max: 100, color: '#e879f9' },
];

function getZoneForValue(v) {
  return ZONES.find(z => v <= z.max) || ZONES[ZONES.length - 1];
}

const IntensityTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const zone = getZoneForValue(val);
  return (
    <div className="glass-card rounded-xl p-3 text-xs font-mono border border-white/10">
      <div className="font-bold text-base" style={{ color: zone.color }}>{val?.toFixed(0)}<span className="text-[10px] text-gray-500 ml-1">%</span></div>
      <div className="text-[10px] mt-0.5" style={{ color: zone.color }}>Zone: {zone.name}</div>
    </div>
  );
};

export default function ActivityIntensityGraph({ intensityHistory, currentIntensity, activityZone }) {
  const data = useMemo(() =>
    intensityHistory.map((value, i) => ({
      value,
      zone: getZoneForValue(value),
      label: i === intensityHistory.length - 1 ? 'Now' : `-${intensityHistory.length - 1 - i}s`
    })), [intensityHistory]);

  const zoneBreaks = [15, 35, 60, 80];
  const timeInZones = useMemo(() => {
    const counts = { Rest: 0, Light: 0, Moderate: 0, High: 0, Peak: 0 };
    intensityHistory.forEach(v => { counts[getZoneForValue(v).name]++; });
    const total = intensityHistory.length || 1;
    return Object.entries(counts).map(([name, count]) => ({
      name, pct: Math.round((count / total) * 100),
      color: ZONES.find(z => z.name === name)?.color
    }));
  }, [intensityHistory]);

  return (
    <div className="glass-card rounded-3xl p-5 relative overflow-hidden vitals-slide-up" style={{ animationDelay: '0.15s' }}>
      <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[#fbbf24] via-[#fbbf24]/30 to-transparent" />
      <div className="flex justify-between items-start mb-4">
        <SectionHeader icon={Zap} title="Activity Intensity" subtitle="Zone-based movement tracking" color="#fbbf24"
          actions={<div className="flex items-center gap-2"><ZoneBadge zone={activityZone} /><LiveBadge color="#fbbf24" /></div>} />
      </div>
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-mono text-gray-500 uppercase">Load</span>
          <span key={currentIntensity} className="text-2xl font-bold font-mono vitals-pop-in" style={{ color: activityZone.color }}>
            {currentIntensity.toFixed(0)}<span className="text-xs text-gray-500 ml-1">%</span>
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-600 ease-out"
            style={{ width: `${currentIntensity}%`, background: 'linear-gradient(90deg, #60a5fa, #34d399, #fbbf24, #f87171, #e879f9)', backgroundSize: '200% 100%', backgroundPosition: `${100 - currentIntensity}% 0` }} />
        </div>
      </div>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip content={<IntensityTooltip />} />
            {zoneBreaks.map(y => (<ReferenceLine key={y} y={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />))}
            <Area type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2.5} fill="url(#intensityGrad)" fillOpacity={1} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[9px] font-mono text-gray-500 uppercase mb-2">Zone Distribution</div>
        <div className="flex gap-2 items-end h-8">
          {timeInZones.map(z => (
            <div key={z.name} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-sm transition-all duration-500" style={{ height: `${Math.max(2, z.pct * 0.3)}px`, backgroundColor: z.color, opacity: z.pct > 0 ? 1 : 0.15 }} />
              <span className="text-[8px] font-mono" style={{ color: z.color }}>{z.pct}%</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          {timeInZones.map(z => (<span key={z.name} className="flex-1 text-[8px] font-mono text-gray-600 text-center truncate">{z.name}</span>))}
        </div>
      </div>
    </div>
  );
}
