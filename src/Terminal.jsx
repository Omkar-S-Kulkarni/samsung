import { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, Cpu, Database, Zap, Shield } from 'lucide-react';

const Step = ({ icon: Icon, label, status, detail, color }) => (
  <div className="flex gap-4 items-start py-3 relative">
    <div className="absolute left-[15px] top-[40px] w-[2px] h-[calc(100%-25px)] bg-white/5 last:hidden"></div>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${status === 'active' ? 'bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-black/40'}`} style={{ color: status === 'active' ? color : '#4b5563' }}>
      {status === 'active' ? <Icon size={16} className="animate-pulse" /> : <Icon size={16} />}
    </div>
    <div className="flex-1 pt-1">
      <div className="flex justify-between items-center">
        <span className={`text-sm font-bold tracking-tight ${status === 'active' ? 'text-white' : 'text-gray-500'}`}>{label}</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${status === 'active' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>{status.toUpperCase()}</span>
      </div>
      {status === 'active' && detail && (
        <p className="text-xs text-gray-400 mt-1 font-mono leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">{detail}</p>
      )}
    </div>
  </div>
);

export default function Terminal() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { id: 'preprocess', label: 'Adaptive Preprocessing', icon: Zap, color: 'var(--color-pulse-cyan)', detail: 'Cleaning noise from sensor stream, aligning frequencies...' },
    { id: 'ml', label: 'Edge ML Inference', icon: Cpu, color: 'var(--color-pulse-green)', detail: 'Running TCN patterns for anomaly detection...' },
    { id: 'rag', label: 'Memory Retrieval (RAG)', icon: Database, color: 'var(--color-pulse-amber)', detail: 'Searching local FAISS index for similar patterns...' },
    { id: 'llm', label: 'Multi-Agent Reasoning', icon: Shield, color: '#c084fc', detail: 'Safety, Analysis, and Coaching agents debating output...' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-2">
          <TerminalIcon size={20} className="text-gray-500" />
          <h1 className="text-2xl font-bold tracking-tight text-white">Pipeline Logs</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-1 rounded-full">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Real-time Stream</span>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex flex-col">
          {steps.map((step, i) => (
            <Step
              key={step.id}
              {...step}
              status={i === activeStep ? 'active' : (i < activeStep ? 'complete' : 'pending')}
            />
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-mono">Terminal Output</h2>
        <div className="bg-black/60 rounded-xl p-4 font-mono text-[10px] md:text-xs text-gray-400 space-y-1 h-48 overflow-y-auto border border-white/5 scrollbar-thin">
          <p className="text-[var(--color-pulse-green)]">[SYS] Booting ADEO Intelligence Engine v2.4...</p>
          <p>[SYS] Privacy Vault initialized with AES-256-GCM.</p>
          <p>[SYS] Digital Twin state restored: Readiness 82%.</p>
          <p className="text-[var(--color-pulse-cyan)]">[PIPELINE] Input detected: User 1 | HR 72bpm | HRV 52ms</p>
          <p>[PIPELINE] Preprocessing complete (latency 12ms).</p>
          <p>[ML] Anomaly check: 0.04 (NORMAL).</p>
          <p>[RAG] Found 3 relevant memories in tier: short-term.</p>
          <p className="text-[var(--color-pulse-amber)]">[LLM] Agent 'safety' approved suggestion.</p>
          <p className="text-[#c084fc]">[LLM] Final response generated in 142ms.</p>
          <p className="text-gray-600 italic">... monitoring stream ...</p>
        </div>
      </div>
    </div>
  );
}
