import React from 'react';
import { DroneState, Mission } from '../types';
import { Activity, Gauge, Battery, Crosshair, Target, AlertTriangle, MapPin, CheckCircle2, MousePointer2 } from 'lucide-react';

interface HUDProps {
  stats: DroneState | null;
  mission: Mission | null;
  isMissionComplete: boolean;
}

export const HUD: React.FC<HUDProps> = ({ stats, mission, isMissionComplete }) => {
  if (!stats) return null;

  const speed = Math.sqrt(stats.velocity.x ** 2 + stats.velocity.y ** 2 + stats.velocity.z ** 2) * 3.6; // m/s to km/h approx
  const altitude = stats.position.y - 0.5; // Relative to ground
  const throttlePct = Math.round(stats.throttle * 100);
  const isLowThrottle = stats.throttle < 0.35 && altitude < 1.0;
  
  if (stats.status === 'CRASHED') {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 backdrop-blur-sm z-50 animate-in fade-in">
            <div className="text-center space-y-4 p-8 bg-black/80 border-2 border-red-600 rounded-xl shadow-2xl shadow-red-900/50">
                <AlertTriangle className="w-24 h-24 text-red-500 mx-auto animate-bounce" />
                <h1 className="text-6xl font-bold text-red-500 tracking-tighter">CRITICAL FAILURE</h1>
                <p className="text-red-200 font-mono text-xl">SYSTEM DESTROYED - COLLISION DETECTED</p>
                <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors uppercase tracking-widest">
                    Reboot System
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none text-cyan-400 font-mono text-sm overflow-hidden">
      
      {/* Center Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
        <Crosshair size={48} strokeWidth={1} />
      </div>
      
      {/* Artificial Horizon Lines (Simplified) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-1 bg-cyan-500/20" 
           style={{ transform: `translate(-50%, -50%) rotate(${-stats.rotation.z}rad) translateY(${stats.rotation.x * 100}px)` }} />

      {/* Warnings */}
      {isLowThrottle && (
         <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-pulse">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mb-1" />
            <span className="text-yellow-500 font-bold tracking-widest bg-black/50 px-2 rounded">INCREASE THROTTLE [SPACE]</span>
         </div>
      )}

      {/* Left Panel - Flight Data */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 space-y-4 bg-black/40 p-4 rounded border border-cyan-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Gauge className="w-5 h-5" />
          <div>
            <p className="text-xs text-cyan-600">THRUST</p>
            <div className="w-32 h-2 bg-gray-800 rounded overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${throttlePct > 90 ? 'from-red-600 to-red-400' : 'from-cyan-600 to-cyan-400'}`} style={{ width: `${throttlePct}%` }}></div>
            </div>
            <span className="text-lg">{throttlePct}%</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" />
          <div>
            <p className="text-xs text-cyan-600">ALTITUDE</p>
            <span className="text-lg">{Math.max(0, altitude).toFixed(1)}m</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Target className="w-5 h-5" />
          <div>
            <p className="text-xs text-cyan-600">SPEED</p>
            <span className="text-lg">{speed.toFixed(1)} km/h</span>
          </div>
        </div>
      </div>

      {/* Objective Marker / Compass */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="bg-black/40 px-6 py-2 rounded border border-cyan-900/50">
            <span className="text-xl font-bold">{(Math.abs((stats.rotation.y * 180 / Math.PI) % 360)).toFixed(0)}°</span>
        </div>
        
        {mission && stats.distanceToObjective !== null && (
             <div className={`px-4 py-1 rounded flex items-center gap-2 ${isMissionComplete ? 'bg-green-900/80 text-green-400 border-green-500' : 'bg-cyan-900/80 border-cyan-500'} border`}>
                {isMissionComplete ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
                <span className="font-bold">{isMissionComplete ? 'OBJECTIVE COMPLETE' : `${stats.distanceToObjective.toFixed(0)}m TO TARGET`}</span>
             </div>
        )}
      </div>

      {/* Right Panel - Mission & Status */}
      <div className="absolute right-8 top-8 w-72 space-y-2">
        <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-cyan-900/50">
           <span className="text-xs text-cyan-600">SYSTEM STATUS</span>
           <span className="text-green-500 text-xs">ONLINE</span>
        </div>

        <div className="bg-black/60 p-4 rounded border-l-2 border-cyan-500 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
             <h3 className="font-bold text-white flex items-center gap-2">
               <Battery className="w-4 h-4" />
               BATTERY
             </h3>
             <span className={`${stats.battery < 20 ? 'text-red-500 blink' : 'text-cyan-400'}`}>
               {stats.battery}%
             </span>
          </div>
          
          {mission ? (
            <div className="mt-4 pt-4 border-t border-cyan-900/50 animate-in fade-in slide-in-from-right duration-700">
              <p className="text-xs text-cyan-600 uppercase tracking-wider mb-1">Current Mission</p>
              <p className={`font-bold text-sm mb-1 ${isMissionComplete ? 'text-green-400' : 'text-white'}`}>
                {isMissionComplete ? 'MISSION ACCOMPLISHED' : mission.objective}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">{mission.briefing}</p>
              <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-cyan-900/30 text-[10px] text-cyan-200 border border-cyan-800">
                DIFFICULTY: {mission.difficulty.toUpperCase()}
              </div>
            </div>
          ) : (
             <div className="mt-4 pt-4 border-t border-cyan-900/50 text-center py-4 text-gray-500 italic text-xs">
               No active mission. Awaiting orders...
             </div>
          )}
        </div>
      </div>

      {/* Bottom Center - Controls Helper */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="text-[10px] text-cyan-600 animate-pulse tracking-widest flex items-center gap-2">
              <MousePointer2 size={12} />
              CLICK SCREEN TO ENABLE MOUSE LOOK • ESC TO RELEASE
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-[10px] md:text-xs text-gray-400 bg-black/80 px-6 py-3 rounded-xl border border-white/10">
            <span className="flex items-center gap-1"><span className="bg-gray-800 px-1.5 py-0.5 rounded text-white">W/S</span> PITCH</span>
            <span className="flex items-center gap-1"><span className="bg-gray-800 px-1.5 py-0.5 rounded text-white">A/D</span> ROLL</span>
            <span className="flex items-center gap-1"><span className="bg-gray-800 px-1.5 py-0.5 rounded text-white">SPACE/SHIFT</span> THROTTLE</span>
            <span className="flex items-center gap-1"><span className="bg-gray-800 px-1.5 py-0.5 rounded text-white">Q/E</span> YAW</span>
          </div>
      </div>
    </div>
  );
};