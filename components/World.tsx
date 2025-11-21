import React, { useRef } from 'react';
import { Sky, Cloud, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Obstacle } from '../types';

interface WorldProps {
  obstacles: Obstacle[];
  objectivePosition: [number, number, number] | null;
}

interface BuildingProps {
  position: [number, number, number];
  size: [number, number, number];
}

const Building: React.FC<BuildingProps> = ({ position, size }) => {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial 
        color="#9ca3af" 
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
};

const Tree: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
       {/* Trunk */}
       <mesh position={[0, 1, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[0.3, 0.4, 2, 6]} />
         <meshStandardMaterial color="#5c4033" roughness={1} />
       </mesh>
       {/* Leaves */}
       <mesh position={[0, 3, 0]} castShadow receiveShadow>
         <coneGeometry args={[1.5, 4, 8]} />
         <meshStandardMaterial color="#2d4c1e" roughness={1} />
       </mesh>
    </group>
  )
}

const ObjectiveMarker: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const ref = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y += 0.02;
            ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <group position={position} ref={ref}>
                {/* Outer Ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[3, 0.2, 16, 32]} />
                    <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={2} toneMapped={false} />
                </mesh>
                 {/* Inner Ring */}
                 <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[2, 0.1, 16, 32]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} toneMapped={false} />
                </mesh>
                {/* Beacon Beam */}
                <mesh position={[0, -50, 0]}>
                    <cylinderGeometry args={[0.1, 0.1, 100, 8]} />
                    <meshBasicMaterial color="#00ffcc" opacity={0.3} transparent />
                </mesh>
            </group>
        </Float>
    );
}

export const World: React.FC<WorldProps> = ({ obstacles, objectivePosition }) => {
  return (
    <group>
      <Sky sunPosition={[100, 20, 100]} inclination={0.5} azimuth={0.25} turbidity={10} rayleigh={0.5} />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
      />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#5fab23" roughness={1} />
      </mesh>
      
      {/* Obstacles */}
      {obstacles.map((obj, i) => {
          if (obj.type === 'building') {
              return <Building key={i} position={obj.position} size={obj.size} />;
          } else {
              return <Tree key={i} position={obj.position} />;
          }
      })}

      {/* Objective */}
      {objectivePosition && <ObjectiveMarker position={objectivePosition} />}

      {/* Clouds */}
      <Cloud opacity={0.5} position={[0, 50, -100]} />
      <Cloud opacity={0.5} position={[100, 40, 50]} />
      <Cloud opacity={0.5} position={[-100, 60, 50]} />
    </group>
  );
};