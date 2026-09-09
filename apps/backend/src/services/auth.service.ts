/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NOTE: This file uses `(db as any).user` casts because the Prisma client
 * was generated from the old schema (with `password` instead of `passwordHash`, no `name`).
 * After running `prisma migrate dev`, the generated client will include
 * the new fields and these casts can be removed.
 */
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

function toSafeUser(user: any): SafeUser {
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
  // Check for existing user
  const existing = await (db as any).user.findUnique({ where: { email } });
  if (existing) {
    throw makeAppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await (db as any).user.create({
    data: { name: name ?? null, email, passwordHash },
  });

  const token = createToken(user.id, user.email);
  return { user: toSafeUser(user), token };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const user = await (db as any).user.findUnique({ where: { email } });

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
  const user = await (db as any).user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return toSafeUser(user);
}
