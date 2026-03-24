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
  landmarks: Landmark[][]; // Array of hands, each hand is array of landmarks
}

export interface User {
  username: string;
  signatures: GestureSignature[];
}
