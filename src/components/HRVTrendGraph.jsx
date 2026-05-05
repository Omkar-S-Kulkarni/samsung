/**
 * HRVTrendGraph
 * Heart Rate Variability trend with RMSSD display and improving/declining indicators.
 */
import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { motion } from 'framer-motion';
import { SectionHeader, LiveBadge } from './VitalsComponents';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const HrvTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="glass-card rounded-xl p-3 text-xs font-mono border border-white/10">
      <div className="text-[var(--color-pulse-green)] font-bold text-base">{val?.toFixed(1)} <span className="text-[10px] text-gray-500">ms</span></div>
      <div className="text-gray-500 text-[10px] mt-0.5">RMSSD</div>
    </div>
  );
};

function getTrend(history) {
  if (history.length < 6) return 'stable';
  const recent = history.slice(-6);
  const older  = history.slice(-12, -6);
  if (older.length === 0) return 'stable';
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder  = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (diff > 2) return 'improving';
  if (diff < -2) return 'declining';
  return 'stable';
}

function getHRVStatus(hrv) {
  if (hrv >= 60) return { label: 'Excellent Recovery', color: '#39FF6A' };
  if (hrv >= 45) return { label: 'Good Recovery',      color: '#39FF6A' };
  if (hrv >= 30) return { label: 'Moderate',            color: '#fbbf24' };
  return               { label: 'Low — Needs Rest',    color: '#FF4560' };
}

export default function HRVTrendGraph({ hrvHistory, currentHrv }) {
  const data = useMemo(() =>
    hrvHistory.map((v, i) => ({
      value: v,
      label: i === hrvHistory.length - 1 ? 'Now' : `-${hrvHistory.length - 1 - i}s`
    })), [hrvHistory]);

  const trend  = getTrend(hrvHistory);
  const status = getHRVStatus(currentHrv);

  const TrendIcon  = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? '#39FF6A'  : trend === 'declining' ? '#FF4560'    : '#fbbf24';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card rounded-3xl p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[var(--color-pulse-green)] via-[var(--color-pulse-green)]/30 to-transparent" />

      <div className="flex justify-between items-start mb-4">
        <SectionHeader
          icon={Activity}
          title="HRV Trend"
          subtitle="RMSSD-derived variability"
          color="var(--color-pulse-green)"
          actions={<LiveBadge color="var(--color-pulse-green)" />}
        />
      </div>

      {/* HRV value + trend */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <motion.span key={currentHrv}
            initial={{ scale: 1.1 }} animate={{ scale: 1 }}
            className="text-4xl font-bold font-mono text-white"
            style={{ textShadow: '0 0 16px rgba(57,255,106,0.5)' }}>
            {currentHrv}
          </motion.span>
          <span className="text-xs text-gray-500 font-bold uppercase ml-1.5">ms</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: status.color, backgroundColor: `${status.color}15`, borderColor: `${status.color}30` }}>
            {status.label}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: trendColor }}>
            <TrendIcon size={10} /> {trend.charAt(0).toUpperCase() + trend.slice(1)}
          </span>
        </div>
      </div>

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <filter id="hrv-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip content={<HrvTooltip />} />
            {/* Optimal range band */}
            <ReferenceLine y={60} stroke="rgba(57,255,106,0.2)" strokeDasharray="4 4" />
            <ReferenceLine y={30} stroke="rgba(255,69,96,0.2)"  strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-pulse-green)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              filter="url(#hrv-glow)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Zone indicators */}
      <div className="flex gap-3 mt-3 pt-3 border-t border-white/5">
        {[
          { label: 'Low <30ms',   color: '#FF4560' },
          { label: 'Mod 30–60ms', color: '#fbbf24' },
          { label: 'High >60ms',  color: '#39FF6A' },
        ].map(z => (
          <span key={z.label} className="flex items-center gap-1 text-[9px] font-mono text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: z.color }} />
            {z.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
