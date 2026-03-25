import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;
const challengeSecret = process.env.CHALLENGE_JWT_SECRET;

if (!jwtSecret) {
  throw new Error('Missing JWT_SECRET');
}

if (!challengeSecret) {
  throw new Error('Missing CHALLENGE_JWT_SECRET');
}

export const signAccessToken = (payload: { userId: string; username: string }) =>
  jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, jwtSecret) as { userId: string; username: string };

export const signChallengeToken = (payload: { userId: string; username: string; challengeId: string }) =>
  jwt.sign(payload, challengeSecret, { expiresIn: '10m' });

export const verifyChallengeToken = (token: string) =>
  jwt.verify(token, challengeSecret) as { userId: string; username: string; challengeId: string };
