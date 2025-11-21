import React, { useState, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { World } from './components/World';
import { Drone } from './components/Drone';
import { HUD } from './components/HUD';
import { MissionControl } from './components/MissionControl';
import { DroneState, Mission, Obstacle } from './types';

const App: React.FC = () => {
  const [droneStats, setDroneStats] = useState<DroneState | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [objectivePos, setObjectivePos] = useState<[number, number, number] | null>(null);
  const [missionComplete, setMissionComplete] = useState(false);

  // Generate World Data Once
  const obstacles = useMemo(() => {
    const items: Obstacle[] = [];
    
    // Buildings
    for (let i = 0; i < 30; i++) {
      const width = 5 + Math.random() * 10;
      const depth = 5 + Math.random() * 10;
      const height = 8 + Math.random() * 30;
      const x = (Math.random() - 0.5) * 300;
      const z = (Math.random() - 0.5) * 300;
      
      // Keep spawn area clear
      if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
      
      items.push({
        type: 'building',
        position: [x, height / 2, z],
        size: [width, height, depth]
      });
    }

    // Trees
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;
      
      // Keep spawn area clear
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;
      
      // Avoid overlapping buildings
      const colliding = items.some(b => 
        b.type === 'building' &&
        Math.abs(b.position[0] - x) < b.size[0]/2 + 3 && 
        Math.abs(b.position[2] - z) < b.size[2]/2 + 3
      );
      
      if (!colliding) {
        items.push({
          type: 'tree',
          position: [x, 0, z],
          size: [1.5, 4, 1.5] // Approximate tree collider size
        });
      }
    }
    return items;
  }, []);

  const handleMissionStart = (mission: Mission) => {
    // Pick a random building or open spot as the objective target
    const randomObstacle = obstacles[Math.floor(Math.random() * obstacles.length)];
    // Set target high up in the air or near a building
    const target: [number, number, number] = [
        randomObstacle.position[0], 
        randomObstacle.size[1] + 5, // Above the object
        randomObstacle.position[2]
    ];
    
    setObjectivePos(target);
    setActiveMission(mission);
    setMissionComplete(false);
  };

  const handleObjectiveReached = () => {
    if (!missionComplete) {
        setMissionComplete(true);
        // Keep the mission active in UI but show success
    }
  };

  return (
    <div className="w-full h-full relative bg-black">
      {/* 3D Scene */}
      <Canvas shadows camera={{ fov: 60 }}>
        <fog attach="fog" args={['#87CEEB', 10, 250]} />
        <Suspense fallback={null}>
          <World obstacles={obstacles} objectivePosition={objectivePos} />
          <Drone 
            onUpdateStats={setDroneStats} 
            obstacles={obstacles}
            objectivePosition={objectivePos}
            onObjectiveReached={handleObjectiveReached}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <HUD stats={droneStats} mission={activeMission} isMissionComplete={missionComplete} />
      
      {/* Mission Generator Modal */}
      <MissionControl onMissionStart={handleMissionStart} />
      
      {/* Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.4) 100%)' }}></div>
    </div>
  );
};

export default App;