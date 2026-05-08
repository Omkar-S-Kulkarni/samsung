import { create } from 'zustand';

const HISTORY_LEN = 60; // Keep 60 samples (60s at 1s interval)
const GOAL_STEPS = 10000;

/**
 * Push a new value into a fixed-length history array.
 * Oldest sample is dropped when limit is reached.
 */
function pushHistory(arr, value, limit = HISTORY_LEN) {
  const next = [...arr, value];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

/**
 * Derive simple RMSSD-like HRV from a window of HR values.
 * In production this would come from the backend; here we simulate.
 */
function deriveHRV(hrHistory) {
  if (hrHistory.length < 2) return 52;
  const diffs = hrHistory.slice(1).map((v, i) => Math.abs(v - hrHistory[i]));
  const rmssd = Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / diffs.length);
  // Scale to realistic ms range 20–80
  return Math.max(20, Math.min(80, Math.round(rmssd * 8 + 30)));
}

/**
 * Map HR + activity to activity zone.
 */
function getActivityZone(hr, intensity) {
  if (intensity < 10 && hr < 65) return { name: 'Rest', color: '#60a5fa', zone: 0 };
  if (intensity < 30 || hr < 80) return { name: 'Light', color: '#34d399', zone: 1 };
  if (intensity < 60 || hr < 110) return { name: 'Moderate', color: '#fbbf24', zone: 2 };
  if (intensity < 80 || hr < 140) return { name: 'High', color: '#f87171', zone: 3 };
  return { name: 'Peak', color: '#e879f9', zone: 4 };
}

/**
 * Compute signal quality based on variance and missing data.
 */
function computeSignalQuality(hrHistory) {
  if (hrHistory.length < 5) return { score: 100, label: 'Good', color: '#39FF6A' };
  const mean = hrHistory.reduce((s, v) => s + v, 0) / hrHistory.length;
  const variance = hrHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / hrHistory.length;
  const noise = Math.sqrt(variance);
  if (noise < 3) return { score: 98, label: 'Excellent', color: '#39FF6A' };
  if (noise < 6) return { score: 88, label: 'Good', color: '#39FF6A' };
  if (noise < 12) return { score: 72, label: 'Moderate', color: '#fbbf24' };
  return { score: 50, label: 'Poor', color: '#FF4560' };
}

const useVitalsStore = create((set) => ({
  // ── Core Vitals ──────────────────────────────────────────────
  hr: 72,
  hrv: 52,
  spO2: 98,
  activityIntensity: 20,
  steps: 4500,
  stressScore: 35,
  unifiedScore: 72.5,

  // ── History Arrays (for graphs) ──────────────────────────────
  hrHistory: Array.from({ length: HISTORY_LEN }, () => 72),
  hrvHistory: Array.from({ length: HISTORY_LEN }, () => 52),
  intensityHistory: Array.from({ length: HISTORY_LEN }, () => 20),
  spO2History: Array.from({ length: HISTORY_LEN }, () => 98),
  stressHistory: Array.from({ length: HISTORY_LEN }, () => 35),

  // ── Derived State ────────────────────────────────────────────
  activityZone: getActivityZone(72, 20),
  signalQuality: { score: 98, label: 'Excellent', color: '#39FF6A' },
  goalSteps: GOAL_STEPS,

  // ── Backend State ────────────────────────────────────────────
  backendState: null,
  twin: null,
  rewards: null,
  isConnected: false,
  lastUpdated: null,
  alerts: [],

  // ── Time Window Selection ────────────────────────────────────
  timeWindow: 30, // seconds to display
  setTimeWindow: (w) => set({ timeWindow: w }),

  // ── Active Chart View ────────────────────────────────────────
  chartView: 'hr', // 'hr' | 'hrv' | 'intensity' | 'combined'
  setChartView: (v) => set({ chartView: v }),

  // ── Update Vitals (called by polling loop) ───────────────────
  updateVitals: (newHr, newIntensity, newSpO2, newStress) => set((state) => {
    const hrH = pushHistory(state.hrHistory, newHr);
    const intH = pushHistory(state.intensityHistory, newIntensity);
    const spO2H = pushHistory(state.spO2History, newSpO2);
    const stressH = pushHistory(state.stressHistory, newStress);
    const newHrv = deriveHRV(hrH);
    const hrvH = pushHistory(state.hrvHistory, newHrv);

    return {
      hr: newHr,
      hrv: newHrv,
      spO2: newSpO2,
      activityIntensity: newIntensity,
      stressScore: newStress,
      hrHistory: hrH,
      hrvHistory: hrvH,
      intensityHistory: intH,
      spO2History: spO2H,
      stressHistory: stressH,
      activityZone: getActivityZone(newHr, newIntensity),
      signalQuality: computeSignalQuality(hrH),
      lastUpdated: new Date(),
    };
  }),

  setBackendState: (data) => set({
    backendState: data,
    twin: data?.twin,
    rewards: data?.rewards,
    unifiedScore: data?.unified_score ?? 72.5,
    isConnected: true,
    steps: data?.twin?.daily_steps ?? 4500,
    alerts: [],
  }),

  setSteps: (s) => set({ steps: s }),
  setConnected: (b) => set({ isConnected: b }),
  addAlert: (a) => set(s => ({ alerts: [a, ...s.alerts].slice(0, 10) })),
  clearAlerts: () => set({ alerts: [] }),
}));

export { getActivityZone, computeSignalQuality, HISTORY_LEN, GOAL_STEPS };
export default useVitalsStore;
