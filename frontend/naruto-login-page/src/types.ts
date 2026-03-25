export type View =
  | 'login'
  | 'register'
  | 'selectGestures'
  | 'recordGestures'
  | 'verifyGestures'
  | 'resetPassword'
  | 'success'
  | 'home';

export interface HandSign {
  id: string;
  name: string;
  image: string;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureSignature {
  signId: string;
  captures: { landmarks: Landmark[]; label: string }[][]; // Array of multi-hand captures
}

export interface User {
  username: string;
  signatures: GestureSignature[];
}
