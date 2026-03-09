#!/usr/bin/env tsx
/**
 * 激活码生成工具（卖家专用）
 *
 * 用法：
 *   1. 首次使用，生成密钥对：
 *      npx tsx scripts/generate-license.ts --init
 *
 *   2. 给客户生成激活码：
 *      npx tsx scripts/generate-license.ts --machine XXXX-XXXX-XXXX-XXXX
 *
 *   3. 生成有时效的激活码（30天）：
 *      npx tsx scripts/generate-license.ts --machine XXXX-XXXX-XXXX-XXXX --days 30
 *
 *   4. 指定授权等级：
 *      npx tsx scripts/generate-license.ts --machine XXXX-XXXX-XXXX-XXXX --plan pro
 *
 * 注意：
 *   - keys/private.pem 是你的私钥，绝对不要泄露！不要放进 git！
 *   - keys/public.pem 会打包进 exe，是公开的
 */

import { generateKeyPairSync, createSign } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = path.join(__dirname, "../keys");
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, "private.pem");
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, "public.pem");

// 解析命令行参数
function parseArgs(): Record<string, string> {
    const args: Record<string, string> = {};
    const argv = process.argv.slice(2);

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith("--")) {
            const key = arg.substring(2);
            const next = argv[i + 1];
            if (next && !next.startsWith("--")) {
                args[key] = next;
                i++;
            } else {
                args[key] = "true";
            }
        }
    }

    return args;
}

// 初始化密钥对
function initKeys(): void {
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }

    if (fs.existsSync(PRIVATE_KEY_PATH)) {
        console.log("⚠️  密钥对已存在，跳过生成。如需重新生成请手动删除 keys/ 目录。");
        return;
    }

    console.log("🔐 正在生成 RSA-2048 密钥对...");

    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

    console.log(`✅ 密钥对已生成：`);
    console.log(`   私钥（绝密）: ${PRIVATE_KEY_PATH}`);
    console.log(`   公钥（公开）: ${PUBLIC_KEY_PATH}`);
    console.log("");
    console.log("⚠️  请确保 private.pem 不会被提交到 Git！");
}

// 生成激活码
function generateLicense(
    machineCode: string,
    days: number,
    plan: string,
): string {
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        console.error("❌ 未找到私钥！请先运行: npx tsx scripts/generate-license.ts --init");
        process.exit(1);
    }

    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8");

    // 计算过期时间（0 = 永久）
    const expiresAt = days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : 0;

    // 构造明文 payload
    const payload = `${machineCode}|${expiresAt}|${plan}`;

    // 用私钥签名
    const signer = createSign("RSA-SHA256");
    signer.update(payload);
    const signature = signer.sign(privateKey, "base64");

    // 最终激活码 = payload.signature
    return `${payload}.${signature}`;
}

// ---------- 主逻辑 ----------

const args = parseArgs();

if (args.init) {
    initKeys();
    process.exit(0);
}

if (args.machine) {
    const machineCode = args.machine;
    const days = Number(args.days || 0); // 0 = 永久
    const plan = args.plan || "basic";

    const validPlans = ["basic", "pro", "unlimited"];
    if (!validPlans.includes(plan)) {
        console.error(`❌ 无效的授权等级: ${plan}。可选: ${validPlans.join(", ")}`);
        process.exit(1);
    }

    const license = generateLicense(machineCode, days, plan);

    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("          激 活 码 生 成 成 功");
    console.log("═══════════════════════════════════════════");
    console.log(`  机器码: ${machineCode}`);
    console.log(`  有效期: ${days > 0 ? `${days} 天` : "永久"}`);
    console.log(`  等  级: ${plan}`);
    console.log("───────────────────────────────────────────");
    console.log(`  激活码:`);
    console.log("");
    console.log(`  ${license}`);
    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("  请将上面的激活码发送给客户");
    console.log("═══════════════════════════════════════════");

    process.exit(0);
}

// 没有参数时显示帮助
console.log(`
使用方法:
  初始化密钥对（首次使用）:
    npx tsx scripts/generate-license.ts --init

  生成激活码:
    npx tsx scripts/generate-license.ts --machine <机器码> [--days <天数>] [--plan <等级>]

  参数说明:
    --machine   客户的机器码（必填）
    --days      有效天数（可选，默认永久）
    --plan      授权等级: basic / pro / unlimited（可选，默认 basic）

  示例:
    npx tsx scripts/generate-license.ts --machine A3B7-F82C-19D5-E6A0
    npx tsx scripts/generate-license.ts --machine A3B7-F82C-19D5-E6A0 --days 365 --plan pro
`);
