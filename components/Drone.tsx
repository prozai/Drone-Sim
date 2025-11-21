import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Euler, Quaternion } from 'three';
import * as THREE from 'three';
import { DroneState, Obstacle } from '../types';

interface DroneProps {
  onUpdateStats: (stats: DroneState) => void;
  obstacles: Obstacle[];
  objectivePosition: [number, number, number] | null;
  onObjectiveReached: () => void;
}

// Physics Constants
const GRAVITY = 25; // Increased for heavier feel (drops faster)
const THRUST_POWER = 65; // Increased to compensate for gravity
const DRAG = 0.98;
const ROTATION_SPEED = 2.5;
const TILT_SPEED = 3.0;
const MAX_TILT = 0.6;
const HOVER_THROTTLE = 0.40; // Adjusted for new gravity/thrust ratio
const DRONE_RADIUS = 0.5; // Radius for center body
const PROP_COLLISION_RADIUS = 0.15; // Radius for prop tips
const THROTTLE_RESPONSE_SPEED = 2.0; // Controls how fast throttle input changes (0 to 1)

// Relative positions of the 4 propellers
const PROP_OFFSETS = [
  new Vector3(0.8, 0, 0.8),   // Front Left
  new Vector3(-0.8, 0, 0.8),  // Front Right
  new Vector3(0.8, 0, -0.8),  // Back Left
  new Vector3(-0.8, 0, -0.8)  // Back Right
];

