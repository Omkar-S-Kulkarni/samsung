import { useState } from 'react';
import { Heart, Activity, Moon, Footprints } from 'lucide-react';

export default function WatchFace({ hr }) {
  const [viewIndex, setViewIndex] = useState(0);

  const metrics = [
    { id: 'hr', value: hr, unit: 'BPM', icon: Heart, color: 'var(--color-pulse-cyan)', tip: "HR steady. Zone 2." },
    { id: 'hrv', value: 52, unit: 'MS', icon: Activity, color: 'var(--color-pulse-green)', tip: "Optimal recovery." },
    { id: 'sleep', value: 81, unit: 'SCORE', icon: Moon, color: 'var(--color-pulse-amber)', tip: "Good deep sleep." },
    { id: 'activity', value: 67, unit: 'SCORE', icon: Footprints, color: '#c084fc', tip: "Keep moving." }
  ];

  const current = metrics[viewIndex];

  const handleTap = () => {
    setViewIndex((prev) => (prev + 1) % metrics.length);
  };

  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const quarter = circ / 4;

  return (
    <div className="flex items-center justify-center min-h-screen bg-black w-full overflow-hidden">
      <div
        onClick={handleTap}
        className="relative w-full max-w-[240px] aspect-square rounded-full overflow-hidden bg-[var(--color-pulse-bg)] flex flex-col items-center justify-center cursor-pointer select-none"
      >
        {/* Background Gradient Mesh */}
        <div className="absolute inset-0 mesh-bg opacity-40 mix-blend-screen"></div>

        {/* Circular Arcs via SVG */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-md" viewBox="0 0 100 100">
          {/* Sleep Arc (Right Edge) - Top Right to Bottom Right */}
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,154,60,0.15)" strokeWidth="3"
            strokeDasharray={`${quarter} ${circ}`}
            transform="rotate(-45 50 50)" strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke="var(--color-pulse-amber)" strokeWidth="3"
            strokeDasharray={`${quarter * 0.81} ${circ}`}
            transform="rotate(-45 50 50)" strokeLinecap="round"
            style={{ filter: viewIndex === 2 ? 'drop-shadow(0 0 4px rgba(255,154,60,0.8))' : 'none', opacity: viewIndex === 2 || viewIndex === 0 ? 1 : 0.4 }}
          />

          {/* HRV Arc (Left Edge) - Bottom Left to Top Left */}
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke="rgba(57,255,106,0.15)" strokeWidth="3"
            strokeDasharray={`${quarter} ${circ}`}
            transform="rotate(135 50 50)" strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke="var(--color-pulse-green)" strokeWidth="3"
            strokeDasharray={`${quarter * 0.52} ${circ}`}
            transform="rotate(135 50 50)" strokeLinecap="round"
            style={{ filter: viewIndex === 1 ? 'drop-shadow(0 0 4px rgba(57,255,106,0.8))' : 'none', opacity: viewIndex === 1 || viewIndex === 0 ? 1 : 0.4 }}
          />

          {/* Activity Arc (Top Edge) */}
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke="rgba(192,132,252,0.15)" strokeWidth="3"
            strokeDasharray={`${quarter} ${circ}`}
            transform="rotate(-135 50 50)" strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke="#c084fc" strokeWidth="3"
            strokeDasharray={`${quarter * 0.67} ${circ}`}
            transform="rotate(-135 50 50)" strokeLinecap="round"
            style={{ filter: viewIndex === 3 ? 'drop-shadow(0 0 4px rgba(192,132,252,0.8))' : 'none', opacity: viewIndex === 3 || viewIndex === 0 ? 1 : 0.4 }}
          />
        </svg>

        {/* Inner Content Container */}
        <div className="z-10 flex flex-col items-center justify-center mt-3">
          <current.icon
            size={18}
            color={current.color}
            className="mb-1"
            style={{ filter: `drop-shadow(0 0 8px ${current.color})` }}
          />
          <div className="flex items-baseline justify-center">
            <span
              className="font-mono text-[64px] font-bold text-white tracking-tighter leading-none"
              style={{ textShadow: `0 0 20px ${current.color}60` }}
            >
              {current.value}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono tracking-widest mt-1 opacity-80 uppercase">{current.unit}</span>
        </div>

        {/* Coach Tip */}
        <div className="absolute bottom-6 w-full flex justify-center z-10 px-6">
          <p className="text-[9px] text-[var(--color-pulse-cyan)] font-sans leading-tight truncate px-3 bg-[var(--color-pulse-cyan)]/10 border border-[var(--color-pulse-cyan)]/20 rounded-full py-0.5">
            {current.tip}
          </p>
        </div>

        {/* Pulse Ring when HR is active */}
        {viewIndex === 0 && (
          <div className="absolute inset-4 rounded-full border border-[var(--color-pulse-cyan)]/20 animate-pulse-ring z-0 pointer-events-none"></div>
        )}
      </div>
    </div>
  );
}
