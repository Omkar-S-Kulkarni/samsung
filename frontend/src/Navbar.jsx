import { useState, useEffect, useRef } from "react";
import { useGlobalSocket } from "../context/SocketContext";

export default function Navbar({ theme, setTheme, onSevereClick, analysisMode, setAnalysisMode }) {
  const { sendCommand, simulationState } = useGlobalSocket();
  const { scenario, isRunning } = simulationState || {};
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    if (settingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [settingsOpen]);

  const handleScenarioChange = (newScenario) => {
    sendCommand("CHANGE_SCENARIO", newScenario);
    if (newScenario === "severe_flood" && onSevereClick) {
      onSevereClick();
    }
  };

  const handleControl = (controlType) => {
    sendCommand(controlType, null);
  };

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    setSettingsOpen(false);
  };

  const activeClass = "bg-primary text-white dark:text-black px-3 py-1 text-[10px] font-black tracking-wider shadow-[0_0_15px_rgba(170,255,220,0.3)] transition-all cursor-pointer";
  const inactiveClass = "border border-surface-border px-3 py-1 text-[10px] font-bold text-surface-muted hover:text-surface-foreground hover:border-gray-600 cursor-pointer transition-all";

  return (
    <header className="flex justify-between items-center w-full px-6 py-3 border-b border-surface-border bg-surface-navbar backdrop-blur-md sticky top-0 z-[3000]">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col -space-y-1">
          <span className="text-xl font-black tracking-[0.2em] text-primary">
            ADEO
          </span>
          <span className="text-[7px] text-gray-600 font-mono tracking-[0.3em] font-bold">
            V.1.7_ORCHESTRATOR
          </span>
        </div>

        {/* Toggle */}
        <div className="flex bg-surface-muted border border-surface-border p-0.5 rounded-sm">
          <button className="px-3 py-1 text-[10px] font-bold text-primary bg-primary/10 rounded-sm">
            SYNTHETIC
          </button>
          <button className="px-3 py-1 text-[10px] font-bold text-surface-muted hover:text-surface-foreground transition-colors">
            REAL
          </button>
        </div>

        {/* Disaster Types */}
        <div className="flex gap-1.5 items-center">
          <span
            onClick={() => handleScenarioChange("moderate_flood")}
            className={scenario === "moderate_flood" ? activeClass : inactiveClass}>
            MODERATE FLOOD
          </span>
          <span
            onClick={() => handleScenarioChange("severe_flood")}
            className={scenario === "severe_flood" ? activeClass : inactiveClass}>
            SEVERE FLOOD
          </span>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6">
        {/* Controls */}
        <div className="flex items-center gap-3 border-r border-surface-border pr-6">
          <button
            onClick={() => handleControl("PLAY_SIMULATION")}
            className={`transition-colors scale-90 ${isRunning ? "text-primary" : "text-surface-muted hover:text-primary"}`}>
            ▶
          </button>
          <button
            onClick={() => handleControl("PAUSE_SIMULATION")}
            className={`transition-colors scale-90 ${!isRunning ? "text-primary" : "text-surface-muted hover:text-primary"}`}>
            ❚❚
          </button>
          <button
            onClick={() => handleControl("STEP_SIMULATION")}
            className="text-surface-muted hover:text-primary transition-colors scale-90 font-bold px-1"
            title="Step Forward">
            +1
          </button>
          <button className="text-surface-muted hover:text-primary transition-colors scale-90 text-sm border-l border-surface-border pl-3">
            ?
          </button>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-5">
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen((open) => !open)}
              className="text-surface-muted cursor-pointer hover:text-surface-foreground transition-colors text-base"
              aria-label="Settings"
            >
              ⚙
            </button>
            {settingsOpen && (
              <div 
                className="absolute right-0 top-full mt-3 w-64 rounded-2xl border border-surface-border bg-surface-navbar p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl z-[2000]">
                <div className="mb-3 text-[10px] uppercase tracking-[0.32em] text-surface-muted">
                  UI SETTINGS
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-surface-border bg-surface-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-surface-muted">
                          Theme Mode
                        </div>
                        <div className="text-sm font-semibold text-surface-foreground">
                          {theme === "dark" ? "Dark Mode" : "Light Mode"}
                        </div>
                      </div>
                      <button
                        onClick={handleThemeToggle}
                        className="rounded-full bg-primary px-3 py-1 text-[10px] font-black text-white dark:text-black transition-colors hover:bg-primary/90"
                      >
                        Switch
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-surface-muted">
                          Analysis Mode
                        </div>
                        <div className="text-sm font-semibold text-surface-foreground">
                          {analysisMode ? "Enabled" : "Disabled"}
                        </div>
                      </div>
                      <button
                        onClick={() => setAnalysisMode(!analysisMode)}
                        className={`rounded-full px-3 py-1 text-[10px] font-black transition-all ${analysisMode ? 'bg-primary text-white dark:text-black shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-surface-border text-surface-muted'}`}
                      >
                        {analysisMode ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-muted p-3">
                    <div className="flex flex-col gap-2">
                       <div className="text-[11px] uppercase tracking-[0.24em] text-orange-400">
                          Emergency Actions
                       </div>
                       <button
                         onClick={() => {
                           sendCommand("SEND_EMERGENCY_NOTIFICATIONS", {});
                           setSettingsOpen(false);
                         }}
                         className="w-full rounded-xl bg-orange-600/20 border border-orange-500/50 py-2 text-[10px] font-black text-orange-400 transition-all hover:bg-orange-600/30 active:scale-95"
                       >
                         SEND EMERGENCY ALERTS
                       </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-muted p-3 text-[11px] text-surface-muted">
                    Use the settings menu to manage system alerts and switch between UI styles.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
