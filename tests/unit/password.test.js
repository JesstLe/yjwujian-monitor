"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const password_ts_1 = require("../../src/backend/utils/password.ts");
(0, vitest_1.describe)('password utils', () => {
    (0, vitest_1.describe)('hashPassword', () => {
        (0, vitest_1.it)('should hash password', async () => {
            const password = 'TestPassword123!';
            const hash = await (0, password_ts_1.hashPassword)(password);
            (0, vitest_1.expect)(hash).toBeDefined();
            (0, vitest_1.expect)(hash).not.toBe(password);
            (0, vitest_1.expect)(hash.length).toBeGreaterThan(50);
        });
        (0, vitest_1.it)('should generate different hashes for same password', async () => {
            const password = 'TestPassword123!';
            const hash1 = await (0, password_ts_1.hashPassword)(password);
            const hash2 = await (0, password_ts_1.hashPassword)(password);
            (0, vitest_1.expect)(hash1).not.toBe(hash2);
        });
    });
    (0, vitest_1.describe)('verifyPassword', () => {
        (0, vitest_1.it)('should verify correct password', async () => {
            const password = 'TestPassword123!';
            const hash = await (0, password_ts_1.hashPassword)(password);
            const isValid = await (0, password_ts_1.verifyPassword)(password, hash);
            (0, vitest_1.expect)(isValid).toBe(true);
        });
        (0, vitest_1.it)('should reject wrong password', async () => {
            const password = 'TestPassword123!';
            const hash = await (0, password_ts_1.hashPassword)(password);
            const isValid = await (0, password_ts_1.verifyPassword)('WrongPassword', hash);
            (0, vitest_1.expect)(isValid).toBe(false);
        });
    });
    (0, vitest_1.describe)('validatePasswordStrength', () => {
        (0, vitest_1.it)('should accept valid password', () => {
            const result = (0, password_ts_1.validatePasswordStrength)('Password123');
            (0, vitest_1.expect)(result.valid).toBe(true);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
        });
        (0, vitest_1.it)('should reject short password', () => {
            const result = (0, password_ts_1.validatePasswordStrength)('Pass1');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.errors).toContain('密码至少需要 8 个字符');
        });
        (0, vitest_1.it)('should reject password without lowercase', () => {
            const result = (0, password_ts_1.validatePasswordStrength)('PASSWORD123');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.errors).toContain('密码需要包含小写字母');
        });
        (0, vitest_1.it)('should reject password without uppercase', () => {
            const result = (0, password_ts_1.validatePasswordStrength)('password123');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.errors).toContain('密码需要包含大写字母');
        });
        (0, vitest_1.it)('should reject password without number', () => {
            const result = (0, password_ts_1.validatePasswordStrength)('PasswordPassword');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.errors).toContain('密码需要包含数字');
        });
        (0, vitest_1.it)('should return multiple errors', () => {
            const result = (0, password_ts_1.validatePasswordStrength)('pass');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.errors.length).toBeGreaterThan(1);
        });
    });
});