export const Drone: React.FC<DroneProps> = ({ onUpdateStats, obstacles, objectivePosition, onObjectiveReached }) => {
  const droneRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  
  // Physics State
  const position = useRef(new Vector3(0, 2, 0));
  const velocity = useRef(new Vector3(0, 0, 0));
  const rotation = useRef(new Euler(0, 0, 0, 'YXZ'));
  const throttle = useRef(0);
  const isCrashed = useRef(false);
  const lastStatsUpdate = useRef(0);
  
  // Camera Orbit State (Azimuth, Elevation)
  const cameraOrbit = useRef({ theta: 0, phi: 0.2 }); // phi 0.2 starts looking slightly down

  // Input State
  const keys = useRef<{ [key: string]: boolean }>({});

  // Handle Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keys.current[e.code] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle Mouse Input (Camera)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === gl.domElement) {
            cameraOrbit.current.theta -= e.movementX * 0.005;
            cameraOrbit.current.phi -= e.movementY * 0.005;
            
            // Clamp vertical look (don't flip under ground or over top)
            cameraOrbit.current.phi = Math.max(-0.5, Math.min(1.2, cameraOrbit.current.phi));
        }
    };
    
    const onClick = () => {
        // Only request lock if not clicking on UI (which stops propagation usually, but good to be safe)
        if (!document.pointerLockElement) {
            gl.domElement.requestPointerLock();
        }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    gl.domElement.addEventListener('click', onClick);
    
    return () => {
        document.removeEventListener('mousemove', onMouseMove);
        gl.domElement.removeEventListener('click', onClick);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!droneRef.current) return;
    const dt = Math.min(delta, 0.1);
    const now = state.clock.elapsedTime;

    // Safety: Prevent NaN propagation
    if (isNaN(position.current.x)) position.current.set(0, 5, 0);
    if (isNaN(velocity.current.x)) velocity.current.set(0, 0, 0);

    // --- CRASHED STATE LOGIC ---
    if (isCrashed.current) {
        // Simple fall physics
        velocity.current.y -= GRAVITY * dt;
        position.current.add(velocity.current.clone().multiplyScalar(dt));
        
        // Floor collision
        if (position.current.y < 0.2) {
            position.current.y = 0.2;
            velocity.current.set(0, 0, 0);
        }
        
        droneRef.current.position.copy(position.current);
        
        // Throttle UI updates even when crashed
        if (now - lastStatsUpdate.current > 0.1) {
            lastStatsUpdate.current = now;
            onUpdateStats({
                position: position.current,
                velocity: velocity.current,
                rotation: rotation.current,
                throttle: 0,
                battery: 0,
                status: 'CRASHED',
                distanceToObjective: null
            });
        }
        return;
    }

    // --- 1. Handle Inputs ---
    
    // Yaw
    if (keys.current['ArrowLeft'] || keys.current['KeyQ']) rotation.current.y += ROTATION_SPEED * dt;
    if (keys.current['ArrowRight'] || keys.current['KeyE']) rotation.current.y -= ROTATION_SPEED * dt;

    // Throttle
    if (keys.current['ArrowUp'] || keys.current['Space']) {
        throttle.current = Math.min(throttle.current + dt * THROTTLE_RESPONSE_SPEED, 1);
    } else if (keys.current['ArrowDown'] || keys.current['ShiftLeft'] || keys.current['ShiftRight']) {
        throttle.current = Math.max(throttle.current - dt * THROTTLE_RESPONSE_SPEED, 0);
    }

    // Pitch & Roll
    let targetPitch = 0;
    if (keys.current['KeyW']) targetPitch = -MAX_TILT;
    if (keys.current['KeyS']) targetPitch = MAX_TILT;
    
    let targetRoll = 0;
    if (keys.current['KeyD']) targetRoll = -MAX_TILT; 
    if (keys.current['KeyA']) targetRoll = MAX_TILT; 

    // Takeoff Assist
    const isMovingInput = keys.current['KeyW'] || keys.current['KeyS'] || keys.current['KeyA'] || keys.current['KeyD'];
    if (isMovingInput && position.current.y < 1.0 && throttle.current < HOVER_THROTTLE) {
        throttle.current = THREE.MathUtils.lerp(throttle.current, HOVER_THROTTLE + 0.05, dt * 3);
    }

    rotation.current.x = THREE.MathUtils.lerp(rotation.current.x, targetPitch, dt * TILT_SPEED);
    rotation.current.z = THREE.MathUtils.lerp(rotation.current.z, targetRoll, dt * TILT_SPEED);

    // --- 2. Physics Calculation ---
    
    const quat = new Quaternion().setFromEuler(rotation.current);
    const upVector = new Vector3(0, 1, 0).applyQuaternion(quat);
    const thrustForce = upVector.multiplyScalar(throttle.current * THRUST_POWER);
    const gravityForce = new Vector3(0, -GRAVITY, 0);
    const acceleration = new Vector3().addVectors(thrustForce, gravityForce);
    
    velocity.current.add(acceleration.multiplyScalar(dt));
    velocity.current.multiplyScalar(DRAG);
    
    // Predict next position for collision check
    const nextPosition = position.current.clone().add(velocity.current.clone().multiplyScalar(dt));

    // --- 3. Collision Detection ---
    let collision = false;
    
    // 3a. Ground Physics (Center Body - Handles Landing)
    if (nextPosition.y < 0.5) {
      nextPosition.y = 0.5;
      velocity.current.y = 0;
      velocity.current.x *= 0.8;
      velocity.current.z *= 0.8;
      
      // Auto-level if touching ground and no input
      if (!isMovingInput) {
        rotation.current.x = THREE.MathUtils.lerp(rotation.current.x, 0, dt * 5);
        rotation.current.z = THREE.MathUtils.lerp(rotation.current.z, 0, dt * 5);
      }
      
      // Hard landing check
      if (Math.abs(velocity.current.y) > 10) {
          isCrashed.current = true;
          collision = true; 
      }
    }

    // 3b. Calculate Propeller World Positions
    const propPoints = PROP_OFFSETS.map(offset => offset.clone().applyQuaternion(quat).add(nextPosition));

    // 3c. Propeller Ground Check (If tilted too much near ground -> Crash)
    if (!collision) {
        for (const p of propPoints) {
            if (p.y < 0.1) {
                collision = true; // Prop dug into dirt
                break;
            }
        }
    }

    // 3d. Obstacle Collision (Check Center + 4 Props)
    if (!collision) {
        // Points to check: Center + 4 Props
        const checkPoints = [
            { point: nextPosition, radius: DRONE_RADIUS },
            ...propPoints.map(p => ({ point: p, radius: PROP_COLLISION_RADIUS }))
        ];

        for (const obs of obstacles) {
            for (const { point, radius } of checkPoints) {
                
                if (obs.type === 'building') {
                    // AABB Collision with margin equal to point radius
                    const halfW = obs.size[0] / 2 + radius;
                    const halfH = obs.size[1] / 2 + radius;
                    const halfD = obs.size[2] / 2 + radius;
                    
                    const dx = Math.abs(point.x - obs.position[0]);
                    const dy = Math.abs(point.y - obs.position[1]);
                    const dz = Math.abs(point.z - obs.position[2]);
                    
                    if (dx < halfW && dy < halfH && dz < halfD) {
                        collision = true;
                        break;
                    }
                } else {
                    // Tree Collision (Cylinder)
                    // Point radius added to tree radius
                    const treeRadius = 1.5 + radius; 
                    const dist = Math.sqrt(Math.pow(point.x - obs.position[0], 2) + Math.pow(point.z - obs.position[2], 2));
                    
                    if (dist < treeRadius && point.y < obs.size[1]) {
                        collision = true;
                        break;
                    }
                }
            }
            if (collision) break;
        }
    }

    if (collision && !isCrashed.current) { 
        isCrashed.current = true;
        
        // Calculate pushback BEFORE zeroing velocity to avoid NaNs
        // Push back against the velocity vector to "bounce" slightly
        if (velocity.current.lengthSq() > 0.1) {
            const pushback = velocity.current.clone().normalize().multiplyScalar(1.5);
            position.current.sub(pushback);
        } else {
             // Fallback if static collision (e.g. stuck in wall)
             position.current.y += 0.5;
        }

        velocity.current.set(0,0,0);
        
        // Immediate UI Update
        onUpdateStats({
            position: position.current,
            velocity: velocity.current,
            rotation: rotation.current,
            throttle: 0,
            battery: 0,
            status: 'CRASHED',
            distanceToObjective: null
        });
        return;
    } else {
        // No crash, update position
        position.current.copy(nextPosition);
    }

    // --- 4. Objective Logic ---
    let distanceToObj = null;
    if (objectivePosition) {
        const objVec = new Vector3(...objectivePosition);
        distanceToObj = position.current.distanceTo(objVec);
        if (distanceToObj < 4.0) {
            onObjectiveReached();
        }
    }

    // --- 5. Apply to Visual Mesh ---
    droneRef.current.position.copy(position.current);
    droneRef.current.quaternion.copy(quat);
    
    // --- 6. Camera Follow Logic (With Mouse Orbit) ---
    const camDist = 10;
    const camHeight = 2;
    
    // Calculate offset in spherical coords relative to drone's yaw
    const totalYaw = rotation.current.y + cameraOrbit.current.theta;
    const totalPitch = cameraOrbit.current.phi;
    
    // Base offset vector (initially behind the drone)
    const camOffset = new Vector3(0, 0, camDist);
    
    // Rotate up/down (Pitch - X axis)
    camOffset.applyAxisAngle(new Vector3(1, 0, 0), totalPitch);
    // Rotate around (Yaw - Y axis)
    camOffset.applyAxisAngle(new Vector3(0, 1, 0), totalYaw);
    
    const targetCameraPos = position.current.clone().add(new Vector3(0, camHeight, 0)).add(camOffset);

    // Smoothly interpolate camera position (faster lerp for responsiveness)
    camera.position.lerp(targetCameraPos, dt * 10);
    camera.lookAt(position.current.clone().add(new Vector3(0, 1, 0)));

    // --- 7. Update UI (Throttled) ---
    if (now - lastStatsUpdate.current > 0.1) { // 10 FPS UI update
        lastStatsUpdate.current = now;
        onUpdateStats({
            position: position.current,
            velocity: velocity.current,
            rotation: rotation.current,
            throttle: throttle.current,
            battery: 85,
            status: 'FLYING',
            distanceToObjective: distanceToObj
        });
    }
    
    // Propeller spin
    droneRef.current.children.forEach((child) => {
      if (child.name.startsWith("prop")) {
        child.rotation.y += (throttle.current * 40 * dt + 5 * dt) * (isCrashed.current ? 0 : 1);
      }
    });
  });

  return (
    <group ref={droneRef}>
      {/* Main Body */}
      <mesh castShadow receiveShadow scale={[0.6, 0.15, 0.4]}>
        <boxGeometry />
        <meshStandardMaterial color={isCrashed.current ? "#555" : "#1a1a1a"} metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[0.5, 0, 0.5]} scale={[0.8, 0.05, 0.05]} rotation={[0, Math.PI/4, 0]} castShadow>
         <boxGeometry />
         <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.5, 0, 0.5]} scale={[0.8, 0.05, 0.05]} rotation={[0, -Math.PI/4, 0]} castShadow>
         <boxGeometry />
         <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0.5, 0, -0.5]} scale={[0.8, 0.05, 0.05]} rotation={[0, -Math.PI/4, 0]} castShadow>
         <boxGeometry />
         <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.5, 0, -0.5]} scale={[0.8, 0.05, 0.05]} rotation={[0, Math.PI/4, 0]} castShadow>
         <boxGeometry />
         <meshStandardMaterial color="#333" />
      </mesh>

      {/* Props */}
      <Propeller position={[0.8, 0.1, 0.8]} name="prop1" color="#ef4444" />
      <Propeller position={[-0.8, 0.1, 0.8]} name="prop2" color="#ef4444" />
      <Propeller position={[0.8, 0.1, -0.8]} name="prop3" color="#06b6d4" />
      <Propeller position={[-0.8, 0.1, -0.8]} name="prop4" color="#06b6d4" />
      
      {/* Camera Gimbal fake */}
      <mesh position={[0, -0.1, 0.3]}>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial color="black" roughness={0.2} />
      </mesh>
    </group>
  );
};

const Propeller = ({ position, name, color }: { position: [number, number, number], name: string, color: string }) => (
  <group position={position} name={name}>
    <mesh>
       <cylinderGeometry args={[0.02, 0.02, 0.1]} />
       <meshStandardMaterial color="#666" />
    </mesh>
    <mesh position={[0, 0.05, 0]}>
      <boxGeometry args={[0.8, 0.01, 0.08]} />
      <meshStandardMaterial color={color} opacity={0.9} transparent />
    </mesh>
  </group>
);