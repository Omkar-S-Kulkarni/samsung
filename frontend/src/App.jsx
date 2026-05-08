import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { Routes, Route } from "react-router-dom";
import Orchestration from "./pages/Orchestration";
import ZonalAnalysis from "./pages/ZonalAnalysis";
import ShelterStatus from "./pages/ShelterStatus";
import ReplanLog from "./pages/ReplanLog";
import RoutePlan from "./pages/RoutePlan";
import SimulationMap from "./pages/SimulationMap";
import PostAnalysis from "./pages/PostAnalysis";
import { SocketProvider } from "./context/SocketContext";
import SevereZoneOverlay from "./components/SevereZoneOverlay";
import AnalysisPanel from "./components/AnalysisPanel";
import RealtimeEvents from "./pages/RealtimeEvents";
import DailyReports from "./pages/DailyReports";
import PrivacyDashboard from "./pages/PrivacyDashboard";
import CrossDeviceSync from "./pages/CrossDeviceSync";
import IntelligencePipeline from "./pages/IntelligencePipeline";

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [showSevereOverlay, setShowSevereOverlay] = useState(false);
  const [analysisMode, setAnalysisMode] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("adeo_theme");
    setTheme(stored === "light" ? "light" : "dark");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    window.localStorage.setItem("adeo_theme", theme);
  }, [theme]);

  return (
    <SocketProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-surface text-surface-foreground">

        {/* Top Navbar */}
        <Navbar 
          theme={theme} 
          setTheme={setTheme} 
          onSevereClick={() => setShowSevereOverlay(true)} 
          analysisMode={analysisMode}
          setAnalysisMode={setAnalysisMode}
        />

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <Sidebar />

          {/* Page Content */}
          <main className="p-6 flex-1 overflow-y-auto no-scrollbar bg-surface">
            <Routes>
              <Route path="/pipeline" element={<IntelligencePipeline />} />
              <Route path="/" element={<Orchestration />} />
              <Route path="/route-plan" element={<RoutePlan />} />
              <Route path="/simulation" element={<SimulationMap />} />
              <Route path="/zonal" element={<ZonalAnalysis />} />
              <Route path="/shelter" element={<ShelterStatus />} />
              <Route path="/replan" element={<ReplanLog />} />
              <Route path="/events" element={<RealtimeEvents />} />
              <Route path="/reports" element={<DailyReports />} />
              <Route path="/privacy" element={<PrivacyDashboard />} />
              <Route path="/sync" element={<CrossDeviceSync />} />
              <Route path="/analysis" element={<PostAnalysis />} />
            </Routes>
          </main>

        </div>

        {/* Overlays */}
        <SevereZoneOverlay
          isOpen={showSevereOverlay}
          onClose={() => setShowSevereOverlay(false)}
        />

        <AnalysisPanel 
          isOpen={analysisMode} 
          onClose={() => setAnalysisMode(false)} 
        />

      </div>
    </SocketProvider>
  );
}
