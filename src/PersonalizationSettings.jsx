import { useState, useEffect, useCallback } from 'react';
import {
  Settings, User, Bell, ShieldAlert, Eye, EyeOff, Lock, Heart, Moon, Zap,
  Activity, Volume2, VolumeX, ChevronRight, RefreshCw, Check
} from 'lucide-react';

const API = 'http://localhost:8000';
const C = { cyan: '#00E5FF', green: '#39FF6A', amber: '#FF9A3C', red: '#f87171', purple: '#c084fc' };

const TONE_META = {
  strict:   { label: 'Clinical',     emoji: '🔬', color: C.cyan,   desc: 'Data-driven, precise, professional' },
  friendly: { label: 'Friendly',     emoji: '😊', color: C.green,  desc: 'Casual, conversational, encouraging' },
  coach:    { label: 'Motivational', emoji: '🏋️', color: C.amber, desc: 'Goal-focused, action-oriented, inspiring' },
};

const FREQ_OPTIONS = ['low', 'medium', 'high'];

/* ── Toggle Switch ── */
const Toggle = ({ enabled, onChange, label, sublabel, icon: Icon, color = C.cyan }) => (
  <div className="flex items-center justify-between p-4 rounded-2xl transition-all"
    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl" style={{ backgroundColor: enabled ? `${color}15` : 'rgba(255,255,255,0.04)', color: enabled ? color : '#6b7280' }}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        {sublabel && <div className="text-[10px] text-gray-500 mt-0.5">{sublabel}</div>}
      </div>
    </div>
    <button onClick={onChange}
      className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
      style={{ backgroundColor: enabled ? color : 'rgba(255,255,255,0.1)' }}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${enabled ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
);

/* ── Pill Selector ── */
const PillSelector = ({ options, value, onChange, color = C.cyan }) => (
  <div className="flex gap-2">
    {options.map(opt => (
      <button key={opt} onClick={() => onChange(opt)}
        className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border"
        style={value === opt
          ? { backgroundColor: `${color}20`, borderColor: `${color}50`, color: color }
          : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>
        {opt}
      </button>
    ))}
  </div>
);

/* ── Section Header ── */
const Section = ({ title, icon: Icon, color = C.cyan, children }) => (
  <div className="glass-card rounded-2xl p-6 vitals-slide-up">
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <h2 className="text-[11px] text-gray-400 font-mono uppercase tracking-widest font-bold">{title}</h2>
    </div>
    {children}
  </div>
);

/* ── Default Settings ── */
const DEFAULT_SETTINGS = {
  personality_mode: 'coach',
  notification_frequency: 'medium',
  alert_sensitivity: 'medium',
  privacy: { biometrics: true, location: false, cloud: false },
  data_visibility: { heart_rate: true, sleep: true, stress: true, activity: true },
};

/* ── Main Component ── */
export default function PersonalizationSettings({ user_id = 'react_user_1' }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/settings/${user_id}`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || DEFAULT_SETTINGS);
      }
    } catch {
      // Use defaults already set
    }
  }, [user_id]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (patch) => {
    const updated = { ...settings, ...patch };
    // Deep merge for nested objects
    if (patch.privacy) updated.privacy = { ...settings.privacy, ...patch.privacy };
    if (patch.data_visibility) updated.data_visibility = { ...settings.data_visibility, ...patch.data_visibility };
    setSettings(updated);

    setSaving(true);
    try {
      const body = { user_id };
      if (patch.personality_mode) body.personality_mode = patch.personality_mode;
      if (patch.notification_frequency) body.notification_frequency = patch.notification_frequency;
      if (patch.alert_sensitivity) body.alert_sensitivity = patch.alert_sensitivity;
      if (patch.privacy) {
        if (patch.privacy.biometrics !== undefined) body.privacy_biometrics = patch.privacy.biometrics;
        if (patch.privacy.location !== undefined) body.privacy_location = patch.privacy.location;
        if (patch.privacy.cloud !== undefined) body.privacy_cloud = patch.privacy.cloud;
      }
      if (patch.data_visibility) {
        if (patch.data_visibility.heart_rate !== undefined) body.data_visibility_hr = patch.data_visibility.heart_rate;
        if (patch.data_visibility.sleep !== undefined) body.data_visibility_sleep = patch.data_visibility.sleep;
        if (patch.data_visibility.stress !== undefined) body.data_visibility_stress = patch.data_visibility.stress;
        if (patch.data_visibility.activity !== undefined) body.data_visibility_activity = patch.data_visibility.activity;
      }
      await fetch(`${API}/settings/${user_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch { /* offline */ }
    setSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar w-full max-w-5xl mx-auto space-y-5">

      {/* ── HEADER ── */}
      <div className="flex justify-between items-center pt-2 vitals-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono uppercase flex items-center gap-2">
            <Settings className="text-[var(--color-pulse-cyan)]" /> Personalization
          </h1>
          <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">
            Customize your ADEO experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase"
              style={{ backgroundColor: `${C.green}15`, color: C.green, border: `1px solid ${C.green}30` }}>
              <Check size={12} /> Saved
            </div>
          )}
          <button onClick={fetchSettings} className="p-2 rounded-full hover:bg-white/5 transition-all text-gray-400 hover:text-white">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── PERSONALITY MODE ── */}
      <Section title="Coaching Personality" icon={User} color={C.purple}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(TONE_META).map(([key, meta]) => {
            const active = settings.personality_mode === key;
            return (
              <button key={key} onClick={() => updateSetting({ personality_mode: key })}
                className="p-5 rounded-2xl text-left transition-all relative overflow-hidden border"
                style={active
                  ? { backgroundColor: `${meta.color}12`, borderColor: `${meta.color}40`, boxShadow: `0 0 30px ${meta.color}10` }
                  : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5" style={{ backgroundColor: meta.color, filter: 'blur(20px)' }} />
                <div className="text-2xl mb-2">{meta.emoji}</div>
                <div className="text-sm font-bold text-white mb-1">{meta.label}</div>
                <div className="text-[10px] text-gray-400 leading-relaxed">{meta.desc}</div>
                {active && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: meta.color }}>
                    <Check size={10} className="text-[var(--color-pulse-bg)]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── NOTIFICATION & SENSITIVITY ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="Notification Frequency" icon={Bell} color={C.amber}>
          <PillSelector
            options={FREQ_OPTIONS}
            value={settings.notification_frequency}
            onChange={(v) => updateSetting({ notification_frequency: v })}
            color={C.amber}
          />
          <p className="text-[10px] text-gray-500 font-mono mt-3">
            {settings.notification_frequency === 'low' ? 'Only critical alerts' :
             settings.notification_frequency === 'high' ? 'All insights & recommendations' :
             'Important alerts & daily summaries'}
          </p>
        </Section>

        <Section title="Alert Sensitivity" icon={ShieldAlert} color={C.red}>
          <PillSelector
            options={FREQ_OPTIONS}
            value={settings.alert_sensitivity}
            onChange={(v) => updateSetting({ alert_sensitivity: v })}
            color={C.red}
          />
          <p className="text-[10px] text-gray-500 font-mono mt-3">
            {settings.alert_sensitivity === 'low' ? 'Trigger on major deviations only' :
             settings.alert_sensitivity === 'high' ? 'Trigger on any deviation from baseline' :
             'Trigger on moderate deviations'}
          </p>
        </Section>
      </div>

      {/* ── PRIVACY SETTINGS ── */}
      <Section title="Privacy & Security" icon={Lock} color={C.cyan}>
        <div className="space-y-3">
          <Toggle
            label="Biometric Processing"
            sublabel="Allow HR, HRV, SpO2, and stress intelligence"
            enabled={settings.privacy.biometrics}
            icon={Heart}
            color={C.cyan}
            onChange={() => updateSetting({ privacy: { biometrics: !settings.privacy.biometrics } })}
          />
          <Toggle
            label="Location Processing"
            sublabel="Enable location-aware insights"
            enabled={settings.privacy.location}
            icon={Activity}
            color={C.green}
            onChange={() => updateSetting({ privacy: { location: !settings.privacy.location } })}
          />
          <Toggle
            label="Cloud Sync"
            sublabel="Sync data across devices via secure cloud"
            enabled={settings.privacy.cloud}
            icon={Zap}
            color={C.amber}
            onChange={() => updateSetting({ privacy: { cloud: !settings.privacy.cloud } })}
          />
        </div>
        <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ background: `${C.cyan}08`, border: `1px solid ${C.cyan}15` }}>
          <Lock size={12} style={{ color: C.cyan }} />
          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">
            All data encrypted with AES-256-GCM on device
          </span>
        </div>
      </Section>

      {/* ── DATA VISIBILITY ── */}
      <Section title="Data Visibility Controls" icon={Eye} color={C.green}>
        <p className="text-[10px] text-gray-500 font-mono mb-4">Choose which metrics are displayed in dashboards</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'heart_rate', label: 'Heart Rate', icon: Heart, color: C.cyan },
            { key: 'sleep', label: 'Sleep Data', icon: Moon, color: C.purple },
            { key: 'stress', label: 'Stress & HRV', icon: Zap, color: C.amber },
            { key: 'activity', label: 'Activity', icon: Activity, color: C.green },
          ].map(item => (
            <button key={item.key}
              onClick={() => updateSetting({ data_visibility: { [item.key]: !settings.data_visibility[item.key] } })}
              className="flex items-center gap-3 p-4 rounded-2xl transition-all border"
              style={settings.data_visibility[item.key]
                ? { backgroundColor: `${item.color}10`, borderColor: `${item.color}30` }
                : { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', opacity: 0.5 }}>
              <item.icon size={18} style={{ color: settings.data_visibility[item.key] ? item.color : '#4b5563' }} />
              <span className="text-xs font-medium text-white">{item.label}</span>
              <div className="ml-auto">
                {settings.data_visibility[item.key]
                  ? <Eye size={14} style={{ color: item.color }} />
                  : <EyeOff size={14} className="text-gray-600" />}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <div className="h-4" />
    </div>
  );
}
