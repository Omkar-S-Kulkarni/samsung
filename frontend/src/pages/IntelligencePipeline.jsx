import React, { useState, useEffect } from 'react';
import { useGlobalSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import cityData from '../data/city-model.json';

const GEO_COORDS = {
  Z01: [12.9698, 77.7499], Z02: [12.9279, 77.6271], Z03: [12.9121, 77.6446],
  Z04: [12.8601, 77.7850], Z05: [12.9716, 77.6411], Z06: [12.9880, 77.6690],
  Z07: [12.9304, 77.6784], Z08: [12.9569, 77.7011], Z09: [12.9166, 77.6101],
  Z10: [12.8399, 77.6770], Z11: [13.0354, 77.5988], Z12: [13.1007, 77.5963]
};

export default function IntelligencePipeline() {
  const { data } = useGlobalSocket();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (data?.tick) setTick(data.tick);
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-surface text-surface-foreground p-6 space-y-6 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-surface-border pb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tighter uppercase">Intelligence_Data_Pipeline</h1>
          <p className="text-xs font-mono text-primary tracking-[0.3em] uppercase">Adeo_Core_Inference_Engine // Live_Monitoring</p>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="text-[10px] text-surface-muted font-black uppercase">System_Tick</div>
            <div className="text-lg font-mono text-emerald-400">TICK_{tick.toString().padStart(4, '0')}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-surface-muted font-black uppercase">Engine_Status</div>
            <div className="text-lg font-mono text-blue-400">STABLE</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: Raw & Preprocessing */}
        <div className="space-y-6">
          {/* Raw Input Stream */}
          <div className="bg-surface-panel border border-surface-border rounded-xl p-5 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent"></div>
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Raw_Sensor_Ingest
            </h3>
            <div className="bg-surface-muted rounded-lg p-4 font-mono text-[10px] text-primary/70 h-64 overflow-hidden relative border border-surface-border">
              <div className="animate-scrolling-text space-y-1">
                {Array.from({length: 20}).map((_, i) => (
                  <div key={i}>
                    {`{ "node": "Z${(i%12+1).toString().padStart(2, '0')}", "type": "IOT_FLOW", "val": ${(Math.random()*10).toFixed(2)}, "ts": "${new Date().toISOString()}" }`}
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface pointer-events-none"></div>
            </div>
          </div>

          {/* Data Refinery */}
          <div className="bg-surface-panel border border-surface-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Autonomous_Preprocessing_Steps</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Coordinate_Mapping', desc: 'OSM_NODE_ALIGNMENT', stat: 'OK' },
                { title: 'Flood_Normalization', desc: 'SCALING_VECTOR_V1', stat: '98.4%' },
                { title: 'Priority_Weighting', desc: 'HEURISTIC_SCORE_ENGINE', stat: 'ACTIVE' }
              ].map((step, i) => (
                <div key={i} className="bg-surface-muted border border-surface-border p-4 rounded-lg flex flex-col gap-2 group hover:border-indigo-500/50 transition-all">
                  <span className="text-[10px] font-black text-indigo-400">{step.title}</span>
                  <span className="text-[8px] font-mono text-surface-muted uppercase">{step.desc}</span>
                  <div className="mt-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded w-fit">{step.stat}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: LLM & Zonal Output */}
        <div className="space-y-6">
          {/* Neural Processing Terminal (Replaces LLM Core) */}
          <div className="bg-surface-panel border border-purple-500/30 rounded-xl p-0 relative overflow-hidden h-[300px] flex flex-col shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            {/* Terminal Header */}
            <div className="bg-purple-500/10 border-b border-purple-500/20 px-4 py-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                </div>
                <span className="text-[10px] font-mono text-purple-400 font-bold tracking-widest ml-2">OLLAMA_NEURAL_LINK // LLM_CORE_V4</span>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-[9px] font-mono text-purple-300 animate-pulse">STATUS: INFERENCING</span>
                 <span className="text-[9px] font-mono text-gray-500">42 t/s</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-4 font-mono text-[11px] space-y-2 overflow-hidden relative">
               {/* Scanline Effect */}
               <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
               
               <div className="animate-terminal-scroll space-y-2">
                 <div className="text-purple-400 opacity-80">{`[SYSTEM] Initializing weight matrix... DONE`}</div>
                 <div className="text-emerald-500/70 font-mono">{`[GIN] 2026/04/30 - 13:54:26 | 200 | 14.205s | 127.0.0.1 | POST "/api/generate"`}</div>
                 <div className="text-blue-400">{`> PROMPT_IN: "Evaluate Z07 flood risk based on sensor_77.68"`}</div>
                 <div className="text-surface-muted pl-4">{`[THINKING] Analyzing hydrology vectors... Cross-referencing OSM road network...`}</div>
                 <div className="text-emerald-500/70 font-mono">{`[GIN] 2026/04/30 - 13:54:32 | 200 |  5.787s | 127.0.0.1 | POST "/api/generate"`}</div>
                 <div className="text-emerald-400">{`> RESPONSE: "Z07 risk high (9.2). Critical blockage at Z07_ORR_INTERSECTION. Priority 1 evacuation suggested."`}</div>
                 <div className="text-emerald-500/70 font-mono">{`[GIN] 2026/04/30 - 13:54:48 | 200 |  2.855ms| 127.0.0.1 | GET  "/api/tags"`}</div>
                 
                 <div className="text-purple-400 opacity-80">{`[SYSTEM] Context window optimized (4096 tokens)`}</div>
                 <div className="text-emerald-500/70 font-mono">{`[GIN] 2026/04/30 - 13:55:11 | 200 | 12.797s | 127.0.0.1 | POST "/api/generate"`}</div>
                 <div className="text-blue-400">{`> PROMPT_IN: "Recalculate route efficiency for Z08_S01"`}</div>
                 <div className="text-surface-muted pl-4">{`[THINKING] Traversing Dijsktra-Ollivier mesh... Calculating congestion delta...`}</div>
                 <div className="text-emerald-500/70 font-mono">{`[GIN] 2026/04/30 - 13:55:21 | 200 |  2.659ms| 127.0.0.1 | GET  "/api/tags"`}</div>
                 <div className="text-emerald-400">{`> RESPONSE: "Route optimal. Expected latency 4.2m per unit."`}</div>
                 
                 <div className="text-red-500/70 font-mono">{`[GIN] 2026/04/30 - 13:55:36 | 500 | 14.979s | 127.0.0.1 | POST "/api/generate"`}</div>
                 <div className="text-yellow-400">{`[WARN] Model temp spike: 0.85 -> 0.92 | Adjusting...`}</div>
                 <div className="text-surface-muted font-mono">{`time=2026-04-30T14:02:51.602+05:30 level=INFO source=server.go:444 msg="starting runner" cmd="ollama.exe runner --ollama-engine --port 57477"`}</div>
                 <div className="text-purple-400 opacity-80">{`[SYSTEM] KV_Cache sync complete.`}</div>
                 
                 <div className="text-emerald-500/70 font-mono">{`[GIN] 2026/04/30 - 14:08:21 | 200 | 14.539ms| 127.0.0.1 | GET  "/api/tags"`}</div>
                 <div className="text-blue-400">{`> PROMPT_IN: "Status check Z12"`}</div>
                 <div className="text-emerald-500/70 font-mono">{`[GIN] 2026/04/30 - 13:56:49 | 200 | 13.403s | 127.0.0.1 | POST "/api/generate"`}</div>
                 <div className="text-emerald-400">{`> RESPONSE: "Z12 stable. No immediate threats."`}</div>
               </div>
            </div>

            {/* Terminal Footer */}
            <div className="p-3 bg-purple-500/5 border-t border-purple-500/10 flex items-center gap-4">
               <div className="flex-1 flex flex-col gap-1">
                 <div className="flex justify-between text-[8px] font-mono text-purple-400">
                    <span>QWEN_2.5_CODER_7B</span>
                    <span>94% CONFIDENCE</span>
                 </div>
                 <div className="h-1 bg-purple-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-[94%] shadow-[0_0_10px_#a855f7]"></div>
                 </div>
               </div>
               <div className="flex-1 flex flex-col gap-1">
                 <div className="flex justify-between text-[8px] font-mono text-blue-400">
                    <span>LLAMA_3.1_8B</span>
                    <span>88% CONFIDENCE</span>
                 </div>
                 <div className="h-1 bg-blue-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[88%] shadow-[0_0_10px_#3b82f6]"></div>
                 </div>
               </div>
            </div>
          </div>

          {/* Zonal Division & Risk Grid */}
          <div className="bg-surface-panel border border-surface-border rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-primary uppercase tracking-widest">Tactical_Zonal_Stratification</h3>
              <span className="text-[10px] font-mono text-emerald-500/50">12_NODES_DETECTION</span>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {Array.from({length: 12}).map((_, i) => {
                const id = `Z${(i+1).toString().padStart(2, '0')}`;
                const liveZone = data?.city_model?.zones?.find(z => z.id === id);
                const risk = liveZone?.risk_score ?? 0;
                return (
                  <div 
                    key={id} 
                    onClick={() => {
                      // Remapped Z01 to bellandur and Z02 to marathahalli per user request
                      let zoneKey = id;
                      if (id === 'Z01') zoneKey = 'bellandur';
                      if (id === 'Z02') zoneKey = 'marathahalli';
                      
                      navigate('/route-plan', { state: { autoSelectZone: zoneKey } });
                    }}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all group hover:scale-105 cursor-pointer ${
                      risk >= 9 ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                      risk >= 7 ? 'bg-orange-500/20 border-orange-500/50' :
                      'bg-surface-muted border-surface-border'
                    }`}
                  >
                    <span className="text-xs font-black text-surface-foreground group-hover:text-primary transition-colors">{id}</span>
                    <div className="text-[10px] font-mono font-bold text-surface-muted">{risk.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Footer / Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="bg-surface-panel border border-surface-border p-4 rounded-xl flex items-center gap-4">
           <div className="text-3xl">🎯</div>
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-surface-muted uppercase tracking-widest">Target_Acquisition</span>
             <span className="text-sm font-bold text-surface-foreground uppercase">Top 3 Critical Zones identified</span>
           </div>
        </div>
        <div className="bg-surface-panel border border-surface-border p-4 rounded-xl flex items-center gap-4">
           <div className="text-3xl">⚖️</div>
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-surface-muted uppercase tracking-widest">Decision_Governance</span>
             <span className="text-sm font-bold text-surface-foreground uppercase">Automated Route Prioritization</span>
           </div>
        </div>
        <div className="bg-surface-panel border border-surface-border p-4 rounded-xl flex items-center gap-4">
           <div className="text-3xl">🛡️</div>
           <div className="flex flex-col">
             <span className="text-[10px] font-black text-surface-muted uppercase tracking-widest">System_Safety</span>
             <span className="text-sm font-bold text-surface-foreground uppercase">Zero Failure Pathfinding Active</span>
           </div>
        </div>
      </div>

      <style>
        {`
          @keyframes scrollText { from { transform: translateY(0); } to { transform: translateY(-50%); } }
          @keyframes terminalScroll { 
            0% { transform: translateY(0); }
            10% { transform: translateY(-30px); }
            20% { transform: translateY(-60px); }
            30% { transform: translateY(-90px); }
            40% { transform: translateY(-120px); }
            50% { transform: translateY(-150px); }
            60% { transform: translateY(-180px); }
            70% { transform: translateY(-210px); }
            80% { transform: translateY(-240px); }
            90% { transform: translateY(-270px); }
            100% { transform: translateY(-300px); }
          }
          .animate-scrolling-text { animation: scrollText 20s linear infinite; }
          .animate-terminal-scroll { animation: terminalScroll 15s steps(20) infinite; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        `}
      </style>
    </div>
  );
}
