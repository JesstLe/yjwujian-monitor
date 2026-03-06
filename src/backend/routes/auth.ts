import { Router, Request, Response } from "express";
import { z } from "zod";
import { authService } from "../services/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(8, "密码至少需要 8 个字符"),
  username: z
    .string()
    .min(2, "用户名至少需要 2 个字符")
    .max(50, "用户名最多 50 个字符")
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "验证令牌不能为空"),
});

const verifyDeviceSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  code: z.string().length(6, "验证码必须是 6 位"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "重置令牌不能为空"),
  password: z.string().min(8, "密码至少需要 8 个字符"),
});

const resendVerificationSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

/**
 * Helper to extract client IP address
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * Helper to set auth cookie
 */
function setAuthCookie(res: Response, token: string): void {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });
}

/**
 * Helper to clear auth cookie
 */
function clearAuthCookie(res: Response): void {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

// POST /api/auth/register - Register a new user
router.post("/register", async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join("; ");
      return res.status(400).json({ success: false, error: errors });
    }

    const { email, password, username } = parseResult.data;

    const result = await authService.register({
      email,
      password,
      username,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(201).json({
      success: true,
      message: "注册成功，请查收验证邮件",
      userId: result.userId,
    });
  } catch (error) {
    console.error("Register error:", error);
    const message = error instanceof Error ? error.message : "注册失败";
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/auth/verify-email - Verify email address
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const parseResult = verifyEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join("; ");
      return res.status(400).json({ success: false, error: errors });
    }

    const { token } = parseResult.data;

    const result = await authService.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: "邮箱验证成功",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    const message = error instanceof Error ? error.message : "验证失败";
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/auth/login - Login with email and password
router.post("/login", async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join("; ");
      return res.status(400).json({ success: false, error: errors });
    }

    const { email, password } = parseResult.data;
    const userAgent = req.headers["user-agent"] || "unknown";
    const ipAddress = getClientIp(req);

    const result = await authService.login({
      email,
      password,
      userAgent,
      ipAddress,
    });

    if (!result.success) {
      const statusCode = result.error?.includes("锁定") ? 429 : 401;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        attemptsRemaining: result.attemptsRemaining,
      });
    }

    // Check if device verification is required
    if (result.requiresDeviceVerification) {
      return res.json({
        success: true,
        requiresDeviceVerification: true,
        message: "检测到新设备，已发送验证码到您的邮箱",
      });
    }

    // Set auth cookie
    if (result.token) {
      setAuthCookie(res, result.token);
    }

    return res.json({
      success: true,
      message: "登录成功",
      user: result.user,
    });
  } catch (error) {
    console.error("Login error:", error);
    const message = error instanceof Error ? error.message : "登录失败";
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/auth/verify-device - Verify new device with code
router.post("/verify-device", async (req: Request, res: Response) => {
  try {
    const parseResult = verifyDeviceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join("; ");
      return res.status(400).json({ success: false, error: errors });
    }

    const { email, code } = parseResult.data;
    const userAgent = req.headers["user-agent"] || "unknown";

    const result = await authService.verifyDevice({
      email,
      code,
      userAgent,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Set auth cookie
    if (result.token) {
      setAuthCookie(res, result.token);
    }

    return res.json({
      success: true,
      message: "设备验证成功",
      user: result.user,
    });
  } catch (error) {
    console.error("Verify device error:", error);
    const message = error instanceof Error ? error.message : "设备验证失败";
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/auth/logout - Logout current user
router.post("/logout", requireAuth, (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;

    if (token) {
      const result = authService.logout(token);
      if (!result.success) {
        console.warn("Logout warning:", result.error);
      }
    }

    clearAuthCookie(res);

    return res.json({
      success: true,
      message: "已退出登录",
    });
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear cookie even if blacklist fails
    clearAuthCookie(res);
    return res.json({
      success: true,
      message: "已退出登录",
    });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join("; ");
      return res.status(400).json({ success: false, error: errors });
    }

    const { email } = parseResult.data;

    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    return res.json({
      success: true,
      message: "如果该邮箱已注册，您将收到重置密码的邮件",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return success to prevent email enumeration
    return res.json({
      success: true,
      message: "如果该邮箱已注册，您将收到重置密码的邮件",
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join("; ");
      return res.status(400).json({ success: false, error: errors });
    }

    const { token, password } = parseResult.data;

    const result = await authService.resetPassword(token, password);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: "密码重置成功，请使用新密码登录",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    const message = error instanceof Error ? error.message : "密码重置失败";
    return res.status(500).json({ success: false, error: message });
  }
});

// GET /api/auth/me - Get current authenticated user
router.get("/me", requireAuth, (req: Request, res: Response) => {
  try {
    const user = authService.getCurrentUser(req.user!.id);

    if (!user) {
      return res.status(404).json({ success: false, error: "用户不存在" });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    const message = error instanceof Error ? error.message : "获取用户信息失败";
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/auth/resend-verification - Resend verification email
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const parseResult = resendVerificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join("; ");
      return res.status(400).json({ success: false, error: errors });
    }

    const { email } = parseResult.data;

    const result = await authService.resendVerification(email);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      message: "验证邮件已发送，请查收",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    const message = error instanceof Error ? error.message : "发送验证邮件失败";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
