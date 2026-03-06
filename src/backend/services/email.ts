import { Resend } from "resend";

const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.APP_URL || "http://localhost:5173";

// 延迟初始化 Resend 客户端，允许在没有 API key 时启动（开发模式）
let resend: Resend | null = null;
const getResend = (): Resend | null => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

export class EmailService {
  async sendVerificationEmail(
    email: string,
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

    const client = getResend();
    if (!client) {
      // 开发模式：只记录日志
      console.log("\n========================================");
      console.log("[DEV MODE] 邮箱验证邮件（未实际发送）");
      console.log(`收件人: ${email}`);
      console.log(`验证链接: ${verifyUrl}`);
      console.log("========================================\n");
      return { success: true };
    }

    try {
      await client.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "验证您的邮箱 - 永劫藏宝阁监控",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937;">验证您的邮箱</h2>
            <p style="color: #4b5563;">感谢注册永劫藏宝阁监控系统！</p>
            <p style="color: #4b5563;">请点击下方链接验证您的邮箱地址：</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              验证邮箱
            </a>
            <p style="color: #9ca3af; font-size: 14px;">链接 24 小时内有效。如果您没有注册账号，请忽略此邮件。</p>
          </div>
        `,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send verification email:", error);
      return { success: false, error: "发送邮件失败" };
    }
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    const client = getResend();
    if (!client) {
      // 开发模式：只记录日志
      console.log("\n========================================");
      console.log("[DEV MODE] 密码重置邮件（未实际发送）");
      console.log(`收件人: ${email}`);
      console.log(`重置链接: ${resetUrl}`);
      console.log("========================================\n");
      return { success: true };
    }

    try {
      await client.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "重置密码 - 永劫藏宝阁监控",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937;">重置您的密码</h2>
            <p style="color: #4b5563;">我们收到了重置密码的请求。</p>
            <p style="color: #4b5563;">请点击下方链接设置新密码：</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              重置密码
            </a>
            <p style="color: #9ca3af; font-size: 14px;">链接 24 小时内有效。如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
        `,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: "发送邮件失败" };
    }
  }

  async sendDeviceVerificationCode(
    email: string,
    code: string,
    deviceName: string,
  ): Promise<{ success: boolean; error?: string }> {
    const client = getResend();
    if (!client) {
      // 开发模式：只记录日志
      console.log("\n========================================");
      console.log("[DEV MODE] 设备验证码（未实际发送）");
      console.log(`收件人: ${email}`);
      console.log(`设备: ${deviceName}`);
      console.log(`验证码: ${code}`);
      console.log("========================================\n");
      return { success: true };
    }

    try {
      await client.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: "新设备登录验证 - 永劫藏宝阁监控",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937;">新设备登录验证</h2>
            <p style="color: #4b5563;">检测到新设备尝试登录您的账号：</p>
            <p style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block;"><strong>${deviceName}</strong></p>
            <p style="color: #4b5563; margin-top: 16px;">您的验证码是：</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;">
              ${code}
            </div>
            <p style="color: #9ca3af; font-size: 14px;">验证码 10 分钟内有效。如果这不是您本人的操作，请立即修改密码。</p>
          </div>
        `,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send device verification code:", error);
      return { success: false, error: "发送邮件失败" };
    }
  }
}

export const emailService = new EmailService();
