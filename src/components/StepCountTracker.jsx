/**
 * StepCountTracker
 * Real-time step counter with animated goal progress ring.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Footprints, Target } from 'lucide-react';
import { ProgressRing, SectionHeader, AnimatedValue } from './VitalsComponents';

const GOAL = 10000;

function getStepStatus(steps) {
  const pct = (steps / GOAL) * 100;
  if (pct >= 100) return { label: 'Goal Reached! 🎉', color: '#39FF6A' };
  if (pct >= 75)  return { label: 'Almost there!',    color: '#39FF6A' };
  if (pct >= 50)  return { label: 'Halfway!',          color: '#fbbf24' };
  if (pct >= 25)  return { label: 'Keep going',        color: '#fbbf24' };
  return               { label: 'Just getting started', color: '#60a5fa' };
}

function getCalorieEstimate(steps) {
  // Rough estimate: ~0.04 kcal per step
  return Math.round(steps * 0.04);
}

function getDistanceEstimate(steps) {
  // Average stride ~0.762m
  return (steps * 0.000762).toFixed(2);
}

export default function StepCountTracker({ steps }) {
  const pct    = Math.min((steps / GOAL) * 100, 100);
  const status = getStepStatus(steps);
  const remain = Math.max(0, GOAL - steps);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-3xl p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[#c084fc] via-[#c084fc]/30 to-transparent" />

      <div className="flex justify-between items-start mb-5">
        <SectionHeader
          icon={Footprints}
          title="Step Tracker"
          subtitle={`Daily goal: ${GOAL.toLocaleString()} steps`}
          color="#c084fc"
        />
        <span className="text-[10px] font-mono px-2 py-1 rounded-full border font-bold"
          style={{ color: status.color, borderColor: `${status.color}30`, backgroundColor: `${status.color}10` }}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Ring */}
        <ProgressRing value={steps} max={GOAL} size={110} strokeWidth={8} color="#c084fc">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Done</span>
            <span className="text-xl font-bold font-mono text-white">{Math.round(pct)}%</span>
          </div>
        </ProgressRing>

        {/* Stats column */}
        <div className="flex-1 flex flex-col gap-3">
          <div>
            <div className="text-[9px] font-mono text-gray-500 uppercase mb-0.5">Steps</div>
            <div className="text-3xl font-bold font-mono text-white">
              <AnimatedValue value={steps} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[9px] text-gray-500 font-mono uppercase">Remaining</div>
              <div className="text-sm font-bold font-mono mt-0.5 text-gray-200">{remain.toLocaleString()}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5">
              <div className="text-[9px] text-gray-500 font-mono uppercase">Calories</div>
              <div className="text-sm font-bold font-mono mt-0.5" style={{ color: '#fbbf24' }}>
                ~{getCalorieEstimate(steps)} kcal
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/5 col-span-2">
              <div className="text-[9px] text-gray-500 font-mono uppercase">Distance</div>
              <div className="text-sm font-bold font-mono mt-0.5" style={{ color: '#c084fc' }}>
                ~{getDistanceEstimate(steps)} km
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-1.5">
          <span>0</span>
          <span className="flex items-center gap-1"><Target size={9} /> {GOAL.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #c084fc, #e879f9)' }}
          />
        </div>
        {/* Milestone ticks */}
        <div className="flex justify-between mt-1 px-0.5">
          {[25, 50, 75, 100].map(m => (
            <div key={m} className="flex flex-col items-center gap-0.5">
              <div className="w-px h-1.5" style={{ backgroundColor: steps / GOAL * 100 >= m ? '#c084fc' : 'rgba(255,255,255,0.1)' }} />
              <span className="text-[8px] font-mono" style={{ color: steps / GOAL * 100 >= m ? '#c084fc' : '#4b5563' }}>
                {(GOAL * m / 100 / 1000).toFixed(1)}k
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
