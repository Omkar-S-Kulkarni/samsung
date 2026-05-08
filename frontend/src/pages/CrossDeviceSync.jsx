import React, { useState, useEffect } from 'react';

export default function CrossDeviceSync() {
  const [autoSync, setAutoSync] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Synced'); // Synced, Syncing, Offline
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());

  const transferLogs = [
    { id: 1, file: 'evac_route_data.json', size: '45 KB', time: '10:45 AM', status: 'Success' },
    { id: 2, file: 'zonal_risk_profile.bin', size: '1.2 MB', time: '10:42 AM', status: 'Success' },
    { id: 3, file: 'sensor_net_telemetry.log', size: '8.4 MB', time: '10:30 AM', status: 'Success' },
    { id: 4, file: 'auth_token_refresh', size: '2 KB', time: '10:15 AM', status: 'Success' },
  ];

  const handleManualSync = () => {
    setSyncStatus('Syncing...');
    setTimeout(() => {
      setSyncStatus('Synced');
      setLastSync(new Date().toLocaleTimeString());
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-surface-border pb-2">
         <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
            Cross-Device Sync
          </span>
          <div className="h-4 w-px bg-surface-border"></div>
          <span className="text-[10px] font-mono text-surface-muted uppercase tracking-widest">
            Mobile_Relay_Link
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-surface-panel border border-surface-border p-5 col-span-2 relative overflow-hidden flex items-center justify-between">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-primary/20">
             {syncStatus === 'Syncing...' && <div className="h-full bg-primary animate-pulse w-1/3 mx-auto"></div>}
           </div>
           
           <div className="flex items-center gap-6 z-10">
             <div className="bg-surface p-4 rounded-full border border-surface-border relative">
                <span className="material-symbols-outlined text-4xl text-surface-foreground">devices</span>
                {syncStatus === 'Synced' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-surface-panel flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-white">check</span>
                  </div>
                )}
             </div>
             
             <div>
               <span className="text-[10px] font-bold text-surface-muted uppercase tracking-[0.1em]">Target: Command Tablet Alpha</span>
               <h3 className="text-2xl font-black mt-1 flex items-center gap-3">
                 Status: <span className={syncStatus === 'Syncing...' ? 'text-orange-400' : 'text-emerald-400'}>{syncStatus}</span>
                 {syncStatus === 'Syncing...' && <span className="material-symbols-outlined animate-spin text-orange-400">sync</span>}
               </h3>
               <div className="text-[10px] font-mono text-surface-muted mt-2">
                 Last successful sync: {lastSync}
               </div>
             </div>
           </div>

           <div className="z-10 flex flex-col gap-3">
             <button 
               onClick={handleManualSync}
               disabled={syncStatus === 'Syncing...'}
               className="bg-primary text-surface px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
             >
               <span className="material-symbols-outlined text-[16px]">sync</span>
               Force Sync
             </button>
           </div>
        </div>

        {/* Sync Controls */}
        <div className="bg-surface-panel border border-surface-border p-5 flex flex-col justify-center">
           <span className="text-[10px] font-bold text-surface-muted uppercase tracking-[0.1em] mb-4">Sync Controls</span>
           
           <div className="flex items-center justify-between p-3 border border-surface-border bg-surface mb-3">
             <div>
               <h4 className="text-xs font-bold text-surface-foreground">Auto-Sync Link</h4>
               <p className="text-[10px] text-surface-muted mt-1">Keep devices in parity.</p>
             </div>
             <button 
               onClick={() => setAutoSync(!autoSync)}
               className={`w-10 h-5 rounded-full relative transition-colors ${autoSync ? 'bg-primary' : 'bg-surface-muted'}`}
             >
               <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoSync ? 'translate-x-5' : ''}`}></span>
             </button>
           </div>

           <div className="flex items-center justify-between p-3 border border-surface-border bg-surface opacity-50 cursor-not-allowed">
             <div>
               <h4 className="text-xs font-bold text-surface-foreground">Sync over Cellular</h4>
               <p className="text-[10px] text-surface-muted mt-1">Wi-Fi only selected.</p>
             </div>
             <button disabled className="w-10 h-5 rounded-full bg-surface-muted relative">
               <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full"></span>
             </button>
           </div>
        </div>
      </div>

      {/* Transfer Logs */}
      <div className="bg-surface-panel border border-surface-border flex flex-col flex-1 overflow-hidden">
         <div className="px-4 py-3 border-b border-surface-border bg-surface-muted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-primary">swap_vert</span>
            <span className="text-[10px] font-bold text-surface-foreground tracking-[0.1em] uppercase">Data Transfer Logs</span>
          </div>
          <span className="text-[9px] font-mono text-surface-muted uppercase">Showing latest 50 entries</span>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
             <thead className="bg-surface sticky top-0">
               <tr className="text-surface-muted border-b border-surface-border">
                  <th className="font-normal py-3 px-4 uppercase tracking-widest">Time</th>
                  <th className="font-normal py-3 px-4 uppercase tracking-widest">Payload</th>
                  <th className="font-normal py-3 px-4 uppercase tracking-widest text-right">Size</th>
                  <th className="font-normal py-3 px-4 uppercase tracking-widest text-right">Status</th>
               </tr>
             </thead>
             <tbody className="text-surface-foreground">
                {transferLogs.map((log) => (
                  <tr key={log.id} className="border-b border-surface-border hover:bg-surface-accent transition-colors">
                     <td className="py-3 px-4 text-surface-muted">{log.time}</td>
                     <td className="py-3 px-4 text-emerald-400">{log.file}</td>
                     <td className="py-3 px-4 text-right text-surface-muted">{log.size}</td>
                     <td className="py-3 px-4 text-right font-bold text-primary">{log.status}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
