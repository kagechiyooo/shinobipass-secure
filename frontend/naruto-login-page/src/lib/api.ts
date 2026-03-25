const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const authHeaders = (token?: string) => (token ? { Authorization: `Bearer ${token}` } : {});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data as T;
}

export interface RegisterGesturePayload {
  landmark_template: unknown;
  snapshot_template: number[] | null;
}

export interface LoginGestureTemplate {
  slot_number: number;
  landmark_template: unknown;
  snapshot_template: number[] | null;
}

export interface LoginResponse {
  ok: true;
  message: string;
  challengeToken: string;
  sequence: number[];
  gestures: LoginGestureTemplate[];
}

export interface ChallengeResponse {
  ok: true;
  message: string;
  sequence: number[];
}

export interface VerifyGestureStepResponse {
  ok: true;
  passed: boolean;
  expected_slot: number;
  detected_slot: number;
  next_step: number;
  completed: boolean;
  message: string;
  accessToken?: string;
}

export const api = {
  register: (body: { username: string; password: string; gestures: RegisterGesturePayload[] }) =>
    request('/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { username: string; password: string }) =>
    request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  forgotPasswordChallenge: (body: { username: string }) =>
    request<LoginResponse>('/forgot-password-challenge', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyGestureStep: (body: { detected_slot: number }, challengeToken: string) =>
    request<VerifyGestureStepResponse>('/verify-gesture-step', {
      method: 'POST',
      headers: authHeaders(challengeToken),
      body: JSON.stringify(body),
    }),

  resetPassword: (body: { newPassword: string }, accessToken: string) =>
    request('/reset-password', {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    }),

  me: (accessToken: string) =>
    request<{ ok: true; user: { userId: string; username: string } }>('/me', {
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
};
