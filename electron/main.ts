/**
 * Electron 主进程入口
 *
 * 功能：
 * 1. 启动内嵌 Express 后端服务
 * 2. 创建主窗口加载前端页面
 * 3. 通过 GitHub Releases 实现自动更新
 *
 * 使用前需安装依赖：
 *   pnpm add electron electron-updater
 *   pnpm add -D electron-builder
 */

import { writeFile } from "node:fs/promises";

// eslint-disable-next-line @typescript-eslint/no-var-requires
let electron: typeof import("electron");
let electronUpdater: typeof import("electron-updater");

try {
    electron = require("electron");
    electronUpdater = require("electron-updater");
} catch {
    console.error(
        "Electron dependencies not installed. Run: pnpm add electron electron-updater",
    );
    process.exit(1);
}

const { app, BrowserWindow, dialog, ipcMain, shell } = electron;
const { autoUpdater } = electronUpdater;

const DEFAULT_BACKEND_PORT = 3100;
const HEALTH_CHECK_TIMEOUT_MS = 30_000;
const HEALTH_CHECK_INTERVAL_MS = 400;

type BackendModule = {
    startServer: () => Promise<unknown>;
    getListeningPort: (server: unknown) => number | undefined;
    resolveServerPort: () => number | undefined;
};

interface SaveFileRequest {
    defaultFileName: string;
    buffer: Uint8Array;
}

interface SaveFileResponse {
    canceled: boolean;
    filePath?: string;
    error?: string;
}

// ---------- 自动更新配置 ----------

/**
 * 配置自动更新源为 GitHub Releases。
 * 需要在 package.json 中添加：
 * {
 *   "build": {
 *     "publish": [{
 *       "provider": "github",
 *       "owner": "你的GitHub用户名",
 *       "repo": "yjwujian-monitor"
 *     }]
 *   }
 * }
 */
function setupAutoUpdater(): void {
    // 禁用自动下载，让用户确认后再下载
    autoUpdater.autoDownload = false;
    // 允许降级（方便调试）
    autoUpdater.allowDowngrade = false;

    // 检测到新版本
    autoUpdater.on("update-available", (info: { version: string }) => {
        dialog
            .showMessageBox({
                type: "info",
                title: "发现新版本",
                message: `发现新版本 v${info.version}，是否立即下载更新？`,
                buttons: ["立即下载", "稍后再说"],
                defaultId: 0,
            })
            .then((result: { response: number }) => {
                if (result.response === 0) {
                    autoUpdater.downloadUpdate();
                }
            });
    });

    // 没有新版本
    autoUpdater.on("update-not-available", () => {
        console.log("当前已是最新版本");
    });

    // 下载进度
    autoUpdater.on("download-progress", (progress: { percent: number }) => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.setProgressBar(progress.percent / 100);
        }
    });

    // 下载完成，提示重启安装
    autoUpdater.on("update-downloaded", () => {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.setProgressBar(-1); // 清除进度条
        }

        dialog
            .showMessageBox({
                type: "info",
                title: "更新已就绪",
                message: "新版本已下载完成，重启应用即可完成更新。",
                buttons: ["立即重启", "稍后重启"],
                defaultId: 0,
            })
            .then((result: { response: number }) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
    });

    // 更新出错
    autoUpdater.on("error", (error: Error) => {
        console.error("自动更新出错:", error);
    });
}

// ---------- 窗口管理 ----------

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;
let rendererUrl = "";

function getAppServerUrl(port: number): string {
    return `http://127.0.0.1:${port}`;
}

function shouldOpenExternally(targetUrl: string, appOrigin: string): boolean {
    try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }
        return parsed.origin !== appOrigin;
    } catch {
        return false;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function waitForHealth(
    serverUrl: string,
    timeoutMs = HEALTH_CHECK_TIMEOUT_MS,
): Promise<void> {
    const healthUrl = `${serverUrl}/api/health`;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        let isHealthy = false;
        try {
            const response = await fetch(healthUrl);
            isHealthy = response.ok;
        } catch (_error: unknown) {
            isHealthy = false;
        }

        if (isHealthy) {
            return;
        }

        await sleep(HEALTH_CHECK_INTERVAL_MS);
    }

    throw new Error(`Backend health check timeout: ${healthUrl}`);
}

async function startBackend(): Promise<string> {
    const backendEntry = "../dist/backend/index.js";
    const backendModule = (await import(backendEntry)) as BackendModule;
    const server = await backendModule.startServer();
    const port =
        backendModule.getListeningPort(server) ??
        backendModule.resolveServerPort() ??
        DEFAULT_BACKEND_PORT;
    const appServerUrl = getAppServerUrl(port);
    await waitForHealth(appServerUrl);

    return appServerUrl;
}

function resolveRendererUrl(isDev: boolean, appServerUrl: string): string {
    if (isDev) {
        return process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";
    }

    return appServerUrl;
}

function createMainWindow(url: string, isDev: boolean): void {
    const appOrigin = new URL(url).origin;

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 680,
        title: "永劫无间 · 藏宝阁助手",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        // 在 Windows 上隐藏菜单栏
        autoHideMenuBar: true,
    });

    mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }: { url: string }) => {
        if (shouldOpenExternally(targetUrl, appOrigin)) {
            void shell.openExternal(targetUrl);
        }
        return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
        if (shouldOpenExternally(targetUrl, appOrigin)) {
            event.preventDefault();
            void shell.openExternal(targetUrl);
        }
    });

    mainWindow.loadURL(url).catch((error: unknown) => {
        console.error("Failed to load renderer URL:", error);
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// ---------- 应用生命周期 ----------

app.whenReady().then(async () => {
    ipcMain.handle(
        "desktop:save-file",
        async (_event: unknown, request: SaveFileRequest): Promise<SaveFileResponse> => {
            try {
                const { canceled, filePath } = await dialog.showSaveDialog({
                    defaultPath: request.defaultFileName,
                });

                if (canceled || !filePath) {
                    return { canceled: true };
                }

                await writeFile(filePath, Buffer.from(request.buffer));
                return { canceled: false, filePath };
            } catch (error: unknown) {
                const message =
                    error instanceof Error ? error.message : "Failed to save file";
                return {
                    canceled: true,
                    error: message,
                };
            }
        },
    );

    // 将 Electron 用户数据目录注入环境变量，供后端使用
    process.env.APP_DATA_DIR = app.getPath("userData");

    const isDev = process.env.NODE_ENV === "development";
    let appServerUrl = getAppServerUrl(DEFAULT_BACKEND_PORT);

    // 生产模式下启动内嵌的 Express 后端
    if (!isDev) {
        try {
            appServerUrl = await startBackend();
            console.log(`Backend server ready at ${appServerUrl}`);
        } catch (error: unknown) {
            console.error("Failed to start backend:", error);
            dialog.showErrorBox(
                "后端启动失败",
                "本地服务启动失败，应用将退出。请检查日志后重试。",
            );
            app.quit();
            return;
        }
    }

    rendererUrl = resolveRendererUrl(isDev, appServerUrl);

    // 创建主窗口
    createMainWindow(rendererUrl, isDev);

    // 启动后检查更新（延迟 3 秒，等窗口加载完）
    setTimeout(() => {
        setupAutoUpdater();
        autoUpdater.checkForUpdates().catch((err: Error) => {
            console.log("检查更新失败（可能是离线状态）:", err.message);
        });
    }, 3000);
});

// macOS: 点击 Dock 图标时重新创建窗口
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const isDev = process.env.NODE_ENV === "development";
        createMainWindow(rendererUrl, isDev);
    }
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
