import { describe, it, expect, beforeEach } from 'vitest';
import { generateToken, verifyToken, getTokenJti, getTokenExpiry, type JwtPayload } from '../../src/backend/utils/jwt';

describe('jwt utils', () => {
  const testPayload = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate unique jti for each token', () => {
      const token1 = generateToken(testPayload);
      const token2 = generateToken(testPayload);

      const payload1 = verifyToken(token1);
      const payload2 = verifyToken(token2);

      expect(payload1.jti).toBeDefined();
      expect(payload2.jti).toBeDefined();
      expect(payload1.jti).not.toBe(payload2.jti);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(testPayload);
      const decoded = verifyToken(token) as JwtPayload;

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.jti).toBeDefined();
    });

    it('should throw for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('should throw for empty token', () => {
      expect(() => verifyToken('')).toThrow();
    });
  });

  describe('getTokenJti', () => {
    it('should return jti for valid token', () => {
      const token = generateToken(testPayload);
      const jti = getTokenJti(token);

      expect(jti).toBeDefined();
      expect(typeof jti).toBe('string');
    });

    it('should return null for invalid token', () => {
      const jti = getTokenJti('invalid-token');
      expect(jti).toBeNull();
    });
  });

  describe('getTokenExpiry', () => {
    it('should return expiry date for valid token', () => {
      const token = generateToken(testPayload);
      const expiry = getTokenExpiry(token);

      expect(expiry).toBeInstanceOf(Date);
      expect(expiry!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiry = getTokenExpiry('invalid-token');
      expect(expiry).toBeNull();
    });
  });
});
