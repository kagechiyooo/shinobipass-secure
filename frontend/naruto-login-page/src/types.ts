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
