/**
 * 机器指纹生成工具
 *
 * 通过组合多个硬件标识（CPU型号、主板序列号、磁盘序列号、MAC地址）
 * 生成一个稳定且唯一的机器码，用于软件授权绑定。
 *
 * 设计原则：
 * - 使用多个硬件信息组合，单个硬件变化不会影响指纹（取前3个因子的哈希）
 * - 过滤掉虚拟网卡和回环地址
 * - 输出为 16 位大写十六进制，方便客户手动输入
 */

import { createHash } from "crypto";
import os from "os";
import { execSync } from "child_process";

/**
 * 采集硬件信息因子
 */
function collectHardwareFactors(): string[] {
    const factors: string[] = [];

    // 因子 1: CPU 型号 + 核心数（所有平台通用，非常稳定）
    const cpus = os.cpus();
    if (cpus.length > 0) {
        factors.push(`cpu:${cpus[0].model.trim()}:${cpus.length}`);
    }

    // 因子 2: 主机名（不够稳定，仅作为补充因子）
    factors.push(`hostname:${os.hostname()}`);

    // 因子 3: 第一个非虚拟网卡的 MAC 地址
    const interfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
        if (!addrs) continue;
        // 跳过虚拟网卡和回环地址
        const isVirtual =
            name.toLowerCase().includes("virtual") ||
            name.toLowerCase().includes("vmware") ||
            name.toLowerCase().includes("vethernet") ||
            name.toLowerCase().includes("docker") ||
            name.toLowerCase().includes("vbox");
        if (isVirtual) continue;

        for (const addr of addrs) {
            if (!addr.internal && addr.mac && addr.mac !== "00:00:00:00:00:00") {
                factors.push(`mac:${addr.mac}`);
                break;
            }
        }
        // 只取第一个有效网卡
        if (factors.some((f) => f.startsWith("mac:"))) break;
    }

    // 因子 4: 平台特有的硬件序列号
    try {
        if (process.platform === "win32") {
            // Windows: 主板序列号
            const serial = execSync(
                "wmic baseboard get SerialNumber /value",
                { encoding: "utf-8", timeout: 5000 },
            )
                .split("=")[1]
                ?.trim();
            if (serial && serial !== "To Be Filled By O.E.M." && serial !== "None") {
                factors.push(`board:${serial}`);
            }

            // Windows: 磁盘序列号
            const diskSerial = execSync(
                "wmic diskdrive get SerialNumber /value",
                { encoding: "utf-8", timeout: 5000 },
            )
                .split("=")[1]
                ?.trim();
            if (diskSerial) {
                factors.push(`disk:${diskSerial}`);
            }
        } else if (process.platform === "darwin") {
            // macOS: 硬件 UUID
            const hwUUID = execSync(
                "system_profiler SPHardwareDataType | grep 'Hardware UUID'",
                { encoding: "utf-8", timeout: 5000 },
            )
                .split(":")[1]
                ?.trim();
            if (hwUUID) {
                factors.push(`hwuuid:${hwUUID}`);
            }
        } else {
            // Linux: machine-id
            const machineId = execSync("cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id 2>/dev/null", {
                encoding: "utf-8",
                timeout: 5000,
            }).trim();
            if (machineId) {
                factors.push(`machineid:${machineId}`);
            }
        }
    } catch {
        // 获取失败不影响，其他因子足够
    }

    return factors;
}

/**
 * 生成 16 位大写十六进制机器码
 * 格式示例: A3B7-F82C-19D5-E6A0
 */
export function getMachineCode(): string {
    const factors = collectHardwareFactors();
    const combined = factors.join("|");

    const hash = createHash("sha256").update(combined).digest("hex").toUpperCase();

    // 取前 16 位，每 4 位用横杠分隔，方便阅读和输入
    const short = hash.substring(0, 16);
    return `${short.slice(0, 4)}-${short.slice(4, 8)}-${short.slice(8, 12)}-${short.slice(12, 16)}`;
}

/**
 * 获取原始硬件因子（调试用）
 */
export function getHardwareFactors(): string[] {
    return collectHardwareFactors();
}
