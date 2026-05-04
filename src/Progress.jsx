import React from 'react';
import { Trophy, Target, TrendingUp, Award, Zap } from 'lucide-react';

const ProgressBar = ({ progress, color }) => (
  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden shadow-inner">
    <div 
      className="h-full rounded-full transition-all duration-1000 ease-out" 
      style={{ width: `${Math.min(100, progress)}%`, backgroundColor: color }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
    </div>
  </div>
);

const Badge = ({ icon: Icon, label, earned, color }) => (
  <div className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${earned ? 'glass-card border-white/10' : 'bg-black/20 border-white/5 opacity-40 grayscale'}`}>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${earned ? 'bg-white/10' : 'bg-white/5'}`} style={{ color: earned ? color : '#4b5563' }}>
      <Icon size={24} />
    </div>
    <span className="text-[10px] font-bold text-center uppercase tracking-tight text-white">{label}</span>
  </div>
);

export default function Progress({ goals, rewards }) {
  // Fallback mock data if not provided
  const activeGoals = goals?.active_goals || [
    { category: 'step_count', target: 10000, current: 7240, unit: 'steps', progress_pct: 72 },
    { category: 'sleep_duration', target: 8, current: 6.5, unit: 'hrs', progress_pct: 81 }
  ];

  const badges = [
    { id: 'goal_getter', label: 'Goal Getter', icon: Target, color: 'var(--color-pulse-cyan)', earned: rewards?.badges?.includes('Goal Getter') },
    { id: 'streak_king', label: 'Streak King', icon: TrendingUp, color: 'var(--color-pulse-green)', earned: rewards?.badges?.includes('Consistency King') },
    { id: 'early_bird', label: 'Early Bird', icon: Award, color: 'var(--color-pulse-amber)', earned: false },
    { id: 'data_sage', label: 'Data Sage', icon: Trophy, color: '#c084fc', earned: true }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Progress</h1>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 uppercase font-mono">Current Level</span>
            <span className="text-lg font-bold text-[var(--color-pulse-cyan)] font-mono">LVL {rewards?.level || 1}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[var(--color-pulse-cyan)]/20 flex items-center justify-center border border-[var(--color-pulse-cyan)]/30">
            <Trophy className="text-[var(--color-pulse-cyan)]" size={20} />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-5 border-l-4 border-[var(--color-pulse-cyan)]">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Total Points</span>
          <div className="text-3xl font-bold text-white mt-1 font-mono">{rewards?.points || 0}</div>
        </div>
        <div className="glass-card rounded-2xl p-5 border-l-4 border-[var(--color-pulse-green)]">
          <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Active Streak</span>
          <div className="text-3xl font-bold text-white mt-1 font-mono">{rewards?.streak_days || 0} Days</div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="mb-8">
        <h2 className="text-xs text-[var(--color-pulse-cyan)] uppercase tracking-widest mb-4 font-mono">Active Challenges</h2>
        <div className="space-y-4">
          {activeGoals.map((goal, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-white/5">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="text-white font-bold capitalize">{goal.category.replace('_', ' ')}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Target: {goal.target} {goal.unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-bold text-white">{goal.current}</span>
                  <span className="text-xs text-gray-500 ml-1">{goal.unit}</span>
                </div>
              </div>
              <ProgressBar progress={goal.progress_pct} color={i % 2 === 0 ? 'var(--color-pulse-cyan)' : 'var(--color-pulse-green)'} />
              <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
                <span>{goal.progress_pct}% Completed</span>
                {goal.progress_pct >= 100 && <span className="text-[var(--color-pulse-green)]">GOAL MET!</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trophy Room */}
      <div className="mb-8">
        <h2 className="text-xs text-[var(--color-pulse-cyan)] uppercase tracking-widest mb-4 font-mono">Trophy Room</h2>
        <div className="grid grid-cols-4 gap-3">
          {badges.map(badge => (
            <Badge key={badge.id} {...badge} />
          ))}
        </div>
      </div>
    </div>
  );
}
