import bcrypt from 'bcryptjs';
import db from '../db';
import { createToken } from '../utils/jwt';

const SALT_ROUNDS = 12;

export interface SafeUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

function toSafeUser(user: { id: string; name: string | null; email: string; createdAt: Date; updatedAt: Date }): SafeUser {
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function makeAppError(message: string, statusCode: number, code: string): Error {
  const err = new Error(message) as Error & { statusCode: number; code: string };
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export async function registerUser(
  name: string | undefined,
  email: string,
  password: string,
): Promise<AuthResult> {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw makeAppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await db.user.create({
    data: { name: name ?? null, email, passwordHash },
  });

  const token = createToken(user.id, user.email);
  return { user: toSafeUser(user), token };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const user = await db.user.findUnique({ where: { email } });

  // Use constant-time compare even for missing user to prevent timing attacks
  const hash = user?.passwordHash ?? '$2a$12$invalidhashfortimingnomatch000000000000000000';
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) {
    throw makeAppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = createToken(user.id, user.email);
  return { user: toSafeUser(user), token };
}

export async function getUserById(userId: string): Promise<SafeUser | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return toSafeUser(user);
}

/**
 * Upgrade a temporary guest user (`@flowops.local`) into a permanent account
 * while preserving all workflows and execution history created during the session.
 */
export async function upgradeGuestUser(
  userId: string,
  name: string | undefined,
  email: string,
  password: string,
): Promise<AuthResult> {
  const current = await db.user.findUnique({ where: { id: userId } });
  if (!current) {
    throw makeAppError('User not found', 404, 'USER_NOT_FOUND');
  }
  if (!current.email.endsWith('@flowops.local')) {
    throw makeAppError('Account is already registered', 400, 'ALREADY_REGISTERED');
  }

  const emailTaken = await db.user.findUnique({ where: { email } });
  if (emailTaken && emailTaken.id !== userId) {
    throw makeAppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      name: name ?? current.name,
      email,
      passwordHash,
    },
  });

  const token = createToken(updated.id, updated.email);
  return { user: toSafeUser(updated), token };
}
