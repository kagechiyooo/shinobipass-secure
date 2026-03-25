import 'dotenv/config';
import argon2 from 'argon2';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { signAccessToken, signChallengeToken } from './lib/jwt.js';
import { requireAccessAuth, requireChallengeAuth } from './middleware/auth.js';
import type { AuthenticatedRequest } from './middleware/auth.js';
import { supabase } from './lib/supabase.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many requests, try again later.' },
});

const registerSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8).max(128),
  gestures: z.array(
    z.object({
      landmark_template: z.unknown(),
      snapshot_template: z.array(z.number()).nullable(),
    })
  ).length(4),
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const verifyGestureStepSchema = z.object({
  detected_slot: z.number().int().min(1).max(4),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

const buildChallengePayload = async (user: { id: string; username: string }) => {
  const sequence = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data: challenge, error: challengeError } = await supabase
    .from('auth_challenges')
    .insert({
      user_id: user.id,
      sequence,
      current_step: 0,
      attempts_used: 0,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (challengeError || !challenge) {
    return {
      error: challengeError?.message ?? 'Failed to create gesture challenge',
    };
  }

  const challengeToken = signChallengeToken({
    userId: user.id,
    username: user.username,
    challengeId: challenge.id,
  });

  const { data: gestures, error: gestureError } = await supabase
    .from('gesture_templates')
    .select('slot_number, landmark_template, snapshot_template')
    .eq('user_id', user.id)
    .order('slot_number', { ascending: true });

  if (gestureError) {
    return {
      error: gestureError.message,
    };
  }

  return {
    challengeToken,
    sequence,
    gestures,
  };
};

app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use('/register', authLimiter);
app.use('/login', authLimiter);
app.use('/reset-password', authLimiter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Backend is running' });
});

app.get('/db-check', async (_req, res) => {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return res.status(500).json({
      ok: false,
      message: 'Supabase connection failed',
      error: error.message,
    });
  }

  return res.json({
    ok: true,
    message: 'Supabase connection successful',
    userCount: count ?? 0,
  });
});

app.post('/register', async (req, res) => {
  try {
    const { username, password, gestures } = registerSchema.parse(req.body);

    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUserError) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to check existing user',
        error: existingUserError.message,
      });
    }

    if (existingUser) {
      return res.status(409).json({
        ok: false,
        message: 'Username already exists',
      });
    }

    const passwordHash = await argon2.hash(password);

    const { data: createdUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
      })
      .select('id, username')
      .single();

    if (createUserError || !createdUser) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to create user',
        error: createUserError?.message,
      });
    }

    const gestureRows = gestures.map((gesture: any, index: number) => ({
      user_id: createdUser.id,
      slot_number: index + 1,
      landmark_template: gesture.landmark_template,
      snapshot_template: gesture.snapshot_template ?? null,
    }));

    const { error: gestureInsertError } = await supabase
      .from('gesture_templates')
      .insert(gestureRows);

    if (gestureInsertError) {
      return res.status(500).json({
        ok: false,
        message: 'User created but saving gestures failed',
        error: gestureInsertError.message,
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Register successful',
      user: createdUser,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Unexpected server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, failed_attempts, lock_until')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to fetch user',
        error: error.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'User not found',
      });
    }

    if (user.lock_until && new Date(user.lock_until).getTime() > Date.now()) {
      return res.status(423).json({
        ok: false,
        message: 'Account is temporarily locked',
        lock_until: user.lock_until,
      });
    }

    const isPasswordValid = await argon2.verify(user.password_hash, password);

    if (!isPasswordValid) {
      const nextAttempts = (user.failed_attempts ?? 0) + 1;
      const shouldLock = nextAttempts >= 3;
      const lockUntil = shouldLock ? new Date(Date.now() + 5000).toISOString() : null;

      await supabase
        .from('users')
        .update({
          failed_attempts: shouldLock ? 0 : nextAttempts,
          lock_until: lockUntil,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      return res.status(401).json({
        ok: false,
        message: shouldLock ? 'Wrong password. Account locked for 5 seconds.' : 'Wrong password',
        attempts_left: shouldLock ? 0 : 3 - nextAttempts,
        lock_until: lockUntil,
      });
    }

    await supabase
      .from('users')
      .update({
        failed_attempts: 0,
        lock_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    const challengePayload = await buildChallengePayload({
      id: user.id,
      username: user.username,
    });

    if ('error' in challengePayload) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to create gesture challenge',
        error: challengePayload.error,
      });
    }

    return res.json({
      ok: true,
      message: 'Password verified. Continue with gesture challenge.',
      challengeToken: challengePayload.challengeToken,
      sequence: challengePayload.sequence,
      gestures: challengePayload.gestures,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        message: error.issues[0]?.message ?? 'Invalid login payload',
      });
    }
    return res.status(500).json({
      ok: false,
      message: 'Unexpected server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/me', requireAccessAuth, (req: AuthenticatedRequest, res) => {
  return res.json({
    ok: true,
    user: req.auth,
  });
});

app.post('/reset-password', requireAccessAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { newPassword } = resetPasswordSchema.parse(req.body);
    const userId = req.auth?.userId;

    const passwordHash = await argon2.hash(newPassword);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        failed_attempts: 0,
        lock_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to reset password',
        error: updateError.message,
      });
    }

    return res.json({
      ok: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        message: error.issues[0]?.message ?? 'Invalid reset password payload',
      });
    }
    return res.status(500).json({
      ok: false,
      message: 'Unexpected server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/forgot-password-challenge', async (req, res) => {
  try {
    const { username } = z.object({ username: z.string().trim().min(1) }).parse(req.body);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to fetch user',
        error: error.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: 'User not found',
      });
    }

    const challengePayload = await buildChallengePayload(user);

    if ('error' in challengePayload) {
      return res.status(500).json({
        ok: false,
        message: 'Failed to create forgot-password challenge',
        error: challengePayload.error,
      });
    }

    return res.json({
      ok: true,
      message: 'Continue with gesture challenge to reset password.',
      challengeToken: challengePayload.challengeToken,
      sequence: challengePayload.sequence,
      gestures: challengePayload.gestures,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        message: error.issues[0]?.message ?? 'Invalid forgot-password payload',
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'Unexpected server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/verify-gesture-step', requireChallengeAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { detected_slot } = verifyGestureStepSchema.parse(req.body);
    const challengeId = req.auth?.challengeId;
    const userId = req.auth?.userId;

    const { data: challenge, error } = await supabase
      .from('auth_challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, message: 'Failed to load challenge', error: error.message });
    }

    if (!challenge) {
      return res.status(404).json({ ok: false, message: 'Challenge not found' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ ok: false, message: 'Challenge is no longer active' });
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ ok: false, message: 'Challenge expired' });
    }

    if (challenge.lock_until && new Date(challenge.lock_until).getTime() > Date.now()) {
      return res.status(423).json({ ok: false, message: 'Challenge is locked', lock_until: challenge.lock_until });
    }

    const sequence = Array.isArray(challenge.sequence) ? challenge.sequence as number[] : [];
    const currentStep = challenge.current_step as number;
    const expectedSlot = sequence[currentStep];

    if (expectedSlot === undefined) {
      return res.status(400).json({ ok: false, message: 'Invalid challenge step' });
    }

    if (expectedSlot !== detected_slot) {
      const nextAttempts = (challenge.attempts_used as number) + 1;
      const shouldLock = nextAttempts >= 3;
      const lockUntil = shouldLock ? new Date(Date.now() + 5000).toISOString() : null;

      await supabase
        .from('auth_challenges')
        .update({
          current_step: 0,
          attempts_used: shouldLock ? 0 : nextAttempts,
          lock_until: lockUntil,
        })
        .eq('id', challenge.id);

      return res.json({
        ok: true,
        passed: false,
        expected_slot: expectedSlot,
        detected_slot,
        next_step: 0,
        completed: false,
        message: shouldLock ? 'Wrong gesture. Locked for 5 seconds.' : 'Wrong gesture. Restart from step 1.',
      });
    }

    const nextStep = currentStep + 1;
    const completed = nextStep >= sequence.length;

    if (completed) {
      await supabase
        .from('auth_challenges')
        .update({
          current_step: nextStep,
          status: 'completed',
        })
        .eq('id', challenge.id);

      const accessToken = signAccessToken({
        userId: req.auth!.userId,
        username: req.auth!.username,
      });

      return res.json({
        ok: true,
        passed: true,
        expected_slot: expectedSlot,
        detected_slot,
        next_step: nextStep,
        completed: true,
        accessToken,
        message: 'Gesture verification completed',
      });
    }

    await supabase
      .from('auth_challenges')
      .update({
        current_step: nextStep,
      })
      .eq('id', challenge.id);

    return res.json({
      ok: true,
      passed: true,
      expected_slot: expectedSlot,
      detected_slot,
      next_step: nextStep,
      completed: false,
      message: 'Correct gesture',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        message: error.issues[0]?.message ?? 'Invalid verify gesture payload',
      });
    }

    return res.status(500).json({
      ok: false,
      message: 'Unexpected server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
