import React, { useState } from 'react';

export default function PrivacyDashboard() {
  const [permissions, setPermissions] = useState({
    location: true,
    sensorData: true,
    telemetry: false,
    analytics: true
  });

  const togglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteData = () => {
    if (window.confirm("Are you sure you want to delete all local data? This action cannot be reversed.")) {
      localStorage.clear();
      alert("All local data has been erased.");
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-surface-border pb-2">
         <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
            Privacy Dashboard
          </span>
          <div className="h-4 w-px bg-surface-border"></div>
          <span className="text-[10px] font-mono text-surface-muted uppercase tracking-widest">
            Data_Security_Module
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Indicators */}
        <div className="bg-surface-panel border border-emerald-500/30 p-5 relative overflow-hidden flex items-center justify-between">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <span className="material-symbols-outlined text-8xl text-emerald-500">lock</span>
           </div>
           <div>
             <span className="text-[10px] font-bold text-surface-muted uppercase tracking-[0.1em]">Encryption Status</span>
             <h3 className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
               <span className="material-symbols-outlined">shield</span>
               AES-256 ACTIVE
             </h3>
           </div>
           <div className="text-right">
             <div className="text-[10px] font-mono text-surface-muted">End-to-End</div>
             <div className="text-xs font-bold text-emerald-500 mt-1">SECURED</div>
           </div>
        </div>

        <div className="bg-surface-panel border border-surface-border p-5 relative overflow-hidden flex items-center justify-between">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <span className="material-symbols-outlined text-8xl">database</span>
           </div>
           <div>
             <span className="text-[10px] font-bold text-surface-muted uppercase tracking-[0.1em]">Data Stored Locally</span>
             <h3 className="text-2xl font-black text-surface-foreground mt-1 flex items-center gap-2">
               <span className="material-symbols-outlined">hard_drive</span>
               ON-DEVICE ONLY
             </h3>
           </div>
           <div className="text-right">
             <div className="text-[10px] font-mono text-surface-muted">Cloud Backup</div>
             <div className="text-xs font-bold text-orange-400 mt-1">DISABLED</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Permissions Overview */}
        <div className="bg-surface-panel border border-surface-border flex flex-col overflow-hidden">
           <div className="px-4 py-3 border-b border-surface-border bg-surface-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-primary">admin_panel_settings</span>
            <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Permissions Overview</span>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto">
             <div className="flex items-center justify-between p-3 border border-surface-border bg-surface">
               <div>
                 <h4 className="text-xs font-bold text-surface-foreground">Location Services</h4>
                 <p className="text-[10px] text-surface-muted mt-1">Required for accurate routing and geospatial analysis.</p>
               </div>
               <button 
                 onClick={() => togglePermission('location')}
                 className={`w-10 h-5 rounded-full relative transition-colors ${permissions.location ? 'bg-primary' : 'bg-surface-muted'}`}
               >
                 <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${permissions.location ? 'translate-x-5' : ''}`}></span>
               </button>
             </div>
             
             <div className="flex items-center justify-between p-3 border border-surface-border bg-surface">
               <div>
                 <h4 className="text-xs font-bold text-surface-foreground">Live Sensor Data Integration</h4>
                 <p className="text-[10px] text-surface-muted mt-1">Allows pulling realtime feeds from municipal sensors.</p>
               </div>
               <button 
                 onClick={() => togglePermission('sensorData')}
                 className={`w-10 h-5 rounded-full relative transition-colors ${permissions.sensorData ? 'bg-primary' : 'bg-surface-muted'}`}
               >
                 <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${permissions.sensorData ? 'translate-x-5' : ''}`}></span>
               </button>
             </div>

             <div className="flex items-center justify-between p-3 border border-surface-border bg-surface">
               <div>
                 <h4 className="text-xs font-bold text-surface-foreground">Anonymous Telemetry</h4>
                 <p className="text-[10px] text-surface-muted mt-1">Send crash logs and performance metrics to developers.</p>
               </div>
               <button 
                 onClick={() => togglePermission('telemetry')}
                 className={`w-10 h-5 rounded-full relative transition-colors ${permissions.telemetry ? 'bg-primary' : 'bg-surface-muted'}`}
               >
                 <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${permissions.telemetry ? 'translate-x-5' : ''}`}></span>
               </button>
             </div>

             <div className="flex items-center justify-between p-3 border border-surface-border bg-surface">
               <div>
                 <h4 className="text-xs font-bold text-surface-foreground">Post-Incident Analytics</h4>
                 <p className="text-[10px] text-surface-muted mt-1">Aggregate system data for weekly intelligence reports.</p>
               </div>
               <button 
                 onClick={() => togglePermission('analytics')}
                 className={`w-10 h-5 rounded-full relative transition-colors ${permissions.analytics ? 'bg-primary' : 'bg-surface-muted'}`}
               >
                 <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${permissions.analytics ? 'translate-x-5' : ''}`}></span>
               </button>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Data Usage Transparency */}
          <div className="bg-surface-panel border border-surface-border flex flex-col flex-1 overflow-hidden">
             <div className="px-4 py-3 border-b border-surface-border bg-surface-muted flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-blue-400">visibility</span>
              <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Data Usage Transparency</span>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
               <p className="text-xs text-surface-muted mb-4 leading-relaxed">
                 Unisys acts solely as an orchestrator. Your operational data never leaves the active session perimeter without explicit permission.
               </p>
               <div className="flex gap-3 text-xs border-b border-surface-border pb-3">
                 <span className="font-mono font-bold text-emerald-400">ALLOW</span>
                 <span className="text-surface-foreground">Local model inference for Evacuation Logic</span>
               </div>
               <div className="flex gap-3 text-xs border-b border-surface-border pb-3">
                 <span className="font-mono font-bold text-red-400">BLOCK</span>
                 <span className="text-surface-foreground">Third-party data harvesting scripts</span>
               </div>
               <div className="flex gap-3 text-xs">
                 <span className="font-mono font-bold text-orange-400">WARN</span>
                 <span className="text-surface-foreground">Connecting to external municipal APIs</span>
               </div>
            </div>
          </div>

          {/* Delete All Data Option */}
          <div className="bg-red-500/5 border border-red-500/20 flex flex-col p-5">
             <div className="flex items-center gap-3 mb-3">
               <span className="material-symbols-outlined text-red-500">warning</span>
               <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider">Danger Zone</h3>
             </div>
             <p className="text-xs text-surface-muted mb-4">
               Permanently erase all locally stored data, simulation cache, and event logs. This action cannot be reversed.
             </p>
             <button onClick={handleDeleteData} className="bg-red-500/10 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white transition-all py-2 px-4 text-xs font-bold uppercase tracking-widest self-start">
               Delete All Data
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
