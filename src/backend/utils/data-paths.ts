/**
 * 数据存储路径管理
 *
 * 将用户数据（数据库、激活信息）存储到系统用户目录，
 * 确保卸载重装后数据不会丢失。
 *
 * 各平台存储位置：
 * - macOS:   ~/Library/Application Support/yjwujian-monitor/
 * - Windows: %APPDATA%/yjwujian-monitor/
 * - Linux:   ~/.config/yjwujian-monitor/
 */

import os from "os";
import path from "path";
import fs from "fs";

const APP_NAME = "yjwujian-monitor";

/**
 * 获取用户数据根目录
 * 优先使用环境变量 APP_DATA_DIR（Electron 可注入），
 * 否则根据操作系统自动计算。
 * 开发模式下使用项目本地的 data/ 目录。
 */
export function getUserDataDir(): string {
    // 1. 环境变量优先（Electron 注入或手动指定）
    if (process.env.APP_DATA_DIR) {
        return process.env.APP_DATA_DIR;
    }

    // 2. 开发模式：使用项目本地 data/ 目录
    if (process.env.NODE_ENV === "development") {
        return path.join(process.cwd(), "data");
    }

    // 3. 生产模式：使用系统用户目录
    const platform = os.platform();
    const home = os.homedir();

    switch (platform) {
        case "darwin":
            return path.join(home, "Library", "Application Support", APP_NAME);
        case "win32":
            return path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), APP_NAME);
        default:
            // Linux 及其他类 Unix 系统
            return path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), APP_NAME);
    }
}

export function getDbPath(): string {
    return process.env.DATABASE_PATH || path.join(getUserDataDir(), "monitor.db");
}

export function getLicenseFilePath(): string {
    return path.join(getUserDataDir(), "license.json");
}

export function getKeysDir(): string {
    return path.join(getUserDataDir(), "..", "..", "keys");
}

/**
 * 确保数据目录存在
 */
export function ensureUserDataDir(): string {
    const userDataDir = getUserDataDir();

    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
        console.log(`Created user data directory: ${userDataDir}`);
    }

    return userDataDir;
}
