import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../src/backend/utils/password.ts';

describe('password utils', () => {
  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept valid password', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = validatePasswordStrength('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码至少需要 8 个字符');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码需要包含小写字母');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码需要包含大写字母');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('PasswordPassword');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('密码需要包含数字');
    });

    it('should return multiple errors', () => {
      const result = validatePasswordStrength('pass');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
