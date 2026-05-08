import React, { useState, useEffect } from 'react';
import { Cpu, Merge, Database, Brain, GitMerge, Search, MessageSquare, Code, Terminal, CheckCircle2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

export default function ModelLayer({ section, simState }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 800);
    return () => clearInterval(id);
  }, []);

  if (section === '5_models') {
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Cpu className="text-[#FF9A3C]" /> Model Execution Visualization
        </h2>
        <div className="grid grid-cols-2 gap-8 flex-1">
          <div className="glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-mono text-sm text-[#FF9A3C] mb-4">Edge CNN-LSTM Encoder</h3>
            <div className="flex-1 flex flex-col justify-center items-center gap-4 relative">
              {['Input Layer (128x3)', 'Conv1D (64 filters)', 'LSTM (32 units)', 'Dense Output'].map((layer, i) => (
                <div key={layer} className="w-48 py-3 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center relative group">
                  <div className={`absolute inset-0 bg-[#FF9A3C]/10 rounded-lg transition-opacity duration-300 ${tick % 4 === i ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="font-mono text-xs text-gray-300 relative z-10">{layer}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-black/30 rounded-lg border border-[#FF9A3C]/20">
              <span className="font-mono text-[10px] text-gray-500">Inference Latency: </span>
              <span className="font-mono text-xs text-[#FF9A3C] font-bold">12ms</span>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-mono text-sm text-[#c084fc] mb-4">Cloud LLM Decoder (Llama 3)</h3>
            <div className="flex-1 bg-black/50 border border-white/5 rounded-xl p-4 font-mono text-xs text-gray-300 relative overflow-hidden">
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#c084fc] animate-pulse" />
                <span className="text-[10px] text-[#c084fc]">GENERATING</span>
              </div>
              <p className="mt-4">
                Based on the elevated HR baseline and recent poor sleep architecture, 
                the user is exhibiting early signs of sympathetic overtraining.
                <span className={`inline-block w-2 h-4 bg-[#c084fc] ml-1 align-middle ${tick % 2 === 0 ? 'opacity-100' : 'opacity-0'}`} />
              </p>
            </div>
            <div className="mt-4 flex justify-between px-2">
              <span className="font-mono text-[10px] text-gray-500">Tokens/sec: <span className="text-[#c084fc]">45.2</span></span>
              <span className="font-mono text-[10px] text-gray-500">Context Window: <span className="text-[#c084fc]">2048/8192</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === '6_fusion') {
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Merge className="text-[var(--color-pulse-green)]" /> Multi-Modal Fusion Layer
        </h2>
        <div className="flex-1 glass-card rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[var(--color-pulse-green)]/5" />
          
          <div className="flex w-full max-w-2xl justify-between relative z-10">
            <div className="flex flex-col gap-6 w-48">
              {['Heart Rate Graph', 'Sleep Stages Matrix', 'Activity Intensity', 'SpO2 Trend'].map((mod, i) => (
                <div key={mod} className="bg-black/40 border border-white/10 p-3 rounded-lg text-center font-mono text-xs text-gray-400 relative">
                  {mod}
                  <div className={`absolute right-0 top-1/2 w-8 h-[1px] bg-[var(--color-pulse-green)] transition-opacity duration-300 translate-x-full ${tick % 2 === i%2 ? 'opacity-100' : 'opacity-20'}`} />
                </div>
              ))}
            </div>
            
            <div className="w-48 h-48 rounded-full border-4 border-[var(--color-pulse-green)]/30 flex items-center justify-center relative bg-black/60 shadow-[0_0_50px_rgba(57,255,106,0.1)]">
              <div className="absolute inset-0 rounded-full border border-[var(--color-pulse-green)] animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-[var(--color-pulse-green)]/50 animate-[spin_3s_linear_infinite_reverse]" />
              <div className="text-center">
                <GitMerge size={32} className="text-[var(--color-pulse-green)] mx-auto mb-2" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">Cross-Modal<br/>Attention</span>
              </div>
            </div>
            
            <div className="flex flex-col justify-center w-48 pl-8 relative">
               <div className={`absolute left-0 top-1/2 w-8 h-[1px] bg-[var(--color-pulse-green)] transition-opacity duration-300 -translate-x-full ${tick % 2 !== 0 ? 'opacity-100' : 'opacity-20'}`} />
               <div className="bg-[var(--color-pulse-green)]/10 border border-[var(--color-pulse-green)]/30 p-4 rounded-lg text-center">
                 <span className="font-mono text-xs text-[var(--color-pulse-green)] font-bold block mb-2">Unified State Vector</span>
                 <div className="grid grid-cols-4 gap-1">
                   {Array.from({length: 16}).map((_, i) => (
                     <div key={i} className="h-2 rounded-[1px] bg-[var(--color-pulse-green)] transition-all duration-300" style={{ opacity: 0.2 + Math.random() * 0.8 }} />
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === '7_rag') {
    const vectorData = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 100,
      type: Math.random() > 0.8 ? 'retrieved' : 'stored'
    }));

    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Database className="text-[#c084fc]" /> RAG Memory Database
        </h2>
        <div className="grid grid-cols-3 gap-6 flex-1">
          <div className="col-span-2 glass-card rounded-2xl p-6 flex flex-col">
            <h3 className="font-mono text-sm mb-4 flex items-center gap-2">
              <Search size={16} className="text-[#c084fc]" /> Vector Space Semantic Search
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" dataKey="x" hide />
                  <YAxis type="number" dataKey="y" hide />
                  <ZAxis type="number" dataKey="z" range={[20, 200]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#000', border: '1px solid #c084fc' }} />
                  <Scatter name="Stored" data={vectorData.filter(d => d.type === 'stored')} fill="rgba(255,255,255,0.2)" />
                  <Scatter name="Retrieved" data={vectorData.filter(d => d.type === 'retrieved')} fill="#c084fc" className={tick % 2 === 0 ? 'opacity-100' : 'opacity-50'} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 overflow-y-auto hide-scrollbar">
            <h3 className="font-mono text-sm text-[#c084fc]">Top-K Retrieved Context</h3>
            {['Yesterday: Reported high stress during 2PM meeting', 'Last Week: Sleep quality dropped after late dinner', 'Goal: Trying to improve HRV baseline'].map((ctx, i) => (
              <div key={i} className="p-3 bg-black/40 border border-[#c084fc]/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase">Memory Chunk {i+1}</span>
                  <span className="text-[9px] font-mono text-[#c084fc]">Sim: 0.{95 - i*4}</span>
                </div>
                <p className="text-xs text-gray-300 font-medium">"{ctx}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section === '8_reasoning') {
    return (
      <div className="p-8 h-full flex flex-col">
        <h2 className="text-2xl font-bold font-mono tracking-tight mb-8 text-white flex items-center gap-3">
          <Brain className="text-[var(--color-pulse-cyan)]" /> LLM Chain-of-Thought Reasoning
        </h2>
        <div className="grid grid-cols-2 gap-6 flex-1">
          <div className="glass-card rounded-2xl p-6 flex flex-col overflow-y-auto hide-scrollbar">
            <h3 className="font-mono text-sm mb-4 flex items-center gap-2 text-gray-400">
              <Terminal size={16} /> Constructed Prompt
            </h3>
            <pre className="text-[10px] font-mono text-gray-300 whitespace-pre-wrap bg-black/50 p-4 rounded-xl border border-white/5 flex-1">
{`SYSTEM: You are ADEO, an AI Health Coach.
---
BIOMETRIC CONTEXT:
- HR: 72 bpm (Elevated)
- HRV: 45 ms (Low)
- Sleep: 5.2 hrs (Deficit)
- Activity: Light (Zone 1)
---
RAG MEMORY:
1. User is recovering from mild flu.
2. User prefers actionable, short advice.
---
USER REQUEST:
"Why do I feel so tired today?"
---
AI REASONING LOGIC INITIATED...`}
            </pre>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col">
               <h3 className="font-mono text-sm mb-4 text-[var(--color-pulse-cyan)]">Reasoning Chain</h3>
               <div className="space-y-4 flex-1">
                 {[
                   { step: '1. Analyze Data', text: 'HR is elevated, HRV is low. Indicates CNS strain.', status: 'done' },
                   { step: '2. Cross-reference Memory', text: 'User had flu recently. Strain is likely post-viral fatigue.', status: 'done' },
                   { step: '3. Formulate Recommendation', text: 'Suggest aggressive rest. Cancel evening workout.', status: 'active' },
                   { step: '4. Hallucination Check', text: 'Verifying medical claims... Safe.', status: 'pending' },
                 ].map((item, i) => (
                   <div key={i} className={`flex gap-3 items-start transition-opacity duration-500 ${item.status === 'pending' ? 'opacity-30' : 'opacity-100'}`}>
                     <div className="mt-1">
                       {item.status === 'done' ? <CheckCircle2 size={14} className="text-[var(--color-pulse-green)]" /> : 
                        item.status === 'active' ? <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[var(--color-pulse-cyan)] rounded-full animate-spin" /> :
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />}
                     </div>
                     <div>
                       <span className="text-xs font-bold font-mono text-white block mb-1">{item.step}</span>
                       <p className="text-[11px] text-gray-400">{item.text}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
