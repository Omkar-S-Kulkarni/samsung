import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, Activity, Moon, Heart, Target, Brain, ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

const API = 'http://localhost:8000';
const C = { cyan:'#00E5FF', green:'#39FF6A', amber:'#FF9A3C', red:'#f87171', purple:'#c084fc', bg:'#080C14', cardBg:'rgba(255,255,255,0.03)' };

export default function TrendsAnalytics({ user_id = 'react_user_1' }) {
  const [timeframe, setTimeframe] = useState('7d');
  const [trendData, setTrendData] = useState([]);
  const [indicators, setIndicators] = useState({});
  const [correlations, setCorrelations] = useState([]);
  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  
  // Which metric is currently selected for the main area chart
  const [activeMetric, setActiveMetric] = useState('readiness');

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch(`${API}/trends/${user_id}?timeframe=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        setTrendData(data.data || []);
        setIndicators(data.indicators || {});
      }
    } catch (err) {
      console.error("Failed to fetch trends", err);
    }
  }, [user_id, timeframe]);

  const fetchCorrelations = useCallback(async () => {
    try {
      const res = await fetch(`${API}/trends/correlations/${user_id}`);
      if (res.ok) {
        const data = await res.json();
        setCorrelations(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch correlations", err);
    }
  }, [user_id]);

  const fetchInsight = useCallback(async () => {
    setLoadingInsight(true);
    try {
      const res = await fetch(`${API}/trends/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, timeframe })
      });
      if (res.ok) {
        const data = await res.json();
        setInsight(data.insight);
      }
    } catch (err) {
      console.error("Failed to fetch insight", err);
    }
    setLoadingInsight(false);
  }, [user_id, timeframe]);

  useEffect(() => {
    fetchTrends();
    fetchCorrelations();
    fetchInsight();
  }, [fetchTrends, fetchCorrelations, fetchInsight]);

  // UI Helpers
  const MetricCard = ({ id, title, icon: Icon, color, value, delta, unit }) => {
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    
    // For HR and Stress, a decrease is usually 'good' (green). For Readiness/Sleep, increase is good.
    const inverseLogic = id === 'hr' || id === 'stress';
    let deltaColor = 'text-gray-500';
    if (isPositive) deltaColor = inverseLogic ? 'text-red-400' : 'text-[var(--color-pulse-green)]';
    if (isNegative) deltaColor = inverseLogic ? 'text-[var(--color-pulse-green)]' : 'text-red-400';

    return (
      <button 
        onClick={() => setActiveMetric(id)}
        className={`glass-card rounded-2xl p-5 text-left transition-all relative overflow-hidden ${activeMetric === id ? 'ring-1 ring-white/20 bg-white/10' : 'hover:bg-white/5'}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5" style={{backgroundColor: color, filter: 'blur(20px)'}}/>
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 rounded-lg" style={{backgroundColor: `${color}15`, color: color}}>
            <Icon size={20} />
          </div>
          {delta !== undefined && (
            <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${deltaColor}`}>
              {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : null}
              {Math.abs(delta)}{unit}
            </div>
          )}
        </div>
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-bold text-white font-mono">{value !== undefined ? value : '--'}<span className="text-sm text-gray-500 ml-1">{unit}</span></p>
      </button>
    );
  };

  const getMetricConfig = (id) => {
    switch(id) {
      case 'readiness': return { key: 'readiness', color: C.cyan, name: 'Readiness' };
      case 'sleep': return { key: 'sleep_hrs', color: C.purple, name: 'Sleep' };
      case 'stress': return { key: 'stress', color: C.amber, name: 'Stress' };
      case 'hr': return { key: 'hr', color: C.red, name: 'Heart Rate' };
      default: return { key: 'readiness', color: C.cyan, name: 'Readiness' };
    }
  };

  const activeConfig = getMetricConfig(activeMetric);

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar w-full max-w-6xl mx-auto">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 pt-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono uppercase flex items-center gap-2">
            <TrendingUp className="text-[var(--color-pulse-green)]" /> Trends & Analytics
          </h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">
            Longitudinal Health Insights
          </p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="glass-card flex p-1 rounded-xl w-max">
          {['7d', '30d', '6m'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-all ${
                timeframe === tf ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              {tf === '7d' ? 'Daily (7d)' : tf === '30d' ? 'Weekly (30d)' : 'Monthly (6m)'}
            </button>
          ))}
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard id="readiness" title="Avg Readiness" icon={Activity} color={C.cyan} value={indicators.readiness?.value} delta={indicators.readiness?.delta} unit="%" />
        <MetricCard id="sleep" title="Avg Sleep" icon={Moon} color={C.purple} value={indicators.sleep?.value} delta={indicators.sleep?.delta} unit="h" />
        <MetricCard id="stress" title="Avg Stress" icon={Zap} color={C.amber} value={indicators.stress?.value} delta={indicators.stress?.delta} unit="%" />
        <MetricCard id="hr" title="Resting HR" icon={Heart} color={C.red} value={indicators.hr?.value} delta={indicators.hr?.delta} unit=" bpm" />
      </div>

      {/* ── MAIN CHART AREA ── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest flex items-center gap-2">
            <Target size={14} className="text-white" /> Longitudinal {activeConfig.name} Trajectory
          </h2>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`color_${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeConfig.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={activeConfig.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}
                labelStyle={{ color: '#6b7280', fontSize: '10px', fontFamily: 'monospace' }}
              />
              <Area type="monotone" dataKey={activeConfig.key} name={activeConfig.name} stroke={activeConfig.color} strokeWidth={3} fillOpacity={1} fill={`url(#color_${activeMetric})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── CORRELATION SCATTER PLOT ── */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-6 flex items-center gap-2">
            <Activity size={14} className="text-white" /> Correlation: Sleep vs HRV
          </h2>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="sleep" name="Sleep" unit="h" domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} label={{ value: 'Sleep Duration (hrs)', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 10 }} />
                <YAxis type="number" dataKey="hrv" name="HRV" unit="ms" domain={['auto', 'auto']} tick={{ fill: '#6b7280', fontSize: 10 }} label={{ value: 'HRV (ms)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10 }} />
                <ZAxis type="number" range={[50, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize:'12px', fontFamily:'monospace' }} />
                <Scatter name="Correlation" data={correlations} fill={C.cyan} fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── INTELLIGENT INSIGHTS ── */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden border-t-2 border-[#c084fc]">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-[#c084fc] blur-2xl" />
          <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
            <Brain size={14} className="text-[#c084fc]" /> Intelligent Insights (gemma3:12b)
          </h2>
          
          <div className="flex-1 flex items-center justify-center relative z-10">
            {loadingInsight ? (
              <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
                <div className="w-6 h-6 border-2 border-t-transparent border-[#c084fc] rounded-full animate-spin" />
                <p className="text-xs font-mono animate-pulse">Analyzing {timeframe} trends...</p>
              </div>
            ) : insight ? (
              <p className="text-sm text-gray-200 leading-relaxed font-sans">{insight}</p>
            ) : (
              <p className="text-xs text-gray-500 font-mono text-center">No insights available.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
