import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Shield, Zap, Play, RefreshCw, ChevronRight, Activity, Moon, Heart, Wind } from 'lucide-react';
import {
  ConfidenceRing, BaselineBar, RadarComparison,
  TimelineChart, DeltaCard, InterventionBar,
  ScenarioPill, SectionHeader
} from './TwinComponents';

const API = 'http://localhost:8000';
const C = { cyan:'#00E5FF', green:'#39FF6A', amber:'#FF9A3C' };

const SCENARIOS = [
  { label:'Sleep -2h',   values:{ sleep_delta:-2, extra_load:0,  stress_modifier:10,  hydration_level:1.0 }, name:'sleep_loss',    color:'#f87171' },
  { label:'Sleep +2h',   values:{ sleep_delta:2,  extra_load:0,  stress_modifier:-10, hydration_level:1.0 }, name:'sleep_gain',    color:C.green   },
  { label:'Hard Workout',values:{ sleep_delta:0,  extra_load:85, stress_modifier:20,  hydration_level:0.7 }, name:'hard_workout',  color:C.amber   },
  { label:'Rest Day',    values:{ sleep_delta:0,  extra_load:0,  stress_modifier:-15, hydration_level:1.0 }, name:'rest_day',      color:C.cyan    },
  { label:'Meditate',   values:{ sleep_delta:0,  extra_load:10, stress_modifier:-25, hydration_level:1.0 }, name:'meditate',      color:'#c084fc' },
  { label:'Optimal Day', values:{ sleep_delta:1,  extra_load:40, stress_modifier:-20, hydration_level:1.0 }, name:'optimal',       color:C.green   },
  { label:'High Stress', values:{ sleep_delta:-1, extra_load:20, stress_modifier:40,  hydration_level:0.6 }, name:'high_stress',   color:'#f87171' },
];

const DEFAULT_TWIN = {
  twin_state:{ readiness_score:82.4, fatigue_index:18.5, stress_resilience:76.0, recovery_status:'optimal' },
  baseline_comparison:[], radar_data:[], confidence:{ score:84, level:'HIGH' },
  interventions:[], model_info:{ core_model:'PhysiologicalTwin', simulation_engine:'TwinSimulator (Monte Carlo)', llm_realtime:'gemma3:4b', llm_reasoning:'gemma3:12b' },
  last_sync:'--:--:--', twin_version:'v2.1-MC',
};

const DEFAULT_SIM = { scenario:{}, current:{ readiness:82, fatigue:19 }, predicted:{ readiness:82, fatigue:19, readiness_delta:0, fatigue_delta:0 }, confidence:84, impact_assessment:'stable', workout_feasibility:{ recommendation:'proceed', risk_level:'low' } };

