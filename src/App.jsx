import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Home, Brain, Zap, Database, Lock, Heart, Moon, Footprints, Activity, Send, X, Trophy, Shield, Terminal as TerminalIcon, Info } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import Anthropic from '@anthropic-ai/sdk';
import Signals from './Signals';
import Memory from './Memory';
import WatchFace from './WatchFace';
import Progress from './Progress';
import DigitalTwin from './DigitalTwin';
import Vault from './Vault';
import Terminal from './Terminal';

// Utility for Tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Custom hook for intervals
function useInterval(callback, delay) {
  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

// Sparkline component
const Sparkline = ({ data, color }) => (
  <div className="h-10 w-full mt-2">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// Glass Card Component
const GlassCard = ({ title, value, unit, icon: Icon, color, data }) => (
  <div className="glass-card rounded-2xl p-4 flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-2">
        <Icon size={16} color={color} />
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="text-right">
        <span className="font-mono text-xl font-bold text-white">{value}</span>
        {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </div>
    </div>
    <div className="mt-auto">
      <Sparkline data={data} color={color} />
    </div>
  </div>
);

// Main Dashboard Component
const Dashboard = ({ hr, hrData, twin, rewards, backendState }) => {
  const mockHrvData = Array.from({ length: 20 }, (_, i) => ({ value: 50 + Math.sin(i) * 5 + Math.random() * 2 }));
  const mockSleepData = Array.from({ length: 20 }, (_, i) => ({ value: 70 + Math.cos(i/2) * 10 + Math.random() * 5 }));
  const mockActivityData = Array.from({ length: 20 }, (_, i) => ({ value: 40 + i * 2 + Math.random() * 10 }));

  const unifiedScore = Number(backendState?.unified_score || 72.5);
  const riskLevel = backendState?.risk_level || 'low';
  const stateSummary = backendState?.state_summary || 'Stable: Analytics loading...';
  const batteryMode = backendState?.battery_mode || 'AI-Mode';
  const timestamp = backendState?.timestamp || '00:00:00';

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      {/* Top Status Bar */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-mono">ADEO Intelligence</h1>
          <span className="text-[10px] text-gray-500 font-mono tracking-widest">Update: {timestamp}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider",
            riskLevel === 'low' ? "bg-green-500/10 border-green-500/30 text-green-400" :
            riskLevel === 'medium' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
            "bg-red-500/10 border-red-500/30 text-red-400"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
              riskLevel === 'low' ? "bg-green-400" : riskLevel === 'medium' ? "bg-amber-400" : "bg-red-400")} />
            {riskLevel} Risk
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
            <Zap size={10} className="text-[var(--color-pulse-cyan)]" />
            <span className="text-[10px] font-medium tracking-wide text-gray-300 uppercase">{batteryMode}</span>
          </div>
        </div>
      </div>

      {/* State Summary Banner */}
      <div className="glass-card rounded-2xl p-4 mb-6 border-l-4 border-[var(--color-pulse-cyan)]">
        <div className="flex items-center gap-3">
          <Info size={18} className="text-[var(--color-pulse-cyan)]" />
          <span className="text-sm md:text-base font-medium text-white">{stateSummary}</span>
        </div>
      </div>

      {/* Unified Health Score Ring */}
      <div className="flex justify-center my-6 md:my-10 flex-1 items-center">
        <div className="relative flex items-center justify-center w-60 h-60 md:w-80 md:h-80 rounded-full">
          {/* Progress Ring Background */}
          <svg className="absolute w-full h-full -rotate-90">
             <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
             <circle 
                cx="50%" cy="50%" r="45%" fill="none" 
                stroke="var(--color-pulse-cyan)" strokeWidth="8" 
                strokeDasharray="282.7" 
                strokeDashoffset={282.7 * (1 - (unifiedScore / 100))} 
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
          </svg>
          
          <div className="flex flex-col items-center justify-center z-10">
            <span className="text-gray-400 text-[10px] mb-1 uppercase tracking-widest font-mono">Overall Score</span>
            <div className="flex items-baseline">
              <span className="font-mono text-7xl md:text-9xl font-bold text-white">
                {Math.round(unifiedScore)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
               <Heart size={14} className="text-red-400" />
               <span className="text-sm font-mono text-white">{hr || 0} <span className="text-[10px] text-gray-500">bpm</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8 overflow-x-auto hide-scrollbar">
        {['Rest', 'Workout', 'Hydrate', 'Meditate'].map((action, i) => (
          <button key={i} className="flex-1 min-w-[90px] glass-card rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-white/5 transition-all">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
               <Zap size={14} className="text-[var(--color-pulse-cyan)]" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-tight">{action}</span>
          </button>
        ))}
      </div>

      {/* Vitals Snapshot Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-auto">
        <GlassCard title="Heart Rate" value={hr || 0} unit="bpm" icon={Heart} color="var(--color-pulse-cyan)" data={hrData} />
        <GlassCard title="HRV" value="52" unit="ms" icon={Activity} color="var(--color-pulse-green)" data={mockHrvData} />
        <GlassCard title="Sleep" value={twin?.readiness_score?.toFixed(0) || '81'} unit="/100" icon={Moon} color="var(--color-pulse-amber)" data={mockSleepData} />
        <GlassCard title="Activity" value={rewards?.points || '67'} unit="pts" icon={Footprints} color="#c084fc" data={mockActivityData} />
      </div>
    </div>
  );
};

// Coach Panel Component
const CoachPanel = ({ hr, isOpen, onClose, twin }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi, I am PULSE. Your on-device health coach. I have analyzed your Digital Twin and readiness. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const systemPrompt = `You are PULSE, an on-device health coach. Current data: HR: ${hr}bpm, Readiness: ${twin?.readiness_score?.toFixed(1)}%, Fatigue: ${twin?.fatigue_index?.toFixed(1)}%.`;

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "I've reviewed your Digital Twin metrics. Your readiness is high, making it a great day for intense activity. Would you like a personalized plan?" 
          }]);
          setIsTyping(false);
        }, 1500);
        return;
      }

      const anthropic = new Anthropic({ apiKey: apiKey, dangerouslyAllowBrowser: true });
      const msg = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 300,
        system: systemPrompt,
        messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }))
      });
      setMessages(prev => [...prev, { role: 'assistant', content: msg.content[0].text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={cn(
      "fixed md:relative top-0 right-0 w-full md:w-80 lg:w-96 h-screen glass-card border-l border-white/10 z-[60] md:z-10 flex flex-col transition-transform duration-300 bg-[var(--color-pulse-bg)] md:bg-[var(--color-pulse-bg)]/50",
      isOpen ? "translate-x-0" : "translate-x-full md:hidden"
    )}>
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[var(--color-pulse-bg)]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--color-pulse-cyan)]/20 flex items-center justify-center border border-[var(--color-pulse-cyan)]/30">
            <Brain className="text-[var(--color-pulse-cyan)]" size={16} />
          </div>
          <h2 className="font-bold text-lg tracking-wide text-white">AI Coach</h2>
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 hide-scrollbar flex flex-col pb-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex max-w-[90%]", m.role === 'user' ? "self-end justify-end" : "self-start")}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-[var(--color-pulse-cyan)]/20 flex-shrink-0 flex items-center justify-center mr-2 mt-1 border border-[var(--color-pulse-cyan)]/30">
                <Brain size={14} className="text-[var(--color-pulse-cyan)]" />
              </div>
            )}
            <div className="flex flex-col">
              <div className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed",
                m.role === 'user' 
                  ? "bg-[var(--color-pulse-cyan)]/20 text-white rounded-tr-sm border border-[var(--color-pulse-cyan)]/30 shadow-[0_2px_10px_rgba(0,229,255,0.1)]" 
                  : "bg-white/5 text-gray-200 rounded-tl-sm border border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
              )}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex self-start max-w-[85%] animate-pulse">
            <div className="w-7 h-7 rounded-full bg-[var(--color-pulse-cyan)]/20 flex-shrink-0 flex items-center justify-center mr-2 mt-1 border border-[var(--color-pulse-cyan)]/30">
              <Brain size={14} className="text-[var(--color-pulse-cyan)]" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 text-gray-400 text-xs font-mono">PULSE is reasoning...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/10 bg-[var(--color-pulse-bg)] md:bg-transparent pb-28 md:pb-4">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative flex items-center">
          <input 
            type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask PULSE..."
            className="w-full bg-black/40 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-[var(--color-pulse-cyan)]/50 transition-all"
          />
          <button type="submit" className="absolute right-1.5 p-2 bg-[var(--color-pulse-cyan)] text-[var(--color-pulse-bg)] rounded-full"><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hr, setHr] = useState(72);
  const [hrData, setHrData] = useState(Array.from({ length: 20 }, () => ({ value: 72 })));
  const [backendState, setBackendState] = useState(null);
  const [user_id] = useState('react_user_' + Math.floor(Math.random() * 1000));

  // Sync with API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/dashboard/${user_id}`);
        const data = await response.json();
        setBackendState(data);
      } catch (err) {
        console.error("API connection failed:", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user_id]);

  // Real-time processing simulation
  useInterval(async () => {
    const newHr = 72 + Math.floor(Math.random() * 10) - 5;
    setHr(newHr);
    setHrData(prev => [...prev.slice(1), { value: newHr }]);

    try {
      await fetch('http://localhost:8000/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id,
          heart_rate_bpm: newHr,
          hrv_ms: 55 + Math.random() * 10,
          total_steps_today: 4500
        })
      });
    } catch (err) {}
  }, 3000);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'twin', label: 'Twin', icon: Activity },
    { id: 'progress', label: 'Progress', icon: Trophy },
    { id: 'coach', label: 'Coach', icon: Brain },
    { id: 'signals', label: 'Signals', icon: Zap },
    { id: 'memory', label: 'Memory', icon: Database },
    { id: 'vault', label: 'Vault', icon: Shield },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
  ];

  if (activeTab === 'watch') return <WatchFace hr={hr} />;

  return (
    <div className="min-h-screen mesh-bg text-white flex flex-col md:flex-row font-sans selection:bg-[var(--color-pulse-cyan)]/30">
      {/* Desktop Nav */}
      <nav className="hidden md:flex flex-col w-24 lg:w-64 border-r border-white/5 glass-card p-4 h-screen sticky top-0 z-50">
        <div className="mb-8 p-2 flex items-center justify-center lg:justify-start gap-3">
          <Activity className="text-[var(--color-pulse-cyan)]" size={24} />
          <span className="hidden lg:block font-bold text-2xl tracking-widest text-white">ADEO</span>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={cn("flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition-all", 
              activeTab === item.id ? "bg-white/10 text-[var(--color-pulse-cyan)]" : "text-gray-400 hover:text-white hover:bg-white/5")}>
              <item.icon size={22} />
              <span className="hidden lg:block font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        {activeTab === 'dashboard' ? <Dashboard hr={hr} hrData={hrData} twin={backendState?.twin} rewards={backendState?.rewards} backendState={backendState} /> :
         activeTab === 'twin' ? <DigitalTwin twin={backendState?.twin} /> :
         activeTab === 'progress' ? <Progress goals={backendState?.goals} rewards={backendState?.rewards} /> :
         activeTab === 'signals' ? <Signals /> :
         activeTab === 'memory' ? <Memory /> :
         activeTab === 'vault' ? <Vault privacy={backendState?.privacy} /> :
         activeTab === 'terminal' ? <Terminal /> :
         activeTab === 'coach' ? <Dashboard hr={hr} hrData={hrData} twin={backendState?.twin} rewards={backendState?.rewards} backendState={backendState} /> :
         <div className="flex-1 flex items-center justify-center text-gray-500 font-mono">Module Initializing...</div>}
      </main>

      {/* Coach Drawer */}
      <CoachPanel hr={hr} isOpen={activeTab === 'coach'} onClose={() => setActiveTab('dashboard')} twin={backendState?.twin} />

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card rounded-t-3xl border-none p-3 z-[70] bg-[var(--color-pulse-bg)]/90 backdrop-blur-xl">
        <div className="flex justify-between items-center overflow-x-auto hide-scrollbar px-2">
          {navItems.slice(0, 5).map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn("flex flex-col items-center p-2 min-w-[64px]", activeTab === item.id ? "text-[var(--color-pulse-cyan)]" : "text-gray-500")}>
              <item.icon size={20} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
