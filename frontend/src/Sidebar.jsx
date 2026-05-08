import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { label: "Intelligence Pipeline", path: "/pipeline", icon: "hub" },
    { label: "Orchestration", path: "/", icon: "grid_view" },
    { label: "Route Plan", path: "/route-plan", icon: "map" },
    { label: "Simulation", path: "/simulation", icon: "compass" },
    { label: "Zonal Analysis", path: "/zonal", icon: "analytics" },
    { label: "Shelter Status", path: "/shelter", icon: "shield" },
    { label: "Replan Log", path: "/replan", icon: "history" },
    { label: "Real-Time Events", path: "/events", icon: "notifications" },
    { label: "Daily Reports", path: "/reports", icon: "description" },
    { label: "Privacy Dashboard", path: "/privacy", icon: "security" },
    { label: "Device Sync", path: "/sync", icon: "sync" },
    { label: "Post Analysis", path: "/analysis", icon: "insert_chart" }
  ];

  return (
    <aside className="w-64 bg-surface border-r border-surface-border flex flex-col p-5 sticky left-0 h-[calc(100vh-65px)]">

      {/* Header Info */}
      <div className="mb-10 space-y-1">
        <div className="text-[9px] text-surface-muted uppercase tracking-[0.2em] font-bold font-mono">
          SYSTEM_STATUS_INDICATOR
        </div>
        <div className="text-lg font-black text-primary tracking-tight leading-none">
          KINETIC_COMMAND
        </div>
        <div className="text-[9px] text-surface-muted font-mono">
          SECTOR_7_ACTIVE // AUTH_STP_44
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 transition-all group ${isActive
                ? "bg-primary text-white dark:text-black shadow-[0_0_20px_rgba(170,255,220,0.2)]"
                : "text-surface-muted hover:text-surface-foreground hover:bg-surface-accent"
                }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isActive ? "text-white dark:text-black" : "text-surface-muted group-hover:text-primary"}`}>
                {item.icon === "hub" && "⎇"}
                {item.icon === "grid_view" && "⊞"}
                {item.icon === "map" && "🗺️"}
                {item.icon === "compass" && "🧭"}
                {item.icon === "analytics" && "▥"}
                {item.icon === "shield" && "🛡"}
                {item.icon === "history" && "🕒"}
                {item.icon === "notifications" && "🔔"}
                {item.icon === "description" && "📄"}
                {item.icon === "security" && "🔒"}
                {item.icon === "sync" && "🔄"}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Action */}
      <div className="mt-auto pt-6 border-t border-surface-border">
        <button className="w-full bg-red-500/10 text-red-500 border border-red-500/30 py-3 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-red-500 hover:text-white transition-all group active:scale-[0.98]">
          EMERGENCY REPLAN
        </button>
      </div>

    </aside>
  );
}
