import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, verifyChallengeToken } from '../lib/jwt.js';

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    username: string;
    challengeId?: string;
  };
}

const extractBearerToken = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
};

export const requireAccessAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Missing access token' });
    }

    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.userId,
      username: payload.username,
    };

    next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid access token' });
  }
};

export const requireChallengeAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Missing challenge token' });
    }

    const payload = verifyChallengeToken(token);
    req.auth = {
      userId: payload.userId,
      username: payload.username,
      challengeId: payload.challengeId,
    };

    next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid challenge token' });
  }
};
