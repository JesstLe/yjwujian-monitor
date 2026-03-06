import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../../src/backend/services/email';

// Mock Resend module
vi.mock('resend', () => {
  const mockSend = vi.fn().mockResolvedValue({ id: 'email-id-123', error: null });
  return {
    Resend: vi.fn(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

// Import mocked Resend after vi.mock
import { Resend } from 'resend';

describe('EmailService', () => {
  let emailService: EmailService;
  let mockResendInstance: { emails: { send: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();
    emailService = new EmailService();
    mockResendInstance = new Resend() as unknown as { emails: { send: ReturnType<typeof vi.fn> } };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const result = await emailService.sendVerificationEmail(
        'test@example.com',
        'verification-token-123'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should call resend.emails.send with correct parameters', async () => {
      await emailService.sendVerificationEmail(
        'test@example.com',
        'test-token'
      );

      expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
      const callArgs = mockResendInstance.emails.send.mock.calls[0][0];

      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toContain('验证您的邮箱');
      expect(callArgs.html).toContain('/verify-email?token=test-token');
    });

    it('should return error when send fails', async () => {
      mockResendInstance.emails.send.mockRejectedValueOnce(new Error('API Error'));

      const result = await emailService.sendVerificationEmail(
        'test@example.com',
        'test-token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('发送邮件失败');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const result = await emailService.sendPasswordResetEmail(
        'test@example.com',
        'reset-token-123'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should call resend.emails.send with correct parameters', async () => {
      await emailService.sendPasswordResetEmail(
        'test@example.com',
        'reset-token-456'
      );

      expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
      const callArgs = mockResendInstance.emails.send.mock.calls[0][0];

      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toContain('重置密码');
      expect(callArgs.html).toContain('/reset-password?token=reset-token-456');
    });

    it('should return error when send fails', async () => {
      mockResendInstance.emails.send.mockRejectedValueOnce(new Error('Network error'));

      const result = await emailService.sendPasswordResetEmail(
        'test@example.com',
        'reset-token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('发送邮件失败');
    });
  });

  describe('sendDeviceVerificationCode', () => {
    it('should send device verification code successfully', async () => {
      const result = await emailService.sendDeviceVerificationCode(
        'test@example.com',
        '123456',
        'Chrome on Windows'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should include device name and code in email', async () => {
      await emailService.sendDeviceVerificationCode(
        'test@example.com',
        '654321',
        'Safari on macOS'
      );

      expect(mockResendInstance.emails.send).toHaveBeenCalledTimes(1);
      const callArgs = mockResendInstance.emails.send.mock.calls[0][0];

      expect(callArgs.to).toBe('test@example.com');
      expect(callArgs.subject).toContain('新设备登录验证');
      expect(callArgs.html).toContain('654321');
      expect(callArgs.html).toContain('Safari on macOS');
    });

    it('should return error when send fails', async () => {
      mockResendInstance.emails.send.mockRejectedValueOnce(new Error('Service unavailable'));

      const result = await emailService.sendDeviceVerificationCode(
        'test@example.com',
        '123456',
        'Unknown Device'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('发送邮件失败');
    });
  });

  describe('Email content', () => {
    it('should include 24-hour expiry notice in verification email', async () => {
      await emailService.sendVerificationEmail('test@example.com', 'token');

      const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
      expect(callArgs.html).toContain('24 小时');
    });

    it('should include 24-hour expiry notice in password reset email', async () => {
      await emailService.sendPasswordResetEmail('test@example.com', 'token');

      const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
      expect(callArgs.html).toContain('24 小时');
    });

    it('should include 10-minute expiry notice in device verification email', async () => {
      await emailService.sendDeviceVerificationCode('test@example.com', '123456', 'Device');

      const callArgs = mockResendInstance.emails.send.mock.calls[0][0];
      expect(callArgs.html).toContain('10 分钟');
    });
  });
});
