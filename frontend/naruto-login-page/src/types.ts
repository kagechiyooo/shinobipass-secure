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
  landmarks: { landmarks: Landmark[]; label: string }[]; // Array of hands with labels
}

export interface User {
  username: string;
  signatures: GestureSignature[];
}
