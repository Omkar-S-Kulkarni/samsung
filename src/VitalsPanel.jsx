/**
 * VitalsPanel — Production-quality Real-Time Health Dashboard
 * ============================================================
 * Composed of modular sub-components, driven by Zustand store.
 * All graphs update live without reloads.
 */
import { useCallback } from 'react';

import { Heart, Activity, Droplets, Footprints, Wifi, WifiOff, Zap } from 'lucide-react';

// Store
import useVitalsStore from './store/vitalsStore';

// Components
import { StatCard, SignalBadge, LiveBadge, AlertBanner } from './components/VitalsComponents';
import LiveHeartRateGraph from './components/LiveHeartRateGraph';
import HRVTrendGraph from './components/HRVTrendGraph';
import ActivityIntensityGraph from './components/ActivityIntensityGraph';
import StepCountTracker from './components/StepCountTracker';
import SpO2Display from './components/SpO2Display';
import MultiSignalChart from './components/MultiSignalChart';

/* ── Helper: format time ────────────────────────────────────── */
function fmtTime(date) {
  if (!date) return '--:--:--';
  return new Date(date).toLocaleTimeString([], { hour12: false });
}

/* ── Vitals summary cards row ───────────────────────────────── */
function VitalsSummaryRow({ hr, hrv, spO2, activityIntensity, activityZone }) {
  const hrStatus = hr > 100 ? 'High' : hr < 50 ? 'Low' : 'Normal';
  const hrColor = hr > 100 ? '#FF4560' : hr < 50 ? '#fbbf24' : 'var(--color-pulse-cyan)';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* HR */}
      <StatCard
        icon={Heart}
        title="Heart Rate"
        value={hr}
        unit="bpm"
        color={hrColor}
        pulse
        badge={<LiveBadge color={hrColor} />}
        subtext={`Status: ${hrStatus}`}
      />

      {/* HRV */}
      <StatCard
        icon={Activity}
        title="HRV (RMSSD)"
        value={hrv}
        unit="ms"
        color="var(--color-pulse-green)"
        badge={<span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Variability</span>}
        subtext={hrv >= 45 ? '↑ Good Recovery' : hrv >= 30 ? '→ Moderate' : '↓ Low — Rest'}
      />

      {/* SpO2 */}
      <StatCard
        icon={Droplets}
        title="Blood Oxygen"
        value={spO2 ?? '—'}
        unit={spO2 ? '%' : ''}
        color={spO2 >= 95 ? 'var(--color-pulse-green)' : spO2 >= 90 ? '#fbbf24' : '#FF4560'}
        badge={
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
            style={{
              color: spO2 >= 95 ? '#39FF6A' : spO2 >= 90 ? '#fbbf24' : '#FF4560',
              borderColor: spO2 >= 95 ? '#39FF6A33' : spO2 >= 90 ? '#fbbf2433' : '#FF456033',
              backgroundColor: spO2 >= 95 ? '#39FF6A10' : spO2 >= 90 ? '#fbbf2410' : '#FF456010',
            }}>
            SpO₂
          </span>
        }
        subtext={spO2 >= 95 ? 'Optimal' : spO2 >= 90 ? 'Monitor closely' : 'Seek attention!'}
      />

      {/* Activity */}
      <StatCard
        icon={Footprints}
        title="Activity Zone"
        value={activityZone.name}
        unit=""
        color={activityZone.color}
        badge={
          <span className="text-[9px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
            {activityIntensity.toFixed(0)}%
          </span>
        }
        subtext={`Intensity load: ${activityIntensity.toFixed(0)}%`}
      />
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function VitalsPanel() {
  // Pull everything from the store
  const {
    hr, hrv, spO2, activityIntensity, steps,
    hrHistory, hrvHistory, intensityHistory, spO2History,
    activityZone, signalQuality, lastUpdated, isConnected,
    alerts,
    timeWindow, setTimeWindow,
  } = useVitalsStore();

  const handleDismissAlert = useCallback((idx) => {
    useVitalsStore.setState(s => ({
      alerts: s.alerts.filter((_, i) => i !== idx)
    }));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar p-4 pb-28 md:pb-6 w-full max-w-7xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2 vitals-fade-in"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-[var(--color-pulse-cyan)] animate-live" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-mono uppercase">
              Vitals Intelligence
            </h1>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest">
            REAL-TIME SENSOR FUSION  •  {fmtTime(lastUpdated)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SignalBadge quality={signalQuality} />

          <div className="flex items-center gap-2 glass-card px-3 py-2 rounded-full border"
            style={{ borderColor: isConnected ? 'rgba(57,255,106,0.2)' : 'rgba(255,69,96,0.2)' }}>
            {isConnected
              ? <Wifi size={14} className="text-[var(--color-pulse-green)]" />
              : <WifiOff size={14} className="text-[#FF4560]" />
            }
            <span className="text-[10px] font-mono font-bold" style={{ color: isConnected ? 'var(--color-pulse-green)' : '#FF4560' }}>
              {isConnected ? 'Backend Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────── */}
      <>
        {alerts.map((alert, i) => (
          <AlertBanner key={i} alert={alert} onDismiss={() => handleDismissAlert(i)} />
        ))}
      </>

      {/* ── Summary Cards ──────────────────────────────────────── */}
      <VitalsSummaryRow
        hr={hr} hrv={hrv} spO2={spO2}
        activityIntensity={activityIntensity}
        activityZone={activityZone}
      />

      {/* ── Live Heart Rate Graph (full width) ─────────────────── */}
      <LiveHeartRateGraph
        hrHistory={hrHistory}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
      />

      {/* ── HRV + Activity (2-col) ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <HRVTrendGraph
          hrvHistory={hrvHistory}
          currentHrv={hrv}
        />
        <ActivityIntensityGraph
          intensityHistory={intensityHistory}
          currentIntensity={activityIntensity}
          activityZone={activityZone}
        />
      </div>

      {/* ── Steps + SpO2 (2-col) ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StepCountTracker steps={steps} />
        <SpO2Display spO2={spO2} spO2History={spO2History} />
      </div>

      {/* ── Multi-Signal Overlay (full width) ──────────────────── */}
      <MultiSignalChart
        hrHistory={hrHistory}
        hrvHistory={hrvHistory}
        intensityHistory={intensityHistory}
        timeWindow={timeWindow}
      />

      {/* ── Neural Insights ─────────────────────────────────────── */}
      <div
        className="glass-card rounded-3xl p-5 vitals-slide-up"
        style={{ animationDelay: '0.4s' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[var(--color-pulse-cyan)]/10 border border-[var(--color-pulse-cyan)]/20">
            <Zap size={18} className="text-[var(--color-pulse-cyan)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Neural Insights</h3>
            <p className="text-[10px] text-gray-500 font-mono">AI-generated biometric analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              label: 'HRV Correlation',
              color: 'var(--color-pulse-cyan)',
              text: hrv >= 45
                ? 'Parasympathetic activity dominant. Optimal recovery state.'
                : 'Sympathetic drive elevated. Consider rest or relaxation.',
            },
            {
              label: 'Activity Sync',
              color: 'var(--color-pulse-green)',
              text: `HR and intensity are ${Math.abs(hr - 72) < 15 ? 'well correlated' : 'diverging'}. Metabolic efficiency ${activityZone.zone <= 2 ? 'is high' : 'is strained'}.`,
            },
            {
              label: 'O₂ Status',
              color: spO2 >= 95 ? 'var(--color-pulse-green)' : '#fbbf24',
              text: spO2 >= 95
                ? 'Blood oxygen is optimal. Aerobic performance at peak capacity.'
                : 'SpO₂ slightly reduced. Limit high-intensity activity.',
            },
          ].map(insight => (
            <div key={insight.label}
              className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: insight.color }}>
                {insight.label}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer for mobile nav */}
      <div className="h-4" />
    </div>
  );
}
