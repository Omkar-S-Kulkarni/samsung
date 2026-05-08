import React, { useState, useEffect } from 'react';
import { 
  Network, Activity, Cpu, Shield, Brain, Zap, Database, ArrowRight, ActivitySquare,
  Thermometer, Radar, Fingerprint, Merge, MemoryStick, MessagesSquare, Lightbulb, User, ShieldCheck, Timer, Signal, HelpCircle, Layers
} from 'lucide-react';

import DataLayer from './components/pipeline/DataLayer';
import ModelLayer from './components/pipeline/ModelLayer';
import DigitalTwinLayer from './components/pipeline/DigitalTwinLayer';
import SystemLayer from './components/pipeline/SystemLayer';

const PIPELINE_SECTIONS = [
  { id: '1_main', label: '1. Architecture Pipeline', icon: Network, group: 'Overview' },
  { id: '2_sensors', label: '2. Live Sensor Input', icon: Activity, group: 'Ingestion' },
  { id: '3_preprocess', label: '3. Preprocessing', icon: ActivitySquare, group: 'Ingestion' },
  { id: '4_features', label: '4. Feature Engineering', icon: Radar, group: 'Ingestion' },
  { id: '5_models', label: '5. Model Execution', icon: Cpu, group: 'Intelligence' },
  { id: '6_fusion', label: '6. Multi-Modal Fusion', icon: Merge, group: 'Intelligence' },
  { id: '7_rag', label: '7. RAG Memory DB', icon: Database, group: 'Intelligence' },
  { id: '8_reasoning', label: '8. LLM Reasoning', icon: Brain, group: 'Intelligence' },
  { id: '9_prediction', label: '9. Prediction Engine', icon: Lightbulb, group: 'Output' },
  { id: '10_twin', label: '10. Digital Twin Simulation', icon: User, group: 'Output' },
  { id: '11_safety', label: '11. Safety Engine', icon: ShieldCheck, group: 'Output' },
  { id: '12_perf', label: '12. Performance Metrics', icon: Timer, group: 'System' },
  { id: '13_edge', label: '13. Edge AI Execution', icon: Signal, group: 'System' },
  { id: '14_explain', label: '14. Explainability Panel', icon: HelpCircle, group: 'System' },
];

export default function PipelineVisualizer() {
  const [activeSection, setActiveSection] = useState('1_main');

  const [simState, setSimState] = useState({
    hrShift: 0,
    stressMode: false,
    workoutMode: false,
    sleepDeprived: false,
    networkStatus: 'online'
  });

  const updateSim = (key, val) => setSimState(p => ({ ...p, [key]: val }));

  const renderSection = () => {
    switch(activeSection) {
      case '1_main': case '2_sensors': case '3_preprocess': case '4_features':
        return <DataLayer section={activeSection} simState={simState} updateSim={updateSim} />;
      case '5_models': case '6_fusion': case '7_rag': case '8_reasoning':
        return <ModelLayer section={activeSection} simState={simState} updateSim={updateSim} />;
      case '9_prediction': case '10_twin': case '11_safety':
        return <DigitalTwinLayer section={activeSection} simState={simState} updateSim={updateSim} />;
      case '12_perf': case '13_edge': case '14_explain':
        return <SystemLayer section={activeSection} simState={simState} updateSim={updateSim} />;
      default: return <div>Select a section</div>;
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden text-white pt-2">
      <div className="w-64 border-r border-white/5 bg-black/20 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Layers className="text-[var(--color-pulse-cyan)]" size={18} />
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">Pipeline Demo</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
          {['Overview', 'Ingestion', 'Intelligence', 'Output', 'System'].map(group => (
            <div key={group} className="mb-4">
              <div className="text-[9px] uppercase tracking-widest text-gray-500 font-mono px-3 mb-1">{group}</div>
              {PIPELINE_SECTIONS.filter(s => s.group === group).map(section => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-all ${
                      isActive ? 'bg-[var(--color-pulse-cyan)]/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                    }`}
                  >
                    <section.icon size={14} className={isActive ? 'text-[var(--color-pulse-cyan)]' : 'text-gray-500'} />
                    <span className="text-xs font-mono truncate">{section.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 h-full overflow-y-auto relative hide-scrollbar">
        {renderSection()}
      </div>
    </div>
  );
}
