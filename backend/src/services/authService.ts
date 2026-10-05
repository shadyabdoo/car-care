import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { createUser, findUserByEmail, findUserById } from '../repositories/userRepository.js';

export function sanitizeUser(user: any) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export function signToken(userId: number) {
  return jwt.sign({ userId }, env.JWT_SECRET as jwt.Secret, { expiresIn: env.JWT_EXPIRES_IN as any });
}

export async function registerUser(input: { name: string; email: string; phone: string; password: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);

  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409, code: 'EMAIL_EXISTS' });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await createUser({
    name: input.name.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    passwordHash,
  });

  if (!user) {
    throw Object.assign(new Error('Unable to create user'), { statusCode: 500, code: 'USER_CREATE_FAILED' });
  }

  const token = signToken(user.id);
  return { token, user: sanitizeUser(user) };
}

export async function loginUser(input: { email: string; password: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatches) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  }

  const token = signToken(user.id);
  return { token, user: sanitizeUser(user) };
}

export async function getCurrentUser(userId: number) {
  const user = await findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
  }
  return sanitizeUser(user);
}
