export type View =
  | 'login'
  | 'register'
  | 'selectGestures'
  | 'recordGestures'
  | 'verifyGestures'
  | 'resetPassword'
  | 'success'
  | 'home';

export type FingerStatus = 'EXTENDED' | 'FOLDED' | 'ANY';

export interface HandSign {
  id: string;
  name: string;
  image: string;
  validationRules?: FingerStatus[]; // Array of 5 finger statuses [Thumb, Index, Middle, Ring, Pinky]
}
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandFrame {
  landmarks: Landmark[];
  timestamp: number;
  label: string;
}

export interface GestureSignature {
  signId: string;
  captures: HandFrame[][]; // Multi-repetition captures (each capture is a sequence of frames)
  trajectories?: Landmark[][];
  proportions?: number[];
}

export interface User {
  username: string;
  signatures: GestureSignature[];
  biometricProfile?: {
    avgShape: number[];
    avgTiming: number[];
    variance: number;
  };
  registrationTiming?: number[];
}
