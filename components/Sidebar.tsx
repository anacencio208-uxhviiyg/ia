import React from 'react';
import { MISSION_STATS, CREW_MANIFEST } from '../constants';

const Sidebar: React.FC = () => {
  return (
    <div className="w-full md:w-80 bg-space-dark/80 border-r border-cyan-900/30 flex flex-col h-full backdrop-blur-sm overflow-y-auto">
      <div className="p-6 border-b border-cyan-900/30">
        <h1 className="text-2xl font-bold text-white tracking-widest font-mono">
          ARGO <span className="text-holo-cyan">IX</span>
        </h1>
        <p className="text-xs text-cyan-500/70 mt-1 font-mono tracking-wider">MISSION AURORA // CLASSIFIED</p>
      </div>

      <div className="p-6 space-y-8 flex-1">
        {/* Ship Status */}
        <div>
          <h2 className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-4 border-b border-cyan-900/50 pb-2">Ship Telemetry</h2>
          <div className="grid grid-cols-2 gap-3">
            {MISSION_STATS.map((stat, index) => (
              <div key={index} className="bg-cyan-950/20 border border-cyan-900/30 p-2 rounded">
                <p className="text-[10px] text-cyan-400/70 uppercase font-mono">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-mono text-white">{stat.value}</span>
                  {stat.unit && <span className="text-[10px] text-cyan-500">{stat.unit}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planet Target Info */}
        <div>
          <h2 className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-4 border-b border-cyan-900/50 pb-2">Target: Aurelis-3</h2>
          <div className="space-y-2 text-sm font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-cyan-500/70">System</span>
              <span>Helion</span>
            </div>
             <div className="flex justify-between">
              <span className="text-cyan-500/70">Radius</span>
              <span>1.2x Earth</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-500/70">Atmosphere</span>
              <span>N2/O2</span>
            </div>
             <div className="flex justify-between">
              <span className="text-cyan-500/70">Temp</span>
              <span>19°C Avg</span>
            </div>
          </div>
        </div>

        {/* Crew Manifest */}
        <div>
          <h2 className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-4 border-b border-cyan-900/50 pb-2">Crew Manifest</h2>
          <div className="space-y-2">
            {CREW_MANIFEST.map((crew, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm font-mono group">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-slate-300 group-hover:text-holo-cyan transition-colors">{crew.name}</span>
                </div>
                <span className="text-[10px] text-cyan-600 uppercase border border-cyan-900/50 px-1 rounded">{crew.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-cyan-900/30 text-[10px] font-mono text-cyan-800 text-center">
        SYS.VER.4.9.2 // ECHO INTEGRATED
      </div>
    </div>
  );
};

export default Sidebar;