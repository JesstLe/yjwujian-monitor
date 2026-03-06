import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '30d';

export interface JwtPayload {
  userId: string;
  email: string;
  jti: string;
}

export function generateToken(payload: Omit<JwtPayload, 'jti'>): string {
  const jti = randomUUID();
  return jwt.sign({ ...payload, jti }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function getTokenJti(token: string): string | null {
  try {
    const payload = verifyToken(token);
    return payload.jti;
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}
