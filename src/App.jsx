import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Home, Brain, Zap, Database, Lock, Heart, Moon, Footprints, Activity, Send, X } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import Anthropic from '@anthropic-ai/sdk';
import Signals from './Signals';
import Memory from './Memory';
import WatchFace from './WatchFace';

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
const Dashboard = ({ hr, hrData }) => {
  // Static mock data for other biosignals with slight variations
  const mockHrvData = Array.from({ length: 20 }, (_, i) => ({ value: 50 + Math.sin(i) * 5 + Math.random() * 2 }));
  const mockSleepData = Array.from({ length: 20 }, (_, i) => ({ value: 70 + Math.cos(i/2) * 10 + Math.random() * 5 }));
  const mockActivityData = Array.from({ length: 20 }, (_, i) => ({ value: 40 + i * 2 + Math.random() * 10 }));

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">PULSE</h1>
        <div className="flex items-center gap-1.5 bg-[var(--color-pulse-bg)]/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(57,255,106,0.2)]">
          <Lock size={12} className="text-[var(--color-pulse-green)]" />
          <span className="text-[10px] font-medium tracking-wide text-[var(--color-pulse-green)] uppercase">On-Device AI</span>
        </div>
      </div>

      {/* HR Ring section */}
      <div className="flex justify-center my-6 md:my-12 flex-1 items-center">
        <div className="relative flex items-center justify-center w-56 h-56 md:w-72 md:h-72 rounded-full border-2 border-[var(--color-pulse-cyan)]/20 animate-pulse-ring">
          <div className="absolute inset-2 rounded-full border border-[var(--color-pulse-cyan)]/10"></div>
          <div className="absolute inset-6 rounded-full border border-[var(--color-pulse-cyan)]/5"></div>
          <div className="flex flex-col items-center justify-center z-10">
            <Heart className="text-[var(--color-pulse-cyan)] mb-2" fill="currentColor" size={28} />
            <div className="flex items-baseline">
              <span className="font-mono text-6xl md:text-8xl font-bold text-white drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">{hr}</span>
              <span className="text-[var(--color-pulse-cyan)] ml-1 text-sm md:text-lg font-mono">bpm</span>
            </div>
            <span className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-mono">Live</span>
          </div>
        </div>
      </div>

      {/* Biosignal Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-auto">
        <GlassCard title="HR" value={hr} unit="bpm" icon={Heart} color="var(--color-pulse-cyan)" data={hrData} />
        <GlassCard title="HRV" value="52" unit="ms" icon={Activity} color="var(--color-pulse-green)" data={mockHrvData} />
        <GlassCard title="Sleep" value="81" unit="/100" icon={Moon} color="var(--color-pulse-amber)" data={mockSleepData} />
        <GlassCard title="Activity" value="67" unit="/100" icon={Footprints} color="#c084fc" data={mockActivityData} />
      </div>
    </div>
  );
};

// Coach Panel Component
const CoachPanel = ({ hr, isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi, I am PULSE. Your on-device health coach. How can I help you optimize your day?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const systemPrompt = `You are PULSE, an on-device health coach. Be concise (max 3 sentences). Current data: HR: ${hr}bpm, HRV: 52ms, Sleep: 81/100, Activity: 67/100.`;

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        // Fallback simulation if no API key
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Simulation mode active (VITE_ANTHROPIC_API_KEY not set). Your biosignals look stable. Keep hydrating and stay focused." 
          }]);
          setIsTyping(false);
        }, 1500);
        return;
      }

      const anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }))
      });

      setMessages(prev => [...prev, { role: 'assistant', content: msg.content[0].text }]);
    } catch (error) {
      console.error(error);
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
      {/* Header */}
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

      {/* Chat Messages */}
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
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1 mt-1.5 ml-1 opacity-80">
                  <Zap size={10} className="text-[var(--color-pulse-green)]" fill="currentColor" />
                  <span className="text-[9px] text-[var(--color-pulse-green)] font-mono uppercase tracking-widest">&lt;180ms on-device</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex self-start max-w-[85%]">
            <div className="w-7 h-7 rounded-full bg-[var(--color-pulse-cyan)]/20 flex-shrink-0 flex items-center justify-center mr-2 mt-1 border border-[var(--color-pulse-cyan)]/30">
              <Brain size={14} className="text-[var(--color-pulse-cyan)]" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 text-gray-200 rounded-tl-sm border border-white/10 flex items-center gap-0.5">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-white/10 bg-[var(--color-pulse-bg)] md:bg-transparent pb-28 md:pb-4">
        {/* Quick Actions */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3 pb-1">
          {["How's my recovery?", "Optimize my sleep", "Am I overtraining?"].map((chip, i) => (
            <button 
              key={i}
              onClick={() => handleSend(chip)}
              disabled={isTyping}
              className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-gray-300 hover:text-[var(--color-pulse-cyan)] hover:border-[var(--color-pulse-cyan)]/30 hover:bg-[var(--color-pulse-cyan)]/10 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative flex items-center"
        >
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask PULSE..."
            className="w-full bg-black/40 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-pulse-cyan)]/50 focus:ring-1 focus:ring-[var(--color-pulse-cyan)]/50 transition-all font-sans"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 p-2 bg-[var(--color-pulse-cyan)] text-[var(--color-pulse-bg)] rounded-full hover:bg-[var(--color-pulse-cyan)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Hoist HR state
  const [hr, setHr] = useState(72);
  const [hrData, setHrData] = useState(Array.from({ length: 20 }, () => ({ value: 72 })));

  useInterval(() => {
    const newHr = 72 + Math.floor(Math.random() * 7) - 3; // +/- 3bpm around 72
    setHr(newHr);
    setHrData(prev => [...prev.slice(1), { value: newHr }]);
  }, 2000);

  const [isWatch, setIsWatch] = useState(typeof window !== 'undefined' ? window.innerWidth <= 240 : false);
  
  useEffect(() => {
    const handleResize = () => setIsWatch(window.innerWidth <= 240);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'coach', label: 'Coach', icon: Brain },
    { id: 'signals', label: 'Signals', icon: Zap },
    { id: 'memory', label: 'Memory', icon: Database },
  ];

  const isCoachOpen = activeTab === 'coach';

  if (isWatch) {
    return <WatchFace hr={hr} />;
  }

  return (
    <div className="min-h-screen mesh-bg text-white flex flex-col md:flex-row font-sans selection:bg-[var(--color-pulse-cyan)]/30">
      
      {/* Desktop Sidebar Nav */}
      <nav className="hidden md:flex flex-col w-24 lg:w-64 border-r border-white/5 glass-card p-4 rounded-none h-screen sticky top-0 z-50">
        <div className="mb-8 p-2 flex items-center justify-center lg:justify-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-pulse-cyan)]/20 flex items-center justify-center border border-[var(--color-pulse-cyan)]/30">
            <Activity className="text-[var(--color-pulse-cyan)]" size={20} />
          </div>
          <span className="hidden lg:block font-bold text-2xl tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">PULSE</span>
        </div>
        
        <div className="flex-1 flex flex-col gap-3">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl transition-all duration-300 group",
                  isActive ? "bg-white/10 text-[var(--color-pulse-cyan)] shadow-[0_0_15px_rgba(0,229,255,0.1)]" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={22} className={isActive ? "text-[var(--color-pulse-cyan)] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" : "group-hover:text-white transition-colors"} />
                <span className="hidden lg:block font-medium text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative max-w-full overflow-hidden">
        {activeTab === 'dashboard' || activeTab === 'coach' ? (
          <Dashboard hr={hr} hrData={hrData} />
        ) : activeTab === 'signals' ? (
          <Signals />
        ) : activeTab === 'memory' ? (
          <Memory />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p className="text-lg font-mono">{navItems.find(i => i.id === activeTab)?.label} Module Initializing...</p>
          </div>
        )}
      </main>

      {/* Coach Panel */}
      <CoachPanel 
        hr={hr} 
        isOpen={isCoachOpen} 
        onClose={() => setActiveTab('dashboard')} 
      />

      {/* Mobile / Smartwatch Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card rounded-t-3xl rounded-b-none border-b-0 border-x-0 pb-safe pt-3 px-6 z-[70] bg-[var(--color-pulse-bg)]/80 backdrop-blur-xl">
        <div className="flex justify-between items-center max-w-md mx-auto mb-3">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex flex-col items-center p-2 rounded-xl transition-all relative w-16",
                  isActive ? "text-[var(--color-pulse-cyan)]" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {isActive && (
                  <div className="absolute -top-3 w-8 h-1 rounded-full bg-[var(--color-pulse-cyan)] shadow-[0_0_10px_rgba(0,229,255,0.8)]"></div>
                )}
                <item.icon size={24} className={cn("mb-1.5", isActive ? "drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" : "")} />
                <span className="text-[10px] sm:text-xs font-medium tracking-wide max-[240px]:hidden">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      
    </div>
  );
}
