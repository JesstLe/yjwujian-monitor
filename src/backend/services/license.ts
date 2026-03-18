/**
 * License 验证服务
 *
 * 基于 RSA 非对称加密实现离线激活验证：
 * - 激活码 = Base64(RSA_SIGN(机器码 + 过期时间))
 * - 验证时用内置公钥解密签名，比对机器码是否匹配
 *
 * 激活码格式（明文部分）: machineCode|expiresAt|plan
 * - machineCode: 客户机器码
 * - expiresAt: 过期时间戳（0 = 永久）
 * - plan: 授权等级（basic / pro / unlimited）
 */

import { createVerify } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getMachineCode } from "../utils/machine-code";
import { getLicenseFilePath } from "../utils/data-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 内置公钥路径（打包进应用）
const PUBLIC_KEY_PATH = path.join(__dirname, "../../../keys/public.pem");

export interface LicenseInfo {
    machineCode: string;
    expiresAt: number; // Unix 毫秒时间戳，0 = 永久
    plan: "basic" | "pro" | "unlimited";
    activatedAt: number;
}

interface StoredLicense {
    license: string; // 激活码原文（Base64签名数据）
    info: LicenseInfo;
}

class LicenseService {
    private cachedLicense: LicenseInfo | null = null;

    /**
     * 获取当前机器码
     */
    getMachineCode(): string {
        return getMachineCode();
    }

    /**
     * 验证并激活 License
     * @param licenseKey 客户输入的激活码
     * @returns 激活结果
     */
    activate(licenseKey: string): { success: boolean; error?: string; info?: LicenseInfo } {
        const key = licenseKey.trim();
        if (!key) {
            return { success: false, error: "请输入激活码" };
        }

        // 解析激活码：格式为 "明文数据.签名"
        const dotIndex = key.lastIndexOf(".");
        if (dotIndex === -1) {
            return { success: false, error: "激活码格式无效" };
        }

        const payload = key.substring(0, dotIndex);
        const signature = key.substring(dotIndex + 1);

        // 验证签名
        try {
            const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf-8");
            const verifier = createVerify("RSA-SHA256");
            verifier.update(payload);
            const isValid = verifier.verify(publicKey, signature, "base64");

            if (!isValid) {
                return { success: false, error: "激活码签名验证失败，请检查是否输入正确" };
            }
        } catch {
            return { success: false, error: "验证失败：公钥文件缺失或损坏" };
        }

        // 解析明文数据
        const parts = payload.split("|");
        if (parts.length < 3) {
            return { success: false, error: "激活码数据格式无效" };
        }

        const [machineCode, expiresAtStr, plan] = parts;
        const expiresAt = Number(expiresAtStr);

        // 校验机器码
        const localMachineCode = this.getMachineCode();
        if (machineCode !== localMachineCode) {
            return {
                success: false,
                error: `激活码绑定的机器码不匹配。\n当前机器码: ${localMachineCode}\n激活码机器码: ${machineCode}`,
            };
        }

        // 校验有效期
        if (expiresAt > 0 && Date.now() > expiresAt) {
            return { success: false, error: "激活码已过期" };
        }

        // 校验 plan
        const validPlans = ["basic", "pro", "unlimited"];
        if (!validPlans.includes(plan)) {
            return { success: false, error: "激活码授权类型无效" };
        }

        // 保存激活信息
        const info: LicenseInfo = {
            machineCode,
            expiresAt,
            plan: plan as LicenseInfo["plan"],
            activatedAt: Date.now(),
        };

        this.saveLicense(key, info);
        this.cachedLicense = info;

        return { success: true, info };
    }

    /**
     * 获取当前激活状态
     */
    getLicenseStatus(): {
        activated: boolean;
        expired: boolean;
        info: LicenseInfo | null;
        machineCode: string;
    } {
        const machineCode = this.getMachineCode();

        if (this.cachedLicense) {
            const expired =
                this.cachedLicense.expiresAt > 0 &&
                Date.now() > this.cachedLicense.expiresAt;
            return {
                activated: !expired,
                expired,
                info: this.cachedLicense,
                machineCode,
            };
        }

        // 从文件加载
        const stored = this.loadLicense();
        if (!stored) {
            return { activated: false, expired: false, info: null, machineCode };
        }

        // 校验机器码是否匹配（防止把别的机器的 license.json 拷过来）
        if (stored.info.machineCode !== machineCode) {
            return { activated: false, expired: false, info: null, machineCode };
        }

        const expired =
            stored.info.expiresAt > 0 && Date.now() > stored.info.expiresAt;
        this.cachedLicense = stored.info;

        return {
            activated: !expired,
            expired,
            info: stored.info,
            machineCode,
        };
    }

    /**
     * 清除激活信息（用于调试或重新激活）
     */
    deactivate(): void {
        this.cachedLicense = null;
        const licenseFile = getLicenseFilePath();
        try {
            if (fs.existsSync(licenseFile)) {
                fs.unlinkSync(licenseFile);
            }
        } catch {
            // 忽略删除失败
        }
    }

    private saveLicense(licenseKey: string, info: LicenseInfo): void {
        const licenseFile = getLicenseFilePath();
        try {
            const dir = path.dirname(licenseFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data: StoredLicense = { license: licenseKey, info };
            fs.writeFileSync(licenseFile, JSON.stringify(data, null, 2), "utf-8");
        } catch (error) {
            console.error("保存激活信息失败:", error);
        }
    }

    private loadLicense(): StoredLicense | null {
        const licenseFile = getLicenseFilePath();
        try {
            if (!fs.existsSync(licenseFile)) {
                return null;
            }
            const raw = fs.readFileSync(licenseFile, "utf-8");
            return JSON.parse(raw) as StoredLicense;
        } catch {
            return null;
        }
    }
}

export const licenseService = new LicenseService();
