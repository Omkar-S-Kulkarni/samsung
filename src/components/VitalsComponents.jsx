/**
 * Shared reusable components for the ADEO Vitals Dashboard
 */

/* ── Animated Counter ─────────────────────────────────────────── */
export function AnimatedValue({ value, decimals = 0, className = '' }) {
  return (
    <span
      key={value}
      className={`vitals-fade-in ${className}`}
    >
      {typeof value === 'number' ? value.toFixed(decimals) : value}
    </span>
  );
}

/* ── Live Badge ───────────────────────────────────────────────── */
export function LiveBadge({ color = '#00E5FF' }) {
  return (
    <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest font-mono"
      style={{ color }}>
      <span className="animate-live w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      Live
    </span>
  );
}

/* ── Signal Quality Badge ─────────────────────────────────────── */
export function SignalBadge({ quality }) {
  const { label, color, score } = quality;
  return (
    <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-full border"
      style={{ borderColor: `${color}30` }}>
      <div className="flex gap-0.5 items-end h-3.5">
        {[0.4, 0.65, 0.85, 1].map((h, i) => (
          <span key={i}
            className="w-1 rounded-sm transition-all duration-500"
            style={{
              height: `${h * 14}px`,
              backgroundColor: score >= (i + 1) * 25 ? color : 'rgba(255,255,255,0.1)'
            }} />
        ))}
      </div>
      <span className="text-[10px] font-bold font-mono" style={{ color }}>{label}</span>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────────── */
export function StatCard({ icon: Icon, title, value, unit, color, subtext, badge, pulse = false, children }) {
  return (
    <div
      className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col relative overflow-hidden vitals-slide-up"
      style={{ borderBottom: `2px solid ${color}60` }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-4 right-4 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />

      <div className="flex justify-between items-start mb-3">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon size={18} style={{ color }} className={pulse ? 'animate-heartbeat' : ''} />
        </div>
        {badge}
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-3xl font-bold font-mono text-white">{value}</span>
        {unit && <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">{unit}</span>}
      </div>

      <div className="mt-1 text-[10px] text-gray-500 font-medium uppercase tracking-wider">{title}</div>

      {subtext && (
        <div className="mt-2 text-[10px] font-medium" style={{ color: `${color}cc` }}>
          {subtext}
        </div>
      )}

      {children}
    </div>
  );
}

/* ── Section Header ───────────────────────────────────────────── */
export function SectionHeader({ icon: Icon, title, subtitle, color = 'var(--color-pulse-cyan)', actions }) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-500 font-mono mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

/* ── Progress Ring (SVG) ──────────────────────────────────────── */
export function ProgressRing({ value, max = 100, size = 80, strokeWidth = 6, color, bgColor = 'rgba(255,255,255,0.05)', children }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ── Zone Badge ──────────────────────────────────────────────── */
export function ZoneBadge({ zone }) {
  return (
    <span
      key={zone.name}
      className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border font-mono vitals-scale-in"
      style={{ color: zone.color, backgroundColor: `${zone.color}15`, borderColor: `${zone.color}30` }}
    >
      {zone.name}
    </span>
  );
}

/* ── Time Window Selector ─────────────────────────────────────── */
export function TimeWindowPicker({ value, onChange }) {
  const opts = [10, 30, 60];
  return (
    <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/5 gap-0.5">
      {opts.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className="px-3 py-1 rounded-lg text-[10px] font-bold font-mono uppercase transition-all"
          style={{
            background: value === o ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: value === o ? 'var(--color-pulse-cyan)' : '#6b7280',
            border: value === o ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
          }}>
          {o}s
        </button>
      ))}
    </div>
  );
}

/* ── Chart Toggle ─────────────────────────────────────────────── */
export function ChartToggle({ options, value, onChange }) {
  return (
    <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/5 gap-0.5">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className="px-3 py-1 rounded-lg text-[10px] font-bold font-mono uppercase transition-all"
          style={{
            background: value === o.id ? `${o.color}18` : 'transparent',
            color: value === o.id ? o.color : '#6b7280',
            border: value === o.id ? `1px solid ${o.color}30` : '1px solid transparent',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Alert Banner ─────────────────────────────────────────────── */
export function AlertBanner({ alert, onDismiss }) {
  const isWarn = alert.severity === 'CRITICAL';
  const color = isWarn ? '#FF4560' : '#fbbf24';
  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3 border text-xs vitals-slide-in-right"
      style={{ background: `${color}10`, borderColor: `${color}30` }}
    >
      <span className="animate-live w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-gray-200 flex-1" style={{ color }}>{alert.message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-gray-500 hover:text-white flex-shrink-0 text-[10px]">✕</button>
      )}
    </div>
  );
}
