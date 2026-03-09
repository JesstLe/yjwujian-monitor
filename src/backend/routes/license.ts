/**
 * License API 路由
 *
 * 提供机器码获取、激活码验证、激活状态查询等接口。
 * 这些接口不需要登录验证（激活在登录之前）。
 */

import { Router } from "express";
import { createSign } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { licenseService } from "../services/license";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY_PATH = path.join(__dirname, "../../../keys/private.pem");

// 管理员密钥（通过环境变量设置，用于保护生成接口）
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin";

const router = Router();

/**
 * GET /api/license/status
 * 获取当前激活状态和机器码
 */
router.get("/status", (_req, res) => {
    try {
        const status = licenseService.getLicenseStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        const message = error instanceof Error ? error.message : "获取激活状态失败";
        res.status(500).json({ success: false, error: message });
    }
});

/**
 * POST /api/license/activate
 * 验证并激活 License
 * Body: { licenseKey: string }
 */
router.post("/activate", (req, res) => {
    try {
        const { licenseKey } = req.body as { licenseKey?: string };
        if (!licenseKey) {
            return res.status(400).json({ success: false, error: "请提供激活码" });
        }

        const result = licenseService.activate(licenseKey);

        if (result.success) {
            res.json({ success: true, data: result.info });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "激活失败";
        res.status(500).json({ success: false, error: message });
    }
});

/**
 * GET /api/license/machine-code
 * 仅获取机器码（方便客户复制）
 */
router.get("/machine-code", (_req, res) => {
    try {
        const machineCode = licenseService.getMachineCode();
        res.json({ success: true, data: { machineCode } });
    } catch (error) {
        const message = error instanceof Error ? error.message : "获取机器码失败";
        res.status(500).json({ success: false, error: message });
    }
});

/**
 * POST /api/license/generate
 * 管理员接口：根据机器码生成激活码
 * Body: { machineCode: string, days?: number, plan?: string, secret: string }
 */
router.post("/generate", (req, res) => {
    try {
        const { machineCode, days = 0, plan = "basic", secret } = req.body as {
            machineCode?: string;
            days?: number;
            plan?: string;
            secret?: string;
        };

        // 验证管理员密钥
        if (secret !== ADMIN_SECRET) {
            return res.status(403).json({ success: false, error: "管理员密钥错误" });
        }

        if (!machineCode || !machineCode.trim()) {
            return res.status(400).json({ success: false, error: "请输入机器码" });
        }

        // 验证 plan
        const validPlans = ["basic", "pro", "unlimited"];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({
                success: false,
                error: `无效的授权等级，可选: ${validPlans.join(", ")}`,
            });
        }

        // 检查私钥是否存在
        if (!fs.existsSync(PRIVATE_KEY_PATH)) {
            return res.status(500).json({
                success: false,
                error: "私钥文件不存在，请先运行: npx tsx scripts/generate-license.ts --init",
            });
        }

        const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8");

        // 计算过期时间
        const expiresAt = days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : 0;

        // 构造 payload 并签名
        const payload = `${machineCode.trim()}|${expiresAt}|${plan}`;
        const signer = createSign("RSA-SHA256");
        signer.update(payload);
        const signature = signer.sign(privateKey, "base64");
        const licenseKey = `${payload}.${signature}`;

        res.json({
            success: true,
            data: {
                licenseKey,
                machineCode: machineCode.trim(),
                plan,
                days,
                expiresAt: expiresAt > 0 ? new Date(expiresAt).toISOString() : "永久",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "生成激活码失败";
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
