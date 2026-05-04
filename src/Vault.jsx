import React from 'react';
import { Lock, Shield, RefreshCw, Smartphone, Eye, Trash2, Download } from 'lucide-react';

const Toggle = ({ enabled, onChange, label, sublabel, icon: Icon }) => (
  <div className="flex items-center justify-between p-4 glass-card rounded-2xl border border-white/5">
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-lg ${enabled ? 'bg-[var(--color-pulse-cyan)]/20 text-[var(--color-pulse-cyan)]' : 'bg-white/5 text-gray-500'}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-sm font-bold text-white">{label}</div>
        <div className="text-[10px] text-gray-500">{sublabel}</div>
      </div>
    </div>
    <button 
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-[var(--color-pulse-cyan)]' : 'bg-white/10'}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-7' : 'left-1'}`}></div>
    </button>
  </div>
);

export default function Vault({ privacy }) {
  const [permissions, setPermissions] = React.useState({
    biometrics: true,
    location: false,
    cloud: false
  });

  const syncStatus = {
    connected: true,
    last_sync: '2 mins ago',
    pending: 0
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-6 hide-scrollbar flex flex-col w-full max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Vault</h1>
        <div className="flex items-center gap-1.5 bg-[var(--color-pulse-cyan)]/10 border border-[var(--color-pulse-cyan)]/20 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,229,255,0.1)]">
          <Shield size={12} className="text-[var(--color-pulse-cyan)]" />
          <span className="text-[10px] font-medium tracking-wide text-[var(--color-pulse-cyan)] uppercase">Military Grade AES-256</span>
        </div>
      </div>

      {/* Sync Status */}
      <div className="glass-card rounded-2xl p-5 mb-8 flex items-center justify-between bg-gradient-to-r from-[var(--color-pulse-cyan)]/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Smartphone size={32} className="text-white opacity-20" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--color-pulse-green)] rounded-full border-2 border-[var(--color-pulse-bg)]"></div>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Cross-Device Sync</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Status: Connected to Galaxy S24</div>
          </div>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Permissions Section */}
      <div className="mb-8">
        <h2 className="text-xs text-[var(--color-pulse-cyan)] uppercase tracking-widest mb-4 font-mono">Data Sovereignty</h2>
        <div className="space-y-3">
          <Toggle 
            label="On-Device Encryption" 
            sublabel="All health data is encrypted before saving" 
            enabled={true} 
            icon={Lock} 
            onChange={() => {}} 
          />
          <Toggle 
            label="Biometric Processing" 
            sublabel="Allow heart rate and HRV intelligence" 
            enabled={permissions.biometrics} 
            icon={Shield} 
            onChange={() => setPermissions({...permissions, biometrics: !permissions.biometrics})} 
          />
          <Toggle 
            label="Zero Cloud Leakage" 
            sublabel="Prevents any data from leaving the device" 
            enabled={!permissions.cloud} 
            icon={Eye} 
            onChange={() => setPermissions({...permissions, cloud: !permissions.cloud})} 
          />
        </div>
      </div>

      {/* Data Management Section */}
      <div className="mb-8">
        <h2 className="text-xs text-[var(--color-pulse-cyan)] uppercase tracking-widest mb-4 font-mono">Visibility & Portability</h2>
        <div className="grid grid-cols-2 gap-3">
           <button className="flex items-center justify-center gap-2 p-4 glass-card rounded-2xl border border-white/5 text-gray-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
             <Download size={16} /> Export JSON
           </button>
           <button className="flex items-center justify-center gap-2 p-4 glass-card rounded-2xl border border-white/5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-sm font-medium">
             <Trash2 size={16} /> Purge Vault
           </button>
        </div>
      </div>

      <div className="mt-auto p-4 rounded-xl bg-[var(--color-pulse-cyan)]/5 border border-[var(--color-pulse-cyan)]/10 text-center">
        <p className="text-[10px] text-gray-500 font-mono italic">
          Your master key is stored in the Secure Element. ADEO engineers cannot access your data.
        </p>
      </div>
    </div>
  );
}