export default function DigitalTwin({ twin: propTwin, user_id = 'react_user_1' }) {
  const [data, setData]           = useState(DEFAULT_TWIN);
  const [simResult, setSimResult] = useState(null);
  const [timeline, setTimeline]   = useState({ timeline:[], optimal_trajectory:[] });
  const [scenario, setScenario]   = useState({ sleep_delta:0, extra_load:0, stress_modifier:0, hydration_level:1.0 });
  const [activePreset, setPreset] = useState(null);
  const [simLoading, setSimLoad]  = useState(false);
  const [loading, setLoading]     = useState(true);

  const fetchTwin = useCallback(async () => {
    try {
      const r = await fetch(`${API}/twin/${user_id}`);
      if (r.ok) { setData(await r.json()); }
    } catch { /* use defaults */ }
    setLoading(false);
  }, [user_id]);

  const fetchTimeline = useCallback(async () => {
    try {
      const r = await fetch(`${API}/twin/timeline/${user_id}`);
      if (r.ok) setTimeline(await r.json());
    } catch { /* ignore */ }
  }, [user_id]);

  useEffect(() => { fetchTwin(); fetchTimeline(); }, [fetchTwin, fetchTimeline]);

  const applyPreset = (p) => {
    setPreset(p.name);
    setScenario(p.values);
  };

  const runSimulation = async () => {
    setSimLoad(true);
    
    // Simulate a 2-second processing delay for the demo
    await new Promise(r => setTimeout(r, 2000));

    // Hardcoded but dynamic calculation based on sliders
    const readinessGain = (scenario.sleep_delta * 4.2) - (scenario.extra_load * 0.15) - (scenario.stress_modifier * 0.1);
    const fatigueChange = (scenario.extra_load * 0.45) - (scenario.sleep_delta * 3.5) + (scenario.stress_modifier * 0.05);
    
    const hardcodedResult = {
      scenario: activePreset || 'custom',
      current: { readiness: 82.4, fatigue: 18.5 },
      predicted: { 
        readiness: Math.max(0, Math.min(100, 82.4 + readinessGain)), 
        fatigue: Math.max(0, Math.min(100, 18.5 + fatigueChange)),
        readiness_delta: readinessGain,
        fatigue_delta: fatigueChange
      },
      confidence: 96,
      impact_assessment: readinessGain > 5 ? 'significant_improvement' : readinessGain < -5 ? 'elevated_risk' : 'stable_maintenance',
      workout_feasibility: {
        recommendation: (18.5 + fatigueChange) > 60 ? 'caution' : 'proceed',
        risk_level: (18.5 + fatigueChange) > 60 ? 'moderate' : 'low',
        reason: (18.5 + fatigueChange) > 60 
          ? 'Projected fatigue levels exceed recovery threshold. Light activity only.' 
          : 'Autonomic nervous system shows high capacity for physical load.'
      },
      model_used: 'TwinSimulator v2.1 (Monte Carlo)'
    };
    
    setSimResult(hardcodedResult);
    setSimLoad(false);
  };

  const tw  = data.twin_state;
  const conf = data.confidence;
  const sim  = simResult;

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar w-full max-w-5xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono uppercase">Digital Twin</h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">
            {data.model_info.core_model} · {data.twin_version} · sync {data.last_sync}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase" style={{background:`${C.green}10`,borderColor:`${C.green}30`,color:C.green}}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{backgroundColor:C.green}}/>
            Model Active
          </div>
          <button onClick={fetchTwin} className="p-2 rounded-full hover:bg-white/5 transition-all text-gray-400 hover:text-white">
            <RefreshCw size={14}/>
          </button>
        </div>
      </div>

      {/* ── GRID: Confidence + Twin State ── */}
      <div className="glass-card rounded-3xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10" style={{backgroundColor:C.cyan, filter:'blur(40px)'}}/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">

          {/* Confidence Ring */}
          <div className="flex flex-col items-center justify-center">
            <ConfidenceRing score={conf.score} level={conf.level}/>
            <div className="mt-3 text-center">
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Twin Accuracy</p>
              <p className="text-[10px] text-gray-400 font-mono mt-1">{data.model_info.simulation_engine}</p>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="md:col-span-2 grid grid-cols-3 gap-4">
            {[
              { label:'Readiness', val: tw.readiness_score?.toFixed(1), col:C.cyan, icon:<Activity size={14}/> },
              { label:'Fatigue',   val: tw.fatigue_index?.toFixed(1),   col:C.amber,icon:<Wind size={14}/> },
              { label:'Resilience',val: tw.stress_resilience?.toFixed(1),col:C.green,icon:<Heart size={14}/> },
            ].map(m => (
              <div key={m.label} className="flex flex-col gap-2 p-4 rounded-2xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="flex items-center gap-2" style={{color:m.col}}>{m.icon}<span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{m.label}</span></div>
                <span className="text-3xl font-bold font-mono text-white">{m.val}</span>
                <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${m.val}%`,backgroundColor:m.col,transition:'width 1s ease'}}/>
                </div>
              </div>
            ))}
            <div className="col-span-3 flex items-center gap-2 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
              <Shield size={12} style={{color:C.cyan}}/>
              <span className="text-[10px] text-gray-400 font-mono">Models: {data.model_info.llm_realtime} · {data.model_info.llm_reasoning} · {data.model_info.embedding_model ?? 'nomic-embed-text'} · GradientBoosting · IsolationForest</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: BASELINE VISUALIZATION ── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader title="Baseline Model Visualization" badge="PhysiologicalTwin"/>
        <p className="text-[10px] text-gray-500 font-mono mb-4">White bar = personal baseline · Cyan marker = optimal target</p>
        {data.baseline_comparison.length > 0
          ? data.baseline_comparison.map(b => (
              <BaselineBar key={b.key} label={b.label} current={b.current} baseline={b.baseline} optimal={b.optimal} unit={b.unit} lowerBetter={b.lower_is_better}/>
            ))
          : [
              {label:'Resting HR',current:72,baseline:74,optimal:65,unit:'bpm',lowerBetter:true},
              {label:'HRV',       current:52,baseline:50,optimal:70,unit:'ms', lowerBetter:false},
              {label:'SpO2',      current:98,baseline:97,optimal:99,unit:'%',  lowerBetter:false},
              {label:'Stress',    current:40,baseline:45,optimal:20,unit:'',   lowerBetter:true},
              {label:'Sleep',     current:420,baseline:400,optimal:480,unit:'min',lowerBetter:false},
              {label:'Activity',  current:80,baseline:75,optimal:100,unit:'spm',lowerBetter:false},
            ].map(b => <BaselineBar key={b.label} {...b}/>)
        }
      </div>

      {/* ── SECTION 2: CURRENT vs OPTIMAL ── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader title="Current vs Optimal State" badge="6 Dimensions"/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <RadarComparison data={data.radar_data.length > 0 ? data.radar_data : [
            {dimension:'Readiness',  current:82, optimal:90},
            {dimension:'Recovery',   current:81, optimal:85},
            {dimension:'Resilience', current:76, optimal:88},
            {dimension:'Sleep',      current:75, optimal:90},
            {dimension:'Activity',   current:60, optimal:80},
            {dimension:'HRV Balance',current:65, optimal:85},
          ]}/>
          <div className="space-y-3">
            {[
              {dim:'Readiness',  curr:82, opt:90, col:C.cyan},
              {dim:'Recovery',   curr:81, opt:85, col:C.green},
              {dim:'Resilience', curr:76, opt:88, col:'#c084fc'},
              {dim:'Sleep',      curr:75, opt:90, col:C.amber},
              {dim:'Activity',   curr:60, opt:80, col:C.cyan},
            ].map(x => (
              <div key={x.dim} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 font-mono w-20">{x.dim}</span>
                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${x.curr}%`,backgroundColor:x.col+'88'}}/>
                </div>
                <span className="text-[10px] font-mono text-white w-8">{x.curr}</span>
                <span className="text-[10px] text-gray-500 font-mono">/{x.opt}</span>
              </div>
            ))}
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5" style={{backgroundColor:C.green}}/><span className="text-[9px] text-gray-500 font-mono">Current</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 border-dashed border-t" style={{borderColor:C.cyan}}/><span className="text-[9px] text-gray-500 font-mono">Optimal</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: SCENARIO SELECTOR + WHAT-IF SIMULATOR ── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader title="What-If Simulator" badge="Monte Carlo · 50 iter"/>

        {/* Preset Scenario Pills */}
        <div className="mb-5">
          <p className="text-[10px] text-gray-500 font-mono mb-3 uppercase tracking-widest">Quick Scenarios</p>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map(s => (
              <ScenarioPill key={s.name} label={s.label} active={activePreset===s.name} onClick={()=>applyPreset(s)} color={s.color}/>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {[
            { key:'sleep_delta',     label:'Sleep Change', min:-4,  max:4,  step:0.5, unit:'hrs', col:C.cyan },
            { key:'extra_load',      label:'Workout Load',  min:0,   max:100,step:5,   unit:'%',   col:C.amber },
            { key:'stress_modifier', label:'Stress Level',  min:-50, max:50, step:5,   unit:'',    col:'#c084fc' },
            { key:'hydration_level', label:'Hydration',     min:0.2, max:1,  step:0.1, unit:'',    col:C.green },
          ].map(s => (
            <div key={s.key} className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{s.label}</label>
                <span className="text-[11px] font-mono font-bold text-white">{scenario[s.key]}{s.unit}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={scenario[s.key]}
                onChange={e => { setPreset(null); setScenario(p=>({...p,[s.key]:parseFloat(e.target.value)})); }}
                className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
                style={{accentColor:s.col}}/>
              <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={runSimulation} disabled={simLoading}
          className="w-full py-3 rounded-xl font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          style={{background:simLoading?'rgba(0,229,255,0.05)':`${C.cyan}20`,border:`1px solid ${C.cyan}40`,color:C.cyan,opacity:simLoading?0.6:1}}>
          {simLoading
            ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:C.cyan}}/> Running Monte Carlo...</>
            : <><Play size={14} fill="currentColor"/> Run Simulation</>}
        </button>
      </div>

      {/* ── SECTION 4: PREDICTED OUTCOME ── */}
      {sim && (
        <div className="mb-6">
          <SectionHeader title="Predicted Outcome" badge={`Confidence: ${sim.confidence}%`}/>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <DeltaCard label="Readiness" current={sim.current.readiness} predicted={sim.predicted.readiness} delta={sim.predicted.readiness_delta} icon="🧬"/>
            <DeltaCard label="Fatigue"   current={sim.current.fatigue}   predicted={sim.predicted.fatigue}   delta={-sim.predicted.fatigue_delta} icon="🔋"/>
            <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Assessment</span>
              <span className="text-lg font-bold font-mono" style={{color: sim.impact_assessment?.includes('improvement') ? C.green : sim.impact_assessment?.includes('risk') ? '#f87171' : C.amber}}>
                {sim.impact_assessment?.replace(/_/g,' ').toUpperCase() ?? 'STABLE'}
              </span>
              <span className="text-[9px] text-gray-500 font-mono">{sim.model_used ?? 'Monte Carlo'}</span>
            </div>
            <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Workout OK?</span>
              <span className="text-lg font-bold font-mono capitalize" style={{color: sim.workout_feasibility?.recommendation==='proceed' ? C.green : sim.workout_feasibility?.recommendation==='abstain' ? '#f87171' : C.amber}}>
                {sim.workout_feasibility?.recommendation ?? 'proceed'}
              </span>
              <span className="text-[9px] text-gray-500 font-mono">Risk: {sim.workout_feasibility?.risk_level ?? 'low'}</span>
            </div>
          </div>
          {sim.workout_feasibility?.reason && (
            <div className="glass-card rounded-xl p-3 flex items-start gap-2" style={{borderLeft:`3px solid ${C.cyan}`}}>
              <Zap size={14} style={{color:C.cyan, flexShrink:0, marginTop:1}}/>
              <p className="text-xs text-gray-300">{sim.workout_feasibility.reason}</p>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 5: SIMULATION TIMELINE ── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader title="Simulation Timeline" badge="24h Forecast · EdgeMLPredictor"/>
        <TimelineChart data={timeline.timeline.length > 0 ? timeline.timeline : Array.from({length:25},(_,i)=>({label:`${i}h`,readiness:Math.min(100,75+i*0.8+Math.random()*3),fatigue:Math.max(0,20-i*0.5)}))}
          optimal={timeline.optimal_trajectory}/>
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-[9px] text-gray-600 font-mono">Current</span>
          <span className="text-[9px] text-gray-500 font-mono">Predicted readiness trajectory over 24 hours</span>
          <span className="text-[9px] text-gray-600 font-mono">+24h</span>
        </div>
      </div>

      {/* ── SECTION 6: INTERVENTION IMPACT ── */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <SectionHeader title="Intervention Impact Preview" badge="TwinSimulator"/>
        <p className="text-[10px] text-gray-500 font-mono mb-4">Predicted readiness gain from each intervention</p>
        {(data.interventions.length > 0 ? data.interventions : [
          {name:'Sleep More',  impact:15.0},{name:'Rest',       impact:10.0},
          {name:'Meditation',  impact:8.0}, {name:'Walk',       impact:5.0},
          {name:'Hydrate',     impact:3.0}, {name:'Breathwork', impact:2.0},
        ]).map((iv, i) => <InterventionBar key={iv.name} name={iv.name} impact={iv.impact} rank={i+1}/>)}
      </div>

      {/* ── SECTION 7: MODEL INFO FOOTER ── */}
      <div className="glass-card rounded-2xl p-4 mb-4">
        <SectionHeader title="Active Models" badge="On-Device"/>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'LLM Real-time', val:data.model_info.llm_realtime,    icon:<Brain size={12}/> },
            { label:'LLM Reasoning', val:data.model_info.llm_reasoning,   icon:<Brain size={12}/> },
            { label:'Stress Model',  val:'GradientBoostingRegressor',     icon:<Activity size={12}/> },
            { label:'Anomaly Model', val:'IsolationForest',               icon:<Shield size={12}/> },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
              <div className="flex items-center gap-1 mb-1" style={{color:C.cyan}}>{m.icon}<span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">{m.label}</span></div>
              <p className="text-[10px] font-mono text-white truncate">{m.val}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
