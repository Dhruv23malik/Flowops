import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { registerUser, loginUser, getUserById } from '../services/auth.service';

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function register(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        },
      });
      return;
    }

    const { name, email, password } = parsed.data;
    const { user, token } = await registerUser(name, email, password);

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        },
      });
      return;
    }

    const { email, password } = parsed.data;
    const { user, token } = await loginUser(email, password);

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function guestLogin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const randomId = Math.random().toString(36).substring(2, 10);
    const guestEmail = `guest_${randomId}@flowops.local`;
    const guestPassword = `guest_${randomId}_password`;
    
    // Register the dummy guest user
    const { user, token } = await registerUser('Guest User', guestEmail, guestPassword);

    // Optionally attach a flag indicating it's a guest
    const guestUser = { ...user, isGuest: true };

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ success: true, data: { user: guestUser } });
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
      return;
    }
    const isGuest = user.email.endsWith('@flowops.local');
    res.json({ success: true, data: { user: { ...user, isGuest } } });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: AuthRequest, res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}
