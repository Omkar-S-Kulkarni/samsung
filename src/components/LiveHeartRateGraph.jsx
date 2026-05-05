/**
 * LiveHeartRateGraph
 * Real-time streaming heart rate chart with peak detection and anomaly highlights.
 */
import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Dot
} from 'recharts';
import { motion } from 'framer-motion';
import { SectionHeader, TimeWindowPicker, LiveBadge } from './VitalsComponents';
import { Heart } from 'lucide-react';

/* Custom dot — rendered only at anomaly/peak points */
const PeakDot = (props) => {
  const { cx, cy, value, payload } = props;
  if (!payload.isPeak && !payload.isAnomaly) return null;
  const color = payload.isAnomaly ? '#FF4560' : '#00E5FF';
  return (
    <circle cx={cx} cy={cy} r={5} fill={color}
      stroke="#060A12" strokeWidth={2}
      style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
  );
};

/* Tooltip */
const HrTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-card rounded-xl p-3 text-xs font-mono border border-white/10" style={{ minWidth: 120 }}>
      <div className="text-gray-400 mb-1">{d.label}</div>
      <div className="text-[var(--color-pulse-cyan)] font-bold text-base">{d.value} <span className="text-[10px] text-gray-500">bpm</span></div>
      {d.isPeak    && <div className="text-[10px] mt-1 text-[var(--color-pulse-cyan)]">⬆ Peak</div>}
      {d.isAnomaly && <div className="text-[10px] mt-1 text-[#FF4560]">⚠ Anomaly</div>}
    </div>
  );
};

export default function LiveHeartRateGraph({ hrHistory, timeWindow, onTimeWindowChange }) {
  const data = useMemo(() => {
    const slice = hrHistory.slice(-timeWindow);
    const vals = slice.map(v => v);
    const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
    const std  = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length || 1));
    const now  = Date.now();

    return slice.map((value, i) => {
      const isPeak    = i > 0 && i < slice.length - 1 && value > slice[i - 1] && value > slice[i + 1] && value > mean + std * 0.5;
      const isAnomaly = Math.abs(value - mean) > std * 2.2;
      const secAgo    = timeWindow - i;
      const label     = secAgo === 0 ? 'Now' : `-${secAgo}s`;
      return { value, isPeak, isAnomaly, label, i };
    });
  }, [hrHistory, timeWindow]);

  const latest    = data[data.length - 1]?.value ?? 72;
  const max       = Math.max(...data.map(d => d.value));
  const min       = Math.min(...data.map(d => d.value));
  const domainPad = 8;
  const yDomain   = [Math.max(30, min - domainPad), Math.min(200, max + domainPad)];

  const hasAnomaly = data.some(d => d.isAnomaly);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-3xl p-5 relative overflow-hidden scanline-overlay"
    >
      {/* Left accent bar */}
      <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[var(--color-pulse-cyan)] via-[var(--color-pulse-cyan)]/30 to-transparent" />

      {/* Anomaly warning glow */}
      {hasAnomaly && (
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ boxShadow: 'inset 0 0 40px rgba(255,69,96,0.06)' }} />
      )}

      <div className="flex justify-between items-start mb-5">
        <SectionHeader
          icon={Heart}
          title="Live Heart Rate"
          subtitle={`Last ${timeWindow}s  •  ${min}–${max} bpm range`}
          color="var(--color-pulse-cyan)"
          actions={
            <div className="flex items-center gap-2">
              <LiveBadge />
              <TimeWindowPicker value={timeWindow} onChange={onTimeWindowChange} />
            </div>
          }
        />
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-5">
        <motion.span
          key={latest}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.25 }}
          className="text-5xl font-bold font-mono text-white text-glow-cyan"
        >
          {latest}
        </motion.span>
        <span className="text-sm text-gray-500 font-bold uppercase">bpm</span>
        {hasAnomaly && (
          <span className="text-[10px] text-[#FF4560] border border-[#FF4560]/30 rounded-full px-2 py-0.5 ml-2 animate-pulse">
            ANOMALY
          </span>
        )}
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--color-pulse-cyan)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-pulse-cyan)" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="hrAnomalyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#FF4560" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#FF4560" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" hide tick={false} axisLine={false} tickLine={false} />
            <YAxis domain={yDomain} hide />
            <Tooltip content={<HrTooltip />} />
            {/* Normal HR zone reference lines */}
            <ReferenceLine y={100} stroke="rgba(255,154,60,0.2)" strokeDasharray="4 4" label={{ value: '100', fill: '#ff9a3c', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={60}  stroke="rgba(0,229,255,0.2)"  strokeDasharray="4 4" label={{ value: '60',  fill: '#00e5ff', fontSize: 9, position: 'right' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-pulse-cyan)"
              strokeWidth={2.5}
              fill="url(#hrGrad)"
              fillOpacity={1}
              isAnimationActive={false}
              dot={<PeakDot />}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend row */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[9px] font-mono text-gray-500 uppercase">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-pulse-cyan)]" /> HR
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF4560]" /> Anomaly
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-pulse-cyan)] opacity-40" /> Peak
          </span>
        </div>
        <span>Sampling: 1s</span>
      </div>
    </motion.div>
  );
}
