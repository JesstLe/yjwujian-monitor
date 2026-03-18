"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const jwt_1 = require("../../src/backend/utils/jwt");
(0, vitest_1.describe)('jwt utils', () => {
    const testPayload = {
        userId: 'user-123',
        email: 'test@example.com',
    };
    (0, vitest_1.describe)('generateToken', () => {
        (0, vitest_1.it)('should generate a valid JWT token', () => {
            const token = (0, jwt_1.generateToken)(testPayload);
            (0, vitest_1.expect)(token).toBeDefined();
            (0, vitest_1.expect)(typeof token).toBe('string');
            (0, vitest_1.expect)(token.split('.').length).toBe(3); // JWT has 3 parts
        });
        (0, vitest_1.it)('should generate unique jti for each token', () => {
            const token1 = (0, jwt_1.generateToken)(testPayload);
            const token2 = (0, jwt_1.generateToken)(testPayload);
            const payload1 = (0, jwt_1.verifyToken)(token1);
            const payload2 = (0, jwt_1.verifyToken)(token2);
            (0, vitest_1.expect)(payload1.jti).toBeDefined();
            (0, vitest_1.expect)(payload2.jti).toBeDefined();
            (0, vitest_1.expect)(payload1.jti).not.toBe(payload2.jti);
        });
    });
    (0, vitest_1.describe)('verifyToken', () => {
        (0, vitest_1.it)('should verify and decode a valid token', () => {
            const token = (0, jwt_1.generateToken)(testPayload);
            const decoded = (0, jwt_1.verifyToken)(token);
            (0, vitest_1.expect)(decoded.userId).toBe(testPayload.userId);
            (0, vitest_1.expect)(decoded.email).toBe(testPayload.email);
            (0, vitest_1.expect)(decoded.jti).toBeDefined();
        });
        (0, vitest_1.it)('should throw for invalid token', () => {
            (0, vitest_1.expect)(() => (0, jwt_1.verifyToken)('invalid-token')).toThrow();
        });
        (0, vitest_1.it)('should throw for empty token', () => {
            (0, vitest_1.expect)(() => (0, jwt_1.verifyToken)('')).toThrow();
        });
    });
    (0, vitest_1.describe)('getTokenJti', () => {
        (0, vitest_1.it)('should return jti for valid token', () => {
            const token = (0, jwt_1.generateToken)(testPayload);
            const jti = (0, jwt_1.getTokenJti)(token);
            (0, vitest_1.expect)(jti).toBeDefined();
            (0, vitest_1.expect)(typeof jti).toBe('string');
        });
        (0, vitest_1.it)('should return null for invalid token', () => {
            const jti = (0, jwt_1.getTokenJti)('invalid-token');
            (0, vitest_1.expect)(jti).toBeNull();
        });
    });
    (0, vitest_1.describe)('getTokenExpiry', () => {
        (0, vitest_1.it)('should return expiry date for valid token', () => {
            const token = (0, jwt_1.generateToken)(testPayload);
            const expiry = (0, jwt_1.getTokenExpiry)(token);
            (0, vitest_1.expect)(expiry).toBeInstanceOf(Date);
            (0, vitest_1.expect)(expiry.getTime()).toBeGreaterThan(Date.now());
        });
        (0, vitest_1.it)('should return null for invalid token', () => {
            const expiry = (0, jwt_1.getTokenExpiry)('invalid-token');
            (0, vitest_1.expect)(expiry).toBeNull();
        });
    });
});
