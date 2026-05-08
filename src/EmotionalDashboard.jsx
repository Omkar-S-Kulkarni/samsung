import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Brain, Heart, Activity, Wind, Zap, RefreshCw, ChevronRight,
  Smile, Frown, Meh, AlertTriangle, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const API = 'http://localhost:8000';
const C = { cyan: '#00E5FF', green: '#39FF6A', amber: '#FF9A3C', red: '#f87171', purple: '#c084fc' };

const STATE_CONFIG = {
  stressed:  { gradient: ['#f87171', '#dc2626'], icon: Frown, bg: '#f8717110' },
  anxious:   { gradient: ['#FF9A3C', '#d97706'], icon: Meh,   bg: '#FF9A3C10' },
  fatigued:  { gradient: ['#fbbf24', '#d97706'], icon: Meh,   bg: '#fbbf2410' },
  energized: { gradient: ['#39FF6A', '#22c55e'], icon: Smile, bg: '#39FF6A10' },
  calm:      { gradient: ['#00E5FF', '#0ea5e9'], icon: Smile, bg: '#00E5FF10' },
  neutral:   { gradient: ['#94a3b8', '#64748b'], icon: Meh,   bg: '#94a3b810' },
};

/* ── Custom Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl p-3 border border-white/10 text-xs font-mono" style={{ background: '#0f172a' }}>
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

/* ── Stress Gauge ── */
const StressGauge = ({ level, color }) => {
  const angle = (level / 100) * 180; // 0-180 degrees
  return (
    <div className="flex flex-col items-center relative">
      <svg width="200" height="110" viewBox="0 0 200 110">
        {/* Background arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
        {/* Filled arc */}
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(level / 100) * 251.3} 251.3`}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color}40)` }} />
        {/* Needle */}
        <line x1="100" y1="100" x2={100 + 55 * Math.cos(Math.PI - (angle * Math.PI / 180))} y2={100 - 55 * Math.sin((angle * Math.PI / 180))}
          stroke="white" strokeWidth="2" strokeLinecap="round" style={{ transition: 'all 1s ease' }} />
        <circle cx="100" cy="100" r="4" fill="white" />
        {/* Labels */}
        <text x="20" y="108" fill="#4b5563" fontSize="8" fontFamily="monospace">LOW</text>
        <text x="165" y="108" fill="#4b5563" fontSize="8" fontFamily="monospace">HIGH</text>
      </svg>
      <div className="text-center -mt-2">
        <span className="text-4xl font-bold font-mono text-white">{Math.round(level)}</span>
        <span className="text-xs text-gray-500 ml-1">/100</span>
      </div>
    </div>
  );
};

/* ── Metric Ring ── */
const MetricRing = ({ value, label, color, size = 80, icon: Icon }) => {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {Icon ? <Icon size={16} style={{ color }} /> : <span className="text-sm font-bold font-mono text-white">{Math.round(value)}</span>}
        </div>
      </div>
      <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">{label}</span>
    </div>
  );
};

/* ── Insight Card ── */
const InsightCard = ({ insight }) => {
  const colors = {
    warning: { bg: '#f8717112', border: '#f8717130', icon: AlertTriangle, color: C.red },
    info:    { bg: '#00E5FF08', border: '#00E5FF20', icon: Info,          color: C.cyan },
    positive:{ bg: '#39FF6A08', border: '#39FF6A20', icon: ArrowUpRight,  color: C.green },
  };
  const cfg = colors[insight.type] || colors.info;
  return (
    <div className="p-4 rounded-2xl flex gap-3 transition-all vitals-slide-up" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex-shrink-0 p-2 rounded-xl h-fit" style={{ backgroundColor: `${cfg.color}15` }}>
        <cfg.icon size={16} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white mb-1">{insight.title}</h4>
        <p className="text-xs text-gray-400 leading-relaxed">{insight.text}</p>
      </div>
    </div>
  );
};

/* ── Action Card ── */
const ActionCard = ({ action }) => {
  const impactColors = { high: C.green, medium: C.cyan, low: C.amber };
  const col = impactColors[action.impact] || C.cyan;
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.03] transition-all cursor-pointer group vitals-slide-up">
      <div className="text-2xl flex-shrink-0">{action.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-white">{action.action}</h4>
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold font-mono uppercase" style={{ backgroundColor: `${col}15`, color: col, border: `1px solid ${col}30` }}>
            {action.impact}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{action.description}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] font-mono font-bold" style={{ color: col }}>{action.duration}</span>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
      </div>
    </div>
  );
};


