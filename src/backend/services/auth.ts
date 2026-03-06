import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "../utils/password.js";
import {
  generateToken,
  verifyToken,
  getTokenJti,
  getTokenExpiry,
} from "../utils/jwt.js";
import { emailService } from "./email.js";
import { parseUserAgent, generateVerificationCode } from "./device.js";

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const TOKEN_EXPIRY_HOURS = 24;
const DEVICE_CODE_EXPIRY_MINUTES = 10;

export interface RegisterParams {
  email: string;
  password: string;
  username?: string;
}

export interface RegisterResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface LoginParams {
  email: string;
  password: string;
  userAgent: string;
  ipAddress: string;
}

export interface LoginResult {
  success: boolean;
  requiresDeviceVerification?: boolean;
  deviceFingerprint?: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
  error?: string;
  attemptsRemaining?: number;
}

export interface VerifyDeviceParams {
  email: string;
  code: string;
  userAgent: string;
}

export interface VerifyDeviceResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    username: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
  error?: string;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(params: RegisterParams): Promise<RegisterResult> {
    const { email, password, username } = params;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.errors.join("; "),
      };
    }

    // Check if email already exists
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id: string } | undefined;

    if (existingUser) {
      return {
        success: false,
        error: "该邮箱已被注册",
      };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = randomUUID();
    db.prepare(
      `
      INSERT INTO users (id, email, password_hash, username)
      VALUES (?, ?, ?, ?)
    `,
    ).run(userId, email, passwordHash, username || null);

    // Generate verification token
    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    ).toISOString();

    db.prepare(
      `
      INSERT INTO email_tokens (id, user_id, token, type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(randomUUID(), userId, token, "verification", expiresAt);

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(email, token);
    if (!emailResult.success) {
      console.warn("Failed to send verification email:", emailResult.error);
      // Don't fail registration if email fails
    }

    return {
      success: true,
      userId,
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Find token
    const tokenRecord = db
      .prepare(
        `
      SELECT id, user_id, expires_at, used
      FROM email_tokens
      WHERE token = ? AND type = 'verification'
    `,
      )
      .get(token) as
      | { id: string; user_id: string; expires_at: string; used: number }
      | undefined;

    if (!tokenRecord) {
      return { success: false, error: "无效的验证链接" };
    }

    if (tokenRecord.used) {
      return { success: false, error: "该链接已使用" };
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return { success: false, error: "验证链接已过期" };
    }

    // Mark email as verified
    db.prepare(
      "UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(tokenRecord.user_id);

    // Mark token as used
    db.prepare("UPDATE email_tokens SET used = 1 WHERE id = ?").run(
      tokenRecord.id,
    );

    return { success: true };
  }

  /**
   * Login with email and password
   */
  async login(params: LoginParams): Promise<LoginResult> {
    const { email, password, userAgent, ipAddress } = params;

    // Find user
    const user = db
      .prepare(
        `
      SELECT id, email, password_hash, username, avatar_url, email_verified
      FROM users
      WHERE email = ?
    `,
      )
      .get(email) as
      | {
          id: string;
          email: string;
          password_hash: string;
          username: string | null;
          avatar_url: string | null;
          email_verified: number;
        }
      | undefined;

    if (!user) {
      return { success: false, error: "邮箱或密码错误" };
    }

    // Check if account is locked
    const recentFailedAttempts = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE user_id = ?
        AND success = 0
        AND attempted_at > datetime('now', '-${LOCKOUT_DURATION_MINUTES} minutes')
    `,
      )
      .get(user.id) as { count: number };

    if (recentFailedAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      return {
        success: false,
        error: `账号已锁定，请 ${LOCKOUT_DURATION_MINUTES} 分钟后重试`,
      };
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    // Record login attempt
    db.prepare(
      `
      INSERT INTO login_attempts (user_id, ip_address, success)
      VALUES (?, ?, ?)
    `,
    ).run(user.id, ipAddress, isValidPassword ? 1 : 0);

    if (!isValidPassword) {
      const attemptsRemaining =
        MAX_LOGIN_ATTEMPTS - recentFailedAttempts.count - 1;
      return {
        success: false,
        error: "邮箱或密码错误",
        attemptsRemaining: Math.max(0, attemptsRemaining),
      };
    }

    // Check if email is verified
    if (!user.email_verified) {
      return {
        success: false,
        error: "请先验证邮箱",
      };
    }

    // Parse device info
    const deviceInfo = parseUserAgent(userAgent);

    // Check if device is known
    const knownDevice = db
      .prepare(
        `
      SELECT id
      FROM user_devices
      WHERE user_id = ? AND device_fingerprint = ?
    `,
      )
      .get(user.id, deviceInfo.fingerprint) as { id: string } | undefined;

    // DEV MODE: Skip device verification for development
    const SKIP_DEVICE_VERIFICATION =
      process.env.NODE_ENV === "development" || true;

    if (!knownDevice && !SKIP_DEVICE_VERIFICATION) {
      // New device - require verification
      const code = generateVerificationCode();
      const expiresAt = new Date(
        Date.now() + DEVICE_CODE_EXPIRY_MINUTES * 60 * 1000,
      ).toISOString();

      // Store verification code as a token
      db.prepare(
        `
        INSERT INTO email_tokens (id, user_id, token, type, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(randomUUID(), user.id, code, "device_verification", expiresAt);

      // Send verification code
      const emailResult = await emailService.sendDeviceVerificationCode(
        email,
        code,
        deviceInfo.name,
      );

      if (!emailResult.success) {
        return {
          success: false,
          error: "发送验证码失败，请稍后重试",
        };
      }

      return {
        success: true,
        requiresDeviceVerification: true,
        deviceFingerprint: deviceInfo.fingerprint,
      };
    }

    // Update device last used (or register new device in dev mode)
    if (knownDevice) {
      db.prepare(
        `
        UPDATE user_devices
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      ).run(knownDevice.id);
    } else {
      // Register new device
      db.prepare(
        `
        INSERT INTO user_devices (id, user_id, device_fingerprint, device_name, last_used_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      ).run(randomUUID(), user.id, deviceInfo.fingerprint, deviceInfo.name);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatar_url,
        emailVerified: Boolean(user.email_verified),
      },
    };
  }

  /**
   * Verify new device with code
   */
  async verifyDevice(params: VerifyDeviceParams): Promise<VerifyDeviceResult> {
    const { email, code, userAgent } = params;

    // Find user
    const user = db
      .prepare(
        `
      SELECT id, email, username, avatar_url, email_verified
      FROM users
      WHERE email = ?
    `,
      )
      .get(email) as
      | {
          id: string;
          email: string;
          username: string | null;
          avatar_url: string | null;
          email_verified: number;
        }
      | undefined;

    if (!user) {
      return { success: false, error: "用户不存在" };
    }

    // Find and validate code
    const tokenRecord = db
      .prepare(
        `
      SELECT id, expires_at, used
      FROM email_tokens
      WHERE user_id = ? AND token = ? AND type = 'device_verification'
    `,
      )
      .get(user.id, code) as
      | { id: string; expires_at: string; used: number }
      | undefined;

    if (!tokenRecord) {
      return { success: false, error: "无效的验证码" };
    }

    if (tokenRecord.used) {
      return { success: false, error: "验证码已使用" };
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return { success: false, error: "验证码已过期" };
    }

    // Mark code as used
    db.prepare("UPDATE email_tokens SET used = 1 WHERE id = ?").run(
      tokenRecord.id,
    );

    // Register device
    const deviceInfo = parseUserAgent(userAgent);
    db.prepare(
      `
      INSERT INTO user_devices (id, user_id, device_fingerprint, device_name)
      VALUES (?, ?, ?, ?)
    `,
    ).run(randomUUID(), user.id, deviceInfo.fingerprint, deviceInfo.name);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatar_url,
        emailVerified: Boolean(user.email_verified),
      },
    };
  }

  /**
   * Request password reset
   */
  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Find user
    const user = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as
      | {
          id: string;
        }
      | undefined;

    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    // Generate reset token
    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    ).toISOString();

    db.prepare(
      `
      INSERT INTO email_tokens (id, user_id, token, type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(randomUUID(), user.id, token, "password_reset", expiresAt);

    // Send reset email
    const emailResult = await emailService.sendPasswordResetEmail(email, token);
    if (!emailResult.success) {
      return { success: false, error: "发送邮件失败，请稍后重试" };
    }

    return { success: true };
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.errors.join("; "),
      };
    }

    // Find token
    const tokenRecord = db
      .prepare(
        `
      SELECT id, user_id, expires_at, used
      FROM email_tokens
      WHERE token = ? AND type = 'password_reset'
    `,
      )
      .get(token) as
      | { id: string; user_id: string; expires_at: string; used: number }
      | undefined;

    if (!tokenRecord) {
      return { success: false, error: "无效的重置链接" };
    }

    if (tokenRecord.used) {
      return { success: false, error: "该链接已使用" };
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return { success: false, error: "重置链接已过期" };
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(passwordHash, tokenRecord.user_id);

    // Mark token as used
    db.prepare("UPDATE email_tokens SET used = 1 WHERE id = ?").run(
      tokenRecord.id,
    );

    // Clear all login attempts for this user
    db.prepare("DELETE FROM login_attempts WHERE user_id = ?").run(
      tokenRecord.user_id,
    );

    return { success: true };
  }

  /**
   * Get current user by ID
   */
  getCurrentUser(userId: string): User | null {
    const user = db
      .prepare(
        `
      SELECT id, email, username, avatar_url, email_verified, created_at, updated_at
      FROM users
      WHERE id = ?
    `,
      )
      .get(userId) as
      | {
          id: string;
          email: string;
          username: string | null;
          avatar_url: string | null;
          email_verified: number;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatar_url,
      emailVerified: Boolean(user.email_verified),
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Logout - add token to blacklist
   */
  logout(token: string): { success: boolean; error?: string } {
    const jti = getTokenJti(token);
    if (!jti) {
      return { success: false, error: "无效的 token" };
    }

    const expiry = getTokenExpiry(token);
    if (!expiry) {
      return { success: false, error: "无效的 token" };
    }

    try {
      db.prepare(
        `
        INSERT OR IGNORE INTO token_blacklist (token_jti, expires_at)
        VALUES (?, ?)
      `,
      ).run(jti, expiry.toISOString());

      return { success: true };
    } catch (error) {
      console.error("Failed to blacklist token:", error);
      return { success: false, error: "登出失败" };
    }
  }

  /**
   * Check if token is blacklisted
   */
  isTokenBlacklisted(token: string): boolean {
    const jti = getTokenJti(token);
    if (!jti) {
      return true;
    }

    const blacklisted = db
      .prepare(
        `
      SELECT id FROM token_blacklist WHERE token_jti = ?
    `,
      )
      .get(jti);

    return Boolean(blacklisted);
  }

  /**
   * Resend verification email
   */
  async resendVerification(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    // Find user
    const user = db
      .prepare("SELECT id, email_verified FROM users WHERE email = ?")
      .get(email) as
      | {
          id: string;
          email_verified: number;
        }
      | undefined;

    if (!user) {
      // Don't reveal if email exists
      return { success: true };
    }

    if (user.email_verified) {
      return { success: false, error: "邮箱已验证" };
    }

    // Invalidate previous tokens
    db.prepare(
      `
      UPDATE email_tokens
      SET used = 1
      WHERE user_id = ? AND type = 'verification' AND used = 0
    `,
    ).run(user.id);

    // Generate new token
    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    ).toISOString();

    db.prepare(
      `
      INSERT INTO email_tokens (id, user_id, token, type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(randomUUID(), user.id, token, "verification", expiresAt);

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(email, token);
    if (!emailResult.success) {
      return { success: false, error: "发送邮件失败，请稍后重试" };
    }

    return { success: true };
  }

  /**
   * Verify JWT token and return payload (with blacklist check)
   */
  verifyAuthToken(token: string): {
    valid: boolean;
    payload?: { userId: string; email: string };
    error?: string;
  } {
    try {
      // Check blacklist first
      if (this.isTokenBlacklisted(token)) {
        return { valid: false, error: "Token 已失效" };
      }

      const payload = verifyToken(token);
      return {
        valid: true,
        payload: { userId: payload.userId, email: payload.email },
      };
    } catch (error) {
      return { valid: false, error: "无效的 Token" };
    }
  }

  /**
   * Clean up expired tokens (can be called periodically)
   */
  cleanupExpiredTokens(): void {
    db.prepare(
      "DELETE FROM token_blacklist WHERE expires_at < datetime('now')",
    ).run();
    db.prepare(
      "DELETE FROM email_tokens WHERE expires_at < datetime('now')",
    ).run();
  }
}

export const authService = new AuthService();
