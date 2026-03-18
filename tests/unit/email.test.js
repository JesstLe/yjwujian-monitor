"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const email_1 = require("../../src/backend/services/email");
// Mock Resend module
vitest_1.vi.mock('resend', () => {
    const mockSend = vitest_1.vi.fn().mockResolvedValue({ id: 'email-id-123', error: null });
    return {
        Resend: vitest_1.vi.fn(() => ({
            emails: {
                send: mockSend,
            },
        })),
    };
});
// Import mocked Resend after vi.mock
const resend_1 = require("resend");
(0, vitest_1.describe)('EmailService', () => {
    let emailService;
    let mockResendInstance;
    const originalResendApiKey = process.env.RESEND_API_KEY;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        process.env.RESEND_API_KEY = 'test-api-key';
        emailService = new email_1.EmailService();
        mockResendInstance = new resend_1.Resend();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.clearAllMocks();
        process.env.RESEND_API_KEY = originalResendApiKey;
    });
    (0, vitest_1.describe)('sendVerificationEmail', () => {
        (0, vitest_1.it)('should send verification email successfully', async () => {
            const result = await emailService.sendVerificationEmail('test@example.com', 'verification-token-123');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.error).toBeUndefined();
        });
        (0, vitest_1.it)('should call resend.emails.send with correct parameters', async () => {
            await emailService.sendVerificationEmail('test@example.com', 'test-token');
            (0, vitest_1.expect)(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
            const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
            (0, vitest_1.expect)(callArgs.to).toBe('test@example.com');
            (0, vitest_1.expect)(callArgs.subject).toContain('验证您的邮箱');
            (0, vitest_1.expect)(callArgs.html).toContain('/verify-email?token=test-token');
        });
        (0, vitest_1.it)('should return error when send fails', async () => {
            mockResendInstance.emails.send.mockRejectedValueOnce(new Error('API Error'));
            const result = await emailService.sendVerificationEmail('test@example.com', 'test-token');
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('发送邮件失败');
        });
    });
    (0, vitest_1.describe)('sendPasswordResetEmail', () => {
        (0, vitest_1.it)('should send password reset email successfully', async () => {
            const result = await emailService.sendPasswordResetEmail('test@example.com', 'reset-token-123');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.error).toBeUndefined();
        });
        (0, vitest_1.it)('should call resend.emails.send with correct parameters', async () => {
            await emailService.sendPasswordResetEmail('test@example.com', 'reset-token-456');
            (0, vitest_1.expect)(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
            const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
            (0, vitest_1.expect)(callArgs.to).toBe('test@example.com');
            (0, vitest_1.expect)(callArgs.subject).toContain('重置密码');
            (0, vitest_1.expect)(callArgs.html).toContain('/reset-password?token=reset-token-456');
        });
        (0, vitest_1.it)('should return error when send fails', async () => {
            mockResendInstance.emails.send.mockRejectedValueOnce(new Error('Network error'));
            const result = await emailService.sendPasswordResetEmail('test@example.com', 'reset-token');
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('发送邮件失败');
        });
    });
    (0, vitest_1.describe)('sendDeviceVerificationCode', () => {
        (0, vitest_1.it)('should send device verification code successfully', async () => {
            const result = await emailService.sendDeviceVerificationCode('test@example.com', '123456', 'Chrome on Windows');
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.error).toBeUndefined();
        });
        (0, vitest_1.it)('should include device name and code in email', async () => {
            await emailService.sendDeviceVerificationCode('test@example.com', '654321', 'Safari on macOS');
            (0, vitest_1.expect)(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
            const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
            (0, vitest_1.expect)(callArgs.to).toBe('test@example.com');
            (0, vitest_1.expect)(callArgs.subject).toContain('新设备登录验证');
            (0, vitest_1.expect)(callArgs.html).toContain('654321');
            (0, vitest_1.expect)(callArgs.html).toContain('Safari on macOS');
        });
        (0, vitest_1.it)('should return error when send fails', async () => {
            mockResendInstance.emails.send.mockRejectedValueOnce(new Error('Service unavailable'));
            const result = await emailService.sendDeviceVerificationCode('test@example.com', '123456', 'Unknown Device');
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toBe('发送邮件失败');
        });
    });
    (0, vitest_1.describe)('Email content', () => {
        (0, vitest_1.it)('should include 24-hour expiry notice in verification email', async () => {
            await emailService.sendVerificationEmail('test@example.com', 'token');
            const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
            (0, vitest_1.expect)(callArgs.html).toContain('24 小时');
        });
        (0, vitest_1.it)('should include 24-hour expiry notice in password reset email', async () => {
            await emailService.sendPasswordResetEmail('test@example.com', 'token');
            const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
            (0, vitest_1.expect)(callArgs.html).toContain('24 小时');
        });
        (0, vitest_1.it)('should include 10-minute expiry notice in device verification email', async () => {
            await emailService.sendDeviceVerificationCode('test@example.com', '123456', 'Device');
            const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
            (0, vitest_1.expect)(callArgs.html).toContain('10 分钟');
        });
    });
});
