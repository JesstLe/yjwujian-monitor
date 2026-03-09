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

const { app, BrowserWindow, dialog } = electron;
const { autoUpdater } = electronUpdater;

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

function createMainWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 680,
        title: "永劫无间 · 藏宝阁监控",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        // 在 Windows 上隐藏菜单栏
        autoHideMenuBar: true,
    });

    // 开发模式加载 Vite 开发服务器，生产模式加载打包文件
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
        // 开发模式：前端由 Vite 开发服务器提供
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools();
    } else {
        // 生产模式：Express 后端同时提供前端静态文件
        mainWindow.loadURL("http://localhost:3000");
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// ---------- 应用生命周期 ----------

app.whenReady().then(async () => {
    // 生产模式下启动内嵌的 Express 后端
    if (process.env.NODE_ENV !== "development") {
        try {
            await import("../src/backend/index.js");
            console.log("Backend server started.");
        } catch (error: unknown) {
            console.error("Failed to start backend:", error);
        }
    }

    // 创建主窗口
    createMainWindow();

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
        createMainWindow();
    }
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