/* ── Default emotional data ── */
const DEFAULT_EMOTIONAL = {
  emotional_state: 'calm', state_emoji: '😌', state_color: C.cyan,
  stress_level: 35, readiness: 78, fatigue: 22, resilience: 74,
  mood_trend: Array.from({ length: 8 }, (_, i) => ({
    date: `Day ${i + 1}`, mood_score: Math.round(65 + Math.sin(i) * 12), stress_score: Math.round(32 + Math.cos(i) * 8),
  })),
  insights: [
    { type: 'positive', title: 'Good Stress Resilience', text: 'Your autonomic nervous system is handling stress well.' },
    { type: 'info', title: 'Building Resilience', text: 'Regular breathing exercises can improve stress resilience over time.' },
  ],
  actions: [
    { action: 'Mindful Walk', duration: '15 min', impact: 'medium', icon: '🚶', description: 'Light outdoor walk with focus on surroundings' },
    { action: 'Box Breathing', duration: '5 min', impact: 'high', icon: '🫁', description: '4-4-4-4 breathing pattern to activate parasympathetic response' },
    { action: 'Gratitude Journal', duration: '5 min', impact: 'medium', icon: '📝', description: 'Write 3 things you are grateful for' },
    { action: 'Cold Exposure', duration: '2 min', impact: 'high', icon: '🧊', description: 'Cold shower to boost endorphins and reduce inflammation' },
  ],
  last_updated: '--:--:--',
};

export default function EmotionalDashboard({ user_id = 'react_user_1' }) {
  const [data, setData] = useState(DEFAULT_EMOTIONAL);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API}/emotional/${user_id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Use defaults already set
    }
  }, [user_id]);

  useEffect(() => { fetchState(); const id = setInterval(fetchState, 15000); return () => clearInterval(id); }, [fetchState]);

  const stateConf = STATE_CONFIG[data.emotional_state] || STATE_CONFIG.neutral;
  const StateIcon = stateConf.icon;

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar w-full max-w-5xl mx-auto space-y-5">

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center pt-2 vitals-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono uppercase flex items-center gap-2">
            <Brain className="text-[var(--color-pulse-cyan)]" /> Emotional State
          </h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">
            Physiological emotion mapping · {data.last_updated}
          </p>
        </div>
        <button onClick={fetchState} className="p-2 rounded-full hover:bg-white/5 transition-all text-gray-400 hover:text-white">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── HERO: CURRENT STATE ── */}
      <div className="glass-card rounded-3xl p-8 relative overflow-hidden vitals-slide-up">
        {/* Background glow */}
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-10" style={{ backgroundColor: data.state_color, filter: 'blur(50px)' }} />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full opacity-5" style={{ backgroundColor: data.state_color, filter: 'blur(40px)' }} />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Emotion Display */}
          <div className="flex flex-col items-center text-center">
            <div className="text-7xl mb-3" style={{ filter: `drop-shadow(0 0 20px ${data.state_color}30)` }}>
              {data.state_emoji}
            </div>
            <h2 className="text-3xl font-bold font-mono text-white uppercase tracking-wider">{data.emotional_state}</h2>
            <div className="flex items-center gap-1 mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: `${data.state_color}15`, border: `1px solid ${data.state_color}30` }}>
              <StateIcon size={12} style={{ color: data.state_color }} />
              <span className="text-[10px] font-mono font-bold uppercase" style={{ color: data.state_color }}>
                Current State
              </span>
            </div>
          </div>

          {/* Metric Rings */}
          <div className="flex-1 flex items-center justify-center gap-6">
            <MetricRing value={data.readiness} label="Readiness" color={C.cyan} icon={Activity} />
            <MetricRing value={100 - data.fatigue} label="Recovery" color={C.green} icon={Heart} />
            <MetricRing value={data.resilience} label="Resilience" color={C.purple} icon={Wind} />
          </div>
        </div>
      </div>

      {/* ── STRESS GAUGE + MOOD TREND ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Stress Gauge */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center vitals-slide-up">
          <div className="flex items-center gap-2 mb-4 self-start">
            <Zap size={14} style={{ color: C.amber }} />
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">Stress Level</span>
          </div>
          <StressGauge level={data.stress_level} color={data.state_color} />
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.green }} />
              <span className="text-[9px] text-gray-500 font-mono">0-30 Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.amber }} />
              <span className="text-[9px] text-gray-500 font-mono">30-60 Moderate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: C.red }} />
              <span className="text-[9px] text-gray-500 font-mono">60+ High</span>
            </div>
          </div>
        </div>

        {/* Mood Trend Chart */}
        <div className="glass-card rounded-2xl p-6 vitals-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} style={{ color: C.cyan }} />
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest font-bold">7-Day Mood Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.mood_trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.red} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'monospace' }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="mood_score" stroke={C.green} strokeWidth={2} fill="url(#moodGrad)" name="Mood" />
              <Area type="monotone" dataKey="stress_score" stroke={C.red} strokeWidth={1.5} fill="url(#stressGrad)" name="Stress" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1"><div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: C.green }} /><span className="text-[9px] text-gray-500 font-mono">Mood</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-0.5 rounded-full border-dashed border-t" style={{ borderColor: C.red }} /><span className="text-[9px] text-gray-500 font-mono">Stress</span></div>
          </div>
        </div>
      </div>

      {/* ── EMOTIONAL INSIGHTS ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest font-bold">Emotional Insights</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="space-y-3">
          {data.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
        </div>
      </div>

      {/* ── SUGGESTED WELLNESS ACTIONS ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest font-bold">Suggested Wellness Actions</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="space-y-3">
          {data.actions.map((act, i) => <ActionCard key={i} action={act} />)}
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}
