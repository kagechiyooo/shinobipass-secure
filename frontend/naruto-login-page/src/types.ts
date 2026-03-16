export type View = 
  | 'login' 
  | 'register' 
  | 'selectGestures' 
  | 'recordGestures' 
  | 'chooseLoginVerify' 
  | 'chooseForgotVerify' 
  | 'emailVerify' 
  | 'verifyGestures' 
  | 'resetPassword' 
  | 'success' 
  | 'home';

export interface HandSign {
  id: string;
  name: string;
  image: string;
}
