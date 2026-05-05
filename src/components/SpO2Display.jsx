/**
 * SpO2Display
 * Blood oxygen saturation display with color indicator and trend.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Droplets, Wind } from 'lucide-react';
import { ProgressRing, SectionHeader, LiveBadge, AnimatedValue } from './VitalsComponents';

function getSpO2Status(spO2) {
  if (spO2 === null || spO2 === undefined) return { label: 'Not Available', color: '#6b7280', level: 'na' };
  if (spO2 >= 95) return { label: 'Normal',   color: '#39FF6A', level: 'normal', desc: 'Optimal oxygen saturation' };
  if (spO2 >= 90) return { label: 'Low',      color: '#fbbf24', level: 'low',    desc: 'Slightly reduced — monitor closely' };
  return               { label: 'Critical',  color: '#FF4560', level: 'critical', desc: 'Seek immediate attention!' };
}

export default function SpO2Display({ spO2, spO2History = [] }) {
  const isAvailable = spO2 !== null && spO2 !== undefined;
  const status      = getSpO2Status(spO2);
  const pct         = isAvailable ? spO2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="glass-card rounded-3xl p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-0.5 h-full"
        style={{ background: `linear-gradient(to bottom, ${status.color}, transparent)` }} />

      {/* Subtle glow for critical */}
      {status.level === 'critical' && (
        <div className="absolute inset-0 rounded-3xl pointer-events-none animate-pulse"
          style={{ boxShadow: 'inset 0 0 60px rgba(255,69,96,0.08)' }} />
      )}

      <div className="flex justify-between items-start mb-4">
        <SectionHeader
          icon={Droplets}
          title="SpO₂"
          subtitle="Blood Oxygen Saturation"
          color={status.color}
          actions={isAvailable ? <LiveBadge color={status.color} /> : null}
        />
      </div>

      {isAvailable ? (
        <div className="flex items-center gap-6">
          {/* Ring with radial background */}
          <div className="relative">
            <ProgressRing value={pct} max={100} size={110} strokeWidth={8} color={status.color}
              bgColor="rgba(255,255,255,0.05)">
              <div className="flex flex-col items-center">
                <motion.span
                  key={spO2}
                  initial={{ scale: 1.15 }} animate={{ scale: 1 }}
                  className="text-2xl font-bold font-mono text-white">
                  {spO2}
                </motion.span>
                <span className="text-[10px] font-mono text-gray-400">%</span>
              </div>
            </ProgressRing>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {/* Status badge */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit"
                style={{ color: status.color, backgroundColor: `${status.color}15`, borderColor: `${status.color}30` }}>
                {status.label}
              </span>
              <span className="text-[9px] text-gray-500 font-mono">{status.desc}</span>
            </div>

            {/* Respiratory rate (estimated from SpO2 history variance) */}
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Wind size={12} style={{ color: status.color }} />
                <span className="text-[9px] font-mono text-gray-400 uppercase">Respiratory Status</span>
              </div>
              <div className="text-sm font-bold font-mono text-white">
                {status.level === 'normal' ? 'Optimal' : status.level === 'low' ? 'Reduced' : 'Impaired'}
              </div>
            </div>

            {/* Reference ranges */}
            <div className="flex gap-1.5">
              {[
                { range: '95–100%', label: 'Normal', color: '#39FF6A' },
                { range: '90–94%',  label: 'Low',    color: '#fbbf24' },
                { range: '<90%',    label: 'Critical',color: '#FF4560' },
              ].map(r => (
                <div key={r.label}
                  className="flex-1 text-center p-1.5 rounded-lg border text-[8px] font-mono"
                  style={{
                    borderColor: `${r.color}20`,
                    backgroundColor: `${r.color}08`,
                    color: r.color,
                    opacity: status.label === r.label ? 1 : 0.4
                  }}>
                  <div className="font-bold">{r.label}</div>
                  <div className="text-gray-500">{r.range}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <Droplets size={22} className="text-gray-600" />
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-500">Not Available</div>
            <div className="text-[10px] text-gray-600 font-mono mt-1">Sensor not providing SpO₂ data</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
