export enum FlightMode {
  STABILIZED = 'STABILIZED',
  ACRO = 'ACRO'
}

export interface Obstacle {
  type: 'building' | 'tree';
  position: [number, number, number];
  size: [number, number, number]; // [width, height, depth]
}

export interface DroneState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  throttle: number; // 0 to 1
  battery: number; // 0 to 100
  status: 'FLYING' | 'CRASHED' | 'LANDED';
  distanceToObjective: number | null;
}

export interface Mission {
  id: string;
  briefing: string;
  objective: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  targetPosition?: [number, number, number]; // Optional coordinate for the objective
}