import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import cookieParser from "cookie-parser";
import { initializeDatabase } from "./db/index";
import { startMonitor } from "./services/monitor";
import itemsRouter from "./routes/items";
import watchlistRouter from "./routes/watchlist";
import groupsRouter from "./routes/groups";
import alertsRouter from "./routes/alerts";
import settingsRouter from "./routes/settings";
import monitorRouter from "./routes/monitor";
import compareRouter from "./routes/compare";
import authRouter from "./routes/auth";
import battleRecordsRouter from "./routes/battle-records";
import licenseRouter from "./routes/license";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NODE_ENV = process.env.NODE_ENV || "development";
const DEFAULT_PORT = 3100;

let server: Server | null = null;
let monitorStarted = false;

function parsePort(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function resolveServerPort(): number {
  return parsePort(process.env.PORT) ?? DEFAULT_PORT;
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/items", itemsRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/monitor", monitorRouter);
app.use("/api/compare", compareRouter);
app.use("/api/auth", authRouter);
app.use("/api/battle-records", battleRecordsRouter);
app.use("/api/license", licenseRouter);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

if (NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../dist/frontend")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../dist/frontend/index.html"));
  });
}

export async function startServer(port = resolveServerPort()): Promise<Server> {
  if (server) {
    return server;
  }

  initializeDatabase();

  return await new Promise<Server>((resolve, reject) => {
    const listeningServer = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      if (!monitorStarted) {
        startMonitor();
        monitorStarted = true;
      }

      server = listeningServer;
      resolve(listeningServer);
    });

    listeningServer.on("error", (error) => {
      reject(error);
    });
  });
}

export function getListeningPort(targetServer?: Server): number | null {
  const serverToInspect = targetServer ?? server;
  if (!serverToInspect) {
    return null;
  }

  const address = serverToInspect.address();
  if (!address || typeof address === "string") {
    return null;
  }

  return (address as AddressInfo).port;
}

function isDirectExecution(): boolean {
  const entryFile = process.argv[1];
  if (!entryFile) {
    return false;
  }

  return path.resolve(entryFile) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  startServer().catch((error: unknown) => {
    console.error("Failed to start backend server:", error);
    process.exit(1);
  });
}

export default app;
