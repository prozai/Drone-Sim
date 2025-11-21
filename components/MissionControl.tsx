import React, { useState } from 'react';
import { generateMission } from '../services/geminiService';
import { Mission } from '../types';
import { Radio, Loader2, Command } from 'lucide-react';

interface MissionControlProps {
  onMissionStart: (mission: Mission) => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ onMissionStart }) => {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Default open on start

  const handleGenerate = async (difficulty: string) => {
    setLoading(true);
    try {
      const mission = await generateMission(difficulty);
      onMissionStart(mission);
      setIsOpen(false); // Minimize after generation to focus on flying
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute bottom-8 left-8 pointer-events-auto z-50 bg-cyan-900/80 hover:bg-cyan-800 text-cyan-100 p-3 rounded-full shadow-lg border border-cyan-500/50 transition-all"
      >
        <Command size={24} />
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-cyan-500/30 p-8 rounded-xl shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, cyan 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6 text-cyan-400">
            <Radio className={`w-6 h-6 ${loading ? 'animate-pulse' : ''}`} />
            <h2 className="text-2xl font-bold tracking-wider">MISSION CONTROL</h2>
          </div>

          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Welcome, Pilot. Connect to the central AI mainframe to generate your flight directives. 
            Select your preferred difficulty level to receive a procedural mission briefing.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {['Easy', 'Medium', 'Hard'].map((level) => (
              <button
                key={level}
                disabled={loading}
                onClick={() => handleGenerate(level)}
                className="py-3 px-4 rounded bg-gray-800 hover:bg-cyan-900/50 border border-gray-700 hover:border-cyan-500 text-gray-300 hover:text-white transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {level}
              </button>
            ))}
          </div>
          
          {loading && (
            <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm py-2 animate-pulse">
              <Loader2 className="animate-spin w-4 h-4" />
              <span>Decrypting Mission Data...</span>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center">
             <span className="text-xs text-gray-500">V.1.0.4 SYSTEM READY</span>
             <button onClick={() => setIsOpen(false)} className="text-xs text-gray-400 hover:text-white underline">
               Free Flight Mode
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};