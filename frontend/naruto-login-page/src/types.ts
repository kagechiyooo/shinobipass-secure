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

export interface GestureSignature {
  signId: string;
  captures: { landmarks: Landmark[]; label: string }[][]; // Array of multi-hand captures
  proportions?: number[]; // Anatomical ratios (biometric)
}

export interface User {
  username: string;
  signatures: GestureSignature[];
  registrationTiming?: number[]; // Time intervals between signs (ms)
}
