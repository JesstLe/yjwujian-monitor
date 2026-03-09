import { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";
import { authService } from "../services/auth.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        emailVerified: boolean;
      };
    }
  }
}

/**
 * 本地模式：默认启用，无需登录即可使用所有功能。
 * 设置环境变量 LOCAL_MODE=false 可切换为云端登录模式（需配合云同步服务）。
 */
const LOCAL_MODE = process.env.LOCAL_MODE !== "false";

/**
 * Require authentication - validates JWT token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 本地模式：跳过登录验证，注入默认本地用户
  if (LOCAL_MODE) {
    req.user = {
      id: "dev-user",
      email: "local@localhost",
      emailVerified: true,
    };
    return next();
  }

  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, error: "未登录" });
  }

  try {
    // Check blacklist
    if (authService.isTokenBlacklisted(token)) {
      return res
        .status(401)
        .json({ success: false, error: "登录已失效，请重新登录" });
    }

    const payload = verifyToken(token) as JwtPayload;
    const user = authService.getCurrentUser(payload.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: "用户不存在" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, error: "登录已过期，请重新登录" });
  }
}

/**
 * Require verified email - user must have verified their email
 */
export function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "未登录" });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ success: false, error: "请先验证邮箱" });
  }

  next();
}

/**
 * Optional auth - parse token if present, but don't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return next();
  }

  try {
    if (authService.isTokenBlacklisted(token)) {
      return next();
    }

    const payload = verifyToken(token) as JwtPayload;
    const user = authService.getCurrentUser(payload.userId);

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      };
    }
  } catch {
    // Ignore errors for optional auth
  }

  next();
}
