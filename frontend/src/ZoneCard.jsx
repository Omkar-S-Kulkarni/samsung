import React from 'react'
export default function ZoneCard({ id, name, score, status, recommendation }) {
  const statusColors = {
    CRITICAL: "border-error text-error bg-error/10 cursor-crosshair hover:bg-surface-container-high",
    HIGH: "border-secondary text-secondary bg-secondary/10 hover:bg-surface-container-high",
    MOD: "border-[#fcd34d] text-[#fcd34d] bg-[#fcd34d]/10",
    STABLE: "border-primary text-primary bg-primary/10",
  };

  const statusBorderAndTextColor = {
    CRITICAL: "text-error border-error",
    HIGH: "text-secondary border-secondary",
    MOD: "text-[#fcd34d] border-[#fcd34d]",
    STABLE: "text-primary border-primary",
  };

  const statusBgColor = {
    CRITICAL: "bg-error/10",
    HIGH: "bg-secondary/10",
    MOD: "bg-[#fcd34d]/10",
    STABLE: "bg-primary/10",
  };

  const statusTextColor = {
    CRITICAL: "text-error",
    HIGH: "text-secondary",
    MOD: "text-[#fcd34d]",
    STABLE: "text-primary",
  };
  
  const statusBorderColor = {
    CRITICAL: "border-error",
    HIGH: "border-secondary",
    MOD: "border-[#fcd34d]",
    STABLE: "border-primary",
  };

  const isCriticalHover = status === 'CRITICAL' ? 'hover:bg-surface-container-high cursor-crosshair' : '';

  return (
    <div className={`bg-surface-container border-t-2 ${statusBorderColor[status]} p-3 group ${isCriticalHover}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-label text-[10px] text-slate-400">ZONE_{id}</span>
        <span className={`${statusBgColor[status]} ${statusTextColor[status]} px-1 text-[9px] font-bold`}>
          {status}
        </span>
      </div>
      <div className="text-lg font-black font-headline mb-1 uppercase">{name}</div>
      <div className="flex items-end justify-between">
        <div className={`text-2xl font-label ${statusTextColor[status]}`}>{score}</div>
        <div className={`text-[10px] font-label ${statusTextColor[status]} uppercase font-bold`}>
          {recommendation}
        </div>
      </div>
    </div>
  );
}