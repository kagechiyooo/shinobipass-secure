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
  landmarks: Landmark[][]; // Array of 3 repetitions, each being 21 landmarks
}

export interface User {
  username: string;
  password?: string;
  signatures: GestureSignature[];
}
