import React from 'react';
import { Lock } from 'lucide-react';

export default function Memory() {
  const memories = [
    { text: "You sleep better on days with <8000 steps", score: 92, time: "2 hrs ago" },
    { text: "HRV drops after late meals", score: 88, time: "Yesterday" },
    { text: "Recovery peaks on Tuesdays", score: 76, time: "3 days ago" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Memory</h1>
        <div className="flex items-center gap-1.5 bg-[var(--color-pulse-bg)]/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.05)]">
          <Lock size={12} className="text-gray-300" />
          <span className="text-[10px] font-medium tracking-wide text-gray-300 uppercase">Stored on-device only</span>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xs text-[var(--color-pulse-cyan)] uppercase tracking-widest mb-4 font-mono">Local RAG Patterns</h2>
        <div className="flex flex-col gap-4">
          {memories.map((mem, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:bg-white/5 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-pulse-cyan)] opacity-70"></div>
              <div className="flex justify-between items-start gap-4">
                <p className="text-base md:text-lg text-white leading-snug font-medium">"{mem.text}"</p>
                <span className="text-xs text-gray-500 font-mono whitespace-nowrap mt-1">{mem.time}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-[10px] text-gray-400 w-20 uppercase tracking-wider">Confidence</div>
                <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-[var(--color-pulse-cyan)] rounded-full relative" style={{ width: `${mem.score}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30"></div>
                  </div>
                </div>
                <div className="text-xs font-mono text-[var(--color-pulse-cyan)] font-bold">{mem.score}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
